// ExtinguisherClear's shared drawing kit: screen helpers, chart boards, parts turned on a lathe
// (whole or sliced in half) and small mesh builders. No physics lives here (see extinguisher.js).
import { THREE, M, clamp, lerp } from './kit.js';

export const COL = {
  ext: 0xc8261b, foam: 0xf3efe0, powder: 0xf1e9a8, co2: 0xe9f4ff, oil: 0xd9a21b,
  brass: 0xd0a245, cut: 0xf0d590, steel: 0xc3c8d1, iron: 0x8a909c, water: 0x4fc3ff, deep: 0x2f86d6, spray: 0xbfe8ff,
  good: 0x5ce1a9, warn: 0xffb547, red: 0xff5a5a, grass: 0x2f6b3a, soil: 0x6b4a32, white: 0xf3f4f6, dark: 0x3a3f49, plastic: 0x23262d,
};
export const brass = (o = {}) => M.metal(COL.brass, { roughness: 0.36, metalness: 0.85, side: THREE.DoubleSide, ...o });
export const cutFace = (color = COL.cut, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide, ...o });
export const waterMat = (color = COL.water, opacity = 0.55) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });

// ---------------------------------------------------------------- screen helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
export const isPortrait = (stage) => stage.camera.aspect < 0.9;
export function rows(head, list, note = '', keep = 3, width = 300) {
  const nar = narrowScreen();
  return `<div style="max-width:${width}px"><div class="big">${head}</div>` + (nar ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('') + (note && !nar ? `<small>${note}</small>` : '') + '</div>';
}
// On a phone-width stage hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = [], y = -0.14, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
// The stage backs the camera off on narrow frames (stage.js). fitView undoes that, so a view can
// be given as a true distance D from the target along dir.
export const aspectK = (stage) => Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, stage.camera.aspect)));
export function fitView(stage, target, dir, D) {
  const k = aspectK(stage), d = new THREE.Vector3(...dir).normalize().multiplyScalar(D / k);
  return { pos: [target[0] + d.x, target[1] + d.y, target[2] + d.z], target };
}
// Call every frame. Re-frames when the stage flips between wide, phone-narrow and tall (the
// upright video), or when key changes. pick(mode, key) returns { pos, target } or nothing.
export function framer(stage, pick) {
  let last = null;
  return (key = '') => {
    const mode = stage.host.clientWidth < 560 && !inReel() ? 'narrow' : isPortrait(stage) ? 'tall' : 'wide';
    const id = mode + '|' + key;
    if (id === last) return mode;
    const first = last === null; last = id;
    const v = pick(mode, key);
    if (v && (!stage.moved || !first)) stage.setView(v.pos, v.target, first ? 0.4 : 0.9);
    return mode;
  };
}
export const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));

// ---------------------------------------------------------------- chart boards
// A canvas on a plane. place(pos, scale, rotY) moves it (for the tall video frame); place() puts it home.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0, rotX = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.set(rotX, rotY, 0); root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), ry: rotY, rx: rotX } };
  b.place = (p = null, scale = 1, ry = b.home.ry, rx = b.home.rx) => {
    if (p) { mesh.position.set(...p); mesh.rotation.set(rx, ry, 0); mesh.scale.setScalar(scale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.set(b.home.rx, b.home.ry, 0); mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }
// Axes for a simple line chart. Returns X(v), Y(v) mappers.
export function axes(g, w, h, { title, sub = '', x0 = 0, x1 = 1, y0 = 0, y1 = 1, xt = [], yt = [], xl = '', pad = [92, 70, 30, 60] }) {
  panelBg(g, w, h);
  const [pl, pt, pr, pb] = pad, cw = w - pl - pr, ch = h - pt - pb;
  const X = (v) => pl + (cw * (v - x0)) / (x1 - x0), Y = (v) => pt + ch * (1 - (v - y0) / (y1 - y0));
  g.fillStyle = '#e8eef8'; g.font = 'bold 44px sans-serif'; g.textAlign = 'left'; g.fillText(title, 26, 54);
  if (sub) { g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.textAlign = 'right'; g.fillText(sub, w - 26, 54); g.textAlign = 'left'; }
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
  for (const [v, t] of yt) { g.beginPath(); g.moveTo(pl, Y(v)); g.lineTo(pl + cw, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(t, pl - 12, Y(v) + 11); }
  g.textAlign = 'center';
  for (const [v, t] of xt) { g.fillText(t, X(v), pt + ch + 36); g.beginPath(); g.moveTo(X(v), pt + ch); g.lineTo(X(v), pt + ch + 6); g.stroke(); }
  if (xl) g.fillText(xl, pl + cw / 2, h - 14);
  g.textAlign = 'left';
  return { X, Y, pl, pt, cw, ch };
}
export function plot(g, X, Y, fn, a, b, color, width = 6, n = 90, dash = null) {
  g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath();
  for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n, y = fn(x); if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y)); }
  g.stroke(); g.setLineDash([]);
}
export function marker(g, x, y, text, color = '#ffb547', w = 9999) {
  g.fillStyle = color; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  if (text) { g.font = 'bold 36px sans-serif'; const tw = g.measureText(text).width; g.fillText(text, x + 18 + tw > w - 10 ? x - 18 - tw : x + 18, Math.max(34, y - 14)); }
}

// ---------------------------------------------------------------- turned parts
// A part turned on a lathe: a closed outline of [r, y] points spun round the Y axis, each face
// with its own crisp normals. cut: keep the back half (z ≤ 0) and close the sliced faces.
export function turn(profile, mat, capMat = null, { cut = false, seg = 40 } = {}) {
  const grp = new THREE.Group(), n = profile.length;
  for (let i = 0; i < n; i++) {
    const p = profile[i], q = profile[(i + 1) % n];
    if (p[0] < 1e-6 && q[0] < 1e-6) continue;
    const g = new THREE.LatheGeometry([new THREE.Vector2(Math.max(1e-4, p[0]), p[1]), new THREE.Vector2(Math.max(1e-4, q[0]), q[1])], cut ? seg / 2 : seg, cut ? Math.PI / 2 : 0, cut ? Math.PI : Math.PI * 2);
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; grp.add(m);
  }
  if (cut && capMat) for (const sgn of [1, -1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(profile.map(([r, y]) => new THREE.Vector2(sgn * r, y)))), capMat);
    m.position.z = 0.02; grp.add(m);
  }
  return grp;
}
export function cylY(r, y0, y1, mat, seg = 28, r1 = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, y1 - y0, seg), mat);
  m.position.y = (y0 + y1) / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}
export function boxAt(w, h, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
// A coil spring round the Y axis.
export function helix(R, y0, y1, turns, wire, mat) {
  const nn = Math.max(8, Math.round(turns * 22)), pts = [];
  for (let i = 0; i <= nn; i++) { const t = i / nn, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(R * Math.cos(a), lerp(y0, y1, t), -R * Math.sin(a))); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nn * 2, wire, 6, false), mat);
  m.castShadow = true;
  return m;
}
export function plate(polys, mat, z = 0) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(polys.map((p) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))))), mat);
  m.position.z = z;
  return m;
}
// Make a part see-through or solid again.
export function ghost(obj, on, opacity = 0.16) {
  obj.traverse((o) => {
    if (!o.material || o.isCSS2DObject) return;
    const m = o.material;
    if (m.userData.op0 === undefined) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; }
    m.transparent = on || m.userData.tr0; m.opacity = on ? opacity : m.userData.op0; m.depthWrite = on ? false : m.userData.dw0;
    o.castShadow = !on;
  });
}

export { THREE, M, clamp, lerp };
