'use strict';
/*
 * End-to-end tests for Decrypnoto. Zero dependencies.
 *   node test/e2e.js
 * Boots a real server on a random port with a throwaway state file, drives it
 * over HTTP + Server-Sent Events as several simultaneous players, then loads
 * the browser client in a sandbox to test its draft-merge and scoring logic.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'decrypnoto-e2e-'));
const STATE_FILE = path.join(TMP, 'state.json');
const PORT = 20000 + Math.floor(Math.random() * 20000);
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0, section = '';
const failures = [];
function check(label, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(`[${section}] ${label}${detail !== undefined ? ' — ' + JSON.stringify(detail) : ''}`);
  console.log(`  ✗ ${label}`);
}
function group(name) { section = name; console.log(`• ${name}`); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const id = tag => `${tag}-${crypto.randomBytes(6).toString('hex')}`;

// ---------- server lifecycle ----------
let proc = null;
async function startServer() {
  proc = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: { ...process.env, PORT: String(PORT), STATE_FILE },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  proc.stderrText = '';
  proc.stderr.on('data', d => { proc.stderrText += d; });
  for (let i = 0; i < 100; i++) {
    try { await fetch(BASE + '/'); return; } catch (e) { await sleep(50); }
  }
  throw new Error('server did not start');
}
async function stopServer() {
  if (!proc) return;
  const p = proc;
  proc = null;
  await new Promise(r => { p.once('exit', r); p.kill(); });
}

// ---------- players ----------
async function act(clientId, type, extra = {}) {
  const r = await fetch(BASE + '/api/action', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId, type, ...extra })
  });
  let body = {};
  try { body = await r.json(); } catch (e) {}
  return { status: r.status, ...body };
}

// A player holding a live SSE connection — counts as "online", sees every push
class Player {
  constructor(tag) { this.id = id(tag); this.view = null; this.ctrl = null; this.frames = 0; }
  async connect() {
    this.view = null;   // never let a reconnect read the pre-disconnect view
    this.ctrl = new AbortController();
    const res = await fetch(`${BASE}/events?clientId=${this.id}`, { signal: this.ctrl.signal });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const frame = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = frame.split('\n').find(l => l.startsWith('data: '));
            if (line) {
              const v = JSON.parse(line.slice(6));
              if (v.rounds) v.round = v.rounds[v.rounds.length - 1];
              this.view = v;
              this.frames++;
            }
          }
        }
      } catch (e) {}
    })();
    await this.waitFor(v => v && v.you);
    return this;
  }
  disconnect() { if (this.ctrl) this.ctrl.abort(); this.ctrl = null; }
  do(type, extra) { return act(this.id, type, extra); }
  async waitFor(pred, ms = 2000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      try { if (pred(this.view)) return this.view; } catch (e) {}
      await sleep(15);
    }
    return this.view;
  }
  // wait until a push newer than now has arrived (after an action by someone else)
  async fresh() { const n = this.frames; await this.waitFor(() => this.frames > n, 1000); return this.view; }
}

async function lobbyWith(opts = {}) {
  const owner = await new Player('own').connect();
  await owner.do('createLobby', { name: opts.name || 'Test', mode: opts.mode || 'physical', teamNames: opts.teamNames });
  const v = await owner.waitFor(x => x.you.lobby);
  await owner.do('join', { name: 'Owner', team: 'white' });
  const lid = v.you.lobby.id;
  const players = { owner };
  for (const [tag, team] of opts.others || []) {
    const p = await new Player(tag).connect();
    await p.do('enterLobby', { id: lid });
    const r = await p.do('join', { name: tag, team });
    if (!r.ok) throw new Error('join failed ' + JSON.stringify(r));
    players[tag] = p;
  }
  for (const p of Object.values(players)) await p.waitFor(x => x.players && x.players.length === 1 + (opts.others || []).length);
  return { lid, ...players };
}
async function destroy(ctx) {
  await ctx.owner.do('deleteLobby', { id: ctx.lid });
  for (const p of Object.values(ctx)) if (p instanceof Player) p.disconnect();
}

// ================================================================
async function httpAndSecurity() {
  group('HTTP, headers & hardening');
  const home = await fetch(BASE + '/');
  const html = await home.text();
  check('serves index.html', home.status === 200 && html.includes('<script src="app.js">'));
  check('CSP header set', (home.headers.get('content-security-policy') || '').includes("default-src 'self'"));
  check('nosniff header set', home.headers.get('x-content-type-options') === 'nosniff');
  check('frame-ancestors / X-Frame-Options', home.headers.get('x-frame-options') === 'DENY');
  check('app.js served as JS', (await fetch(BASE + '/app.js')).headers.get('content-type').startsWith('text/javascript'));
  check('style.css served as CSS', (await fetch(BASE + '/style.css')).headers.get('content-type').startsWith('text/css'));
  check('unknown file 404', (await fetch(BASE + '/nope.js')).status === 404);
  for (const p of ['/../server.js', '/%2e%2e/server.js', '/..%2fserver.js', '/%2e%2e%2f%2e%2e%2fetc%2fpasswd', '/public/../../server.js']) {
    const r = await fetch(BASE + p);
    const body = await r.text();
    check(`path traversal blocked: ${p}`, r.status !== 200 || !body.includes('handleAction'), r.status);
  }
  check('GET /api/action → 405', (await fetch(BASE + '/api/action')).status === 405);
  const post = body => fetch(BASE + '/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  check('invalid JSON → 400', (await post('{nope')).status === 400);
  check('null body → 400 (used to crash)', (await post('null')).status === 400);
  check('array body → 400', (await post('[]')).status === 400);
  check('string body → 400', (await post('"hi"')).status === 400);
  check('missing clientId → 400', (await post('{"type":"createLobby","name":"x"}')).status === 400);
  check('short clientId → 400', (await post('{"clientId":"abc","type":"createLobby","name":"x"}')).status === 400);
  check('weird clientId → 400', (await post('{"clientId":"__proto__","type":"createLobby","name":"x"}')).status === 400);
  const big = await post(JSON.stringify({ clientId: id('big'), type: 'setNotes', text: 'x'.repeat(70000) }));
  check('oversized body → 413', big.status === 413);
  check('unknown action → 400', (await act(id('u'), 'launchMissiles')).status === 400);

  const evil = id('evil');
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    check(`enterLobby("${key}") rejected`, !!(await act(evil, 'enterLobby', { id: key })).error);
    check(`deleteLobby("${key}") rejected`, !!(await act(evil, 'deleteLobby', { id: key })).error);
  }
  check('server still alive after prototype attacks', (await fetch(BASE + '/')).status === 200);
  const ctx = await lobbyWith({ others: [['b', 'black']] });
  for (const key of ['__proto__', 'constructor']) {
    check(`approveSwitch("${key}") rejected`, !!(await ctx.b.do('approveSwitch', { id: key })).error);
    check(`kickPlayer pid "${key}" rejected`, !!(await ctx.owner.do('kickPlayer', { pid: key })).error);
  }
  check('server still alive', (await fetch(BASE + '/')).status === 200);
  await destroy(ctx);
}

async function lobbies() {
  group('Lobbies, joining & ownership');
  const a = await new Player('a').connect();
  const b = await new Player('b').connect();
  check('new player sees no lobby', a.view.you.lobby === null);
  check('empty lobby name rejected', !!(await a.do('createLobby', { name: '   ' })).error);
  check('create lobby', (await a.do('createLobby', { name: '  Game Night  ', mode: 'physical', teamNames: { white: 'Falcons', black: 'الصقور' } })).ok);
  let va = await a.waitFor(v => v.you.lobby);
  check('creator lands in lobby, name trimmed', va.you.lobby.name === 'Game Night');
  check('team names set at creation', va.teamNames.white === 'Falcons' && va.teamNames.black === 'الصقور');
  check('mode stored', va.mode === 'physical');
  const lid = va.you.lobby.id;
  const vb = await b.waitFor(v => v.lobbies.some(l => l.id === lid));
  check('lobby appears live in others\' list', vb.lobbies.some(l => l.id === lid && l.mode === 'physical'));

  check('join without name rejected', !!(await a.do('join', { name: '', team: 'white' })).error);
  check('join with bad team rejected', !!(await a.do('join', { name: 'A', team: 'green' })).error);
  check('creator joins', (await a.do('join', { name: 'Alice', team: 'white' })).ok);
  va = await a.waitFor(v => v.you.team === 'white');
  check('creator is owner (crown)', va.you.isOwner && va.players.find(p => p.you).owner);

  check('join before entering lobby rejected', !!(await b.do('join', { name: 'Bob', team: 'black' })).error);
  await b.do('enterLobby', { id: lid });
  await b.do('join', { name: 'Bob', team: 'black' });
  va = await a.waitFor(v => v.players.length === 2);
  check('roster updates live for others', va.players.some(p => p.name === 'Bob' && p.team === 'black' && p.online));
  check('non-owner is not owner', !(await b.waitFor(v => v.you.team)).you.isOwner);
  check('lobby list: owner can delete', va.lobbies.find(l => l.id === lid).canDelete === true);
  check('lobby list: non-owner cannot delete populated lobby', b.view.lobbies.find(l => l.id === lid).canDelete === false);
  check('non-owner delete rejected', !!(await b.do('deleteLobby', { id: lid })).error);

  b.disconnect();
  va = await a.waitFor(v => v.players.find(p => p.name === 'Bob' && !p.online));
  check('player shows offline after disconnect', !!va.players.find(p => p.name === 'Bob' && !p.online));
  await b.connect();
  va = await a.waitFor(v => v.players.find(p => p.name === 'Bob' && p.online));
  check('reconnect restores seat + online', !!va.players.find(p => p.name === 'Bob' && p.online) && b.view.you.team === 'black');

  check('setName empty rejected', !!(await b.do('setName', { name: ' ' })).error);
  await b.do('setName', { name: 'Bobby' });
  check('setName updates roster', !!(await a.waitFor(v => v.players.find(p => p.name === 'Bobby'))).players.find(p => p.name === 'Bobby'));

  // ownership handoff
  await a.do('leaveLobby');
  const vb2 = await b.waitFor(v => v.you.isOwner);
  check('crown passes to remaining player when owner leaves', vb2.you.isOwner === true);
  check('ex-owner is back on lobby list', (await a.waitFor(v => !v.you.lobby)).you.lobby === null);
  check('ex-owner can re-enter & rejoin same team', (await a.do('enterLobby', { id: lid })).ok && (await a.do('join', { name: 'Alice', team: 'white' })).ok);
  check('…but is no longer owner', !(await a.waitFor(v => v.you.team)).you.isOwner);

  await b.do('leaveLobby');
  await a.do('leaveLobby');
  const empty = (await a.waitFor(v => v.lobbies.find(l => l.id === lid && l.players.length === 0))).lobbies.find(l => l.id === lid);
  check('empty lobby deletable by anyone', empty && empty.canDelete === true);
  const c = await new Player('c').connect();
  await c.do('enterLobby', { id: lid });
  await c.do('join', { name: 'Cara', team: 'white' });
  check('first joiner of ownerless lobby becomes owner', (await c.waitFor(v => v.you.isOwner)).you.isOwner);
  check('owner deletes lobby', (await c.do('deleteLobby', { id: lid })).ok);
  check('players inside get bounced', (await c.waitFor(v => !v.you.lobby)).you.lobby === null);
  check('deleted lobby gone from lists', !(await a.fresh()).lobbies.some(l => l.id === lid));
  check('entering deleted lobby rejected', !!(await a.do('enterLobby', { id: lid })).error);
  [a, b, c].forEach(p => p.disconnect());
}

async function privacy() {
  group('Team secrets & private notes');
  const ctx = await lobbyWith({ mode: 'digital', others: [['w2', 'white'], ['b1', 'black']] });
  const { owner, w2, b1 } = ctx;
  await owner.do('setKeyword', { slot: 0, text: 'desert' });
  await owner.do('setOppGuess', { slot: 2, text: 'moon?' });
  await owner.do('setNotes', { text: 'they love animals' });
  await owner.do('setMyNotes', { text: 'my private theory' });
  await w2.waitFor(v => v.teams.white.keywords[0] === 'desert');
  check('teammate sees keywords', w2.view.teams.white.keywords[0] === 'desert');
  check('teammate sees team hypotheses', w2.view.teams.white.oppGuesses[2] === 'moon?');
  check('teammate sees team notes', w2.view.teams.white.notes === 'they love animals');
  const vb = await b1.fresh();
  const dump = JSON.stringify(vb);
  check('enemy never receives keywords', !dump.includes('desert'));
  check('enemy never receives hypotheses', !dump.includes('moon?'));
  check('enemy never receives team notes', !dump.includes('they love animals'));
  check('enemy keyword slots blank (not even "filled" markers)', vb.teams.white.keywords.every(k => k === ''));
  check('private notes returned to their writer', (await owner.waitFor(v => v.you.notes)).you.notes === 'my private theory');
  check('private notes never sent to teammate', !JSON.stringify(w2.view).includes('my private theory'));
  check('private notes never sent to enemy', !JSON.stringify(b1.view).includes('my private theory'));
  check('lobby list never leaks notes', !JSON.stringify(b1.view.lobbies).includes('theory'));

  await owner.do('leaveLobby');
  await owner.do('enterLobby', { id: ctx.lid });
  await owner.do('join', { name: 'Owner', team: 'white' });
  check('private notes survive leave + rejoin', (await owner.waitFor(v => v.you.notes === 'my private theory')).you.notes === 'my private theory');
  check('non-member cannot set notes', !!(await act(id('x'), 'setMyNotes', { text: 'hi' })).error);
  await destroy(ctx);
}

async function digitalGame() {
  group('App-codes mode: encryptor, secrecy, reveal, immutability');
  const ctx = await lobbyWith({ mode: 'digital', others: [['w2', 'white'], ['b1', 'black'], ['b2', 'black']] });
  const { owner: enc, w2, b1, b2 } = ctx;

  check('clues need an encryptor first', !!(await enc.do('submitClues', { clues: ['a', 'b', 'c'] })).error);
  check('non-encryptor cannot draw', !!(await enc.do('drawCode')).error);
  check('claim encryptor', (await enc.do('claimEncryptor')).ok);
  check('draw code', (await enc.do('drawCode')).ok);
  const code = (await enc.waitFor(v => Array.isArray(v.round.white.code))).round.white.code;
  check('drawn code = 3 distinct digits 1-4', code.length === 3 && new Set(code).size === 3 && code.every(d => d >= 1 && d <= 4), code);
  check('teammate sees code as hidden', (await w2.fresh()).rounds[0].white.code === 'hidden');
  check('enemy sees code as hidden', b1.view.rounds[0].white.code === 'hidden');
  check('encryptor name visible', w2.view.rounds[0].white.encryptorName === 'Owner');

  check('setCode rejects repeated digits', !!(await enc.do('setCode', { code: [1, 1, 2] })).error);
  check('…and keeps the existing code', (await enc.fresh()).round.white.code.join() === code.join());
  check('guess with repeated digits rejected', !!(await w2.do('setOwnGuess', { code: [3, 3, 1] })).error);
  await enc.do('setCode', { code: [4, 2, 1] });
  check('teammate cannot set code', !!(await w2.do('setCode', { code: [1, 2, 3] })).error);
  check('teammate cannot submit clues', !!(await w2.do('submitClues', { clues: ['x', 'y', 'z'] })).error);
  check('encryptor submits clues', (await enc.do('submitClues', { clues: [' oasis ', 'engine', 'honey'] })).ok);
  const vb1 = await b1.waitFor(v => v.rounds[0].white.clues[0] === 'oasis');
  check('clues visible live to enemy (spoken aloud) & trimmed', vb1.rounds[0].white.clues.join() === 'oasis,engine,honey');

  await w2.do('setOwnGuess', { code: [4, 2, 1] });
  await b1.do('setInterceptGuess', { code: [1, 2, 3] });
  check('own guess shared with team', (await enc.waitFor(v => Array.isArray(v.round.white.ownGuess))).round.white.ownGuess.join() === '4,2,1');
  check('own guess hidden from enemy', (await b1.fresh()).rounds[0].white.ownGuess === 'hidden');
  check('intercept guess shared with enemy team', (await b2.waitFor(v => Array.isArray(v.rounds[0].white.interceptGuess))).rounds[0].white.interceptGuess.join() === '1,2,3');
  check('intercept guess hidden from guessed team', w2.view.rounds[0].white.interceptGuess === 'hidden');

  check('teammate cannot reveal when encryptor set', !!(await w2.do('reveal')).error);
  check('nextRound blocked before reveals', !!(await enc.do('nextRound')).error);
  check('encryptor reveals', (await enc.do('reveal')).ok);
  const vr = await b1.waitFor(v => v.rounds[0].white.revealed);
  check('after reveal: code visible to all', vr.rounds[0].white.code.join() === '4,2,1');
  check('after reveal: guesses visible to all', vr.rounds[0].white.ownGuess.join() === '4,2,1' && vr.rounds[0].white.interceptGuess.join() === '1,2,3');

  check('code frozen after reveal', !!(await enc.do('setCode', { code: [1, 2, 3] })).error);
  check('own guess frozen after reveal', !!(await w2.do('setOwnGuess', { code: [1, 2, 3] })).error);
  check('intercept frozen after reveal', !!(await b1.do('setInterceptGuess', { code: [4, 2, 1] })).error);
  check('clues frozen after reveal', !!(await enc.do('submitClues', { clues: ['x', 'y', 'z'] })).error);
  check('encryptor role frozen after reveal', !!(await w2.do('claimEncryptor')).error);
  check('physical-only actions rejected', !!(await enc.do('adjustToken', { team: 'white', kind: 'int', delta: 1 })).error);

  // black round, then advance
  await b1.do('claimEncryptor');
  await b1.do('setCode', { code: [2, 3, 4] });
  check('reveal needs full code', (await b1.do('setCode', { code: [2, null, 4] })).ok && !!(await b1.do('reveal')).error);
  await b1.do('setCode', { code: [2, 3, 4] });
  check('takeover moves the role', (await b2.do('claimEncryptor')).ok &&
    (await b1.waitFor(v => v.rounds[0].black.encryptorName === 'b2')).rounds[0].black.encryptorName === 'b2');
  check('old encryptor loses the code view', b1.view.rounds[0].black.code === 'hidden');
  await b2.do('setCode', { code: [2, 3, 4] });
  await b2.do('reveal');
  check('nextRound after both reveals', (await enc.do('nextRound')).ok);
  const v2 = await w2.waitFor(v => v.rounds.length === 2);
  check('round 2 starts clean', v2.rounds[1].white.encryptorName === null && v2.rounds[1].white.clues.join('') === '');
  check('round 1 history kept', v2.rounds[0].white.code.join() === '4,2,1');

  // switching teams drops your encryptor seat
  await enc.do('claimEncryptor');
  await enc.do('drawCode');
  b1.disconnect(); b2.disconnect();
  await enc.waitFor(v => v.players.filter(p => p.team === 'black' && p.online).length === 0);
  check('switch with nobody online on target team is instant', (await enc.do('requestSwitch')).ok &&
    (await enc.waitFor(v => v.you.team === 'black')).you.team === 'black');
  check('switcher no longer holds old team encryptor seat', (await w2.fresh()).round.white.encryptorName === null);
  await destroy(ctx);
}

async function physicalGame() {
  group('Physical-cards mode: shared submit, tokens, rounds');
  const ctx = await lobbyWith({ mode: 'physical', others: [['b1', 'black']] });
  const { owner, b1 } = ctx;
  check('anyone submits enemy clues + code', (await b1.do('submitClues', { team: 'white', clues: ['sand', 'motor', 'bee'], code: [4, 2, 1] })).ok);
  const v = await owner.waitFor(x => x.round.white.clues[0] === 'sand');
  check('submission lands for everyone', v.round.white.clues.join() === 'sand,motor,bee' && v.round.white.code.join() === '4,2,1');
  check('nothing hidden in physical mode', JSON.stringify(b1.view.rounds).indexOf('hidden') === -1);

  check('repeated-digit code rejected', !!(await owner.do('submitClues', { team: 'white', clues: ['sand', 'motor', 'bee'], code: [1, 1, 2] })).error);
  check('…and the good code is kept', (await owner.fresh()).round.white.code.join() === '4,2,1');
  check('out-of-range digit rejected', !!(await owner.do('submitClues', { team: 'white', clues: ['a', 'b', 'c'], code: [5, 1, 2] })).error);
  check('partial code allowed', (await owner.do('submitClues', { team: 'black', clues: ['x', '', ''], code: [3, null, null] })).ok);
  check('blank code clears it', (await owner.do('submitClues', { team: 'black', clues: ['x', '', ''], code: [null, null, null] })).ok &&
    (await owner.waitFor(x => x.round.black.code === null)).round.black.code === null);
  check('omitting code leaves it untouched', (await owner.do('submitClues', { team: 'white', clues: ['sand2', 'motor', 'bee'] })).ok &&
    (await owner.waitFor(x => x.round.white.clues[0] === 'sand2')).round.white.code.join() === '4,2,1');

  const longClue = '🦅'.repeat(100);
  await owner.do('submitClues', { team: 'white', clues: [longClue, 'b', 'c'] });
  const got = (await owner.waitFor(x => x.round.white.clues[0].startsWith('🦅'))).round.white.clues[0];
  check('clue truncated to 80 chars by code point (emoji intact)', Array.from(got).length === 80 && !/[\uD800-\uDBFF]$/.test(got));

  check('digital-only actions rejected', !!(await owner.do('claimEncryptor')).error && !!(await owner.do('setCode', { code: [1, 2, 3] })).error);
  for (let i = 0; i < 12; i++) await owner.do('adjustToken', { team: 'black', kind: 'int', delta: 1 });
  check('token capped at 9', (await owner.waitFor(x => x.tokens.black.int === 9)).tokens.black.int === 9);
  for (let i = 0; i < 12; i++) await b1.do('adjustToken', { team: 'black', kind: 'int', delta: -1 });
  check('token floored at 0', (await owner.waitFor(x => x.tokens.black.int === 0)).tokens.black.int === 0);
  check('bad token kind rejected', !!(await owner.do('adjustToken', { team: 'black', kind: 'gold', delta: 1 })).error);
  check('next round any time', (await b1.do('nextRound')).ok && (await owner.waitFor(x => x.rounds.length === 2)).rounds.length === 2);
  check('keyword slot bounds enforced', !!(await owner.do('setKeyword', { slot: 4, text: 'x' })).error && !!(await owner.do('setKeyword', { slot: 'a', text: 'x' })).error);
  await destroy(ctx);
}

async function switching() {
  group('Team switching approvals');
  const ctx = await lobbyWith({ mode: 'digital', others: [['b1', 'black'], ['b2', 'black']] });
  const { owner, b1, b2 } = ctx;
  await owner.do('requestSwitch');
  const req = (await b1.waitFor(v => v.switchRequests.length)).switchRequests[0];
  check('request visible to target team with needed=2', req && req.needed === 2 && req.name === 'Owner');
  check('requester sees pending, still on white', (await owner.waitFor(v => v.switchRequests.length)).switchRequests[0].yours && owner.view.you.team === 'white');
  check('request not shown as clientId', !JSON.stringify(b1.view.switchRequests).includes(owner.id));
  check('requester cannot approve own request', !!(await owner.do('approveSwitch', { id: req.id })).error);
  await b1.do('approveSwitch', { id: req.id });
  check('1/2 approvals → still white', (await owner.fresh()).you.team === 'white');
  await b2.do('approveSwitch', { id: req.id });
  check('2/2 approvals → switched', (await owner.waitFor(v => v.you.team === 'black')).you.team === 'black');

  await b1.do('requestSwitch');   // black → white: nobody online on white now
  check('instant when target team has nobody online', (await b1.waitFor(v => v.you.team === 'white')).you.team === 'white');
  await b2.do('requestSwitch');   // black → white: b1 is there now
  const r2 = (await b1.waitFor(v => v.switchRequests.length)).switchRequests[0];
  await b1.do('denySwitch', { id: r2.id });
  check('deny clears request and keeps team', (await b2.waitFor(v => !v.switchRequests.length)).you.team === 'black');
  await b2.do('requestSwitch');
  await b2.do('cancelSwitch');
  check('cancel clears request', (await b1.waitFor(v => !v.switchRequests.length)).switchRequests.length === 0);

  await b2.do('leaveLobby');
  await b2.do('enterLobby', { id: ctx.lid });
  check('leave-and-rejoin on other team blocked', !!(await b2.do('join', { name: 'b2', team: 'white' })).error);
  check('formerTeam exposed so the UI can lock it', (await b2.waitFor(v => v.you.formerTeam)).you.formerTeam === 'black');
  check('rejoin on own team ok', (await b2.do('join', { name: 'b2', team: 'black' })).ok);
  await destroy(ctx);
}

async function kickAndPermissions() {
  group('Owner permissions, kick & ban');
  const ctx = await lobbyWith({ mode: 'physical', others: [['w2', 'white'], ['b1', 'black']] });
  const { owner, w2, b1 } = ctx;
  const pid = name => owner.view.players.find(p => p.name === name).pid;

  check('player renames own team', (await b1.do('setTeamName', { team: 'black', name: 'Night' })).ok);
  check('player cannot rename enemy team', !!(await b1.do('setTeamName', { team: 'white', name: 'Losers' })).error);
  check('owner renames any team', (await owner.do('setTeamName', { team: 'black', name: 'Night Owls' })).ok);
  check('team name capped at 20', (await owner.do('setTeamName', { team: 'white', name: 'x'.repeat(40) })).ok &&
    (await owner.waitFor(v => v.teamNames.white.length === 20)).teamNames.white.length === 20);

  check('non-owner cannot kick', !!(await w2.do('kickPlayer', { pid: pid('b1') })).error);
  check('owner cannot kick self', !!(await owner.do('kickPlayer', { pid: pid('Owner') })).error);
  check('non-owner cannot start new game', !!(await w2.do('newGame')).error);
  check('pids are not raw clientIds', !JSON.stringify(owner.view.players).includes(b1.id));

  check('owner kicks b1', (await owner.do('kickPlayer', { pid: pid('b1') })).ok);
  check('kicked player bounced out', (await b1.waitFor(v => !v.you.lobby)).you.lobby === null);
  check('kicked player gone from roster', !(await owner.fresh()).players.some(p => p.name === 'b1'));
  const re = await b1.do('enterLobby', { id: ctx.lid });
  check('kicked player cannot re-enter', !!re.error, re);
  check('owner sees kicked list', (await owner.waitFor(v => v.banned.length)).banned[0].name === 'b1');
  check('non-owner does not see kicked list', (await w2.fresh()).banned.length === 0);
  check('non-owner cannot unban', !!(await w2.do('unbanPlayer', { pid: owner.view.banned[0].pid })).error);
  check('owner lets b1 back', (await owner.do('unbanPlayer', { pid: owner.view.banned[0].pid })).ok);
  check('unbanned player can re-enter', (await b1.do('enterLobby', { id: ctx.lid })).ok);
  check('…and keeps their team lock', !!(await b1.do('join', { name: 'b1', team: 'white' })).error && (await b1.do('join', { name: 'b1', team: 'black' })).ok);

  // new game
  await owner.do('submitClues', { team: 'white', clues: ['a', 'b', 'c'], code: [1, 2, 3] });
  await owner.do('adjustToken', { team: 'white', kind: 'mis', delta: 1 });
  await owner.do('setKeyword', { slot: 0, text: 'kw' });
  check('owner starts new game', (await owner.do('newGame')).ok);
  const ng = await w2.waitFor(v => v.rounds.length === 1 && v.round.white.clues[0] === '');
  check('new game wipes rounds, tokens, keywords', ng.round.white.clues.join('') === '' && ng.tokens.white.mis === 0 && ng.teams.white.keywords[0] === '');
  check('new game keeps players & team names', ng.players.length === 3 && ng.teamNames.black === 'Night Owls');
  await destroy(ctx);
}

async function timers() {
  group('Pressure timer');
  const ctx = await lobbyWith({ mode: 'physical', others: [['b1', 'black']] });
  const { owner, b1 } = ctx;
  check('start timer on enemy', (await owner.do('startTimer')).ok);
  const t = (await b1.waitFor(v => v.timers.black)).timers.black;
  check('timer targets the other team, ~60s', t && t.endsAt - b1.view.serverNow > 58000 && t.endsAt - b1.view.serverNow <= 60500);
  check('serverNow sent for clock sync', typeof b1.view.serverNow === 'number');
  check('double start rejected', !!(await owner.do('startTimer')).error);
  check('timed team cannot stop it early', !!(await b1.do('stopTimer', { team: 'black' })).error);
  check('starter team can cancel', (await owner.do('stopTimer', { team: 'black' })).ok &&
    (await b1.waitFor(v => !v.timers.black)).timers.black === null);
  check('both teams can time each other at once', (await owner.do('startTimer')).ok && (await b1.do('startTimer')).ok &&
    !!(await owner.waitFor(v => v.timers.white && v.timers.black)).timers.white);
  check('bad team rejected', !!(await owner.do('stopTimer', { team: 'purple' })).error);
  await owner.do('nextRound');
  check('timers clear on next round', !(await b1.waitFor(v => !v.timers.white && !v.timers.black)).timers.white);
  await destroy(ctx);
}

async function persistence() {
  group('Persistence & recovery');
  const ctx = await lobbyWith({ name: 'Persist', mode: 'physical', others: [['b1', 'black']] });
  await ctx.owner.do('submitClues', { team: 'black', clues: ['keep', 'me', 'safe'], code: [3, 1, 4] });
  await ctx.owner.do('setMyNotes', { text: 'secret-persist' });
  await ctx.owner.waitFor(v => v.round.black.clues[0] === 'keep');
  ctx.owner.disconnect(); ctx.b1.disconnect();
  const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  check('state file is valid JSON', !!saved.lobbies[ctx.lid]);
  check('no leftover temp file (atomic write)', !fs.existsSync(STATE_FILE + '.tmp'));

  await stopServer();
  await startServer();
  await ctx.owner.connect();
  const v = await ctx.owner.waitFor(x => x.you.lobby);
  check('restart keeps lobby, seat and ownership', v.you.lobby && v.you.lobby.id === ctx.lid && v.you.isOwner && v.you.team === 'white');
  check('restart keeps clues + code', v.round.black.clues.join() === 'keep,me,safe' && v.round.black.code.join() === '3,1,4');
  check('restart keeps private notes', v.you.notes === 'secret-persist', { notes: v.you.notes, savedPlayers: saved.lobbies[ctx.lid].players });
  await ctx.owner.do('deleteLobby', { id: ctx.lid });
  ctx.owner.disconnect();

  await stopServer();
  fs.writeFileSync(STATE_FILE, '{"lobbies": {"x": ');   // truncated / corrupt
  await startServer();
  check('server boots on a corrupt state file', (await fetch(BASE + '/')).status === 200);
  check('corrupt file backed up, not destroyed', fs.readdirSync(TMP).some(f => f.startsWith('state.json.corrupt-')));

  await stopServer();
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    lobbies: { old: { id: 'old', name: 'Legacy', createdAt: 1, players: { 'legacy-client-1': { name: 'L', team: 'white' } },
      teams: { white: { keywords: ['', '', '', ''], oppGuesses: ['', '', '', ''], notes: '' }, black: { keywords: ['', '', '', ''], oppGuesses: ['', '', '', ''], notes: '' } },
      rounds: [{ white: { encryptor: null, code: null, revealed: false, clues: ['', '', ''], ownGuess: null, interceptGuess: null },
                 black: { encryptor: null, code: null, revealed: false, clues: ['', '', ''], ownGuess: null, interceptGuess: null } }] },
      broken: 'not-an-object' },
    clientLobby: { 'legacy-client-1': 'old', 'ghost-client-1': 'missing' }
  }));
  await startServer();
  const legacy = await new Player('legacy').connect();
  legacy.id = 'legacy-client-1';
  legacy.disconnect();
  await legacy.connect();
  const lv = await legacy.waitFor(x => x.you.lobby);
  check('legacy save migrates (defaults filled, owner assigned)', lv.you.lobby.id === 'old' && lv.mode === 'digital' && lv.you.isOwner && lv.timers.white === null);
  check('broken lobby entries dropped', !lv.lobbies.some(l => l.id === 'broken'));
  legacy.disconnect();
}

// ---------- client logic (browser code in a sandbox) ----------
function loadClient() {
  const store = new Map();
  const noopEl = { addEventListener() {}, appendChild() {}, contains: () => false, innerHTML: '', setAttribute() {} };
  const ctx = {
    console, JSON, Math, Date, Array, Object, String, Number, Set, Map, Promise, RegExp, Error,
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)),
      removeItem: k => store.delete(k), key: i => [...store.keys()][i], get length() { return store.size; }
    },
    navigator: { language: 'en-US' },
    crypto: { randomUUID: () => crypto.randomUUID() },
    document: { documentElement: noopEl, getElementById: () => noopEl, addEventListener() {}, createElement: () => noopEl, activeElement: null },
    EventSource: class { constructor() {} },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    window: {}
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8'), ctx);
  return ctx;
}

function clientLogic() {
  group('Client logic: draft merge & scoring');
  const c = loadClient();
  const run = code => vm.runInContext(code, c);
  const blankR = () => ({ white: { clues: ['', '', ''], code: null, revealed: false }, black: { clues: ['', '', ''], code: null, revealed: false } });
  const setView = (rounds, mode = 'physical') =>
    run(`view = ${JSON.stringify({ mode, you: { lobby: { id: 'L1' }, team: 'white' }, rounds, tokens: { white: { int: 0, mis: 0 }, black: { int: 0, mis: 0 } } })}; syncDrafts();`);

  // physical: friend submits while I have an untouched draft → I follow the server
  setView([blankR()]);
  run(`getDraft().black.clues[0] = 'my typing'; saveDraft();`);
  let r = blankR(); r.black.clues = ['', 'friend2', 'friend3']; r.black.code = [2, null, null];
  setView([r]);
  const d = run('JSON.stringify(getDraft().black)');
  const dj = JSON.parse(d);
  check('my edited field is kept when a friend submits', dj.clues[0] === 'my typing', dj);
  check('untouched fields adopt friend\'s submission', dj.clues[1] === 'friend2' && dj.clues[2] === 'friend3', dj);
  check('untouched code adopts friend\'s code', dj.code.join() === '2,,', dj);
  check('draft marked dirty (my edit pending)', run(`draftDirty('black')`) === true);

  // after I submit, the server echo clears dirtiness
  r = blankR(); r.black.clues = ['my typing', 'friend2', 'friend3']; r.black.code = [2, null, null];
  setView([r]);
  check('echo of my submission clears dirty flag', run(`draftDirty('black')`) === false);
  // a later friend edit to a field I submitted is adopted (I'm no longer editing it)
  r.black.clues = ['friend fixed typo', 'friend2', 'friend3'];
  setView([r]);
  check('later friend edits adopted after my submit', JSON.parse(run('JSON.stringify(getDraft().black.clues)'))[0] === 'friend fixed typo');

  // conflict: we both edit the same field → mine wins locally
  run(`getDraft().black.clues[1] = 'mine'; saveDraft();`);
  r.black.clues = ['friend fixed typo', 'theirs', 'friend3'];
  setView([r]);
  check('concurrent edit to same field keeps mine (no silent loss of my typing)', JSON.parse(run('JSON.stringify(getDraft().black.clues)'))[1] === 'mine');

  // code merges as a whole: my edited code must not be mixed with theirs
  run(`getDraft().white.code = [3, 1, null]; saveDraft();`);
  r.white.code = [1, 4, 2];
  setView([r]);
  check('my edited code kept whole (no digit mixing)', run('getDraft().white.code.join()') === '3,1,');

  // new round → fresh draft
  setView([r, blankR()]);
  check('new round starts a clean draft', run('JSON.stringify(getDraft().black.clues)') === '["","",""]');

  // scoring (app-codes mode)
  const sc = [
    { white: { revealed: true, code: [1, 2, 3], ownGuess: [1, 2, 4], interceptGuess: [1, 2, 3], clues: [] },
      black: { revealed: true, code: [4, 3, 2], ownGuess: [4, 3, 2], interceptGuess: [4, 3, 2], clues: [] } },
    { white: { revealed: true, code: [2, 3, 4], ownGuess: [2, 3, 4], interceptGuess: [2, 3, 4], clues: [] },
      black: { revealed: true, code: [1, 3, 4], ownGuess: [3, 1, 4], interceptGuess: [1, 2, 4], clues: [] } }
  ];
  const tk = JSON.parse(run(`JSON.stringify(calcTokens(${JSON.stringify({ mode: 'digital', rounds: sc })}))`));
  check('round-1 intercepts never score', tk.black.int === 1 && tk.white.int === 0, tk);
  check('miscommunications counted per wrong own guess', tk.white.mis === 1 && tk.black.mis === 1, tk);
  const cols = JSON.parse(run(`JSON.stringify(cluesByColumn(${JSON.stringify({ mode: 'physical', rounds: [
    { black: { code: [3, 1, 4], clues: ['sun', 'sea', 'sky'] } }, { black: { code: [3, null, null], clues: ['star', 'x', 'y'] } }
  ] })}, 'black'))`));
  check('clues filed under the right keyword', cols[2].map(x => x.clue).join() === 'sun' && cols[0][0].clue === 'sea' && cols[3][0].clue === 'sky');
  check('incomplete codes are not filed', cols[2].length === 1);
  check('client strings: every Arabic key exists in English', run(`Object.keys(STR.ar).every(k => k in STR.en)`));
  check('client strings: every English key translated', run(`Object.keys(STR.en).filter(k => !(k in STR.ar)).length`) === 0,
    run(`Object.keys(STR.en).filter(k => !(k in STR.ar))`));
}

// ================================================================
(async () => {
  const t0 = Date.now();
  try {
    await startServer();
    await httpAndSecurity();
    await lobbies();
    await privacy();
    await digitalGame();
    await physicalGame();
    await switching();
    await kickAndPermissions();
    await timers();
    await persistence();
    clientLogic();
  } catch (e) {
    fail++;
    failures.push(`[${section}] CRASHED: ${e.stack}`);
  } finally {
    const crashed = proc && proc.exitCode !== null;
    const stderr = proc ? proc.stderrText : '';
    await stopServer();
    fs.rmSync(TMP, { recursive: true, force: true });
    if (crashed) failures.push('server process died during tests');
    if (/action failed/.test(stderr)) failures.push('server logged action errors:\n' + stderr);
  }
  console.log(`\n${pass} passed, ${failures.length ? fail || failures.length : 0} failed  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  if (failures.length) {
    console.log('\nFailures:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
})();
