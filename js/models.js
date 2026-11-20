// The extinguisher cylinders drawn in metres: a stored-pressure body (water, foam or powder) and a
// CO2 one, each as a whole or cut in half, with live pieces (liquid level, gas molecules, gauge, lever, pin).
import { THREE, M, clamp, lerp } from './kit.js';
import { COL, turn, cylY, boxAt, cutFace } from './parts.js';
import { AGENTS } from './extinguisher.js';

const tri = (x) => Math.abs(((x % 2) + 2) % 2 - 1);                // triangle wave 0..1..0
const frac = (v) => v - Math.floor(v);
const redShell = (o = {}) => new THREE.MeshStandardMaterial({ color: COL.ext, roughness: 0.38, metalness: 0.35, side: THREE.DoubleSide, ...o });
const steel = (o = {}) => M.metal(0xc3c8d1, { roughness: 0.3, side: THREE.DoubleSide, ...o });
const brassM = (o = {}) => M.metal(COL.brass, { roughness: 0.36, metalness: 0.85, side: THREE.DoubleSide, ...o });

// Outer outline [r, y] of a stored-pressure body, with the inner outline offset by wall t.
export function bodyProfile(R, H, t) {
  const O = [[0, 0], [R - 0.025, 0], [R, 0.03], [R, H - 0.05], [R * 0.82, H], [0.04, H + 0.026], [0.04, H + 0.05]];
  const I = O.map(([r, y], i) => (i === 0 ? [0, y + t] : i === O.length - 1 ? [r - t, y] : [r - t, y + (i < 3 ? t : -t)])).reverse();
  return [...O, ...I];
}

// A half or whole cylinder of unit height whose base is at y = 0 (scale y to set the level).
export function column(r, mat, cut) {
  const g = new THREE.Group();
  const geo = cut ? new THREE.CylinderGeometry(r, r, 1, 40, 1, false, Math.PI / 2, Math.PI) : new THREE.CylinderGeometry(r, r, 1, 40);
  const m = new THREE.Mesh(geo, mat); m.position.y = 0.5; g.add(m);
  if (cut) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2 * r, 1), mat); p.position.y = 0.5; g.add(p); }
  return g;
}

// Gauge face: a dial from 0 to max bar with a green working band and a needle.
export function gaugeFace(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const draw = (bar, { max = 20, green = [10, 15], red = true } = {}) => {
    const s = size, cx = s / 2, cy = s / 2 + s * 0.02, R = s * 0.46, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    const ang = (v) => a0 + (clamp(v, 0, max) / max) * (a1 - a0);
    g.clearRect(0, 0, s, s); g.fillStyle = '#f4f4ee'; g.beginPath(); g.arc(cx, cy, s * 0.5 - 2, 0, 7); g.fill();
    g.lineWidth = s * 0.07;
    const band = (v0, v1, col) => { g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, R * 0.8, ang(v0), ang(v1)); g.stroke(); };
    if (red) { band(0, green[0], '#e24a3b'); band(green[1], max, '#e24a3b'); }
    band(green[0], green[1], '#2fae6a');
    g.strokeStyle = '#222'; g.lineWidth = s * 0.012; g.fillStyle = '#222'; g.font = `bold ${s * 0.07}px sans-serif`; g.textAlign = 'center';
    for (let v = 0; v <= max; v += 5) { const a = ang(v); g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); g.lineTo(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66); g.stroke(); g.fillText(v, cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5 + s * 0.025); }
    g.font = `${s * 0.06}px sans-serif`; g.fillText('BAR', cx, cy + R * 0.9);
    const a = ang(bar); g.strokeStyle = '#111'; g.lineWidth = s * 0.03; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85); g.stroke();
    g.fillStyle = '#111'; g.beginPath(); g.arc(cx, cy, s * 0.035, 0, 7); g.fill();
    tex.needsUpdate = true;
  };
  draw(0);
  return { tex, draw };
}

// ---------------------------------------------------------------- stored-pressure cylinder
// The spray axis of the nozzle is local +X. opts.hose: 'clip' (hose clipped to the body) or 'free'
// (hose to a nozzle at nozzlePos, for the technique chapter).
export function makeStored(id, { cut = false, hose = 'clip', nozzlePos = [0.42, 0.9, 0.12] } = {}) {
  const a = AGENTS[id], R = 0.085, H = 0.5, t = 0.006, Hin = H - 2 * t;
  const g = new THREE.Group(), parts = {};
  const shell = turn(bodyProfile(R, H, t), redShell(), cutFace(0xe8e0d0, { roughness: 0.7 }), { cut, seg: 48 }); g.add(shell); parts.shell = shell;
  // agent and gas
  const liqMat = new THREE.MeshStandardMaterial({ color: a.color, transparent: true, opacity: id === 'powder' ? 0.95 : 0.72, roughness: id === 'powder' ? 0.95 : 0.1, side: THREE.DoubleSide, depthWrite: id === 'powder' });
  const liquid = column(R - t - 0.002, liqMat, cut); liquid.position.y = t; g.add(liquid); parts.liquid = liquid;
  const dip = cylY(0.0075, 0.02, H + 0.06, steel(), 14); dip.position.z = cut ? -0.012 : 0; g.add(dip); parts.dip = dip;
  const N = 56, gasM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0042, 8, 6), M.glow(0xfff0a0), N); gasM.frustumCulled = false; g.add(gasM); parts.gas = gasM;
  const seed = Array.from({ length: N }, (_, i) => [frac(Math.sin(i * 12.9898) * 43758.5), frac(Math.sin(i * 78.233) * 12345.6), frac(Math.sin(i * 39.346) * 9871.3), 0.4 + frac(i * 0.618)]);
  const o = new THREE.Object3D();
  // valve head
  const top = H + 0.05, vy = top + 0.03;
  const valve = new THREE.Group(); g.add(valve); parts.valve = valve;
  valve.add(cylY(0.05, top - 0.01, top + 0.012, brassM(), 28), boxAt(0.1, 0.07, 0.07, 0, top + 0.05, 0, brassM()), cylY(0.032, top + 0.085, top + 0.1, brassM(), 20));
  // carrying handle (fixed) and squeeze lever (pivots about the valve)
  const fixed = boxAt(0.21, 0.016, 0.05, 0.075, top + 0.115, 0, M.matte(0x22252b)); valve.add(fixed);
  const grip = new THREE.Group(); grip.position.set(-0.02, top + 0.1, 0); valve.add(grip);
  const lever = boxAt(0.2, 0.015, 0.05, 0.1, 0, 0, M.matte(0x22252b)); grip.add(lever); parts.grip = grip;
  const nozP = new THREE.Vector3(...nozzlePos);
  // pin and tamper seal
  const pin = new THREE.Group(); pin.position.set(0.105, top + 0.095, 0); valve.add(pin); parts.pin = pin;
  const pr = cylY(0.0035, -0.04, 0.04, steel({ color: 0xf0d24a, metalness: 0.4 }), 8); pr.rotation.x = Math.PI / 2; pin.add(pr);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0028, 8, 24), steel({ color: 0xf0d24a, metalness: 0.4 })); ring.position.z = 0.055; pin.add(ring);
  const seal = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0015, 6, 14), M.matte(0xd62b1f)); seal.position.set(0.105, top + 0.105, 0.043); valve.add(seal); parts.seal = seal;
  // gauge
  const dial = gaugeFace(256), gm = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.018, 28), [M.metal(0xb9bec8), new THREE.MeshBasicMaterial({ map: dial.tex, toneMapped: false }), M.metal(0xb9bec8)]);
  gm.rotation.x = Math.PI / 2; gm.position.set(-0.012, top + 0.052, 0.054); valve.add(gm); parts.gauge = gm;
  // hose
  const outP = new THREE.Vector3(-0.055, top + 0.045, 0);
  const hosePts = hose === 'free'
    ? [outP.toArray(), [-0.12, top - 0.05, 0.03], [-0.13, top - 0.3, 0.1], [0.02, 0.7, nozP.z * 0.6], [nozP.x * 0.6, nozP.y - 0.1, nozP.z * 0.9], [nozP.x - 0.04, nozP.y, nozP.z]]
    : [outP.toArray(), [-0.1, top - 0.02, 0.0], [-0.115, top - 0.2, 0.06], [-0.07, 0.3, R + 0.035], [0.02, 0.2, R + 0.04], [0.07, 0.14, R + 0.03]];
  const hoseM = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts.map((p) => new THREE.Vector3(...p))), 60, 0.0085, 8), M.matte(0x1d1f24)); hoseM.castShadow = true; g.add(hoseM); parts.hose = hoseM;
  const nozzle = new THREE.Group(); nozzle.position.copy(hose === 'free' ? nozP : new THREE.Vector3(0.07, 0.14, R + 0.03)); g.add(nozzle); parts.nozzle = nozzle;
  const nz = cylY(0.014, 0, 0.09, M.matte(0x22252b), 14, 0.008); nz.rotation.z = -Math.PI / 2; nz.position.x = 0.045; nozzle.add(nz);
  // coloured band by agent (EN 3 style: a coloured panel on a red body)
  const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.085, 48, 1, true, cut ? Math.PI / 2 : 0, cut ? Math.PI : Math.PI * 2), M.matte({ water: 0x4b8bd8, foam: 0xf3efe0, powder: 0x2a61b8, co2: 0x222222 }[id] || 0xffffff, { side: THREE.DoubleSide })); band.position.y = 0.34; g.add(band); parts.band = band;
  // live state
  parts.set = ({ out = 0, gauge = a.p0, squeeze = 0, pin: pinOut = 0, T = 0, hot = 0.35 }) => {
    const vf = (a.vol - out) / a.cyl, level = Hin * vf;
    liquid.scale.y = Math.max(1e-3, level); liquid.visible = level > 0.002;
    const yTop = t + level, y1 = t + Hin - 0.012;
    for (let i = 0; i < N; i++) {
      const s = seed[i], sp = (0.8 + hot * s[3] * 2) * T;
      const u = tri(s[0] * 2 + sp * 0.7) * 2 - 1, v = tri(s[1] * 2 + sp * 0.9) * 2 - 1, w = tri(s[2] * 2 + sp * 0.8);
      const rr = (R - t - 0.012) * 0.9; let x = u * rr, z = v * rr; const m = Math.hypot(x, z); if (m > rr) { x *= rr / m; z *= rr / m; }
      if (cut && z > 0) z = -z;
      o.position.set(x, lerp(yTop + 0.006, y1, w), z); o.scale.setScalar(1); o.updateMatrix(); gasM.setMatrixAt(i, o.matrix);
    }
    gasM.instanceMatrix.needsUpdate = true;
    grip.rotation.z = -squeeze * 0.34;
    pin.position.x = 0.105 + pinOut * 0.0; pin.position.z = pinOut * 0.22; pin.rotation.z = pinOut * 0.4; pin.visible = pinOut < 0.99; seal.visible = pinOut < 0.05;
    dial.draw(gauge, { max: 20, green: [10, 15] });
  };
  parts.set({});
  return { g, parts, R, H, top, dial };
}

// ---------------------------------------------------------------- carbon dioxide cylinder
export function makeCO2({ cut = false } = {}) {
  const R = 0.055, H = 0.42, t = 0.012, Hin = H - 2 * t;
  const g = new THREE.Group(), parts = {};
  const prof = [[0, 0], [R - 0.02, 0], [R, 0.02], [R, H - 0.07], [R * 0.7, H], [0.03, H + 0.03], [0.03, H + 0.05]];
  const inner = prof.map(([r, y], i) => (i === 0 ? [0, y + t] : i === prof.length - 1 ? [r - t, y] : [r - t, y + (i < 3 ? t : -t)])).reverse();
  g.add(turn([...prof, ...inner], redShell(), cutFace(0xe8e0d0, { roughness: 0.7 }), { cut, seg: 48 }));
  const liqM = new THREE.MeshStandardMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.75, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  const liquid = column(R - t - 0.002, liqM, cut); liquid.position.y = t; g.add(liquid); parts.liquid = liquid;
  const dip = cylY(0.0065, 0.02, H + 0.06, steel(), 12); dip.position.z = cut ? -0.01 : 0; g.add(dip);
  const N = 48, gasM = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0036, 8, 6), M.glow(0xbfe6ff), N); gasM.frustumCulled = false; g.add(gasM); parts.gas = gasM;
  const seed = Array.from({ length: N }, (_, i) => [frac(Math.sin(i * 12.9898) * 43758.5), frac(Math.sin(i * 78.233) * 12345.6), frac(Math.sin(i * 39.346) * 9871.3), 0.4 + frac(i * 0.618)]);
  const o = new THREE.Object3D(), top = H + 0.05;
  const valve = new THREE.Group(); g.add(valve);
  valve.add(cylY(0.04, top - 0.01, top + 0.01, brassM(), 24), boxAt(0.08, 0.06, 0.06, 0, top + 0.04, 0, brassM()));
  const fixed = boxAt(0.17, 0.014, 0.045, 0.06, top + 0.095, 0, M.matte(0x22252b)); valve.add(fixed);
  const grip = new THREE.Group(); grip.position.set(-0.02, top + 0.08, 0); valve.add(grip); parts.grip = grip; grip.add(boxAt(0.16, 0.013, 0.045, 0.08, 0, 0, M.matte(0x22252b)));
  const pr = cylY(0.003, -0.035, 0.035, steel({ color: 0xf0d24a }), 8); pr.rotation.x = Math.PI / 2; pr.position.set(0.085, top + 0.082, 0); valve.add(pr);
  // flexible hose and horn (a wide cone that slows the jet and keeps the snow together)
  const outP = new THREE.Vector3(0.0, top + 0.03, 0.035);
  const pts = [outP, new THREE.Vector3(0.0, top + 0.0, 0.1), new THREE.Vector3(0.12, top - 0.06, 0.16), new THREE.Vector3(0.22, 0.42, 0.18), new THREE.Vector3(0.3, 0.52, 0.16)];
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0085, 8), M.matte(0x1d1f24)));
  const horn = new THREE.Group(); horn.position.set(0.3, 0.52, 0.16); g.add(horn); parts.horn = horn;
  const cone = cylY(0.045, 0, 0.17, M.matte(0x16181c), 20, 0.014); cone.rotation.z = -Math.PI / 2; cone.position.x = 0.085; horn.add(cone);
  const sleeve = cylY(0.02, -0.02, 0.06, M.matte(0x22252b), 14); sleeve.rotation.z = -Math.PI / 2; sleeve.position.x = -0.005; horn.add(sleeve);
  parts.set = ({ fill = 0.7, T = 0, hot = 0.3, squeeze = 0 }) => {
    const level = Hin * fill, yTop = t + level, y1 = t + Hin - 0.01;
    liquid.scale.y = Math.max(1e-3, level); liquid.visible = level > 0.002;
    for (let i = 0; i < N; i++) {
      const s = seed[i], sp = (0.8 + hot * s[3] * 2) * T;
      const u = tri(s[0] * 2 + sp * 0.7) * 2 - 1, v = tri(s[1] * 2 + sp * 0.9) * 2 - 1, w = tri(s[2] * 2 + sp * 0.8);
      const rr = (R - t - 0.01) * 0.9; let x = u * rr, z = v * rr; const m = Math.hypot(x, z); if (m > rr) { x *= rr / m; z *= rr / m; }
      if (cut && z > 0) z = -z;
      o.position.set(x, lerp(yTop + 0.006, y1, w), z); o.scale.setScalar(1); o.updateMatrix(); gasM.setMatrixAt(i, o.matrix);
    }
    gasM.instanceMatrix.needsUpdate = true;
    grip.rotation.z = -squeeze * 0.34;
  };
  parts.set({});
  return { g, parts, R, H, top };
}
