'use strict';

// ---------- identity ----------
let clientId = localStorage.getItem('dcy-id');
if (!clientId) {
  clientId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
  localStorage.setItem('dcy-id', clientId);
}

// ---------- language ----------
const STR = {
  en: {
    // generic
    connecting: 'connecting…', cancel: 'Cancel', close: 'Close', save: 'Save', create: 'Create',
    errGeneric: 'Something went wrong', errConn: 'Connection lost — retrying…',
    langButton: 'عربي',
    teamWhite: '⚪ White', teamBlack: '⚫ Black',
    // lobby list
    subLobbies: 'Live Decrypto note sheets — pick a lobby or make one',
    newLobbyName: 'New lobby name',
    modePhysical: '🃏 Physical cards', modePhysicalSub: 'pure note-taking',
    modeDigital: '📱 App codes', modeDigitalSub: 'app draws & scores',
    noLobbies: 'No lobbies yet — create the first one ☝️',
    badgePhysical: '🃏 physical cards', badgeDigital: '📱 app codes',
    lobbyMeta: (round, online, players) => `Round ${round} · ${online} online · ${players} player${players === 1 ? '' : 's'}`,
    nobodyJoined: 'nobody joined yet',
    delLobbyTitle: 'Delete lobby',
    confirmDelLobby: 'Delete this lobby and all its notes? Everyone inside gets kicked out.',
    errLobbyName: 'Give the lobby a name',
    // join screen
    backToLobbies: '← Lobbies',
    subJoin: 'Pick your team — everyone in this lobby shows up below, live',
    yourName: 'Your name', joinGame: 'Join the game',
    privacyHint: "Your team's words & notes are only visible to your team.",
    nobodyYet: 'nobody yet', you: 'you',
    errName: 'Enter your name', errTeam: 'Pick a team',
    confirmLeave: 'Leave the lobby? You can rejoin from the list.',
    // header / banners
    round: n => `Round ${n}`, overtime: ' (overtime)',
    winBanner: t => `🏆 ${t} wins — 2 interceptions!`,
    loseBanner: (t, o) => `💥 ${t} loses — 2 miscommunications. ${o} wins!`,
    switchWaiting: (t, n, m) => `⏳ Waiting for ${t} to accept your switch (${n}/${m})`,
    switchOthers: (name, n, m) => `⏳ <b>${name}</b> joining your team — waiting for the rest (${n}/${m})`,
    switchAsk: name => `🔁 <b>${name}</b> wants to join your team — they'll see your words!`,
    accept: '✓ Accept', deny: '✗ Deny',
    confirmDeny: 'Deny the switch request?',
    // digital round tab
    ourTransmission: 'our transmission', enemyTransmission: 'enemy transmission',
    encryptor: 'Encryptor', imEncryptor: "🕶 I'm giving the clues", takeOver: 'take over',
    confirmTakeOver: 'Take over as encryptor? You will see the secret code.',
    code: 'Code', drawRandom: '🎲 Draw random', onlyYou: 'only you can see it',
    codeSetHidden: '🔒 set — hidden', waitingEncryptor: 'waiting for encryptor',
    clues: 'Clues', cluePh: n => `clue ${n}`,
    ourGuess: 'Our guess', guessHint: 'what code do the clues point to?',
    reveal: '🔓 Reveal code &amp; score',
    revealHint: 'Press reveal after both teams locked their guesses out loud.',
    confirmReveal: 'Reveal the code and score this round?',
    confirmRevealNoGuess: "Your team hasn't entered a guess — no miscommunication will be scored. Reveal anyway?",
    decoded: '✓ decoded', miscomm: '💥 miscommunication', noGuess: 'no guess recorded',
    interceptedBy: g => `🕵️ INTERCEPTED by them (${g})`, safeGuess: g => `🛡 they guessed ${g} — safe`,
    theirClues: 'Their clues', theirCode: 'Their code', notChosen: 'not chosen yet',
    round1Note: 'Round 1: no interception yet — just listen and note their clues.',
    intercept: 'Intercept', interceptHint: 'guess their code for a 🕵️ token',
    weIntercepted: '🕵️ WE INTERCEPTED! (+1 token)', interceptMissedOur: g => `our intercept ${g} — missed`,
    theyDecoded: 'they decoded it', theyMiscommed: '💥 they miscommunicated (+1 for us to laugh at)',
    checkEnemyTab: 'Check the <b>Enemy words</b> tab for their clue history.',
    startRound: n => `Start round ${n} ➜`,
    pos1: '1st', pos2: '2nd', pos3: '3rd',
    // physical round tab
    ourTrans: 'our transmission', theirTrans: 'their transmission',
    typeAsSaid: "type them as they're said",
    codeFromCard: 'from the card, after the reveal',
    filed: '✓ filed into the word columns',
    tokensTitle: 'Tokens — mirror the physical ones 🪙',
    tokensHint: '🕵️ interception · 💥 miscommunication — 2 🕵️ wins, 2 💥 loses.',
    nextRound: 'Next round ➜',
    confirmNext: 'Move on to the next round?',
    confirmNextMissing: teams => `No code recorded for ${teams} — those clues won't be filed into the word columns. Next round anyway?`,
    // enemy / our words tabs
    interceptSheet: 'intercept sheet', onlyYourTeam: 'only your team sees this',
    theirWordPh: n => `your guess for their word #${n}`,
    noRevealedClues: 'no revealed clues yet',
    teamNotes: 'Team notes 📝', notesPh: 'theories, patterns, anything…',
    ourKeywords: 'our keywords', hiddenFromEnemy: 'hidden from the enemy',
    keywordPh: n => `keyword #${n}`, noCluesGiven: 'no clues given yet',
    oursHint: "The chips are clues your team already used — if a column repeats a theme, the enemy will catch on.",
    // log
    roundLog: 'Round log 📜', inProgress: 'in progress…', codeNotRecorded: 'code not recorded',
    logCode: 'code', logDecoded: '✓ decoded', logMiscomm: g => `💥 miscomm (${g})`,
    logIntercepted: '🕵️ intercepted', logInterceptMissed: 'intercept missed',
    // settings
    youTitle: 'You', playersTitle: 'Players', lobbyTitle: 'Lobby', langTitle: 'Language',
    teamsTitle: 'Team names', teamNamePh: 'custom name (optional)',
    reqSwitch: t => `Request switch to ${t}`,
    switchPending: '⏳ Switch pending — tap to cancel',
    switchHint: 'Everyone online on the other team must accept the switch — no sneaky peeking.',
    confirmSwitch: t => `Request a switch to ${t}? Everyone online on that team must accept before you move (if none of them are online, you switch right away).`,
    leaveLobby: '🚪 Leave lobby (back to the list)',
    newGame: "🗑 New game (wipes this lobby's notes)",
    confirmNewGame: 'Start a brand-new game? All rounds, words and notes will be wiped for BOTH teams.',
    confirmNewGame2: 'Really sure? This cannot be undone.',
    // tabs
    tabRound: 'Round', tabEnemy: 'Enemy words', tabOurs: 'Our words', tabLog: 'Log'
  },
  ar: {
    connecting: 'جاري الاتصال…', cancel: 'إلغاء', close: 'إغلاق', save: 'حفظ', create: 'إنشاء',
    errGeneric: 'صار خطأ', errConn: 'انقطع الاتصال — نعيد المحاولة…',
    langButton: 'EN',
    teamWhite: '⚪ الأبيض', teamBlack: '⚫ الأسود',
    subLobbies: 'دفاتر ملاحظات مباشرة للعبة Decrypto — اختر لوبي أو سوّ واحد',
    newLobbyName: 'اسم اللوبي الجديد',
    modePhysical: '🃏 بطاقات حقيقية', modePhysicalSub: 'تدوين بس',
    modeDigital: '📱 شفرات بالتطبيق', modeDigitalSub: 'التطبيق يسحب ويحسب',
    noLobbies: 'لا لوبيات بعد — سوّ أول واحد ☝️',
    badgePhysical: '🃏 بطاقات حقيقية', badgeDigital: '📱 شفرات بالتطبيق',
    lobbyMeta: (round, online, players) => `جولة ${round} · ${online} متصل · ${players} لاعب`,
    nobodyJoined: 'ما دخل أحد بعد',
    delLobbyTitle: 'حذف اللوبي',
    confirmDelLobby: 'تحذف اللوبي بكل ملاحظاته؟ كل اللي داخله بيطلعون.',
    errLobbyName: 'سمّ اللوبي أول',
    backToLobbies: '→ اللوبيات',
    subJoin: 'اختر فريقك — كل اللي في اللوبي يطلعون تحت، مباشر',
    yourName: 'اسمك', joinGame: 'ادخل اللعبة',
    privacyHint: 'كلمات فريقك وملاحظاته ما يشوفها إلا فريقك.',
    nobodyYet: 'لا أحد بعد', you: 'أنت',
    errName: 'اكتب اسمك', errTeam: 'اختر فريق',
    confirmLeave: 'تطلع من اللوبي؟ تقدر ترجع من القائمة.',
    round: n => `الجولة ${n}`, overtime: ' (وقت إضافي)',
    winBanner: t => `🏆 ${t} فاز — اعتراضان!`,
    loseBanner: (t, o) => `💥 ${t} خسر بسوء تفاهم مرتين — الفوز لـ${o}!`,
    switchWaiting: (t, n, m) => `⏳ بانتظار موافقة ${t} على انتقالك (${n}/${m})`,
    switchOthers: (name, n, m) => `⏳ <b>${name}</b> بينضم لفريقكم — بانتظار الباقين (${n}/${m})`,
    switchAsk: name => `🔁 <b>${name}</b> يبي ينضم لفريقكم — بيشوف كلماتكم!`,
    accept: '✓ قبول', deny: '✗ رفض',
    confirmDeny: 'ترفض طلب الانتقال؟',
    ourTransmission: 'إرسالنا', enemyTransmission: 'إرسال الخصم',
    encryptor: 'المشفّر', imEncryptor: '🕶 أنا أعطي التلميحات', takeOver: 'استلمه',
    confirmTakeOver: 'تستلم دور المشفّر؟ بتشوف الشفرة السرية.',
    code: 'الشفرة', drawRandom: '🎲 اسحب شفرة', onlyYou: 'ما يشوفها غيرك',
    codeSetHidden: '🔒 محفوظة — مخفية', waitingEncryptor: 'بانتظار المشفّر',
    clues: 'التلميحات', cluePh: n => `تلميح ${n}`,
    ourGuess: 'تخميننا', guessHint: 'وش الشفرة اللي تشير لها التلميحات؟',
    reveal: '🔓 اكشف الشفرة واحسب',
    revealHint: 'اضغط الكشف بعد ما يثبّت الفريقان تخمينهم بصوت عالي.',
    confirmReveal: 'نكشف الشفرة ونحسب الجولة؟',
    confirmRevealNoGuess: 'فريقك ما سجّل تخمين — ما بيتحسب سوء تفاهم. نكشف؟',
    decoded: '✓ فكيناها', miscomm: '💥 سوء تفاهم', noGuess: 'ما انسجّل تخمين',
    interceptedBy: g => `🕵️ اعترضوها! (${g})`, safeGuess: g => `🛡 خمّنوا ${g} — سالمين`,
    theirClues: 'تلميحاتهم', theirCode: 'شفرتهم', notChosen: 'ما تحدد بعد',
    round1Note: 'الجولة الأولى: لا اعتراض — بس اسمعوا ودوّنوا تلميحاتهم.',
    intercept: 'الاعتراض', interceptHint: 'خمّنوا شفرتهم عشان عملة 🕵️',
    weIntercepted: '🕵️ اعترضناها! (+عملة)', interceptMissedOur: g => `اعتراضنا ${g} — خاب`,
    theyDecoded: 'فكّوها', theyMiscommed: '💥 صار عندهم سوء تفاهم (نضحك عليهم)',
    checkEnemyTab: 'شوف تبويب <b>كلماتهم</b> لتاريخ تلميحاتهم.',
    startRound: n => `ابدأ الجولة ${n} ➜`,
    pos1: 'الأول', pos2: 'الثاني', pos3: 'الثالث',
    ourTrans: 'إرسالنا', theirTrans: 'إرسالهم',
    typeAsSaid: 'اكتبوها مثل ما تنقال',
    codeFromCard: 'من البطاقة، بعد الكشف',
    filed: '✓ انحفظت في أعمدة الكلمات',
    tokensTitle: 'العملات — طابقوها مع اللي على الطاولة 🪙',
    tokensHint: '🕵️ اعتراض · 💥 سوء تفاهم — عملتان 🕵️ فوز، عملتان 💥 خسارة.',
    nextRound: 'الجولة الجاية ➜',
    confirmNext: 'ننتقل للجولة الجاية؟',
    confirmNextMissing: teams => `ما انسجّلت شفرة ${teams} — تلميحاتها ما بتنحفظ في الأعمدة. نكمل؟`,
    interceptSheet: 'ورقة الاعتراض', onlyYourTeam: 'ما يشوفها إلا فريقك',
    theirWordPh: n => `توقعكم لكلمتهم رقم ${n}`,
    noRevealedClues: 'لا تلميحات مكشوفة بعد',
    teamNotes: 'ملاحظات الفريق 📝', notesPh: 'نظريات، أنماط، أي شي…',
    ourKeywords: 'كلماتنا السرية', hiddenFromEnemy: 'مخفية عن الخصم',
    keywordPh: n => `الكلمة ${n}`, noCluesGiven: 'ما عطينا تلميحات بعد',
    oursHint: 'هذي التلميحات اللي استخدمها فريقك — إذا تكرر نفس النمط في عمود، بيلقطونها.',
    roundLog: 'سجل الجولات 📜', inProgress: 'جارية…', codeNotRecorded: 'الشفرة غير مسجلة',
    logCode: 'الشفرة', logDecoded: '✓ فكّوها', logMiscomm: g => `💥 سوء تفاهم (${g})`,
    logIntercepted: '🕵️ انعترضت', logInterceptMissed: 'الاعتراض خاب',
    youTitle: 'أنت', playersTitle: 'اللاعبين', lobbyTitle: 'اللوبي', langTitle: 'اللغة',
    teamsTitle: 'أسماء الفرق', teamNamePh: 'اسم مخصص (اختياري)',
    reqSwitch: t => `اطلب الانتقال إلى ${t}`,
    switchPending: '⏳ الطلب معلّق — اضغط للإلغاء',
    switchHint: 'كل المتصلين في الفريق الثاني لازم يوافقون — بلا غش.',
    confirmSwitch: t => `تطلب الانتقال إلى ${t}؟ كل المتصلين فيه لازم يوافقون قبل ما تنتقل (إذا ما فيه أحد متصل، تنتقل فورًا).`,
    leaveLobby: '🚪 اطلع من اللوبي (ارجع للقائمة)',
    newGame: '🗑 لعبة جديدة (يمسح ملاحظات اللوبي)',
    confirmNewGame: 'نبدأ لعبة جديدة؟ كل الجولات والكلمات والملاحظات بتنمسح للفريقين.',
    confirmNewGame2: 'متأكد؟ ما ينفع تتراجع.',
    tabRound: 'الجولة', tabEnemy: 'كلماتهم', tabOurs: 'كلماتنا', tabLog: 'السجل'
  }
};

let lang = localStorage.getItem('dcy-lang') ||
  ((navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');

function t(key, ...args) {
  const v = (STR[lang] && STR[lang][key]) !== undefined ? STR[lang][key] : STR.en[key];
  return typeof v === 'function' ? v(...args) : (v !== undefined ? v : key);
}
function applyLang() {
  document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}
applyLang();

// ---------- state ----------
let view = null;
let tab = localStorage.getItem('dcy-tab') || 'round';
let pendingRender = false;
let joinTeam = null;
let joinName = localStorage.getItem('dcy-name') || '';
let lobbyName = '';
let createMode = 'physical';
let createTeamNames = { white: '', black: '' };
let showSettings = false;

const TEAMS = ['white', 'black'];
const teamLabel = team => {
  const custom = view && view.teamNames && view.teamNames[team];
  if (custom) return `${team === 'white' ? '⚪' : '⚫'} ${esc(custom)}`;
  return team === 'white' ? t('teamWhite') : t('teamBlack');
};
const otherTeam = team => (team === 'white' ? 'black' : 'white');
const $app = document.getElementById('app');

// ---------- server connection ----------
const es = new EventSource('/events?clientId=' + encodeURIComponent(clientId));
es.onmessage = e => { view = JSON.parse(e.data); render(); };

async function send(type, payload = {}) {
  try {
    const r = await fetch('/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId, type, ...payload })
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast(j.error || t('errGeneric'));
    }
  } catch (e) {
    toast(t('errConn'));
  }
}

const debounces = {};
function sendDebounced(key, type, payload) {
  clearTimeout(debounces[key]);
  debounces[key] = setTimeout(() => { delete debounces[key]; send(type, payload); }, 350);
}

// ---------- utils ----------
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function toast(msg, info) {
  const d = document.createElement('div');
  d.className = 'toast' + (info ? ' info' : '');
  d.textContent = msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(() => d.remove(), 3100);
}
function eqCode(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === 3 &&
    a.every((d, i) => d != null && d === b[i]);
}
function fullCode(a) { return Array.isArray(a) && a.length === 3 && a.every(d => d >= 1 && d <= 4); }
function codeStr(c) { return Array.isArray(c) ? c.map(d => d == null ? '·' : d).join(' ') : ''; }

// tokens: manual counters in physical mode, derived from revealed rounds in
// digital mode (interceptions only count from round 2)
function calcTokens(st) {
  if (st.mode === 'physical') {
    return st.tokens || { white: { int: 0, mis: 0 }, black: { int: 0, mis: 0 } };
  }
  const tk = { white: { int: 0, mis: 0 }, black: { int: 0, mis: 0 } };
  st.rounds.forEach((r, i) => {
    for (const team of TEAMS) {
      const tr = r[team];
      if (!tr.revealed || !fullCode(tr.code)) continue;
      if (Array.isArray(tr.ownGuess) && !eqCode(tr.ownGuess, tr.code)) tk[team].mis++;
      if (i > 0 && Array.isArray(tr.interceptGuess) && eqCode(tr.interceptGuess, tr.code)) {
        tk[otherTeam(team)].int++;
      }
    }
  });
  return tk;
}

// clues a team has given, grouped into keyword columns 1-4
function cluesByColumn(st, team) {
  const cols = [[], [], [], []];
  st.rounds.forEach((r, i) => {
    const tr = r[team];
    if (!fullCode(tr.code)) return;
    if (st.mode !== 'physical' && !tr.revealed) return;
    tr.code.forEach((digit, idx) => {
      const clue = (tr.clues[idx] || '').trim();
      if (clue) cols[digit - 1].push({ round: i + 1, clue });
    });
  });
  return cols;
}

// ---------- render guard (don't clobber inputs while typing) ----------
function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && $app.contains(a);
}
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (pendingRender && !isTyping()) { pendingRender = false; render(); }
  }, 80);
});

// ---------- render ----------
function render() {
  if (!view) return;
  if (isTyping()) { pendingRender = true; return; }

  if (!view.you.lobby) { $app.innerHTML = lobbyScreen(); return; }
  if (!view.you.name || !view.you.team) { $app.innerHTML = joinScreen(); return; }

  const tokens = calcTokens(view);
  let html = header(tokens) + winBanner(tokens) + switchBanners();
  html += '<main>';
  if (tab === 'round') html += roundTab();
  else if (tab === 'enemy') html += enemyTab();
  else if (tab === 'ours') html += oursTab();
  else html += logTab();
  html += '</main>';
  html += tabBar();
  if (showSettings) html += settingsSheet();
  $app.innerHTML = html;
}

function langButton() {
  return `<button class="btn ghost lang-btn" data-action="togglelang">🌐 ${t('langButton')}</button>`;
}

// ---------- lobby list ----------
function lobbyScreen() {
  const lobbies = view.lobbies || [];
  const list = lobbies.map(l => {
    const online = l.players.filter(p => p.online).length;
    const names = l.players.map(p =>
      `<span class="chip">${p.online ? '🟢 ' : ''}${p.team === 'white' ? '⚪' : '⚫'} ${esc(p.name)}</span>`).join('');
    return `<div class="lobby" data-action="enterlobby" data-id="${esc(l.id)}">
      <div class="lobby-main">
        <div class="lobby-name" dir="auto">${esc(l.name)}</div>
        <div class="lobby-sub">${l.mode === 'physical' ? t('badgePhysical') : t('badgeDigital')} · ${t('lobbyMeta', l.round, online, l.players.length)}</div>
        <div class="chips" style="margin-top:6px">${names || `<span class="no-clues">${t('nobodyJoined')}</span>`}</div>
      </div>
      <button class="lobby-del" data-action="dellobby" data-id="${esc(l.id)}" title="${t('delLobbyTitle')}">✕</button>
    </div>`;
  }).join('');
  return `<div class="join">
    <div class="row" style="justify-content:flex-end">${langButton()}</div>
    <div class="logo-big">DECRYPNOTO</div>
    <div class="sub">${t('subLobbies')}</div>
    <div class="row" style="gap:8px">
      <input type="text" id="lobby-name" maxlength="30" placeholder="${t('newLobbyName')}" value="${esc(lobbyName)}" style="flex:1" dir="auto">
      <button class="btn primary" data-action="createlobby">${t('create')}</button>
    </div>
    <div class="team-pick" style="margin-top:-6px">
      <button class="${createMode === 'physical' ? 'white sel' : ''}" data-action="createmode" data-mode="physical" style="padding:12px 0">
        ${t('modePhysical')}<br><span class="hint">${t('modePhysicalSub')}</span></button>
      <button class="${createMode === 'digital' ? 'white sel' : ''}" data-action="createmode" data-mode="digital" style="padding:12px 0">
        ${t('modeDigital')}<br><span class="hint">${t('modeDigitalSub')}</span></button>
    </div>
    <div class="row" style="gap:8px;margin-top:-6px">
      <input type="text" id="ctn-white" maxlength="20" placeholder="⚪ ${t('teamNamePh')}"
        value="${esc(createTeamNames.white)}" dir="auto" style="flex:1">
      <input type="text" id="ctn-black" maxlength="20" placeholder="⚫ ${t('teamNamePh')}"
        value="${esc(createTeamNames.black)}" dir="auto" style="flex:1">
    </div>
    <div class="lobby-list">
      ${list || `<div class="dim" style="text-align:center;padding:24px 0">${t('noLobbies')}</div>`}
    </div>
  </div>`;
}

// ---------- join ----------
function joinScreen() {
  const roster = team => {
    const ps = (view.players || []).filter(p => p.team === team);
    return ps.length
      ? ps.map(p => `<span class="chip">${p.online ? '🟢 ' : ''}${esc(p.name)}${p.you ? ` (${t('you')})` : ''}</span>`).join('')
      : `<span class="no-clues">${t('nobodyYet')}</span>`;
  };
  return `<div class="join">
    <div class="row" style="gap:8px">
      <button class="btn ghost" data-action="leavelobby">${t('backToLobbies')}</button>
      <div class="logo-big" style="font-size:1.1rem;flex:1;text-align:center" dir="auto">${esc(view.you.lobby.name)}</div>
      ${langButton()}
    </div>
    <div class="sub">${t('subJoin')}</div>
    <input type="text" id="join-name" maxlength="24" placeholder="${t('yourName')}"
      value="${esc(joinName)}" dir="auto">
    <div class="team-pick">
      <button class="white ${joinTeam === 'white' ? 'sel' : ''}" data-action="jointeam" data-team="white">${t('teamWhite')}</button>
      <button class="black ${joinTeam === 'black' ? 'sel' : ''}" data-action="jointeam" data-team="black">${t('teamBlack')}</button>
    </div>
    <div class="roster-cols">
      <div class="roster-col"><div class="lbl" style="margin-bottom:6px">${t('teamWhite')}</div><div class="chips">${roster('white')}</div></div>
      <div class="roster-col"><div class="lbl" style="margin-bottom:6px">${t('teamBlack')}</div><div class="chips">${roster('black')}</div></div>
    </div>
    <button class="btn primary wide" data-action="join">${t('joinGame')}</button>
    <div class="hint" style="text-align:center">${t('privacyHint')}</div>
  </div>`;
}

// ---------- header ----------
function header(tokens) {
  const rn = view.rounds.length;
  const my = view.you.team;
  const scores = TEAMS.map(team => `
    <div class="score ${team} ${team === my ? 'mine' : ''}">
      <span class="tname">${teamLabel(team)}</span>
      <span class="tok">🕵️ <b>${tokens[team].int}</b></span>
      <span class="tok">💥 <b>${tokens[team].mis}</b></span>
    </div>`).join('');
  const online = (view.players || []).filter(p => p.online).length;
  return `<header>
    <div class="hdr-top">
      <span class="logo" dir="auto">${esc(view.you.lobby.name)}</span>
      <span class="round-pill">${t('round', rn)}${rn > 8 ? t('overtime') : ''}</span>
      <button class="round-pill" data-action="settings" style="cursor:pointer;font-family:inherit">👥 ${online}</button>
      <button class="gear" data-action="settings" title="Settings">⚙️</button>
    </div>
    <div class="scorebar">${scores}</div>
  </header>`;
}

function winBanner(tokens) {
  const msgs = [];
  for (const team of TEAMS) {
    const o = otherTeam(team);
    if (tokens[team].int >= 2) msgs.push(`<div class="banner">${t('winBanner', teamLabel(team))}</div>`);
    if (tokens[team].mis >= 2) msgs.push(`<div class="banner lose">${t('loseBanner', teamLabel(team), teamLabel(o))}</div>`);
  }
  return msgs.join('');
}

// ---------- team-switch approval banners ----------
function switchBanners() {
  return (view.switchRequests || []).map(r => {
    if (r.yours) {
      return `<div class="banner switch">
        ${t('switchWaiting', teamLabel(r.to), r.approvals, r.needed)}
        <button class="btn ghost" data-action="cancelswitch" style="margin-inline-start:8px">${t('cancel')}</button>
      </div>`;
    }
    if (r.youApproved) {
      return `<div class="banner switch">${t('switchOthers', esc(r.name), r.approvals, r.needed)}</div>`;
    }
    return `<div class="banner switch">
      ${t('switchAsk', esc(r.name))}
      <span style="white-space:nowrap">
        <button class="btn" data-action="approveswitch" data-id="${esc(r.id)}">${t('accept')}</button>
        <button class="btn danger" data-action="denyswitch" data-id="${esc(r.id)}">${t('deny')}</button>
      </span>
    </div>`;
  }).join('');
}

// ---------- round tab ----------
function roundTab() {
  if (view.mode === 'physical') return physicalRoundTab();
  const my = view.you.team, opp = otherTeam(my);
  const ri = view.rounds.length - 1;
  const r = view.rounds[ri];
  let html = myTransmission(r[my], ri) + enemyTransmission(r[opp], ri);
  if (r[my].revealed && r[opp].revealed) {
    html += `<button class="btn primary wide" data-action="next">${t('startRound', ri + 2)}</button>`;
  }
  return html;
}

// physical-cards mode: no roles, no secrets — everyone records the clues said
// aloud for BOTH teams, then punches in the code from the real card once it's
// revealed, which files the clues into the word columns.
function physicalRoundTab() {
  const my = view.you.team, opp = otherTeam(my);
  const ri = view.rounds.length - 1;
  const r = view.rounds[ri];
  let html = '';
  for (const team of [my, opp]) {
    const tr = r[team];
    const filed = fullCode(tr.code);
    let body = `<div class="row"><span class="lbl">${t('clues')}</span><span class="hint">${t('typeAsSaid')}</span></div>`;
    for (let i = 0; i < 3; i++) {
      body += `<div class="clue-row"><span class="clue-num">${i + 1}</span>
        <input type="text" dir="auto" maxlength="80" data-bind="pclue" data-team="${team}" data-i="${i}"
          placeholder="${t('cluePh', i + 1)}" value="${esc(tr.clues[i])}"></div>`;
    }
    body += `<div class="divider"></div>
      <div class="row"><span class="lbl">${t('code')}</span>
        ${filed
          ? `<span class="badge good">${t('filed')}</span>`
          : `<span class="hint">${t('codeFromCard')}</span>`}</div>`;
    body += picker('pcode', Array.isArray(tr.code) ? tr.code : [null, null, null], team);
    html += `<div class="card"><h2><span class="team-tag ${team}">${teamLabel(team)}</span> — ${team === my ? t('ourTrans') : t('theirTrans')}</h2>${body}</div>`;
  }

  const tok = calcTokens(view);
  const stepper = (team, kind, ico) => `
    <div class="tok-step"><span class="tok-ico">${ico}</span>
      <button data-action="tok" data-team="${team}" data-kind="${kind}" data-delta="-1">−</button>
      <b>${tok[team][kind]}</b>
      <button data-action="tok" data-team="${team}" data-kind="${kind}" data-delta="1">+</button>
    </div>`;
  html += `<div class="card"><h2>${t('tokensTitle')}</h2>
    <div class="row" style="align-items:flex-start">
      ${TEAMS.map(team => `<div style="flex:1">
        <div class="lbl" style="margin-bottom:6px">${teamLabel(team)}</div>
        ${stepper(team, 'int', '🕵️')}${stepper(team, 'mis', '💥')}
      </div>`).join('')}
    </div>
    <div class="hint">${t('tokensHint')}</div>
  </div>`;

  html += `<button class="btn primary wide" data-action="nextphysical">${t('nextRound')}</button>`;
  return html;
}

function myTransmission(tr, ri) {
  const my = view.you.team;
  let body = '';

  // encryptor line
  if (tr.encryptorName) {
    body += `<div class="row"><span class="lbl">${t('encryptor')}</span>
      <span>🕶 ${esc(tr.encryptorName)}${tr.encryptorIsYou ? ` (${t('you')})` : ''}</span>
      ${!tr.encryptorIsYou && !tr.revealed ? `<button class="btn ghost" data-action="claim" data-confirm="1">${t('takeOver')}</button>` : ''}
    </div>`;
  } else {
    body += `<div class="row"><span class="lbl">${t('encryptor')}</span>
      <button class="btn" data-action="claim">${t('imEncryptor')}</button></div>`;
  }

  // code
  if (tr.revealed) {
    body += `<div class="row"><span class="lbl">${t('code')}</span><span class="code-display">${codeStr(tr.code)}</span></div>`;
  } else if (tr.encryptorIsYou) {
    body += `<div class="row"><span class="lbl">${t('code')}</span>
      <button class="btn" data-action="draw">${t('drawRandom')}</button>
      <span class="hint">${t('onlyYou')}</span></div>`;
    body += picker('code', Array.isArray(tr.code) ? tr.code : [null, null, null]);
  } else {
    body += `<div class="row"><span class="lbl">${t('code')}</span>
      <span class="badge ${tr.code ? 'good' : ''}">${tr.code ? t('codeSetHidden') : t('waitingEncryptor')}</span></div>`;
  }

  // clues
  body += `<div class="row"><span class="lbl">${t('clues')}</span></div>`;
  for (let i = 0; i < 3; i++) {
    body += `<div class="clue-row"><span class="clue-num">${i + 1}</span>
      <input type="text" dir="auto" maxlength="80" data-bind="clue" data-i="${i}"
        placeholder="${t('cluePh', i + 1)}" value="${esc(tr.clues[i])}" ${tr.revealed ? 'disabled' : ''}></div>`;
  }

  // team guess
  body += `<div class="divider"></div>
    <div class="row"><span class="lbl">${t('ourGuess')}</span><span class="hint">${t('guessHint')}</span></div>`;
  if (tr.revealed) {
    const g = tr.ownGuess;
    const ok = eqCode(g, tr.code);
    body += `<div class="row"><span class="code-display" style="color:${ok ? 'var(--accent)' : 'var(--danger)'}">${g ? codeStr(g) : '—'}</span>
      ${Array.isArray(g) ? `<span class="badge ${ok ? 'good' : 'bad'}">${ok ? t('decoded') : t('miscomm')}</span>` : `<span class="badge warn">${t('noGuess')}</span>`}</div>`;
    if (ri > 0 && Array.isArray(tr.interceptGuess)) {
      const got = eqCode(tr.interceptGuess, tr.code);
      body += `<div class="row"><span class="badge ${got ? 'bad' : 'good'}">${got ? t('interceptedBy', codeStr(tr.interceptGuess)) : t('safeGuess', codeStr(tr.interceptGuess))}</span></div>`;
    }
  } else {
    body += picker('own', Array.isArray(tr.ownGuess) ? tr.ownGuess : [null, null, null]);
    body += `<div class="row" style="margin-top:12px">
      <button class="btn primary wide" data-action="reveal" ${tr.code ? '' : 'disabled'}>${t('reveal')}</button></div>
    <div class="hint">${t('revealHint')}</div>`;
  }

  return `<div class="card"><h2><span class="team-tag ${my}">${teamLabel(my)}</span> — ${t('ourTransmission')}</h2>${body}</div>`;
}

function enemyTransmission(tr, ri) {
  const my = view.you.team, opp = otherTeam(my);
  let body = '';

  body += `<div class="row"><span class="lbl">${t('encryptor')}</span>
    <span class="dim">${tr.encryptorName ? '🕶 ' + esc(tr.encryptorName) : t('notChosen')}</span></div>`;

  body += `<div class="row"><span class="lbl">${t('theirClues')}</span></div>`;
  for (let i = 0; i < 3; i++) {
    body += `<div class="clue-row"><span class="clue-num">${i + 1}</span>
      <div class="clue-view" dir="auto">${esc(tr.clues[i])}</div></div>`;
  }

  if (tr.revealed) {
    body += `<div class="divider"></div>
      <div class="row"><span class="lbl">${t('theirCode')}</span><span class="code-display">${codeStr(tr.code)}</span></div>`;
    if (ri > 0 && Array.isArray(tr.interceptGuess)) {
      const got = eqCode(tr.interceptGuess, tr.code);
      body += `<div class="row"><span class="badge ${got ? 'good' : ''}">${got ? t('weIntercepted') : t('interceptMissedOur', codeStr(tr.interceptGuess))}</span></div>`;
    }
    const ok = eqCode(tr.ownGuess, tr.code);
    if (Array.isArray(tr.ownGuess)) {
      body += `<div class="row"><span class="badge ${ok ? '' : 'warn'}">${ok ? t('theyDecoded') : t('theyMiscommed')}</span></div>`;
    }
  } else if (ri === 0) {
    body += `<div class="divider"></div><div class="hint">${t('round1Note')}</div>`;
  } else {
    body += `<div class="divider"></div>
      <div class="row"><span class="lbl">${t('intercept')}</span><span class="hint">${t('interceptHint')}</span></div>`;
    body += picker('int', Array.isArray(tr.interceptGuess) ? tr.interceptGuess : [null, null, null]);
    body += `<div class="hint" style="margin-top:8px">${t('checkEnemyTab')}</div>`;
  }

  return `<div class="card"><h2><span class="team-tag ${opp}">${teamLabel(opp)}</span> — ${t('enemyTransmission')}</h2>${body}</div>`;
}

function picker(kind, code, team) {
  const POS = [t('pos1'), t('pos2'), t('pos3')];
  const teamAttr = team ? ` data-team="${team}"` : '';
  let html = '<div class="picker">';
  for (let slot = 0; slot < 3; slot++) {
    html += `<div class="pick-row"><span class="pick-pos">${POS[slot]}</span>`;
    for (let d = 1; d <= 4; d++) {
      html += `<button data-action="pick" data-kind="${kind}" data-slot="${slot}" data-digit="${d}"${teamAttr}
        class="${code[slot] === d ? 'sel' : ''}">${d}</button>`;
    }
    html += '</div>';
  }
  return html + '</div>';
}

// ---------- enemy words tab ----------
function enemyTab() {
  const my = view.you.team, opp = otherTeam(my);
  const cols = cluesByColumn(view, opp);
  const guesses = view.teams[my].oppGuesses;
  let html = `<div class="card"><h2><span class="team-tag ${opp}">${teamLabel(opp)}</span> — ${t('interceptSheet')}
    <span class="spacer"></span><span class="hint">${t('onlyYourTeam')}</span></h2>`;
  for (let s = 0; s < 4; s++) {
    html += `<div class="wordcol">
      <div class="wordcol-head"><span class="wordcol-num">${s + 1}</span>
        <input type="text" dir="auto" maxlength="40" data-bind="oppguess" data-i="${s}"
          placeholder="${t('theirWordPh', s + 1)}" value="${esc(guesses[s])}"></div>
      <div class="chips">${
        cols[s].length
          ? cols[s].map(c => `<span class="chip" dir="auto">${esc(c.clue)}<span class="r">R${c.round}</span></span>`).join('')
          : `<span class="no-clues">${t('noRevealedClues')}</span>`
      }</div>
    </div>`;
  }
  html += `</div>
  <div class="card"><h2>${t('teamNotes')}</h2>
    <textarea dir="auto" data-bind="notes" placeholder="${t('notesPh')}">${esc(view.teams[my].notes)}</textarea>
  </div>`;
  return html;
}

// ---------- our words tab ----------
function oursTab() {
  const my = view.you.team;
  const cols = cluesByColumn(view, my);
  const kws = view.teams[my].keywords;
  let html = `<div class="card"><h2><span class="team-tag ${my}">${teamLabel(my)}</span> — ${t('ourKeywords')}
    <span class="spacer"></span><span class="hint">${t('hiddenFromEnemy')}</span></h2>`;
  for (let s = 0; s < 4; s++) {
    html += `<div class="wordcol">
      <div class="wordcol-head"><span class="wordcol-num">${s + 1}</span>
        <input type="text" dir="auto" maxlength="40" data-bind="keyword" data-i="${s}"
          placeholder="${t('keywordPh', s + 1)}" value="${esc(kws[s])}"></div>
      <div class="chips">${
        cols[s].length
          ? cols[s].map(c => `<span class="chip" dir="auto">${esc(c.clue)}<span class="r">R${c.round}</span></span>`).join('')
          : `<span class="no-clues">${t('noCluesGiven')}</span>`
      }</div>
    </div>`;
  }
  html += `<div class="hint">${t('oursHint')}</div></div>`;
  return html;
}

// ---------- log tab ----------
function logTab() {
  let html = `<div class="card"><h2>${t('roundLog')}</h2>`;
  for (let i = view.rounds.length - 1; i >= 0; i--) {
    const r = view.rounds[i];
    html += `<div class="log-round"><div class="log-title">${t('round', i + 1)}</div>`;
    for (const team of TEAMS) {
      const tr = r[team];
      const clues = tr.clues.some(c => c) ? tr.clues.map(c => esc(c || '·')).join(' / ') : '<span class="dim">—</span>';
      let meta = '';
      if (view.mode === 'physical') {
        meta = fullCode(tr.code)
          ? `<span>${t('logCode')} <b class="mono">${codeStr(tr.code)}</b></span>`
          : `<span>${t('codeNotRecorded')}</span>`;
      } else if (tr.revealed) {
        meta += `<span>${t('logCode')} <b class="mono">${codeStr(tr.code)}</b></span>`;
        if (Array.isArray(tr.ownGuess)) meta += `<span>${eqCode(tr.ownGuess, tr.code) ? t('logDecoded') : t('logMiscomm', codeStr(tr.ownGuess))}</span>`;
        if (i > 0 && Array.isArray(tr.interceptGuess)) meta += `<span>${eqCode(tr.interceptGuess, tr.code) ? t('logIntercepted') : t('logInterceptMissed')}</span>`;
      } else {
        meta = `<span>${t('inProgress')}</span>`;
      }
      html += `<div class="log-team">
        <div><span class="team-tag ${team}">${teamLabel(team)}</span> <span class="log-clues" dir="auto">${clues}</span></div>
        <div class="log-meta">${meta}</div></div>`;
    }
    html += '</div>';
  }
  return html + '</div>';
}

// ---------- settings ----------
function settingsSheet() {
  const players = (view.players || []).slice().sort((a, b) => (b.online - a.online));
  return `<div class="overlay" data-action="closesettings">
    <div class="sheet" data-stop="1">
      <h3>${t('youTitle')}</h3>
      <div class="row">
        <input type="text" id="set-name" maxlength="24" value="${esc(view.you.name)}" dir="auto">
        <button class="btn" data-action="savename">${t('save')}</button>
      </div>
      <div class="row">${
        (view.switchRequests || []).some(r => r.yours)
          ? `<button class="btn wide" data-action="cancelswitch">${t('switchPending')}</button>`
          : `<button class="btn wide" data-action="switchteam">${t('reqSwitch', teamLabel(otherTeam(view.you.team)))}</button>`
      }</div>
      <div class="hint">${t('switchHint')}</div>
      <h3>${t('teamsTitle')}</h3>
      <div class="row"><span class="lbl">⚪</span>
        <input type="text" maxlength="20" data-bind="teamname" data-team="white"
          placeholder="${t('teamNamePh')}" value="${esc((view.teamNames || {}).white || '')}" dir="auto" style="flex:1"></div>
      <div class="row"><span class="lbl">⚫</span>
        <input type="text" maxlength="20" data-bind="teamname" data-team="black"
          placeholder="${t('teamNamePh')}" value="${esc((view.teamNames || {}).black || '')}" dir="auto" style="flex:1"></div>
      <h3>${t('langTitle')}</h3>
      <button class="btn wide" data-action="togglelang">🌐 ${t('langButton')}</button>
      <h3>${t('playersTitle')}</h3>
      <div class="player-list">${players.map(p => `
        <div class="p"><span class="dot ${p.online ? 'on' : ''}"></span>
          <span class="team-tag ${p.team}">${p.team === 'white' ? '⚪' : '⚫'}</span>
          ${esc(p.name)}${p.you ? ` (${t('you')})` : ''}</div>`).join('') || `<span class="dim">${t('nobodyYet')}</span>`}
      </div>
      <h3>${t('lobbyTitle')}</h3>
      <button class="btn wide" data-action="leavelobby">${t('leaveLobby')}</button>
      <button class="btn danger wide" data-action="newgame">${t('newGame')}</button>
      <button class="btn wide" data-action="closesettings">${t('close')}</button>
    </div>
  </div>`;
}

// ---------- event handling ----------
document.addEventListener('click', e => {
  const stop = e.target.closest('[data-stop]');
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (stop && !stop.contains(el)) return;
  const a = el.dataset;

  switch (a.action) {
    case 'togglelang':
      lang = lang === 'ar' ? 'en' : 'ar';
      localStorage.setItem('dcy-lang', lang);
      applyLang();
      render();
      break;
    case 'createlobby': {
      const name = (lobbyName || (document.getElementById('lobby-name') || {}).value || '').trim();
      if (!name) { toast(t('errLobbyName')); return; }
      lobbyName = '';
      send('createLobby', { name, mode: createMode, teamNames: createTeamNames });
      createTeamNames = { white: '', black: '' };
      break;
    }
    case 'enterlobby':
      send('enterLobby', { id: a.id });
      break;
    case 'dellobby':
      if (confirm(t('confirmDelLobby'))) {
        send('deleteLobby', { id: a.id });
      }
      break;
    case 'leavelobby':
      if (view.you.name && !confirm(t('confirmLeave'))) return;
      showSettings = false;
      joinTeam = null;
      send('leaveLobby');
      break;
    case 'jointeam':
      joinTeam = a.team;
      render();
      break;
    case 'join': {
      const name = (joinName || document.getElementById('join-name').value || '').trim();
      if (!name) { toast(t('errName')); return; }
      if (!joinTeam) { toast(t('errTeam')); return; }
      localStorage.setItem('dcy-name', name);
      send('join', { name, team: joinTeam });
      break;
    }
    case 'tab':
      tab = a.tab;
      localStorage.setItem('dcy-tab', tab);
      render();
      window.scrollTo(0, 0);
      break;
    case 'claim':
      if (a.confirm && !confirm(t('confirmTakeOver'))) return;
      send('claimEncryptor');
      break;
    case 'draw':
      send('drawCode');
      break;
    case 'pick':
      handlePick(a.kind, Number(a.slot), Number(a.digit), a.team);
      break;
    case 'tok':
      send('adjustToken', { team: a.team, kind: a.kind, delta: Number(a.delta) });
      break;
    case 'nextphysical': {
      const r = view.rounds[view.rounds.length - 1];
      const missing = TEAMS.filter(team => !fullCode(r[team].code));
      const msg = missing.length
        ? t('confirmNextMissing', missing.map(teamLabel).join(' & '))
        : t('confirmNext');
      if (confirm(msg)) send('nextRound');
      break;
    }
    case 'createmode':
      createMode = a.mode;
      render();
      break;
    case 'reveal': {
      const my = view.you.team;
      const tr = view.rounds[view.rounds.length - 1][my];
      const msg = Array.isArray(tr.ownGuess) ? t('confirmReveal') : t('confirmRevealNoGuess');
      if (!confirm(msg)) return;
      send('reveal');
      break;
    }
    case 'next':
      send('nextRound');
      break;
    case 'settings':
      showSettings = true; render();
      break;
    case 'closesettings':
      showSettings = false; render();
      break;
    case 'savename': {
      const name = (document.getElementById('set-name').value || '').trim();
      if (name) { localStorage.setItem('dcy-name', name); send('setName', { name }); }
      showSettings = false;
      break;
    }
    case 'switchteam':
      if (confirm(t('confirmSwitch', teamLabel(otherTeam(view.you.team))))) {
        send('requestSwitch');
        showSettings = false;
      }
      break;
    case 'cancelswitch':
      send('cancelSwitch');
      showSettings = false;
      break;
    case 'approveswitch':
      send('approveSwitch', { id: a.id });
      break;
    case 'denyswitch':
      if (confirm(t('confirmDeny'))) send('denySwitch', { id: a.id });
      break;
    case 'newgame':
      if (confirm(t('confirmNewGame')) && confirm(t('confirmNewGame2'))) {
        send('newGame');
        showSettings = false;
      }
      break;
  }
});

function handlePick(kind, slot, digit, team) {
  const my = view.you.team;
  const ri = view.rounds.length - 1;
  const r = view.rounds[ri];
  let cur, sendIt;
  if (kind === 'pcode') {
    const tm = team === 'white' || team === 'black' ? team : my;
    cur = Array.isArray(r[tm].code) ? r[tm].code.slice() : [null, null, null];
    sendIt = code => { r[tm].code = code; send('setCode', { code, team: tm }); };
  } else if (kind === 'code') {
    cur = Array.isArray(r[my].code) ? r[my].code.slice() : [null, null, null];
    sendIt = code => { r[my].code = code; send('setCode', { code }); };
  } else if (kind === 'own') {
    cur = Array.isArray(r[my].ownGuess) ? r[my].ownGuess.slice() : [null, null, null];
    sendIt = code => { r[my].ownGuess = code; send('setOwnGuess', { code }); };
  } else {
    const opp = otherTeam(my);
    cur = Array.isArray(r[opp].interceptGuess) ? r[opp].interceptGuess.slice() : [null, null, null];
    sendIt = code => { r[opp].interceptGuess = code; send('setInterceptGuess', { code }); };
  }
  // tap the selected digit again to clear it
  if (cur[slot] === digit) {
    cur[slot] = null;
  } else {
    // codes never repeat a digit — clear it from any other slot
    for (let i = 0; i < 3; i++) if (i !== slot && cur[i] === digit) cur[i] = null;
    cur[slot] = digit;
  }
  sendIt(cur);
  render();
}

document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'join-name') { joinName = el.value; return; }
  if (el.id === 'lobby-name') { lobbyName = el.value; return; }
  if (el.id === 'ctn-white') { createTeamNames.white = el.value; return; }
  if (el.id === 'ctn-black') { createTeamNames.black = el.value; return; }
  const b = el.dataset.bind;
  if (!b || !view) return;
  const my = view.you.team;
  const i = Number(el.dataset.i || 0);
  const val = el.value;
  if (b === 'clue') {
    view.rounds[view.rounds.length - 1][my].clues[i] = val;
    sendDebounced('clue' + i, 'setClue', { index: i, text: val });
  } else if (b === 'pclue') {
    const team = el.dataset.team;
    view.rounds[view.rounds.length - 1][team].clues[i] = val;
    sendDebounced('pclue' + team + i, 'setClue', { index: i, text: val, team });
  } else if (b === 'teamname') {
    const team = el.dataset.team;
    if (!view.teamNames) view.teamNames = { white: '', black: '' };
    view.teamNames[team] = val;
    sendDebounced('tn' + team, 'setTeamName', { team, name: val });
  } else if (b === 'keyword') {
    view.teams[my].keywords[i] = val;
    sendDebounced('kw' + i, 'setKeyword', { slot: i, text: val });
  } else if (b === 'oppguess') {
    view.teams[my].oppGuesses[i] = val;
    sendDebounced('og' + i, 'setOppGuess', { slot: i, text: val });
  } else if (b === 'notes') {
    view.teams[my].notes = val;
    sendDebounced('notes', 'setNotes', { text: val });
  }
});

// ---------- tab bar ----------
function tabBar() {
  const tb = (id, ico, label) => `
    <button class="${tab === id ? 'active' : ''}" data-action="tab" data-tab="${id}">
      <span class="ico">${ico}</span>${label}</button>`;
  return `<nav><div class="nav-inner">
    ${tb('round', '🎙️', t('tabRound'))}
    ${tb('enemy', '🕵️', t('tabEnemy'))}
    ${tb('ours', '🔑', t('tabOurs'))}
    ${tb('log', '📜', t('tabLog'))}
  </div></nav>`;
}
