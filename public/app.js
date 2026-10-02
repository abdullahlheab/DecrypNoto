'use strict';

// ---------- storage (can throw in private mode / blocked site data) ----------
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

// ---------- identity ----------
let clientId = lsGet('dcy-id');
if (!clientId || !/^[A-Za-z0-9_-]{8,64}$/.test(clientId)) {
  clientId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now());
  lsSet('dcy-id', clientId);
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
    keyDelete: 'Delete digit',
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
    teamsTitle: 'Team names', teamNamePh: 'custom name (optional)', teamNameShort: 'Team name',
    reqSwitch: t => `Request switch to ${t}`,
    switchPending: '⏳ Switch pending — tap to cancel',
    switchHint: 'Everyone online on the other team must accept the switch — no sneaky peeking.',
    confirmSwitch: t => `Request a switch to ${t}? Everyone online on that team must accept before you move (if none of them are online, you switch right away).`,
    leaveLobby: '🚪 Leave lobby (back to the list)',
    newGame: "🗑 New game (wipes this lobby's notes)",
    confirmNewGame: 'Start a brand-new game? All rounds, words and notes will be wiped for BOTH teams.',
    confirmNewGame2: 'Really sure? This cannot be undone.',
    connLost: '⚠️ Connection lost — reconnecting…',
    removedFromLobby: 'You were removed from the lobby (kicked or the lobby was deleted).',
    ownerTag: 'owner', bannedTitle: 'Kicked players', allowBack: 'Allow back',
    claimFirst: 'Claim the encryptor role to give clues.',
    encryptorTyping: 'Clues appear here when the encryptor submits them.',
    // drafts / submit
    submitBtn: 'Submit', submittedLine: c => `Submitted: ${c}`,
    draftTag: '✍️ draft — not submitted yet (only you see this)',
    nothingSubmitted: 'nothing submitted yet',
    // private notes
    myNotes: '🔒 My private notes', myNotesHint: 'only you can see these — saved to your player',
    myNotesPh: 'your own scratchpad…',
    // user management
    kickBtn: 'Kick', confirmKick: n => `Kick ${n} from the lobby?`,
    // timer
    startTimerBtn: tm => `⏱ Start 1-min timer on ${tm}`,
    timerYou: s => `⏱ ${s} — your team is on the clock!`,
    timerThem: (tm, s) => `⏱ ${s} on ${tm}`,
    timeUp: tm => `🚨 TIME'S UP — ${tm}!`,
    stopTimerBtn: 'Stop', silenceBtn: '🔇 Silence',
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
    keyDelete: 'امسح رقم',
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
    teamsTitle: 'أسماء الفرق', teamNamePh: 'اسم مخصص (اختياري)', teamNameShort: 'اسم الفريق',
    reqSwitch: t => `اطلب الانتقال إلى ${t}`,
    switchPending: '⏳ الطلب معلّق — اضغط للإلغاء',
    switchHint: 'كل المتصلين في الفريق الثاني لازم يوافقون — بلا غش.',
    confirmSwitch: t => `تطلب الانتقال إلى ${t}؟ كل المتصلين فيه لازم يوافقون قبل ما تنتقل (إذا ما فيه أحد متصل، تنتقل فورًا).`,
    leaveLobby: '🚪 اطلع من اللوبي (ارجع للقائمة)',
    newGame: '🗑 لعبة جديدة (يمسح ملاحظات اللوبي)',
    confirmNewGame: 'نبدأ لعبة جديدة؟ كل الجولات والكلمات والملاحظات بتنمسح للفريقين.',
    confirmNewGame2: 'متأكد؟ ما ينفع تتراجع.',
    connLost: '⚠️ انقطع الاتصال — نعيد المحاولة…',
    removedFromLobby: 'انطلعت من اللوبي (انطردت أو انحذف اللوبي).',
    ownerTag: 'صاحب اللوبي', bannedTitle: 'المطرودين', allowBack: 'رجّعه',
    claimFirst: 'استلم دور المشفّر عشان تعطي تلميحات.',
    encryptorTyping: 'التلميحات تطلع هنا أول ما يرسلها المشفّر.',
    submitBtn: 'إرسال', submittedLine: c => `المرسل: ${c}`,
    draftTag: '✍️ مسودة — ما انرسلت بعد (ما يشوفها غيرك)',
    nothingSubmitted: 'ما انرسل شي بعد',
    myNotes: '🔒 ملاحظاتي الخاصة', myNotesHint: 'ما يشوفها أحد غيرك — محفوظة بحسابك',
    myNotesPh: 'دفترك الخاص…',
    kickBtn: 'اطرد', confirmKick: n => `تطرد ${n} من اللوبي؟`,
    startTimerBtn: tm => `⏱ شغّل مؤقت دقيقة على ${tm}`,
    timerYou: s => `⏱ ${s} — فريقك على المؤقت! بسرعة!`,
    timerThem: (tm, s) => `⏱ ${s} على ${tm}`,
    timeUp: tm => `🚨 انتهى الوقت — ${tm}!`,
    stopTimerBtn: 'إيقاف', silenceBtn: '🔇 اسكته',
    tabRound: 'الجولة', tabEnemy: 'كلماتهم', tabOurs: 'كلماتنا', tabLog: 'السجل'
  }
};

let lang = lsGet('dcy-lang') ||
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
let tab = lsGet('dcy-tab') || 'round';
let pendingRender = false;
let joinTeam = null;
let joinName = lsGet('dcy-name') || '';
let lobbyName = '';
let createMode = 'physical';
let createTeamNames = { white: '', black: '' };
let showSettings = false;
let tabSlide = '';        // 'next' / 'prev': slide the new tab in from that side

const TEAMS = ['white', 'black'];
const teamLabelPlain = team => {
  const custom = view && view.teamNames && view.teamNames[team];
  if (custom) return `${team === 'white' ? '⚪' : '⚫'} ${custom}`;
  return team === 'white' ? t('teamWhite') : t('teamBlack');
};
const teamLabel = team => esc(teamLabelPlain(team));
const otherTeam = team => (team === 'white' ? 'black' : 'white');
const $app = document.getElementById('app');

// ---------- server connection ----------
let connected = true;
let leavingOnPurpose = false;
const es = new EventSource('/events?clientId=' + encodeURIComponent(clientId));
es.onopen = () => { if (!connected) { connected = true; render(); } };
es.onerror = () => { if (connected) { connected = false; render(); } };
es.onmessage = e => {
  let next;
  try { next = JSON.parse(e.data); } catch (err) { return; }
  const wasIn = view && view.you && view.you.lobby;
  if (wasIn && !next.you.lobby && !leavingOnPurpose) toast(t('removedFromLobby'));
  if (!next.you.lobby) leavingOnPurpose = false;
  view = next;
  connected = true;
  if (view.serverNow) clockOffset = view.serverNow - Date.now();
  syncDrafts();
  render();
};

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
// a code as little digit tiles (log tab)
function digits(c) { return `<span class="digits">${normCode(c).map(d => `<i>${d == null ? '·' : d}</i>`).join('')}</span>`; }
// a short tick on phones that can vibrate (Android; iOS ignores it)
function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {} }

// ---------- pressure timer + alarm ----------
// serverNow arrives with every state push; the offset corrects phone clock skew
let clockOffset = 0;
function serverTime() { return Date.now() + clockOffset; }
function fmtSecs(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

let audioCtx = null, alarmNodes = null;
function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {}
}
// audio needs a user gesture at least once; every tap keeps it unlocked
document.addEventListener('pointerdown', unlockAudio, { capture: true });

function startAlarm() {
  if (alarmNodes) return;
  unlockAudio();
  if (!audioCtx) return;
  try {
    const gain = audioCtx.createGain();
    gain.gain.value = 0.9;                      // LOUD
    gain.connect(audioCtx.destination);
    const osc = audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 950;
    const lfo = audioCtx.createOscillator();    // siren wobble
    lfo.type = 'square';
    lfo.frequency.value = 5;
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 320;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    osc.start();
    lfo.start();
    alarmNodes = { osc, lfo, gain };
  } catch (e) { alarmNodes = null; }
  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400, 150, 400]);
}
function stopAlarm() {
  if (!alarmNodes) return;
  try { alarmNodes.osc.stop(); alarmNodes.lfo.stop(); alarmNodes.gain.disconnect(); } catch (e) {}
  alarmNodes = null;
  if (navigator.vibrate) navigator.vibrate(0);
}

// tick: keep countdowns fresh and fire/kill the alarm
setInterval(() => {
  if (!view || !view.you || !view.you.lobby || !view.you.team) { stopAlarm(); return; }
  const tms = view.timers || {};
  const active = TEAMS.filter(team => tms[team]);
  const expired = active.some(team => tms[team].endsAt <= serverTime());
  if (expired) startAlarm(); else stopAlarm();
  if (active.length && !isTyping()) render();
}, 500);

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

// ---------- clue drafts (local until submitted) ----------
// Typing never broadcasts; Submit publishes clues (+ code in physical mode).
// Each field remembers the server value it was last synced from ("base").
// When someone else submits, fields you haven't touched follow the server;
// fields you've edited stay yours. Without this, submitting a stale draft
// would wipe clues a teammate had already submitted.
let draftCache = null, draftCacheKey = '';
const normClues = a => [0, 1, 2].map(i => ((a && a[i]) || '').trim());
const normCode = c => (Array.isArray(c) ? [0, 1, 2].map(i => (c[i] == null ? null : c[i])) : [null, null, null]);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function draftKey() { return `dcy-draft-${view.you.lobby.id}-${view.rounds.length - 1}`; }
function serverSide(team) {
  const r = view.rounds[view.rounds.length - 1][team];
  return { clues: normClues(r.clues), code: normCode(r.code) };
}
function freshDraft() {
  const d = {};
  for (const team of TEAMS) {
    const sv = serverSide(team);
    d[team] = { clues: sv.clues.slice(), baseClues: sv.clues.slice(), code: sv.code.slice(), baseCode: sv.code.slice() };
  }
  return d;
}
function getDraft() {
  const k = draftKey();
  if (draftCacheKey !== k) {
    draftCacheKey = k;
    draftCache = null;
    try { draftCache = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    try {  // drop drafts from finished rounds / other lobbies
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('dcy-draft-') && key !== k) localStorage.removeItem(key);
      }
    } catch (e) {}
  }
  const valid = draftCache && TEAMS.every(team => draftCache[team] && Array.isArray(draftCache[team].baseClues));
  if (!valid) { draftCache = freshDraft(); saveDraft(); }
  return draftCache;
}
function saveDraft() { lsSet(draftKey(), JSON.stringify(draftCache)); }

function syncDrafts() {
  if (!view || !view.you || !view.you.lobby || !view.you.team || !view.rounds) return;
  const d = getDraft();
  for (const team of TEAMS) {
    const sv = serverSide(team), dt = d[team];
    for (let i = 0; i < 3; i++) {
      if (dt.clues[i] === dt.baseClues[i] || dt.clues[i].trim() === sv.clues[i]) dt.clues[i] = sv.clues[i];
      dt.baseClues[i] = dt.clues[i] === sv.clues[i] ? sv.clues[i] : dt.baseClues[i];
    }
    // the code merges as a whole — mixing slots could produce a repeated digit
    if (same(dt.code, dt.baseCode) || same(dt.code, sv.code)) { dt.code = sv.code.slice(); dt.baseCode = sv.code.slice(); }
  }
  saveDraft();
}
function draftDirty(team) {
  const dt = getDraft()[team], sv = serverSide(team);
  if (!same(normClues(dt.clues), sv.clues)) return true;
  return view.mode === 'physical' && !same(dt.code, sv.code);
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
// the tab bar hides while the keyboard is up, so the inputs get the room
document.addEventListener('focusin', () => {
  if (isTyping()) document.body.classList.add('typing');
});
document.addEventListener('focusout', () => {
  setTimeout(() => {
    if (isTyping()) return;
    document.body.classList.remove('typing');
    if (pendingRender) { pendingRender = false; render(); }
  }, 80);
});

// ---------- render ----------
function render() {
  if (!view) return;
  if (isTyping()) { pendingRender = true; return; }

  if (!view.you.lobby) { $app.innerHTML = lobbyScreen(); afterRender(); return; }
  if (!view.you.name || !view.you.team) { $app.innerHTML = joinScreen(); afterRender(); return; }

  const tokens = calcTokens(view);
  let html = header(tokens) + (connected ? '' : `<div class="banner lose">${t('connLost')}</div>`) +
    winBanner(tokens) + switchBanners() + timerBar();
  html += `<main${tabSlide ? ` class="slide-${tabSlide}"` : ''}>`;
  tabSlide = '';
  if (tab === 'round') html += roundTab();
  else if (tab === 'enemy') html += enemyTab();
  else if (tab === 'ours') html += oursTab();
  else html += logTab();
  html += '</main>';
  html += tabBar();
  if (showSettings) html += settingsSheet();
  $app.innerHTML = html;
  afterRender();
}

// viz.js (three.js) lays its canvases into the fresh [data-viz] elements
function afterRender() {
  if (window.DcyViz) window.DcyViz.sync();
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
      ${l.canDelete ? `<button class="lobby-del" data-action="dellobby" data-id="${esc(l.id)}" title="${t('delLobbyTitle')}">✕</button>` : ''}
    </div>`;
  }).join('');
  return `<div class="join">
    <div class="row" style="justify-content:flex-end">${langButton()}</div>
    ${lock({ vid: 'hero', code: [4, 2, 3], size: 'hero' })}
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
      <input type="text" id="ctn-white" maxlength="20" placeholder="⚪ ${t('teamNameShort')}"
        value="${esc(createTeamNames.white)}" dir="auto" style="flex:1">
      <input type="text" id="ctn-black" maxlength="20" placeholder="⚫ ${t('teamNameShort')}"
        value="${esc(createTeamNames.black)}" dir="auto" style="flex:1">
    </div>
    <div class="lobby-list">
      ${list || `<div class="dim" style="text-align:center;padding:24px 0">${t('noLobbies')}</div>`}
    </div>
  </div>`;
}

// ---------- join ----------
function joinScreen() {
  const locked = view.you.formerTeam;   // server won't let you rejoin the other side
  const pickedTeam = locked || joinTeam;
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
      <button class="white ${pickedTeam === 'white' ? 'sel' : ''}" data-action="jointeam" data-team="white" ${locked && locked !== 'white' ? 'disabled' : ''}>${teamLabel('white')}</button>
      <button class="black ${pickedTeam === 'black' ? 'sel' : ''}" data-action="jointeam" data-team="black" ${locked && locked !== 'black' ? 'disabled' : ''}>${teamLabel('black')}</button>
    </div>
    <div class="roster-cols">
      <div class="roster-col"><div class="lbl" style="margin-bottom:6px">${teamLabel('white')}</div><div class="chips">${roster('white')}</div></div>
      <div class="roster-col"><div class="lbl" style="margin-bottom:6px">${teamLabel('black')}</div><div class="chips">${roster('black')}</div></div>
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
      <span class="tname" dir="auto">${teamLabel(team)}</span>
      ${coins(team, tokens[team])}
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

// token slots: 2 🕵️ wins, 2 💥 loses — 3D coins drop in via viz.js
function coins(team, tk) {
  const row = (n, ico) => [0, 1].map(i => `<i class="${i < n ? 'on' : ''}">${ico}</i>`).join('');
  const more = tk.int > 2 || tk.mis > 2 ? `<span class="tok-more">${tk.int}·${tk.mis}</span>` : '';
  return `<span class="coins" data-viz="coins" data-vid="coins-${team}" data-int="${tk.int}" data-mis="${tk.mis}"
      role="img" aria-label="🕵️ ${tk.int} · 💥 ${tk.mis}">
      <span class="coin-fb">${row(tk.int, '🕵️')}<span class="coin-gap"></span>${row(tk.mis, '💥')}</span></span>${more}`;
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

// ---------- pressure timer bar ----------
function timerBar() {
  const my = view.you.team, opp = otherTeam(my);
  const tms = view.timers || {};
  let html = '';
  for (const target of TEAMS) {
    const tm = tms[target];
    if (!tm) continue;
    const remain = Math.max(0, Math.ceil((tm.endsAt - serverTime()) / 1000));
    const expired = remain <= 0;
    const mine = target === my;
    let btn;
    if (expired) {
      btn = `<button class="btn primary" data-action="stoptimer" data-team="${target}">${t('silenceBtn')}</button>`;
    } else if (!mine) {
      btn = `<button class="btn danger" data-action="stoptimer" data-team="${target}">${t('stopTimerBtn')}</button>`;
    } else {
      btn = ''; // your own countdown can't be cancelled — sweat it out
    }
    const label = expired
      ? t('timeUp', teamLabel(target))
      : (mine ? t('timerYou', fmtSecs(remain)) : t('timerThem', teamLabel(target), fmtSecs(remain)));
    html += `<div class="banner timerbn ${expired ? 'alarming' : (mine ? 'lose' : '')}">${label} ${btn}</div>`;
  }
  if (!tms[opp]) {
    html += `<div class="timer-start"><button class="btn ghost" data-action="starttimer">${t('startTimerBtn', teamLabel(opp))}</button></div>`;
  }
  return html;
}

// ---------- round tab ----------
function roundTab() {
  if (view.mode === 'physical') return physicalRoundTab();
  const my = view.you.team, opp = otherTeam(my);
  const ri = view.rounds.length - 1;
  const r = view.rounds[ri];
  const mine = myTransmission(r[my], ri), theirs = enemyTransmission(r[opp], ri);
  let html = my === 'white' ? mine + theirs : theirs + mine;   // white always on top
  if (r[my].revealed && r[opp].revealed) {
    html += `<button class="btn primary wide" data-action="next">${t('startRound', ri + 2)}</button>`;
  }
  return html;
}

// physical-cards mode: no roles, no secrets — everyone records the clues said
// aloud for BOTH teams, then punches in the code from the real card once it's
// revealed, which files the clues into the word columns.
function physicalRoundTab() {
  const my = view.you.team;
  const ri = view.rounds.length - 1;
  const r = view.rounds[ri];
  let html = '';
  const draft = getDraft();
  for (const team of TEAMS) {
    const tr = r[team];
    const filed = fullCode(tr.code);
    const d = draft[team];
    const dirty = draftDirty(team);
    let body = `<div class="row"><span class="lbl">${t('clues')}</span><span class="hint">${t('typeAsSaid')}</span></div>`;
    for (let i = 0; i < 3; i++) body += clueInput(team, i, d.clues[i]);
    body += `<div class="divider"></div>
      <div class="row"><span class="lbl">${t('code')}</span>
        ${filed
          ? `<span class="badge good">${t('filed')}</span>`
          : `<span class="hint">${t('codeFromCard')}</span>`}</div>`;
    body += lock({ vid: `pcode-${team}`, code: d.code, kind: 'pcode', team });
    const submittedStr = tr.clues.some(c => c) || Array.isArray(tr.code)
      ? `${tr.clues.map(c => esc(c || '·')).join(' / ')}${Array.isArray(tr.code) ? ' — ' + codeStr(tr.code) : ''}`
      : t('nothingSubmitted');
    body += `<div class="row" style="margin-top:10px">
      <button class="btn ${dirty ? 'primary' : 'ghost'} wide" data-action="submitclues" data-team="${team}">${t('submitBtn')}</button></div>
    <div class="hint submitted-line" dir="auto">${t('submittedLine', submittedStr)}</div>`;
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

function clueInput(team, i, value) {
  return `<div class="clue-row"><span class="clue-num">${i + 1}</span>
    <input type="text" dir="auto" maxlength="80" data-bind="draftclue" data-team="${team}" data-i="${i}"
      enterkeyhint="${i < 2 ? 'next' : 'done'}" autocomplete="off"
      placeholder="${t('cluePh', i + 1)}" value="${esc(value)}"></div>`;
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

  // code — the same lock throughout, so the reveal spins it open
  if (tr.revealed) {
    body += `<div class="row"><span class="lbl">${t('code')}</span></div>`;
    body += lock({ vid: 'code-mine', code: tr.code });
  } else if (tr.encryptorIsYou) {
    body += `<div class="row"><span class="lbl">${t('code')}</span>
      <button class="btn" data-action="draw">${t('drawRandom')}</button>
      <span class="hint">${t('onlyYou')}</span></div>`;
    body += lock({ vid: 'code-mine', code: tr.code, kind: 'code' });
  } else {
    body += `<div class="row"><span class="lbl">${t('code')}</span>
      <span class="badge ${tr.code ? 'good' : ''}">${tr.code ? t('codeSetHidden') : t('waitingEncryptor')}</span></div>`;
    body += lock({ vid: 'code-mine', code: null, hidden: !!tr.code, size: 'sm' });
  }

  // clues — the encryptor drafts locally and submits; teammates read along
  body += `<div class="row"><span class="lbl">${t('clues')}</span></div>`;
  if (tr.encryptorIsYou && !tr.revealed) {
    const d = getDraft()[my];
    const dirty = draftDirty(my);
    for (let i = 0; i < 3; i++) body += clueInput(my, i, d.clues[i]);
    const submittedStr = tr.clues.some(c => c)
      ? tr.clues.map(c => esc(c || '·')).join(' / ')
      : t('nothingSubmitted');
    body += `<div class="row">
      <button class="btn ${dirty ? 'primary' : 'ghost'} wide" data-action="submitclues" data-team="${my}">${t('submitBtn')}</button></div>
    <div class="hint submitted-line" dir="auto">${t('submittedLine', submittedStr)}</div>`;
  } else {
    for (let i = 0; i < 3; i++) {
      body += `<div class="clue-row"><span class="clue-num">${i + 1}</span>
        <div class="clue-view" dir="auto">${esc(tr.clues[i])}</div></div>`;
    }
    if (!tr.revealed && !tr.clues.some(c => c)) {
      body += `<div class="hint">${tr.encryptorName ? t('encryptorTyping') : t('claimFirst')}</div>`;
    }
  }

  // team guess
  body += `<div class="divider"></div>
    <div class="row"><span class="lbl">${t('ourGuess')}</span><span class="hint">${t('guessHint')}</span></div>`;
  if (tr.revealed) {
    const g = tr.ownGuess;
    const ok = eqCode(g, tr.code);
    body += lock({ vid: 'guess-mine', code: g, tint: matchTint(g, tr.code), delay: REVEAL_DELAY });
    body += `<div class="row">
      ${Array.isArray(g) ? `<span class="badge ${ok ? 'good' : 'bad'}">${ok ? t('decoded') : t('miscomm')}</span>` : `<span class="badge warn">${t('noGuess')}</span>`}</div>`;
    if (ri > 0 && Array.isArray(tr.interceptGuess)) {
      const got = eqCode(tr.interceptGuess, tr.code);
      body += `<div class="row"><span class="badge ${got ? 'bad' : 'good'}">${got ? t('interceptedBy', codeStr(tr.interceptGuess)) : t('safeGuess', codeStr(tr.interceptGuess))}</span></div>`;
    }
  } else {
    body += lock({ vid: 'guess-mine', code: tr.ownGuess, kind: 'own' });
    body += `<div class="row" style="margin-top:12px">
      <button class="btn primary wide" data-action="reveal" ${tr.code && (tr.encryptorIsYou || !tr.encryptorName) ? '' : 'disabled'}>${t('reveal')}</button></div>
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

  // their code: a closed lock until they reveal, then it spins open
  body += `<div class="divider"></div><div class="row"><span class="lbl">${t('theirCode')}</span></div>`;
  if (tr.revealed) {
    body += lock({ vid: 'code-theirs', code: tr.code });
    if (ri > 0 && Array.isArray(tr.interceptGuess)) {
      const got = eqCode(tr.interceptGuess, tr.code);
      body += `<div class="row"><span class="lbl">${t('intercept')}</span></div>`;
      body += lock({ vid: 'guess-int', code: tr.interceptGuess, tint: matchTint(tr.interceptGuess, tr.code), delay: REVEAL_DELAY });
      body += `<div class="row"><span class="badge ${got ? 'good' : ''}">${got ? t('weIntercepted') : t('interceptMissedOur', codeStr(tr.interceptGuess))}</span></div>`;
    }
    const ok = eqCode(tr.ownGuess, tr.code);
    if (Array.isArray(tr.ownGuess)) {
      body += `<div class="row"><span class="badge ${ok ? '' : 'warn'}">${ok ? t('theyDecoded') : t('theyMiscommed')}</span></div>`;
    }
  } else {
    body += lock({ vid: 'code-theirs', code: null, hidden: !!tr.code, size: 'sm' });
    if (ri === 0) {
      body += `<div class="hint">${t('round1Note')}</div>`;
    } else {
      body += `<div class="row"><span class="lbl">${t('intercept')}</span><span class="hint">${t('interceptHint')}</span></div>`;
      body += lock({ vid: 'guess-int', code: tr.interceptGuess, kind: 'int' });
      body += `<div class="hint" style="margin-top:8px">${t('checkEnemyTab')}</div>`;
    }
  }

  return `<div class="card"><h2><span class="team-tag ${opp}">${teamLabel(opp)}</span> — ${t('enemyTransmission')}</h2>${body}</div>`;
}

// ---------- code lock ----------
// Every code is a row of three drums: plain digit tiles in HTML, turned into
// a 3D cipher lock by viz.js. Editable locks get a keypad: tap the digits in
// order like a PIN; tap a drum first to change just that digit.
const REVEAL_DELAY = 1150;  // guess drums light up once the code lock lands
const lockCursor = {};      // drum the user tapped, per lock
const lockKey = (kind, team) => `${kind}:${team || ''}:${view.rounds.length}`;

function lock({ vid, code, kind, team, hidden, tint, delay, size }) {
  const c = normCode(code);
  const faces = c.map(d => (hidden ? 5 : d || 0));      // 0 blank, 1-4, 5 hidden
  const cursor = kind ? lockCursor[lockKey(kind, team)] : null;
  const active = kind ? (cursor != null ? cursor : c.indexOf(null)) : -1;
  const POS = [t('pos1'), t('pos2'), t('pos3')];
  const teamAttr = team ? ` data-team="${team}"` : '';
  const drums = faces.map((f, i) => {
    const label = f === 5 ? '?' : (f || '');
    const cls = `drum${i === active ? ' on' : ''}${tint ? ' t-' + tint[i] : ''}`;
    return kind
      ? `<button class="${cls}" data-action="drum" data-kind="${kind}" data-slot="${i}"${teamAttr}
          aria-label="${POS[i]}: ${label || '–'}"><b>${label}</b></button>`
      : `<span class="${cls}"><b>${label}</b></span>`;
  }).join('');
  let html = `<div class="lock${size ? ' ' + size : ''}" data-viz="lock" data-vid="${vid}" data-faces="${faces}"${
    tint ? ` data-tint="${tint}"` : ''}${delay ? ` data-delay="${delay}"` : ''}><div class="drums">${drums}</div></div>`;
  if (kind) {
    const full = !c.includes(null);
    html += '<div class="keypad">';
    for (let d = 1; d <= 4; d++) {
      html += `<button class="${!full && cursor == null && c.includes(d) ? 'used' : ''}"
        data-action="key" data-kind="${kind}" data-digit="${d}"${teamAttr}>${d}</button>`;
    }
    html += `<button class="back" data-action="keyback" data-kind="${kind}"${teamAttr} aria-label="${t('keyDelete')}">⌫</button></div>`;
  }
  return html;
}

// per-drum result colours once a code is revealed: g right, r wrong, d no guess
function matchTint(guess, code) {
  const g = normCode(guess), c = normCode(code);
  return g.map((d, i) => (d == null ? 'd' : d === c[i] ? 'g' : 'r'));
}

// keypad digit: fills the tapped drum, else the first empty one; on a full
// code it starts a new one. Codes never repeat a digit, so a tapped drum takes
// the digit from wherever it was, and an untargeted repeat is ignored.
function keyInto(code, cursor, digit) {
  const c = normCode(code);
  let slot = cursor;
  if (slot == null) {
    slot = c.indexOf(null);
    if (slot < 0) return [digit, null, null];
    if (c.includes(digit)) return c;
  }
  for (let i = 0; i < 3; i++) if (i !== slot && c[i] === digit) c[i] = null;
  c[slot] = digit;
  return c;
}
// ⌫ clears the tapped drum, else the last digit entered
function keyBack(code, cursor) {
  const c = normCode(code);
  let slot = cursor != null && c[cursor] != null ? cursor : -1;
  for (let i = 2; slot < 0 && i >= 0; i--) if (c[i] != null) slot = i;
  if (slot >= 0) c[slot] = null;
  return c;
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
          enterkeyhint="${s < 3 ? 'next' : 'done'}" autocomplete="off"
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
  </div>
  <div class="card"><h2>${t('myNotes')}<span class="spacer"></span><span class="hint">${t('myNotesHint')}</span></h2>
    <textarea dir="auto" data-bind="mynotes" placeholder="${t('myNotesPh')}">${esc(view.you.notes || '')}</textarea>
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
          enterkeyhint="${s < 3 ? 'next' : 'done'}" autocomplete="off"
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
          ? `<span>${t('logCode')} ${digits(tr.code)}</span>`
          : `<span>${t('codeNotRecorded')}</span>`;
      } else if (tr.revealed) {
        meta += `<span>${t('logCode')} ${digits(tr.code)}</span>`;
        if (Array.isArray(tr.ownGuess)) meta += `<span>${eqCode(tr.ownGuess, tr.code) ? t('logDecoded') : t('logMiscomm', codeStr(tr.ownGuess))}</span>`;
        if (i > 0 && Array.isArray(tr.interceptGuess)) meta += `<span>${eqCode(tr.interceptGuess, tr.code) ? t('logIntercepted') : t('logInterceptMissed')}</span>`;
      } else {
        meta = `<span>${t('inProgress')}</span>`;
      }
      // unsubmitted draft for the current round — sits above the older rounds,
      // visible only on this device
      let draftRow = '';
      if (i === view.rounds.length - 1 && (view.mode === 'physical' || team === view.you.team)) {
        const d = getDraft()[team];
        const hasDraftText = d.clues.some(c => (c || '').trim()) ||
          (view.mode === 'physical' && d.code.some(x => x != null));
        if (hasDraftText && draftDirty(team)) {
          const dcode = view.mode === 'physical' && d.code.some(x => x != null) ? ' — ' + codeStr(d.code) : '';
          draftRow = `<div class="log-draft" dir="auto">${d.clues.map(c => esc(c || '·')).join(' / ')}${dcode}
            <span class="log-draft-tag">${t('draftTag')}</span></div>`;
        }
      }
      html += `<div class="log-team">
        <div><span class="team-tag ${team}">${teamLabel(team)}</span> <span class="log-clues" dir="auto">${clues}</span></div>
        ${draftRow}
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
      ${TEAMS.filter(tm => view.you.isOwner || tm === view.you.team).map(tm => `
      <div class="row"><span class="lbl">${tm === 'white' ? '⚪' : '⚫'}</span>
        <input type="text" maxlength="20" data-bind="teamname" data-team="${tm}"
          placeholder="${t('teamNamePh')}" value="${esc((view.teamNames || {})[tm] || '')}" dir="auto" style="flex:1"></div>`).join('')}
      <h3>${t('langTitle')}</h3>
      <button class="btn wide" data-action="togglelang">🌐 ${t('langButton')}</button>
      <h3>${t('playersTitle')}</h3>
      <div class="player-list">${players.map(p => `
        <div class="p"><span class="dot ${p.online ? 'on' : ''}"></span>
          <span class="team-tag ${p.team}">${p.team === 'white' ? '⚪' : '⚫'}</span>
          ${p.owner ? '👑 ' : ''}${esc(p.name)}${p.you ? ` (${t('you')})` : ''}
          ${view.you.isOwner && !p.you
            ? `<button class="btn ghost kick-btn" data-action="kick" data-pid="${esc(p.pid)}" data-pname="${esc(p.name)}">${t('kickBtn')}</button>`
            : ''}</div>`).join('') || `<span class="dim">${t('nobodyYet')}</span>`}
      </div>
      ${(view.banned || []).length ? `<h3>${t('bannedTitle')}</h3>
      <div class="player-list">${view.banned.map(b => `
        <div class="p">🚫 ${esc(b.name)}
          <button class="btn ghost kick-btn" data-action="unban" data-pid="${esc(b.pid)}">${t('allowBack')}</button></div>`).join('')}
      </div>` : ''}
      <h3>${t('lobbyTitle')}</h3>
      <button class="btn wide" data-action="leavelobby">${t('leaveLobby')}</button>
      ${view.you.isOwner ? `<button class="btn danger wide" data-action="newgame">${t('newGame')}</button>` : ''}
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
      lsSet('dcy-lang', lang);
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
      leavingOnPurpose = true;
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
      const team = view.you.formerTeam || joinTeam;
      if (!team) { toast(t('errTeam')); return; }
      lsSet('dcy-name', name);
      send('join', { name, team });
      break;
    }
    case 'tab':
      goTab(a.tab);
      break;
    case 'claim':
      if (a.confirm && !confirm(t('confirmTakeOver'))) return;
      send('claimEncryptor');
      break;
    case 'draw':
      send('drawCode');
      break;
    case 'drum': {
      // tap a drum to aim the keypad at it; tap it again to clear it
      const key = lockKey(a.kind, a.team), slot = Number(a.slot);
      if (lockCursor[key] === slot) {
        const acc = codeAccess(a.kind, a.team);
        if (acc.cur[slot] != null) acc.set(keyBack(acc.cur, slot));
      } else {
        lockCursor[key] = slot;
      }
      buzz();
      render();
      break;
    }
    case 'key': {
      const key = lockKey(a.kind, a.team);
      const acc = codeAccess(a.kind, a.team);
      const next = keyInto(acc.cur, lockCursor[key], Number(a.digit));
      delete lockCursor[key];
      if (!same(next, acc.cur)) acc.set(next);
      buzz();
      render();
      break;
    }
    case 'keyback': {
      const acc = codeAccess(a.kind, a.team);
      const next = keyBack(acc.cur, lockCursor[lockKey(a.kind, a.team)]);
      if (!same(next, acc.cur)) acc.set(next);
      buzz();
      render();
      break;
    }
    case 'tok':
      send('adjustToken', { team: a.team, kind: a.kind, delta: Number(a.delta) });
      break;
    case 'submitclues': {
      const team = a.team;
      const d = getDraft()[team];
      const payload = { team, clues: d.clues };
      if (view.mode === 'physical') payload.code = d.code;
      send('submitClues', payload);
      break;
    }
    case 'unban':
      send('unbanPlayer', { pid: a.pid });
      break;
    case 'kick':
      if (confirm(t('confirmKick', a.pname || '?'))) send('kickPlayer', { pid: a.pid });
      break;
    case 'starttimer':
      unlockAudio();
      send('startTimer');
      break;
    case 'stoptimer':
      send('stopTimer', { team: a.team });
      break;
    case 'nextphysical': {
      const r = view.rounds[view.rounds.length - 1];
      const missing = TEAMS.filter(team => !fullCode(r[team].code));
      const msg = missing.length
        ? t('confirmNextMissing', missing.map(teamLabelPlain).join(' & '))
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
      if (name) { lsSet('dcy-name', name); send('setName', { name }); }
      showSettings = false;
      break;
    }
    case 'switchteam':
      if (confirm(t('confirmSwitch', teamLabelPlain(otherTeam(view.you.team))))) {
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

// the code a lock edits, and how to store a new value
function codeAccess(kind, team) {
  const my = view.you.team;
  const r = view.rounds[view.rounds.length - 1];
  if (kind === 'pcode') {
    // physical-mode code digits are part of the draft — published on submit
    const tm = team === 'white' || team === 'black' ? team : my;
    const d = getDraft();
    return { cur: d[tm].code.slice(), set: code => { d[tm].code = code; saveDraft(); } };
  }
  if (kind === 'code') {
    return { cur: normCode(r[my].code), set: code => { r[my].code = code; send('setCode', { code }); } };
  }
  if (kind === 'own') {
    return { cur: normCode(r[my].ownGuess), set: code => { r[my].ownGuess = code; send('setOwnGuess', { code }); } };
  }
  const opp = otherTeam(my);
  return { cur: normCode(r[opp].interceptGuess), set: code => { r[opp].interceptGuess = code; send('setInterceptGuess', { code }); } };
}

function goTab(next, dir) {
  if (next === tab) return;
  const order = TABS.map(x => x.id);
  tabSlide = (dir || order.indexOf(next) - order.indexOf(tab)) > 0 ? 'next' : 'prev';
  tab = next;
  lsSet('dcy-tab', tab);
  buzz(6);
  render();
  window.scrollTo(0, 0);
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
  if (b === 'draftclue') {
    const team = el.dataset.team;
    getDraft()[team].clues[i] = val;
    saveDraft();               // local only — nothing broadcast until submit
  } else if (b === 'mynotes') {
    view.you.notes = val;
    sendDebounced('mynotes', 'setMyNotes', { text: val });
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

// ---------- tab bar + swipe between tabs ----------
const TABS = [
  { id: 'round', ico: '🎙️', label: 'tabRound' },
  { id: 'enemy', ico: '🕵️', label: 'tabEnemy' },
  { id: 'ours', ico: '🔑', label: 'tabOurs' },
  { id: 'log', ico: '📜', label: 'tabLog' }
];
function tabBar() {
  return `<nav><div class="nav-inner">${TABS.map(x => `
    <button class="${tab === x.id ? 'active' : ''}" data-action="tab" data-tab="${x.id}">
      <span class="ico">${x.ico}</span>${t(x.label)}</button>`).join('')}
  </div></nav>`;
}

// a quick sideways flick anywhere outside the inputs and locks changes tab
let swipe = null;
document.addEventListener('touchstart', e => {
  swipe = null;
  if (e.touches.length !== 1 || !view || !view.you || !view.you.team || showSettings || isTyping()) return;
  if (e.target.closest('input, textarea, .lock, .keypad, header, nav, .overlay')) return;
  swipe = { x: e.touches[0].clientX, y: e.touches[0].clientY, at: Date.now() };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!swipe) return;
  const p = e.changedTouches[0];
  const dx = p.clientX - swipe.x, dy = p.clientY - swipe.y;
  const quick = Date.now() - swipe.at < 700;
  swipe = null;
  if (!quick || Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return;
  const dir = (dx < 0 ? 1 : -1) * (lang === 'ar' ? -1 : 1);   // RTL mirrors the tab order
  const order = TABS.map(x => x.id);
  const next = order[order.indexOf(tab) + dir];
  if (next) goTab(next, dir);
}, { passive: true });

// Enter in a clue / keyword field jumps to the next one, like a form
document.addEventListener('keydown', e => {
  const el = e.target;
  const b = el && el.dataset && el.dataset.bind;
  if (e.key !== 'Enter' || !['draftclue', 'keyword', 'oppguess'].includes(b)) return;
  e.preventDefault();
  const team = el.dataset.team ? `[data-team="${el.dataset.team}"]` : '';
  const next = $app.querySelector(`[data-bind="${b}"]${team}[data-i="${Number(el.dataset.i) + 1}"]`);
  if (next) next.focus(); else el.blur();
});
