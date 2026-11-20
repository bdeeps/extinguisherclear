// ExtinguisherClear's physics, in SI units with pressures in bar. No drawing here.
//
// Stored-pressure model. A cylinder of volume Vc holds an agent of volume Va and a headspace of gas
// (nitrogen or dry air) at P0 when full. Gas expands as agent leaves, at constant temperature
// (Boyle: P·V = constant), so the gauge pressure falls as P(Vout) = P0·Vg0 / (Vg0 + Vout).
// Flow out of the nozzle follows Q = k·√(P − Patm) (a nozzle: flow ∝ √pressure drop). k is
// calibrated here so that a full cylinder empties in the typical discharge time for its kind,
// and the exit speed is v = v0·√((P − Patm)/(P0 − Patm)). Real figures vary by make and standard;
// these are typical ones. Thrown agent flies with gravity and quadratic air drag (dv/dt = −c·|v|·v).
export const PATM = 1.013, G = 9.81;

// vol: litres of agent; rho: kg per litre of the agent as it sits in the cylinder; cyl: litres of the cylinder
// p0: gauge bar at 20 °C; t: seconds to empty; v0: exit speed at full pressure (m/s); c: drag per metre
// cone: half-angle of the spray (rad); mass in kg
export const AGENTS = {
  water: { name: 'Water', short: 'Water', vol: 9, rho: 1.0, cyl: 12.5, p0: 12, t: 60, v0: 15, c: 0.045, cone: 0.035, color: 0x6fd0ff, hex: '#6fd0ff', size: 0.028 },
  foam: { name: 'Foam (AFFF or film-forming)', short: 'Foam', vol: 9, rho: 1.0, cyl: 12.5, p0: 12, t: 55, v0: 13, c: 0.075, cone: 0.06, color: 0xf3efe0, hex: '#f3efe0', size: 0.04 },
  powder: { name: 'ABC dry powder', short: 'Powder', vol: 6.5, rho: 0.92, cyl: 8.6, p0: 14, t: 20, v0: 17, c: 0.22, cone: 0.09, color: 0xf3e58f, hex: '#f3e58f', size: 0.03 },
  co2: { name: 'Carbon dioxide', short: 'CO₂', vol: 0, rho: 0, cyl: 3.4, p0: 57, t: 14, v0: 11, c: 0.8, cone: 0.16, color: 0xeaf6ff, hex: '#eaf6ff', size: 0.025, kg: 2 },
};
// Agents drawn in the classes chapter only (no cylinder model), and burning droplets.
AGENTS.wet = { name: 'Wet chemical', short: 'Wet chemical', v0: 13, c: 0.08, cone: 0.05, color: 0xf1e27a, hex: '#f1e27a', size: 0.03 };
AGENTS.dpowder = { name: 'Class D powder', short: 'D powder', v0: 14, c: 0.22, cone: 0.09, color: 0xb9c0cc, hex: '#b9c0cc', size: 0.03 };
AGENTS.fire = { name: 'Burning droplets', short: 'Burning', v0: 6, c: 0.05, cone: 0.7, color: 0xff9a30, hex: '#ff9a30', size: 0.05 };
const STORED = ['water', 'foam', 'powder'];

// Calibrate k per agent: integrate the full discharge and scale so it takes a.t seconds.
function emptyTime(a, k) {
  const Vg0 = a.cyl - a.vol, P0 = a.p0 + PATM;
  let out = 0, t = 0;
  const dt = 0.02;
  while (out < a.vol && t < 600) { const P = (P0 * Vg0) / (Vg0 + out) - PATM; out += k * Math.sqrt(Math.max(P, 0)) * dt; t += dt; }
  return t;
}
for (const id of STORED) {
  const a = AGENTS[id]; let lo = 0.001, hi = 5;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (emptyTime(a, mid) > a.t) lo = mid; else hi = mid; }
  a.k = (lo + hi) / 2; // litres per second per √bar
}

// The state of one cylinder. frac: 0..1 of the agent still inside. leak: 0..1 of the gas lost.
// Temperature in °C changes the gas pressure (P ∝ T at fixed volume).
export function cylinder(id) {
  const a = AGENTS[id], c = { id, a, out: 0, leak: 0, T: 20 };
  c.reset = () => { c.out = 0; };
  c.Vg0 = a.cyl - a.vol;
  c.P0abs = () => (a.p0 + PATM) * (1 - c.leak) * ((c.T + 273.15) / 293.15);
  c.Pabs = () => (c.P0abs() * c.Vg0) / (c.Vg0 + c.out);
  c.gauge = () => Math.max(0, c.Pabs() - PATM);
  c.frac = () => 1 - c.out / a.vol;
  c.empty = () => c.out >= a.vol - 1e-6;
  c.speed = () => (c.empty() ? 0 : a.v0 * Math.sqrt(c.gauge() / a.p0));
  c.flow = () => (c.empty() ? 0 : a.k * Math.sqrt(c.gauge())); // litres per second
  c.step = (dt) => { const q = c.flow() * dt; c.out = Math.min(a.vol, c.out + q); return q; };
  return c;
}
// How long a cylinder in its current state would spray for, and the mass of agent in it.
export function runtime(c) {
  const a = c.a, d = cylinder(c.id); d.leak = c.leak; d.T = c.T;
  let t = 0; const dt = 0.05;
  while (!d.empty() && t < 900) { if (d.flow() < 1e-5) return 0; d.step(dt); t += dt; }
  return t;
}

// Where does a thrown drop land? Starts at height h0 going up at angle el, returns the distance
// along the ground. Used for the "reach" figures.
export function reach(id, v, el = 0.3, h0 = 1) {
  const a = AGENTS[id]; if (v <= 0) return 0;
  let x = 0, y = h0, vx = v * Math.cos(el), vy = v * Math.sin(el);
  const dt = 0.002;
  for (let i = 0; i < 20000 && y > 0; i++) {
    const sp = Math.hypot(vx, vy);
    vx -= a.c * sp * vx * dt; vy -= (a.c * sp * vy + G) * dt;
    x += vx * dt; y += vy * dt;
  }
  return x;
}

// Carbon dioxide, saturated vapour pressure in bar against temperature in °C (NIST/IUPAC table values).
export const CO2_PTS = [[-30, 14.3], [-20, 19.7], [-10, 26.5], [0, 34.9], [10, 45.0], [20, 57.3], [25, 64.3], [30, 72.1], [31.0, 73.8]];
export const CO2_CRIT = 31.0;
export function co2Pressure(T) {
  T = Math.min(T, CO2_CRIT);
  for (let i = 1; i < CO2_PTS.length; i++) if (T <= CO2_PTS[i][0]) { const [t0, p0] = CO2_PTS[i - 1], [t1, p1] = CO2_PTS[i]; return p0 + ((p1 - p0) * (T - t0)) / (t1 - t0); }
  return CO2_PTS[CO2_PTS.length - 1][1];
}

// The upward angle (radians) that makes a stream leaving at height h0 pass closest to height yT
// at horizontal distance d. Returns { el, miss } where miss is the height error in metres
// (large when the stream cannot get there).
export function aimElevation(id, v, d, h0, yT) {
  const a = AGENTS[id]; let best = { el: 0, miss: 1e9 };
  if (v <= 0) return best;
  for (let el = -0.7; el <= 0.9; el += 0.02) {
    let x = 0, y = h0, vx = v * Math.cos(el), vy = v * Math.sin(el), yAt = null;
    const dt = 0.01;
    for (let i = 0; i < 1200; i++) {
      const sp = Math.hypot(vx, vy);
      vx -= a.c * sp * vx * dt; vy -= (a.c * sp * vy + G) * dt;
      const x0 = x, y0 = y; x += vx * dt; y += vy * dt;
      if (x >= d) { yAt = y0 + ((y - y0) * (d - x0)) / (x - x0 || 1); break; }
      if (y < 0 || vx < 0.2) break;
    }
    const miss = yAt === null ? 1e8 : Math.abs(yAt - yT);
    if (miss < best.miss) best = { el, miss };
  }
  return best;
}
