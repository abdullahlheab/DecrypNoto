'use strict';
// Decrypnoto's 3D layer: the cipher locks that show every code, and the token
// coins in the scoreboard, drawn with three.js.
//
// app.js renders plain HTML and stays fully usable without this file. Each
// element with data-viz gets a canvas laid underneath it, and the HTML digits
// hide once WebGL is up (html.viz). A single WebGL context renders every view
// and copies the frame into that view's own 2D canvas, so views scroll
// natively with the page, survive app.js re-rendering the DOM (the canvas is
// moved into the fresh placeholder), and nothing draws while the game is idle.
//
// Edit this file, then `npm run build` bundles it with three.js into
// public/viz.js (the file the browser loads).

import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, CylinderGeometry,
  MeshStandardMaterial, CanvasTexture, HemisphereLight, DirectionalLight,
  Color, SRGBColorSpace
} from 'three';

const root = document.documentElement;
const reduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
const MAX_DPR = 3;
const FOV = 24;

let renderer = null;
try {
  renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
} catch (e) {
  renderer = null;  // no WebGL: the HTML locks and coins stay visible
}

// ---------- tweening ----------
const ease = {
  out: t => 1 - Math.pow(1 - t, 3),
  back: t => { const c = 1.7, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
  bounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
};
const now = () => performance.now();
const dur = ms => (reduced.matches ? 0 : ms);
// 0..1 progress of a tween (0 while it waits for a delayed start)
function prog(tw, t) {
  if (!tw.dur) return t >= tw.start ? 1 : 0;
  return Math.min(1, Math.max(0, (t - tw.start) / tw.dur));
}

// ---------- shared scene bits ----------
function lit(scene) {
  scene.add(new HemisphereLight(0xe4edff, 0x1a222c, 2.2));
  const sun = new DirectionalLight(0xffffff, 3.2);
  sun.position.set(-0.45, 1, 1.1);
  scene.add(sun);
}
// camera framed so the z=0 plane maps 1:1 onto the element's CSS pixels
function frameCamera(cam, w, h) {
  const d = (h / 2) / Math.tan((FOV / 2) * Math.PI / 180);
  cam.aspect = w / h;
  cam.near = d / 4;
  cam.far = d * 4;
  cam.position.set(w / 2, 0, d);
  cam.lookAt(w / 2, 0, 0);
  cam.updateProjectionMatrix();
}
function texture(canvas) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// ================================================================
// Cipher lock: three hexagonal drums, one per code digit. The facets read
// · 1 2 3 4 ? (blank, the digits, hidden), so stepping 1→2 rolls one facet.
// ================================================================
const FACES = ['·', '1', '2', '3', '4', '?'];
const STEP = Math.PI / 3;
const K = 2;                  // drum width ÷ radius; the facet art is drawn for it
const faceAngle = f => (f + 0.5) * STEP;
const TINT = {
  n: new Color(0xffffff),     // normal
  g: new Color('#7dffb4'),    // matches the real code
  r: new Color('#ff8080'),    // doesn't
  d: new Color('#8d9aa8')     // waiting / hidden
};

let drumGeo = null, axleGeo = null, faceTex = null, axleMat = null;
function drumParts() {
  if (drumGeo) return;
  drumGeo = new CylinderGeometry(1, 1, 1, 6, 1, false).rotateZ(Math.PI / 2);
  axleGeo = new CylinderGeometry(1, 1, 1, 16, 1, false).rotateZ(Math.PI / 2);
  axleMat = new MeshStandardMaterial({ color: 0x55657a, roughness: 0.35, metalness: 0.7 });
  faceTex = texture(paintFaces());
}

// The drum's side unrolls into a strip: one 256px column per facet, running
// around the drum, and K·256px across its width. Text is turned 90° so it
// stands upright once wrapped around the sideways cylinder.
function paintFaces() {
  const F = 256, W = F * K;
  const c = document.createElement('canvas');
  c.width = F * FACES.length;
  c.height = W;
  const g = c.getContext('2d');
  FACES.forEach((label, i) => {
    const x = i * F;
    const grad = g.createLinearGradient(x, 0, x + F, 0);
    grad.addColorStop(0, '#1a2430');
    grad.addColorStop(0.5, '#2c3a4b');
    grad.addColorStop(1, '#1a2430');
    g.fillStyle = grad;
    g.fillRect(x, 0, F, W);
    g.fillStyle = '#0a0e13';                      // engraved rims at both ends
    g.fillRect(x, 0, F, 18);
    g.fillRect(x, W - 18, F, 18);
    g.fillStyle = 'rgba(255,255,255,.08)';        // facet edge highlight
    g.fillRect(x, 0, 4, W);
    g.save();
    g.translate(x + F / 2, W / 2);
    g.rotate(Math.PI / 2);
    if (label === '·') {
      g.fillStyle = '#5d6e81';
      g.beginPath();
      g.arc(0, 0, F * 0.07, 0, Math.PI * 2);
      g.fill();
    } else {
      g.font = `700 ${Math.round(F * 0.8)}px ui-monospace, "SF Mono", Menlo, "Roboto Mono", Consolas, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = label === '?' ? '#7d8ea1' : '#f3f7fb';
      g.fillText(label, 0, F * 0.05);
    }
    g.restore();
  });
  return c;
}

function makeLock(hero) {
  drumParts();
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 1000);
  lit(scene);
  const axle = new Mesh(axleGeo, axleMat);
  scene.add(axle);
  const drums = [0, 1, 2].map(() => {
    const body = new MeshStandardMaterial({ map: faceTex, flatShading: true, roughness: 0.5, metalness: 0.1 });
    const cap = new MeshStandardMaterial({ color: 0x5b6a7c, flatShading: true, roughness: 0.32, metalness: 0.55 });
    const mesh = new Mesh(drumGeo, [body, cap, cap]);
    scene.add(mesh);
    return { mesh, body, face: -1, angle: 0, spin: null, wobble: null, tintKey: '', tint: null };
  });

  const v = {
    scene, camera, hero, sig: '', layoutSig: '',

    // positions the drums over the HTML drum buttons (CSS px, y up)
    place(w, h, slots) {
      frameCamera(camera, w, h);
      const r = Math.min(h * 0.46, ...slots.map(s => (s.w * 0.9) / K));
      const z = -r * Math.cos(Math.PI / 6);   // front facet lands on the 1:1 plane
      drums.forEach((dr, i) => {
        const s = slots[i];
        dr.mesh.scale.set(K * r, r, r);
        dr.mesh.position.set(s.x, s.y, z);
      });
      const left = slots[0].x - K * r / 2 - r * 0.25;
      const right = slots[2].x + K * r / 2 + r * 0.25;
      axle.scale.set(right - left, r * 0.17, r * 0.17);
      axle.position.set((left + right) / 2, slots[1].y, z);
    },

    update(ds, fresh) {
      if (hero && !fresh) return false;      // the hero rolls itself
      const faces = (ds.faces || '0,0,0').split(',').map(n => Math.max(0, Math.min(5, Number(n) || 0)));
      const tints = (ds.tint || '').split(',');
      const sig = `${faces}|${tints}`;
      if (!fresh && sig === v.sig) return false;
      v.sig = sig;
      const t = now();
      const delay = Number(ds.delay) || 0;
      const changed = faces.filter((f, i) => f !== drums[i].face).length;
      // a freshly drawn or revealed code spins like a slot machine; one
      // digit typed on the keypad just rolls that drum to it
      const big = !fresh && changed >= 2 && faces.every(f => f >= 1 && f <= 4);
      drums.forEach((dr, i) => {
        const f = faces[i];
        if (fresh) {
          dr.face = f;
          dr.angle = faceAngle(f);
          dr.spin = dr.wobble = null;
        } else if (f !== dr.face) {
          const from = angleNow(dr, t);
          let steps = (((f - dr.face) % 6) + 6) % 6;
          let ms = 380, fn = ease.back;
          if (big) { steps += 6 * (1 + i); ms = 950 + i * 280; fn = ease.out; }
          else if (steps > 3) steps -= 6;      // roll the short way round
          dr.spin = { from, to: from + steps * STEP, start: t, dur: dur(ms), fn };
          dr.face = f;
        }
        const key = TINT[tints[i]] ? tints[i] : 'n';
        if (key !== dr.tintKey) {
          const at = (dr.spin ? dr.spin.start + dr.spin.dur : t) + (fresh ? 0 : dur(delay + i * 160));
          dr.tint = { from: dr.body.color.clone(), to: TINT[key], start: at, dur: fresh ? 0 : dur(280) };
          if (!fresh && !dr.spin && key !== 'n') dr.wobble = { start: at, dur: dur(650) };
          dr.tintKey = key;
        }
      });
      return true;
    },

    tick(t) {
      let moving = false;
      for (const dr of drums) {
        let a = angleNow(dr, t);
        if (dr.spin && prog(dr.spin, t) >= 1) { dr.angle = dr.spin.to; dr.spin = null; }
        if (dr.spin) moving = true;
        if (dr.wobble) {
          const p = prog(dr.wobble, t);
          a += Math.sin(p * Math.PI * 4) * (1 - p) * 0.28;
          if (p >= 1) dr.wobble = null; else moving = true;
        }
        dr.mesh.rotation.x = a;
        if (dr.tint) {
          const p = prog(dr.tint, t);
          dr.body.color.lerpColors(dr.tint.from, dr.tint.to, ease.out(p));
          if (p >= 1) dr.tint = null; else moving = true;
        }
      }
      return moving;
    },

    // hero only: spin to a random code
    roll() {
      const d = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
      const t = now();
      drums.forEach((dr, i) => {
        const from = angleNow(dr, t);
        const steps = ((((d[i] - dr.face) % 6) + 6) % 6) + 6 * (1 + i);
        dr.spin = { from, to: from + steps * STEP, start: t + i * 90, dur: dur(1000 + i * 260), fn: ease.out };
        dr.face = d[i];
      });
    }
  };
  return v;
}

function angleNow(dr, t) {
  if (!dr.spin) return dr.angle;
  return dr.spin.from + (dr.spin.to - dr.spin.from) * dr.spin.fn(prog(dr.spin, t));
}

// ================================================================
// Token coins: two slots per kind, since 2 🕵️ wins and 2 💥 loses.
// ================================================================
const COIN = {
  int: { emoji: '🕵️', rim: '#e9c46a', face: ['#fff3c9', '#d8b04c'] },
  mis: { emoji: '💥', rim: '#e0645a', face: ['#ffd0c4', '#b8443c'] }
};
let coinGeo = null, socketMat = null;
const coinMats = {};
function coinParts() {
  if (coinGeo) return;
  // faces toward the camera, turned so the face art stands upright
  coinGeo = new CylinderGeometry(1, 1, 0.18, 40, 1, false).rotateX(Math.PI / 2).rotateZ(Math.PI / 2);
  socketMat = new MeshStandardMaterial({ color: 0x1a2330, roughness: 0.9, metalness: 0 });
  for (const kind of Object.keys(COIN)) {
    const k = COIN[kind];
    const edge = new MeshStandardMaterial({ color: k.rim, roughness: 0.3, metalness: 0.75 });
    const face = new MeshStandardMaterial({ map: texture(paintCoin(k)), roughness: 0.4, metalness: 0.25 });
    coinMats[kind] = [edge, face, edge];
  }
}
function paintCoin(k) {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(S * 0.38, S * 0.32, S * 0.05, S / 2, S / 2, S * 0.5);
  grad.addColorStop(0, k.face[0]);
  grad.addColorStop(1, k.face[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(0,0,0,.25)';
  g.lineWidth = S * 0.035;
  g.beginPath();
  g.arc(S / 2, S / 2, S * 0.4, 0, Math.PI * 2);
  g.stroke();
  g.font = `${Math.round(S * 0.5)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(k.emoji, S / 2, S * 0.53);
  return c;
}

function makeCoins() {
  coinParts();
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 1000);
  lit(scene);
  const slots = ['int', 'int', 'mis', 'mis'].map(kind => {
    const socket = new Mesh(coinGeo, socketMat);
    const coin = new Mesh(coinGeo, coinMats[kind]);
    coin.visible = false;
    scene.add(socket, coin);
    return { kind, socket, coin, on: false, anim: null, y: 0, r: 1 };
  });
  const v = {
    scene, camera, sig: '', layoutSig: '',
    place(w, h) {
      frameCamera(camera, w, h);
      const unit = w / 4.8;                    // a small gap between 🕵️ and 💥
      const r = Math.min(h * 0.4, unit * 0.42);
      [0.65, 1.65, 3.15, 4.15].forEach((u, i) => {
        const s = slots[i];
        s.r = r;
        s.socket.position.set(u * unit, 0, -r * 0.4);
        s.socket.scale.set(r * 0.86, r * 0.86, r * 0.5);
        s.coin.position.set(u * unit, 0, 0);
        s.coin.scale.set(r, r, r);
      });
      v.h = h;
    },
    update(ds, fresh) {
      const counts = { int: Number(ds.int) || 0, mis: Number(ds.mis) || 0 };
      const sig = `${counts.int}|${counts.mis}`;
      if (!fresh && sig === v.sig) return false;
      v.sig = sig;
      const t = now();
      let n = 0;
      slots.forEach((s, i) => {
        const on = (i % 2) < counts[s.kind];
        if (on === s.on && !fresh) return;
        s.on = on;
        if (fresh) { s.anim = null; s.coin.visible = on; return; }
        s.coin.visible = true;
        s.anim = { on, start: t + n++ * 140, dur: dur(on ? 900 : 260) };
      });
      return true;
    },
    tick(t) {
      let moving = false;
      for (const s of slots) {
        const c = s.coin;
        let y = 0, spin = 0, k = 1;
        if (s.anim) {
          const p = prog(s.anim, t);
          if (s.anim.on) {
            y = (1 - ease.bounce(p)) * v.h;   // drops in and bounces
            spin = (1 - ease.out(p)) * Math.PI * 4;
          } else {
            k = 1 - ease.out(p);              // shrinks away
          }
          if (p >= 1) { s.anim = null; c.visible = s.on; } else moving = true;
        }
        c.position.y = y;
        c.rotation.set(-0.38, 0.32 + spin, 0);
        c.scale.set(s.r * k, s.r * k, s.r * k);
      }
      return moving;
    }
  };
  return v;
}

// ================================================================
// view registry, layout and the on-demand render loop
// ================================================================
const views = new Map();
let lost = false;
let glW = 0, glH = 0;
let raf = 0;

function makeView(type, el) {
  const v = type === 'coins' ? makeCoins() : makeLock(el.dataset.vid === 'hero');
  v.type = type;
  v.canvas = document.createElement('canvas');
  v.canvas.className = 'viz-canvas';
  v.canvas.setAttribute('aria-hidden', 'true');
  v.ctx = v.canvas.getContext('2d');
  v.w = v.h = v.pw = v.ph = 0;
  return v;
}

// keeps each view's backing store and 3D layout in step with its element
function layout(v) {
  const el = v.el;
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (pw !== v.pw || ph !== v.ph) {
    v.pw = v.canvas.width = pw;              // resizing also clears it
    v.ph = v.canvas.height = ph;
    v.dirty = true;
  }
  let slots = null, sig = `${w}x${h}`;
  if (v.type === 'lock') {
    const box = el.getBoundingClientRect();
    slots = [...el.querySelectorAll('.drum')].slice(0, 3).map(d => {
      const b = d.getBoundingClientRect();
      return { x: b.left - box.left + b.width / 2, y: h / 2 - (b.top - box.top + b.height / 2), w: b.width };
    });
    if (slots.length < 3) return;
    sig += slots.map(s => `${s.x.toFixed(1)},${s.y.toFixed(1)},${s.w.toFixed(1)}`).join(';');
  }
  if (sig !== v.layoutSig) {
    v.layoutSig = sig;
    v.place(w, h, slots);
    v.dirty = true;
  }
}

function sync() {
  if (lost) return;
  for (const el of document.querySelectorAll('[data-viz]')) {
    const id = el.dataset.vid;
    if (!id) continue;
    let v = views.get(id);
    const fresh = !v || v.type !== el.dataset.viz;
    if (fresh) {
      v = makeView(el.dataset.viz, el);
      views.set(id, v);
    }
    v.el = el;
    if (v.canvas.parentNode !== el) el.prepend(v.canvas);
    layout(v);
    if (v.update(el.dataset, fresh)) v.dirty = true;
  }
  kick();
}

function kick() {
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame() {
  raf = 0;
  if (lost) return;
  const t = now();
  let busy = false;
  for (const v of views.values()) {
    if (!v.canvas.isConnected || !v.pw) continue;
    const moving = v.tick(t);
    if (moving || v.dirty) draw(v);
    busy = busy || moving;
  }
  if (busy) kick();
}

function draw(v) {
  v.dirty = false;
  if (v.pw > glW || v.ph > glH) {
    glW = Math.max(glW, v.pw);
    glH = Math.max(glH, v.ph);
    renderer.setSize(glW, glH, false);
  }
  renderer.setViewport(0, 0, v.pw, v.ph);
  renderer.setScissor(0, 0, v.pw, v.ph);
  renderer.setScissorTest(true);
  renderer.render(v.scene, v.camera);
  // GL's origin is bottom-left: the viewport sits at the bottom of the buffer
  v.ctx.clearRect(0, 0, v.pw, v.ph);
  v.ctx.drawImage(renderer.domElement, 0, glH - v.ph, v.pw, v.ph, 0, 0, v.pw, v.ph);
}

// the lobby screen's hero lock rolls a new code now and then, or when tapped
function rollHero() {
  const v = views.get('hero');
  if (!v || !v.canvas.isConnected || !v.pw) return;
  v.roll();
  kick();
}

if (renderer) {
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  const gl = renderer.domElement;
  gl.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    lost = true;
    root.classList.remove('viz');
  });
  gl.addEventListener('webglcontextrestored', () => {
    lost = false;
    root.classList.add('viz');
    for (const v of views.values()) v.dirty = true;
    sync();
  });
  root.classList.add('viz');
  window.DcyViz = { sync };
  window.addEventListener('resize', sync);
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('[data-vid="hero"]')) rollHero();
  });
  setInterval(() => { if (!document.hidden && !reduced.matches) rollHero(); }, 4200);
  sync();
}
