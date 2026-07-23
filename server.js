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

const PORT = process.env.PORT || 4321;
const PUB = path.join(__dirname, 'public');
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'game-state.json');
const TEAMS = ['white', 'black'];

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
function rid() { return Math.random().toString(36).slice(2, 8); }
function blankTokens() {
  return { white: { int: 0, mis: 0 }, black: { int: 0, mis: 0 } };
}
function blankLobby(name, mode) {
  return {
    id: rid(),
    name,
    mode,                       // 'digital' (app draws/hides codes) | 'physical' (real cards, pure notes)
    createdAt: Date.now(),
    players: {},                // clientId -> {name, team}
    teams: { white: blankTeam(), black: blankTeam() },
    teamNames: { white: '', black: '' },  // custom display names, '' = default
    rounds: [blankRound()],
    tokens: blankTokens(),      // manual counters, used in physical mode only
    switchRequests: {},         // requestId -> {clientId, to, approvals: [clientId]}
    formerTeams: {},            // clientId -> last team, blocks leave-and-rejoin cheating
    timers: { white: null, black: null }  // pressure timers, keyed by the team being timed
  };
}

let state = { lobbies: {}, clientLobby: {} };
try {
  if (fs.existsSync(STATE_FILE)) {
    const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (loaded && loaded.lobbies) state = loaded;
  }
} catch (e) {
  console.error('Could not load saved state, starting fresh:', e.message);
}
for (const l of Object.values(state.lobbies)) {
  if (!l.mode) l.mode = 'digital';
  if (!l.tokens) l.tokens = blankTokens();
  if (!l.switchRequests) l.switchRequests = {};
  if (!l.formerTeams) l.formerTeams = {};
  if (!l.teamNames) l.teamNames = { white: '', black: '' };
  if (!l.timers) l.timers = { white: null, black: null };
}

function save() {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); }
  catch (e) { console.error('save failed:', e.message); }
}

// ---------- helpers ----------
const otherTeam = t => (t === 'white' ? 'black' : 'white');

function validCode(arr, allowPartial) {
  if (!Array.isArray(arr) || arr.length !== 3) return null;
  const out = arr.map(d => {
    if (d === null || d === undefined || d === '') return null;
    const n = Number(d);
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : NaN;
  });
  if (out.some(Number.isNaN)) return null;
  if (!allowPartial && out.some(d => d === null)) return null;
  if (out.every(d => d === null)) return null;
  return out;
}

function drawCode() {
  const digits = [1, 2, 3, 4];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, 3);
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

function lobbySummaries() {
  const onlineIds = new Set(sseClients.values());
  return Object.values(state.lobbies).map(l => ({
    id: l.id,
    name: l.name,
    mode: l.mode,
    createdAt: l.createdAt,
    round: l.rounds.length,
    players: Object.entries(l.players).map(([id, p]) => ({
      name: p.name, team: p.team,
      online: onlineIds.has(id) && state.clientLobby[id] === l.id
    }))
  })).sort((a, b) => b.createdAt - a.createdAt);
}

function viewFor(clientId) {
  const lobbies = lobbySummaries();
  const lobbyId = state.clientLobby[clientId];
  const lobby = state.lobbies[lobbyId] || null;
  if (!lobby) {
    return { lobbies, you: { name: '', team: null, lobby: null } };
  }

  const me = lobby.players[clientId] || null;
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
      tm.keywords = tm.keywords.map(k => (k ? 'hidden' : ''));
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
      tr.encryptorName = enc && lobby.players[enc] ? lobby.players[enc].name : null;
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
    you: id === clientId
  }));
  // pending team-switch requests: visible to the requester and the team
  // that has to approve (never leak requester clientIds — they're identity)
  v.switchRequests = Object.entries(lobby.switchRequests).map(([id, q]) => {
    const p = lobby.players[q.clientId];
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

  v.you = {
    name: me ? me.name : '',
    team: myTeam,
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
  const lobbyId = state.clientLobby[clientId];
  const lobby = state.lobbies[lobbyId] || null;
  const me = lobby ? lobby.players[clientId] : null;
  const myTeam = (me && me.team) || null;
  const cur = lobby ? lobby.rounds[lobby.rounds.length - 1] : null;
  const err = m => ({ error: m });
  const needTeam = () => (lobby && myTeam ? null : err('Join a team first'));
  const digitalOnly = () => (lobby && lobby.mode === 'physical' ? err('Not used in physical-cards mode') : null);
  const text = (s, max) => String(s == null ? '' : s).slice(0, max);

  switch (type) {
    case 'createLobby': {
      const name = text(body.name, 30).trim();
      if (!name) return err('Give the lobby a name');
      const l = blankLobby(name, body.mode === 'physical' ? 'physical' : 'digital');
      const tn = body.teamNames || {};
      l.teamNames.white = text(tn.white, 20).trim();
      l.teamNames.black = text(tn.black, 20).trim();
      state.lobbies[l.id] = l;
      state.clientLobby[clientId] = l.id;
      break;
    }
    case 'enterLobby': {
      if (!state.lobbies[body.id]) return err('That lobby no longer exists');
      state.clientLobby[clientId] = body.id;
      break;
    }
    case 'leaveLobby': {
      if (lobby) {
        if (me) lobby.formerTeams[clientId] = me.team;
        delete lobby.players[clientId];
        for (const [id, q] of Object.entries(lobby.switchRequests)) {
          if (q.clientId === clientId) delete lobby.switchRequests[id];
        }
      }
      delete state.clientLobby[clientId];
      break;
    }
    case 'deleteLobby': {
      const l = state.lobbies[body.id];
      if (!l) return err('That lobby no longer exists');
      delete state.lobbies[body.id];
      for (const cid of Object.keys(state.clientLobby)) {
        if (state.clientLobby[cid] === body.id) delete state.clientLobby[cid];
      }
      break;
    }
    case 'join': {
      if (!lobby) return err('Enter a lobby first');
      const name = text(body.name, 24).trim();
      if (!name || !TEAMS.includes(body.team)) return err('Name and team required');
      const former = lobby.formerTeams[clientId];
      if (former && former !== body.team) {
        return err(`You were on the ${former} team — rejoin it, then request a switch so the other team can approve`);
      }
      lobby.players[clientId] = { name, team: body.team };
      lobby.formerTeams[clientId] = body.team;
      break;
    }
    case 'setName': {
      if (!me) return err('Join first');
      const name = text(body.name, 24).trim();
      if (name) me.name = name;
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
        me.team = to;
        lobby.formerTeams[clientId] = to;
        break;
      }
      lobby.switchRequests[rid()] = { clientId, to, approvals: [], at: Date.now() };
      break;
    }
    case 'cancelSwitch': {
      for (const [id, q] of Object.entries(lobby ? lobby.switchRequests : {})) {
        if (q.clientId === clientId) delete lobby.switchRequests[id];
      }
      break;
    }
    case 'approveSwitch': {
      const e = needTeam(); if (e) return e;
      const q = lobby.switchRequests[body.id];
      if (!q) return err('That request is gone');
      if (q.to !== myTeam) return err('Only the team being joined can approve');
      if (!q.approvals.includes(clientId)) q.approvals.push(clientId);
      const stillNeeded = onlineMembers(lobby, q.to)
        .filter(c => c !== q.clientId && !q.approvals.includes(c));
      if (stillNeeded.length === 0) {
        const p = lobby.players[q.clientId];
        if (p) { p.team = q.to; lobby.formerTeams[q.clientId] = q.to; }
        delete lobby.switchRequests[body.id];
      }
      break;
    }
    case 'denySwitch': {
      const e = needTeam(); if (e) return e;
      const q = lobby.switchRequests[body.id];
      if (!q) return err('That request is gone');
      if (q.to !== myTeam) return err('Only the team being joined can deny');
      delete lobby.switchRequests[body.id];
      break;
    }
    case 'newGame': {
      if (!lobby) return err('Enter a lobby first');
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
      const e = needTeam() || digitalOnly(); if (e) return e;
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
      const e = needTeam(); if (e) return e;
      if (lobby.mode === 'physical') {
        // anyone at the table can record either team's revealed card
        const t = TEAMS.includes(body.team) ? body.team : myTeam;
        cur[t].code = validCode(body.code, true);
        break;
      }
      const tr = cur[myTeam];
      if (tr.encryptor !== clientId) return err('Only the encryptor handles the code');
      tr.code = validCode(body.code, true);
      break;
    }
    case 'setClue': {
      const e = needTeam(); if (e) return e;
      const i = body.index | 0;
      if (i < 0 || i > 2) return err('Bad clue index');
      // physical mode: anyone types what was said aloud, for either team
      const t = lobby.mode === 'physical' && TEAMS.includes(body.team) ? body.team : myTeam;
      cur[t].clues[i] = text(body.text, 80);
      break;
    }
    case 'setOwnGuess': {
      const e = needTeam() || digitalOnly(); if (e) return e;
      cur[myTeam].ownGuess = validCode(body.code, true);
      break;
    }
    case 'setInterceptGuess': {
      const e = needTeam() || digitalOnly(); if (e) return e;
      cur[otherTeam(myTeam)].interceptGuess = validCode(body.code, true);
      break;
    }
    case 'reveal': {
      const e = needTeam() || digitalOnly(); if (e) return e;
      const tr = cur[myTeam];
      const full = validCode(tr.code, false);
      if (!full) return err('The encryptor must set a full 3-digit code first');
      tr.code = full;
      tr.revealed = true;
      break;
    }
    case 'startTimer': {
      const e = needTeam(); if (e) return e;
      const target = otherTeam(myTeam);
      if (lobby.timers[target]) return err('A timer is already running on them');
      lobby.timers[target] = { endsAt: Date.now() + 60000, startedBy: me.name };
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
      lobby.teamNames[body.team] = text(body.name, 20).trim();
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
      const slot = body.slot | 0;
      if (slot < 0 || slot > 3) return err('Bad slot');
      lobby.teams[myTeam].keywords[slot] = text(body.text, 40);
      break;
    }
    case 'setOppGuess': {
      const e = needTeam(); if (e) return e;
      const slot = body.slot | 0;
      if (slot < 0 || slot > 3) return err('Bad slot');
      lobby.teams[myTeam].oppGuesses[slot] = text(body.text, 40);
      break;
    }
    case 'setNotes': {
      const e = needTeam(); if (e) return e;
      lobby.teams[myTeam].notes = text(body.text, 4000);
      break;
    }
    default:
      return err('Unknown action: ' + type);
  }
  save();
  broadcast();
  return { ok: true };
}

// ---------- http server ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname === '/events') {
    const clientId = url.searchParams.get('clientId') || '';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('retry: 2000\n\n');
    sseClients.set(res, clientId);
    res.write(`data: ${JSON.stringify(viewFor(clientId))}\n\n`);
    broadcast(); // others see this player come online
    req.on('close', () => { sseClients.delete(res); broadcast(); });
    return;
  }

  if (url.pathname === '/api/action' && req.method === 'POST') {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 64 * 1024) req.destroy(); });
    req.on('end', () => {
      let body;
      try { body = JSON.parse(raw); }
      catch (e) { res.writeHead(400); res.end('{"error":"bad json"}'); return; }
      const result = handleAction(String(body.clientId || ''), body);
      res.writeHead(result.error ? 400 : 200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    });
    return;
  }

  // static files
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  file = path.normalize(file).replace(/^([.][.][\\/])+/, '');
  const full = path.join(PUB, file);
  if (!full.startsWith(PUB)) { res.writeHead(403); res.end(); return; }
  fs.readFile(full, (e, data) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream' });
    res.end(data);
  });
});

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
