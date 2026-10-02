#!/usr/bin/env node
'use strict';
/*
 * Decrypnoto — live shared note-taker for the board game Decrypto.
 * Zero dependencies: plain Node HTTP + Server-Sent Events.
 * Run: node server.js   → friends join at http://<your-LAN-IP>:4321
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const zlib = require('zlib');

const PORT = Number(process.env.PORT) || 4321;
const PUB = path.join(__dirname, 'public');
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'game-state.json');
const TEAMS = ['white', 'black'];
const MAX_LOBBIES = 200;
const TIMER_MS = 60000;
// lobbies nobody has touched for this long are deleted automatically
const LOBBY_TTL_MS = Number(process.env.LOBBY_TTL_MS) || 3 * 24 * 60 * 60 * 1000;
const PRUNE_EVERY_MS = Number(process.env.PRUNE_EVERY_MS) || 10 * 60 * 1000;

// ---------- game state ----------
function blankTeam() {
  return { keywords: ['', '', '', ''], oppGuesses: ['', '', '', ''], notes: '' };
}
function blankRound() {
  const r = {};
  for (const t of TEAMS) {
    r[t] = {
      encryptor: null,          // clientId of the clue-giver this round
      code: null,               // [d,d,d] digits 1-4, secret until revealed
      revealed: false,
      clues: ['', '', ''],
      ownGuess: null,           // this team's decode attempt [d,d,d]
      interceptGuess: null      // the OTHER team's intercept attempt at this code
    };
  }
  return r;
}
function rid() { return crypto.randomBytes(5).toString('hex'); }
function blankTokens() {
  return { white: { int: 0, mis: 0 }, black: { int: 0, mis: 0 } };
}
function blankLobby(name, mode) {
  return {
    id: rid(),
    name,
    mode,                       // 'digital' (app draws/hides codes) | 'physical' (real cards, pure notes)
    createdAt: Date.now(),
    lastActive: Date.now(),     // bumped on every action; idle past LOBBY_TTL_MS → deleted
    owner: null,                // clientId of the lobby admin
    players: {},                // clientId -> {name, team, notes}
    teams: { white: blankTeam(), black: blankTeam() },
    teamNames: { white: '', black: '' },  // custom display names, '' = default
    rounds: [blankRound()],
    tokens: blankTokens(),      // manual counters, used in physical mode only
    switchRequests: {},         // requestId -> {clientId, to, approvals: [clientId]}
    formerTeams: {},            // clientId -> last team, blocks leave-and-rejoin cheating
    formerNotes: {},            // clientId -> private notes kept across leave/rejoin
    banned: {},                 // clientId -> name, kicked players can't re-enter
    timers: { white: null, black: null }  // pressure timers, keyed by the team being timed
  };
}

// Every lookup keyed by user input goes through own(): a plain `obj[key]`
// with key "__proto__" / "constructor" returns inherited objects and used to
// crash the server (and, once saved to disk, keep crashing it on restart).
const own = (obj, key) => (obj && typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key)
  ? obj[key] : undefined);

let state = { lobbies: {}, clientLobby: {} };
try {
  if (fs.existsSync(STATE_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (loaded && loaded.lobbies && typeof loaded.lobbies === 'object') state = loaded;
  }
} catch (e) {
  console.error('Could not load saved state, starting fresh:', e.message);
  try { fs.copyFileSync(STATE_FILE, STATE_FILE + '.corrupt-' + Date.now()); } catch (e2) {}
}
if (!state.clientLobby || typeof state.clientLobby !== 'object') state.clientLobby = {};
for (const [id, l] of Object.entries(state.lobbies)) {
  if (!l || typeof l !== 'object' || !Array.isArray(l.rounds)) { delete state.lobbies[id]; continue; }
  if (!l.mode) l.mode = 'digital';
  if (!l.players) l.players = {};
  if (!l.tokens) l.tokens = blankTokens();
  if (!l.switchRequests) l.switchRequests = {};
  if (!l.formerTeams) l.formerTeams = {};
  if (!l.formerNotes) l.formerNotes = {};
  if (!l.banned) l.banned = {};
  if (!l.teamNames) l.teamNames = { white: '', black: '' };
  if (!l.timers) l.timers = { white: null, black: null };
  if (!l.lastActive) l.lastActive = Date.now();
  if (l.owner === undefined || (l.owner && !own(l.players, l.owner))) {
    l.owner = Object.keys(l.players)[0] || null;
  }
  for (const p of Object.values(l.players)) if (p.notes === undefined) p.notes = '';
}
for (const [cid, lid] of Object.entries(state.clientLobby)) {
  if (!own(state.lobbies, lid)) delete state.clientLobby[cid];
}

// short public id for a client — lets the UI reference players (e.g. kick)
// without ever exposing raw clientIds, which are bearer identities
function pidOf(clientId) {
  return crypto.createHash('sha1').update(String(clientId)).digest('hex').slice(0, 8);
}

// atomic write: a crash mid-write must never leave a truncated state file
function save() {
  const tmp = STATE_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, STATE_FILE);
  } catch (e) { console.error('save failed:', e.message); }
}

// ---------- helpers ----------
const otherTeam = t => (t === 'white' ? 'black' : 'white');
const CLIENT_ID_RE = /^(?!__proto__$)[A-Za-z0-9_-]{8,64}$/;

// truncate by code point so emoji / Arabic never get split mid-character
function text(s, max) {
  return Array.from(String(s == null ? '' : s)).slice(0, max).join('');
}

function validCode(arr, allowPartial) {
  if (!Array.isArray(arr) || arr.length !== 3) return null;
  const out = arr.map(d => {
    if (d === null || d === undefined || d === '') return null;
    const n = Number(d);
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : NaN;
  });
  if (out.some(Number.isNaN)) return null;
  const digits = out.filter(d => d !== null);
  if (new Set(digits).size !== digits.length) return null;   // codes never repeat a digit
  if (!allowPartial && digits.length !== 3) return null;
  if (digits.length === 0) return null;
  return out;
}

// a code from the client: blank → null (clear it); anything else must be valid
function codeArg(v) {
  const blank = !Array.isArray(v) || v.every(d => d == null || d === '');
  if (blank) return { code: null };
  const code = validCode(v, true);
  return code ? { code } : { error: 'Invalid code — use digits 1-4 without repeats' };
}

function drawCode() {
  const digits = [1, 2, 3, 4];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 3);
}

function dropPlayer(lobby, cid) {
  const p = own(lobby.players, cid);
  if (!p) return;
  lobby.formerTeams[cid] = p.team;
  if (p.notes) lobby.formerNotes[cid] = p.notes;
  delete lobby.players[cid];
  for (const [id, q] of Object.entries(lobby.switchRequests)) {
    if (q.clientId === cid) delete lobby.switchRequests[id];
  }
  // hand the crown to whoever's still here, so the lobby stays manageable
  if (lobby.owner === cid) lobby.owner = Object.keys(lobby.players)[0] || null;
}

function clearEncryptorRoles(lobby, cid) {
  const cur = lobby.rounds[lobby.rounds.length - 1];
  for (const t of TEAMS) {
    if (cur[t].encryptor === cid && !cur[t].revealed) cur[t].encryptor = null;
  }
}

// ---------- per-client filtered view ----------
const sseClients = new Map(); // res -> clientId

function onlineMembers(lobby, team) {
  const online = new Set(sseClients.values());
  return Object.keys(lobby.players).filter(cid =>
    lobby.players[cid].team === team &&
    online.has(cid) &&
    state.clientLobby[cid] === lobby.id);
}

function lobbySummaries(clientId) {
  const onlineIds = new Set(sseClients.values());
  return Object.values(state.lobbies).map(l => {
    const count = Object.keys(l.players).length;
    return {
      id: l.id,
      name: l.name,
      mode: l.mode,
      createdAt: l.createdAt,
      round: l.rounds.length,
      canDelete: count === 0 || !l.owner || l.owner === clientId,
      players: Object.entries(l.players).map(([id, p]) => ({
        name: p.name, team: p.team,
        online: onlineIds.has(id) && state.clientLobby[id] === l.id
      }))
    };
  }).sort((a, b) => b.createdAt - a.createdAt);
}

function viewFor(clientId) {
  const lobbies = lobbySummaries(clientId);
  const lobby = own(state.lobbies, own(state.clientLobby, clientId)) || null;
  if (!lobby) {
    return { lobbies, you: { name: '', team: null, lobby: null } };
  }

  const me = own(lobby.players, clientId) || null;
  const myTeam = (me && me.team) || null;
  const v = JSON.parse(JSON.stringify({
    teams: lobby.teams,
    rounds: lobby.rounds,
    createdAt: lobby.createdAt
  }));
  v.lobbies = lobbies;
  v.mode = lobby.mode;
  v.tokens = lobby.tokens;
  v.teamNames = { white: lobby.teamNames.white, black: lobby.teamNames.black };
  v.timers = { white: lobby.timers.white, black: lobby.timers.black };
  v.serverNow = Date.now();  // lets clients correct for clock skew

  // Team-private data: keywords, hypotheses about enemy words, notes
  for (const t of TEAMS) {
    if (t !== myTeam) {
      const tm = v.teams[t];
      tm.keywords = ['', '', '', ''];
      tm.oppGuesses = ['', '', '', ''];
      tm.notes = '';
    }
  }

  // Round secrets: codes hidden until reveal (except to the encryptor),
  // guesses hidden from the opposing team until reveal.
  // Physical mode: everything was said out loud at the table, nothing to hide.
  v.rounds.forEach(r => {
    for (const t of TEAMS) {
      const tr = r[t];
      const enc = tr.encryptor;
      const encP = own(lobby.players, enc);
      tr.encryptorName = encP ? encP.name : null;
      tr.encryptorIsYou = enc === clientId;
      delete tr.encryptor;
      if (lobby.mode !== 'physical' && !tr.revealed) {
        if (!tr.encryptorIsYou) tr.code = tr.code ? 'hidden' : null;
        if (t !== myTeam) tr.ownGuess = tr.ownGuess ? 'hidden' : null;
        if (otherTeam(t) !== myTeam) tr.interceptGuess = tr.interceptGuess ? 'hidden' : null;
      }
    }
  });

  const onlineIds = new Set(sseClients.values());
  v.players = Object.entries(lobby.players).map(([id, p]) => ({
    name: p.name, team: p.team,
    online: onlineIds.has(id) && state.clientLobby[id] === lobby.id,
    you: id === clientId,
    pid: pidOf(id),
    owner: id === lobby.owner
  }));
  // pending team-switch requests: visible to the requester and the team
  // that has to approve (never leak requester clientIds — they're identity)
  v.switchRequests = Object.entries(lobby.switchRequests).map(([id, q]) => {
    const p = own(lobby.players, q.clientId);
    return {
      id,
      name: p ? p.name : '?',
      to: q.to,
      approvals: q.approvals.length,
      needed: onlineMembers(lobby, q.to).filter(c => c !== q.clientId).length,
      youApproved: q.approvals.includes(clientId),
      yours: q.clientId === clientId
    };
  }).filter(r => r.yours || r.to === myTeam);

  const isOwner = lobby.owner === clientId;
  v.banned = isOwner
    ? Object.entries(lobby.banned).map(([cid, name]) => ({ pid: pidOf(cid), name }))
    : [];

  v.you = {
    name: me ? me.name : '',
    team: myTeam,
    formerTeam: own(lobby.formerTeams, clientId) || null,
    notes: me ? (me.notes || '') : '',   // private — only ever sent to its owner
    isOwner,
    lobby: { id: lobby.id, name: lobby.name }
  };
  return v;
}

function broadcast() {
  for (const [res, cid] of sseClients) {
    try { res.write(`data: ${JSON.stringify(viewFor(cid))}\n\n`); }
    catch (e) { sseClients.delete(res); }
  }
}

// ---------- actions ----------
function handleAction(clientId, body) {
  const type = body.type;
  const lobby = own(state.lobbies, own(state.clientLobby, clientId)) || null;
  const me = lobby ? own(lobby.players, clientId) || null : null;
  const myTeam = (me && me.team) || null;
  const cur = lobby ? lobby.rounds[lobby.rounds.length - 1] : null;
  const err = m => ({ error: m });
  const needTeam = () => (lobby && myTeam ? null : err('Join a team first'));
  const digitalOnly = () => (lobby && lobby.mode === 'physical' ? err('Not used in physical-cards mode') : null);
  const notRevealed = tr => (tr.revealed ? err('This round is already revealed') : null);

  switch (type) {
    case 'createLobby': {
      const name = text(body.name, 30).trim();
      if (!name) return err('Give the lobby a name');
      if (Object.keys(state.lobbies).length >= MAX_LOBBIES) return err('Too many lobbies — delete an old one first');
      const l = blankLobby(name, body.mode === 'physical' ? 'physical' : 'digital');
      l.owner = clientId;
      const tn = body.teamNames && typeof body.teamNames === 'object' ? body.teamNames : {};
      l.teamNames.white = text(tn.white, 20).trim();
      l.teamNames.black = text(tn.black, 20).trim();
      state.lobbies[l.id] = l;
      state.clientLobby[clientId] = l.id;
      break;
    }
    case 'enterLobby': {
      const target = own(state.lobbies, body.id);
      if (!target) return err('That lobby no longer exists');
      if (own(target.banned, clientId) !== undefined) return err('You were removed from this lobby by its owner');
      state.clientLobby[clientId] = target.id;
      break;
    }
    case 'leaveLobby': {
      if (lobby) dropPlayer(lobby, clientId);
      delete state.clientLobby[clientId];
      break;
    }
    case 'deleteLobby': {
      const l = own(state.lobbies, body.id);
      if (!l) return err('That lobby no longer exists');
      // empty or ownerless lobbies: anyone may clean up. Otherwise owner only.
      if (Object.keys(l.players).length > 0 && l.owner && l.owner !== clientId) {
        return err('Only the lobby owner can delete a lobby that has players');
      }
      delete state.lobbies[l.id];
      for (const cid of Object.keys(state.clientLobby)) {
        if (state.clientLobby[cid] === l.id) delete state.clientLobby[cid];
      }
      break;
    }
    case 'join': {
      if (!lobby) return err('Enter a lobby first');
      const name = text(body.name, 24).trim();
      if (!name || !TEAMS.includes(body.team)) return err('Name and team required');
      const former = own(lobby.formerTeams, clientId);
      if (former && former !== body.team) {
        return err(`You were on the ${former} team — rejoin it, then request a switch so the other team can approve`);
      }
      const prev = own(lobby.players, clientId);
      const notes = (prev && prev.notes) || own(lobby.formerNotes, clientId) || '';
      lobby.players[clientId] = { name, team: body.team, notes };
      delete lobby.formerNotes[clientId];
      lobby.formerTeams[clientId] = body.team;
      if (!lobby.owner) lobby.owner = clientId;
      break;
    }
    case 'setName': {
      if (!me) return err('Join first');
      const name = text(body.name, 24).trim();
      if (!name) return err('Name can’t be empty');
      me.name = name;
      break;
    }
    case 'requestSwitch': {
      if (!me) return err('Join first');
      const to = otherTeam(me.team);
      for (const [id, q] of Object.entries(lobby.switchRequests)) {
        if (q.clientId === clientId) delete lobby.switchRequests[id];
      }
      // nobody from the target team online to approve → nothing to hide from
      if (onlineMembers(lobby, to).filter(c => c !== clientId).length === 0) {
        clearEncryptorRoles(lobby, clientId);
        me.team = to;
        lobby.formerTeams[clientId] = to;
        break;
      }
      lobby.switchRequests[rid()] = { clientId, to, approvals: [], at: Date.now() };
      break;
    }
    case 'cancelSwitch': {
      if (!lobby) return err('Enter a lobby first');
      for (const [id, q] of Object.entries(lobby.switchRequests)) {
        if (q.clientId === clientId) delete lobby.switchRequests[id];
      }
      break;
    }
    case 'approveSwitch': {
      const e = needTeam(); if (e) return e;
      const q = own(lobby.switchRequests, body.id);
      if (!q) return err('That request is gone');
      if (q.to !== myTeam) return err('Only the team being joined can approve');
      if (!q.approvals.includes(clientId)) q.approvals.push(clientId);
      const stillNeeded = onlineMembers(lobby, q.to)
        .filter(c => c !== q.clientId && !q.approvals.includes(c));
      if (stillNeeded.length === 0) {
        const p = own(lobby.players, q.clientId);
        if (p) {
          clearEncryptorRoles(lobby, q.clientId);
          p.team = q.to;
          lobby.formerTeams[q.clientId] = q.to;
        }
        delete lobby.switchRequests[body.id];
      }
      break;
    }
    case 'denySwitch': {
      const e = needTeam(); if (e) return e;
      const q = own(lobby.switchRequests, body.id);
      if (!q) return err('That request is gone');
      if (q.to !== myTeam) return err('Only the team being joined can deny');
      delete lobby.switchRequests[body.id];
      break;
    }
    case 'newGame': {
      if (!lobby) return err('Enter a lobby first');
      if (lobby.owner && lobby.owner !== clientId) return err('Only the lobby owner can start a new game');
      lobby.teams = { white: blankTeam(), black: blankTeam() };
      lobby.rounds = [blankRound()];
      lobby.tokens = blankTokens();
      lobby.timers = { white: null, black: null };
      // fresh words = nothing to protect anymore
      lobby.switchRequests = {};
      lobby.formerTeams = {};
      for (const cid of Object.keys(lobby.players)) {
        lobby.formerTeams[cid] = lobby.players[cid].team;
      }
      break;
    }
    case 'nextRound': {
      const e = needTeam(); if (e) return e;
      if (lobby.mode !== 'physical' && !TEAMS.every(t => cur[t].revealed)) {
        return err('Both teams must reveal first');
      }
      lobby.rounds.push(blankRound());
      lobby.timers = { white: null, black: null };
      break;
    }
    case 'claimEncryptor': {
      const e = needTeam() || digitalOnly() || notRevealed(cur[myTeam]); if (e) return e;
      cur[myTeam].encryptor = clientId;
      break;
    }
    case 'drawCode': {
      const e = needTeam() || digitalOnly(); if (e) return e;
      const tr = cur[myTeam];
      if (tr.encryptor !== clientId) return err('Only the encryptor handles the code');
      if (tr.revealed) return err('Round already revealed');
      tr.code = drawCode();
      break;
    }
    case 'setCode': {
      // digital-mode encryptor only; physical codes go through submitClues
      const e = needTeam() || digitalOnly(); if (e) return e;
      const tr = cur[myTeam];
      if (tr.encryptor !== clientId) return err('Only the encryptor handles the code');
      const e2 = notRevealed(tr); if (e2) return e2;
      const c = codeArg(body.code); if (c.error) return err(c.error);
      tr.code = c.code;
      break;
    }
    case 'setOwnGuess': {
      const e = needTeam() || digitalOnly() || notRevealed(cur[myTeam]); if (e) return e;
      const c = codeArg(body.code); if (c.error) return err(c.error);
      cur[myTeam].ownGuess = c.code;
      break;
    }
    case 'setInterceptGuess': {
      const opp = myTeam && otherTeam(myTeam);
      const e = needTeam() || digitalOnly() || notRevealed(cur[opp]); if (e) return e;
      const c = codeArg(body.code); if (c.error) return err(c.error);
      cur[opp].interceptGuess = c.code;
      break;
    }
    case 'reveal': {
      const e = needTeam() || digitalOnly(); if (e) return e;
      const tr = cur[myTeam];
      if (tr.encryptor && tr.encryptor !== clientId) return err('Only the encryptor can reveal');
      const full = validCode(tr.code, false);
      if (!full) return err('The encryptor must set a full 3-digit code first');
      tr.code = full;
      tr.revealed = true;
      break;
    }
    case 'submitClues': {
      const e = needTeam(); if (e) return e;
      const isPhys = lobby.mode === 'physical';
      // physical: anyone records either team's spoken clues; digital: your own only
      const team = isPhys && TEAMS.includes(body.team) ? body.team : myTeam;
      const tr = cur[team];
      if (!isPhys) {
        const e2 = notRevealed(tr); if (e2) return e2;
        if (tr.encryptor !== clientId) return err('Only the encryptor gives the clues');
      }
      let code;
      if (isPhys && body.code !== undefined) {
        const c = codeArg(body.code); if (c.error) return err(c.error);
        code = c.code;
      }
      const clues = Array.isArray(body.clues) ? body.clues : [];
      for (let i = 0; i < 3; i++) tr.clues[i] = text(clues[i], 80).trim();
      if (isPhys && body.code !== undefined) tr.code = code;
      break;
    }
    case 'startTimer': {
      const e = needTeam(); if (e) return e;
      const target = otherTeam(myTeam);
      if (lobby.timers[target]) return err('A timer is already running on them');
      lobby.timers[target] = { endsAt: Date.now() + TIMER_MS, startedBy: me.name };
      break;
    }
    case 'stopTimer': {
      const e = needTeam(); if (e) return e;
      if (!TEAMS.includes(body.team)) return err('Bad team');
      const timer = lobby.timers[body.team];
      if (!timer) break;
      // before it rings: only the team that started it may cancel.
      // once it rings: anyone can silence it.
      if (Date.now() < timer.endsAt && myTeam === body.team) {
        return err('Only the team that started the timer can stop it early');
      }
      lobby.timers[body.team] = null;
      break;
    }
    case 'setTeamName': {
      const e = needTeam(); if (e) return e;
      if (!TEAMS.includes(body.team)) return err('Bad team');
      if (body.team !== myTeam && lobby.owner !== clientId) {
        return err('You can only rename your own team');
      }
      lobby.teamNames[body.team] = text(body.name, 20).trim();
      break;
    }
    case 'kickPlayer': {
      if (!lobby) return err('Enter a lobby first');
      if (lobby.owner !== clientId) return err('Only the lobby owner can kick players');
      const target = Object.keys(lobby.players).find(cid => pidOf(cid) === body.pid);
      if (!target) return err('Player not found');
      if (target === clientId) return err("You can't kick yourself");
      lobby.banned[target] = lobby.players[target].name;
      dropPlayer(lobby, target);
      delete state.clientLobby[target];
      break;
    }
    case 'unbanPlayer': {
      if (!lobby) return err('Enter a lobby first');
      if (lobby.owner !== clientId) return err('Only the lobby owner can let players back in');
      const target = Object.keys(lobby.banned).find(cid => pidOf(cid) === body.pid);
      if (!target) return err('Player not found');
      delete lobby.banned[target];
      break;
    }
    case 'setMyNotes': {
      if (!me) return err('Join first');
      me.notes = text(body.text, 4000);
      break;
    }
    case 'adjustToken': {
      const e = needTeam(); if (e) return e;
      if (lobby.mode !== 'physical') return err('Tokens are scored automatically in app-codes mode');
      const t = TEAMS.includes(body.team) ? body.team : null;
      const kind = body.kind === 'int' || body.kind === 'mis' ? body.kind : null;
      if (!t || !kind) return err('Bad token');
      const d = Number(body.delta) > 0 ? 1 : -1;
      lobby.tokens[t][kind] = Math.max(0, Math.min(9, lobby.tokens[t][kind] + d));
      break;
    }
    case 'setKeyword': {
      const e = needTeam(); if (e) return e;
      const slot = Number(body.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot > 3) return err('Bad slot');
      lobby.teams[myTeam].keywords[slot] = text(body.text, 40);
      break;
    }
    case 'setOppGuess': {
      const e = needTeam(); if (e) return e;
      const slot = Number(body.slot);
      if (!Number.isInteger(slot) || slot < 0 || slot > 3) return err('Bad slot');
      lobby.teams[myTeam].oppGuesses[slot] = text(body.text, 40);
      break;
    }
    case 'setNotes': {
      const e = needTeam(); if (e) return e;
      lobby.teams[myTeam].notes = text(body.text, 4000);
      break;
    }
    default:
      return err('Unknown action');
  }
  for (const l of [lobby, own(state.lobbies, own(state.clientLobby, clientId))]) {
    if (l && own(state.lobbies, l.id)) l.lastActive = Date.now();
  }
  save();
  broadcast();
  return { ok: true };
}

function pruneIdleLobbies() {
  const cutoff = Date.now() - LOBBY_TTL_MS;
  const stale = Object.values(state.lobbies).filter(l => l.lastActive < cutoff).map(l => l.id);
  if (!stale.length) return;
  for (const lid of stale) delete state.lobbies[lid];
  for (const [cid, lid] of Object.entries(state.clientLobby)) {
    if (stale.includes(lid)) delete state.clientLobby[cid];
  }
  console.log(`Auto-deleted ${stale.length} idle lobb${stale.length === 1 ? 'y' : 'ies'}`);
  save();
  broadcast();
}
pruneIdleLobbies();
setInterval(pruneIdleLobbies, PRUNE_EVERY_MS);

// ---------- http server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
};
// text files go out gzipped (viz.js bundles three.js: ~540 KB raw, ~140 KB
// gzipped), compressed once per file version
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json']);
const gzipCache = new Map();
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  let url;
  try { url = new URL(req.url, 'http://x'); }
  catch (e) { res.writeHead(400); res.end(); return; }

  if (url.pathname === '/events') {
    const raw = url.searchParams.get('clientId') || '';
    const clientId = CLIENT_ID_RE.test(raw) ? raw : '';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('retry: 2000\n\n');
    sseClients.set(res, clientId);
    res.write(`data: ${JSON.stringify(viewFor(clientId))}\n\n`);
    broadcast(); // others see this player come online
    req.on('close', () => { sseClients.delete(res); broadcast(); });
    return;
  }

  if (url.pathname === '/api/action') {
    if (req.method !== 'POST') { sendJson(res, 405, { error: 'POST only' }); return; }
    let raw = '';
    let tooBig = false;
    req.setEncoding('utf8');
    req.on('data', c => {
      raw += c;
      if (raw.length > 64 * 1024) { tooBig = true; raw = ''; }
    });
    req.on('end', () => {
      if (tooBig) { sendJson(res, 413, { error: 'Request too large' }); return; }
      let body;
      try { body = JSON.parse(raw); } catch (e) { body = null; }
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        sendJson(res, 400, { error: 'Bad request' });
        return;
      }
      if (typeof body.clientId !== 'string' || !CLIENT_ID_RE.test(body.clientId)) {
        sendJson(res, 400, { error: 'Bad client id' });
        return;
      }
      let result;
      try { result = handleAction(body.clientId, body); }
      catch (e) {
        console.error('action failed:', body.type, e);
        sendJson(res, 500, { error: 'Server error' });
        return;
      }
      sendJson(res, result.error ? 400 : 200, result);
    });
    return;
  }

  // static files
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  try { file = decodeURIComponent(file); } catch (e) { res.writeHead(400); res.end(); return; }
  const full = path.join(PUB, path.normalize(file));
  if (!full.startsWith(PUB + path.sep)) { res.writeHead(403); res.end(); return; }
  const notFound = () => { res.writeHead(404, SECURITY_HEADERS); res.end('not found'); };
  fs.stat(full, (e, st) => {
    if (e || !st.isFile()) { notFound(); return; }
    // no-cache + ETag: phones revalidate every load but only re-download changes
    const etag = `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const ext = path.extname(full);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'ETag': etag,
      ...SECURITY_HEADERS
    };
    if (COMPRESSIBLE.has(ext)) headers['Vary'] = 'Accept-Encoding';
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return; }
    fs.readFile(full, (e2, data) => {
      if (e2) { notFound(); return; }
      if (COMPRESSIBLE.has(ext) && data.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        let c = gzipCache.get(full);
        if (!c || c.etag !== etag) {
          c = { etag, gz: zlib.gzipSync(data, { level: 9 }) };
          gzipCache.set(full, c);
        }
        data = c.gz;
        headers['Content-Encoding'] = 'gzip';
      }
      headers['Content-Length'] = data.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

// Node closes idle keep-alive sockets after 5s by default; a browser (or the
// Cloudflare tunnel) reusing one at that instant gets ECONNRESET and the
// player's action is silently dropped. Outlast the clients' own idle timers.
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// SSE keep-alive ping
setInterval(() => {
  for (const [res] of sseClients) {
    try { res.write(': ping\n\n'); } catch (e) { sseClients.delete(res); }
  }
}, 25000);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  DECRYPNOTO is running.\n');
  console.log(`  On this PC:   http://localhost:${PORT}`);
  if (fs.existsSync('/.dockerenv')) {
    console.log(`  Running in Docker — friends join via the PC's LAN IP, e.g. http://<pc-ip>:${PORT}`);
    console.log(`  (find it on the host with: ipconfig | findstr IPv4)`);
  } else {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`  Friends join: http://${net.address}:${PORT}   (${name})`);
        }
      }
    }
  }
  console.log('\n  Everyone must be on the same Wi-Fi as this PC.\n');
});

module.exports = { server };
