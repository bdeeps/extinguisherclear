// Thrown agent and flames. Spray: a pool of particles flying under gravity and quadratic drag
// (the same law as reach() in extinguisher.js). Flame: a flickering cone stack.
import { THREE, M } from './kit.js';
import { AGENTS, G } from './extinguisher.js';

let seedN = 1;
const rnd = () => { seedN = (seedN * 1664525 + 1013904223) >>> 0; return seedN / 4294967296; };

export class Spray {
  constructor(id, N = 700, { size = 1, glow = true } = {}) {
    this.a = AGENTS[id]; this.N = N;
    this.p = new Float32Array(N * 3); this.v = new Float32Array(N * 3); this.live = new Uint8Array(N); this.head = 0; this.age = new Float32Array(N);
    const mat = glow ? new THREE.MeshBasicMaterial({ color: this.a.color, toneMapped: false, transparent: true, opacity: id === 'foam' || id === 'co2' ? 0.85 : 0.95 }) : new THREE.MeshStandardMaterial({ color: this.a.color });
    this.mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(this.a.size * size, 6, 4), mat, N);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mesh.frustumCulled = false;
    this.o = new THREE.Object3D(); this.carry = 0; this.size = size;
    for (let i = 0; i < N; i++) { this.o.position.set(0, -1e4, 0); this.o.updateMatrix(); this.mesh.setMatrixAt(i, this.o.matrix); }
  }
  clear() { this.live.fill(0); this.carry = 0; }
  // Emit `rate` particles per second (call every frame with dt).
  emit(dt, rate, origin, dir, speed, spread = 1) {
    this.carry += rate * dt;
    const n = Math.floor(this.carry); this.carry -= n;
    const d = dir.clone().normalize(), up = Math.abs(d.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize(), w = new THREE.Vector3().crossVectors(d, u);
    for (let k = 0; k < n; k++) {
      const i = this.head; this.head = (i + 1) % this.N;
      const r = Math.sqrt(rnd()) * this.a.cone * spread, ph = rnd() * 6.2832, sp = speed * (0.92 + 0.16 * rnd());
      const vx = d.x + (u.x * Math.cos(ph) + w.x * Math.sin(ph)) * r, vy = d.y + (u.y * Math.cos(ph) + w.y * Math.sin(ph)) * r, vz = d.z + (u.z * Math.cos(ph) + w.z * Math.sin(ph)) * r;
      const f = rnd() * dt; // spread births across the frame
      this.p[i * 3] = origin.x + vx * sp * f; this.p[i * 3 + 1] = origin.y + vy * sp * f; this.p[i * 3 + 2] = origin.z + vz * sp * f;
      this.v[i * 3] = vx * sp; this.v[i * 3 + 1] = vy * sp; this.v[i * 3 + 2] = vz * sp; this.live[i] = 1; this.age[i] = 0;
    }
  }
  // probe(x, y, z, age) -> true to remove the particle (it landed or hit something). Floor removes too.
  step(dt, probe = null) {
    const c = this.a.c, n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n, o = this.o, P = this.p, V = this.v;
    for (let i = 0; i < this.N; i++) {
      if (!this.live[i]) { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix); continue; }
      for (let s = 0; s < n && this.live[i]; s++) {
        const vx = V[i * 3], vy = V[i * 3 + 1], vz = V[i * 3 + 2], sp = Math.hypot(vx, vy, vz);
        V[i * 3] -= c * sp * vx * h; V[i * 3 + 1] -= (c * sp * vy + G) * h; V[i * 3 + 2] -= c * sp * vz * h;
        P[i * 3] += V[i * 3] * h; P[i * 3 + 1] += V[i * 3 + 1] * h; P[i * 3 + 2] += V[i * 3 + 2] * h;
        this.age[i] += h;
        if (P[i * 3 + 1] <= 0.01 || this.age[i] > 6 || (probe && probe(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], this.age[i], this.a))) this.live[i] = 0;
      }
      if (this.live[i]) { o.position.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); const grow = this.a.cone > 0.1 ? 1 + this.age[i] * 1.2 : 1; o.scale.setScalar(grow); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix); }
      else { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); o.updateMatrix(); this.mesh.setMatrixAt(i, o.matrix); }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// A flame: outer cone, hot inner cone, a bright core. intensity 0..1 scales and fades it.
export function makeFlame(color = 0xff7a1a, inner = 0xffd24a) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 14, 1, true), M.glow(color, { transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
  const mid = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.72, 12, 1, true), M.glow(inner, { transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 10, 1, true), M.glow(0xfff6d0, { side: THREE.DoubleSide }));
  outer.position.y = 0.5; mid.position.y = 0.36; core.position.y = 0.2; g.add(outer, mid, core);
  g.set = (k, t, h = 1, w = 1, seed = 0) => {
    const fl = 1 + 0.09 * Math.sin(t * 17 + seed) + 0.05 * Math.sin(t * 29 + seed * 2.3), sw = 0.05 * Math.sin(t * 11 + seed);
    g.visible = k > 0.02; g.scale.set(w * (0.3 + 0.7 * k), h * k * fl, w * (0.3 + 0.7 * k)); g.rotation.z = sw; g.rotation.x = sw * 0.6;
  };
  return g;
}
