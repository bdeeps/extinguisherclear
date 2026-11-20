// Chapter 3: P.A.S.S. and what the jet does. A person stands d metres from a pan fire with a stored-
// pressure extinguisher (cylinder() in extinguisher.js). The nozzle is aimed with aimElevation(): the
// angle that makes the stream, bent by gravity and air drag, pass through the chosen height at the fire.
// Thrown particles (Spray) fly under that same drag. The pan is 1 m wide, split into five strips; a
// particle that lands in a strip puts that strip's flame down by a little (more for powder), one that
// flies through the flame does a little less, and flames creep back from burning neighbours at
// 0.05 per second. So the fire goes out only if the agent reaches the base, all along the pan.
import { THREE, M, clamp, approach } from '../kit.js';
import { rows, fitNarrow, framer, fitView, boxAt, cylY } from '../parts.js';
import { AGENTS, cylinder, aimElevation, reach } from '../extinguisher.js';
import { makeStored } from '../models.js';
import { Spray, makeFlame } from '../spray.js';

const NC = 5, CW = 0.2, HOLD = 1.0;
const HIT = { water: 0.0016, foam: 0.0024, powder: 0.005 }, AIR = { water: 0.0002, foam: 0.0004, powder: 0.0012 };
const TARGET = { base: 0.05, mid: 0.6, top: 1.2 };

export default {
  id: 'pass',
  short: 'Pull, Aim, Squeeze, Sweep',
  title: 'P.A.S.S.: aim at the base',
  subtitle: 'Why the four steps are what they are, and what the jet is doing.',
  view: { pos: [-2.5, 1.9, 5.4], target: [-1.2, 0.7, 0] },
  learn: `<p>Fire services teach four steps, shortened to <b>PASS</b>:</p>
    <p><b>Pull</b> the pin. <b>Aim</b> the nozzle at the <b>base</b> of the fire. <b>Squeeze</b> the lever. <b>Sweep</b> from side to side.</p>
    <p>Each step has a physical reason. The pin is the safety, so nothing happens until you pull it. The <b>base</b> is where the fuel is: a flame is only burning gas rising from the fuel, so agent thrown at the flames' tops flies through them and puts out nothing, as you can see if you aim high. Squeeze the lever fully and keep it squeezed, because the jet is weakest when the lever is half-open. And <b>sweep</b>, because the stream is a narrow beam and a fire is wider, and flames creep back across any strip you leave alone.</p>
    <p>The jet is not a straight line either. Gravity pulls it down and air drags it back, so the program finds the angle that lands the stream where you want. Powder spreads into a wider cloud and slows sooner, so it reaches less far than water. <b>Distance</b> matters: too far and the stream falls short, too close and you are in the heat, and a strong jet can splash burning liquid. Many fire services suggest about two metres.</p>
    <p>And a full extinguisher is brief. Water lasts about a minute and powder about twenty seconds, so <b>use it in short sweeps and leave</b> if it is not winning. A big fire is a job for the fire brigade.</p>
    <p class="tip"><b>Try it:</b> pull the pin, squeeze, and aim at the base with sweep on. Then try aiming at the top, or switch sweep off, and see how long it takes.</p>`,
  terms: [
    { t: 'PASS', d: 'Pull the pin, Aim at the base, Squeeze the lever, Sweep side to side.' },
    { t: 'Discharge time', d: 'How long a full extinguisher keeps spraying: about a minute for 9 litres of water, about 20 seconds for 6 kg of powder.' },
    { t: 'Effective range', d: 'How far the agent still arrives with force. It is a few metres for most portable extinguishers.' },
    { t: 'Standing distance', d: 'How far you stand from the fire: far enough to be out of the heat, close enough for the stream to reach the base.' },
  ],
  defaults: { agent: 'water', dist: 2.2, aim: 'base', pin: false, squeeze: false, sweep: true },
  controls: [
    { key: 'agent', type: 'seg', label: 'Agent', options: [{ v: 'water', label: 'Water' }, { v: 'foam', label: 'Foam' }, { v: 'powder', label: 'Powder' }] },
    { key: 'pin', type: 'toggle', label: '1. Pull the pin' },
    { key: 'aim', type: 'seg', label: '2. Aim at', options: [{ v: 'base', label: 'The base' }, { v: 'mid', label: 'The middle' }, { v: 'top', label: 'The top' }] },
    { key: 'squeeze', type: 'toggle', label: '3. Squeeze the lever' },
    { key: 'sweep', type: 'toggle', label: '4. Sweep side to side' },
    { key: 'dist', type: 'range', label: 'How far you stand', min: 1, max: 7, step: 0.1, fmt: (v) => v.toFixed(1) + ' m' },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Relight and refill', act: (s, inst) => inst.again() }] },
  ],
  quiz: [
    { q: 'Where do you aim the extinguisher?', options: ['At the top of the flames', 'At the middle of the flames', 'At the base of the fire, where the fuel is', 'At the ceiling'], answer: 2, why: 'Flames are burning gas rising from the fuel. Agent aimed at the flames flies through them; it has to reach the fuel at the base.' },
    { q: 'Why do you sweep side to side?', options: ['It looks better', 'The stream is narrow and the fire is wider, and flames creep back across a strip you skip', 'It saves agent', 'It cools the cylinder'], answer: 1, why: 'A stream covers a thin strip. Leave a strip alone and the flames creep back in from the neighbours.' },
    { q: 'About how long does a full water extinguisher spray for?', options: ['5 seconds', 'About a minute', 'About 10 minutes', 'An hour'], answer: 1, why: 'A 9 litre water extinguisher usually empties in about a minute, a powder one in about 20 seconds. Use short sweeps and leave if it is not winning.' },
  ],
  reel: [
    { ms: 4800, caption: 'P.A.S.S. Pull the pin. Aim low, at the base of the fire, where the fuel is.', set: { agent: 'powder', dist: 2.4, aim: 'base', pin: true, squeeze: false, sweep: true }, act: (s, inst) => inst.again(), spin: 0, view: { pos: [-2.4, 1.7, 5.0], target: [-1.2, 0.6, 0] } },
    { ms: 5600, caption: 'Squeeze, and sweep side to side. Flames are only gas rising from fuel, so the base is what counts.', set: { agent: 'powder', pin: true, squeeze: true, sweep: true }, spin: 0, view: { pos: [-2.4, 1.7, 5.0], target: [-1.2, 0.6, 0] } },
  ],

  build({ stage, s }) {
    const G = new THREE.Group(); stage.root.add(G);
    let ex = null, key = '', cyl = cylinder('water'), spray = null, T = 0, pinK = 0, sq = 0, yaw = 0, aimT = 0, aim = { el: 0, miss: 0 }, aimKey = '', elapsed = 0, outAt = -1, usedAt = 0;
    const I = Array(NC).fill(1);
    // pan, fuel and flames
    G.add(boxAt(1.06, 0.1, 1.06, 0, 0.05, 0, M.metal(0x6a707c, { roughness: 0.6 })), boxAt(1.0, 0.02, 1.0, 0, 0.1, 0, M.matte(0x1e1a14)));
    const flames = I.map((_, c) => { const f = makeFlame(); f.position.set(0, 0.1, (c - 2) * CW); G.add(f); return f; });
    const nSmoke = 40, smoke = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x9aa0aa, transparent: true, opacity: 0.05, depthWrite: false }), nSmoke); smoke.frustumCulled = false; G.add(smoke);
    // floor marker and person
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32), M.glow(0x5ce1a9, { side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; G.add(ring);
    const pm = new THREE.MeshStandardMaterial({ color: 0x8e96a6, roughness: 0.8, transparent: true, opacity: 0.5 });
    const person = new THREE.Group(); G.add(person);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 12), pm); torso.position.set(0, 1.15, 0); const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), pm); head.position.set(0, 1.68, 0);
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.55, 6, 12), pm); legs.position.set(0, 0.45, 0); person.add(torso, head, legs);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 8), pm); person.add(arm);
    const you = stage.label('You', [0, 0, 0], G), ft = stage.label('', [0, 0, 0], G, 'hot');
    const flameL = stage.label('Flames: only burning gas', [0, 1.35, 0], G);
    const baseL = stage.label('Base: the fuel', [0.9, 0.12, 0.7], G, 'hot');
    const origin = new THREE.Vector3(), dir = new THREE.Vector3(), noz = new THREE.Vector3();
    const rebuild = () => {
      if (ex) { G.remove(ex.g); ex.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
      ex = makeStored(s.agent, { cut: false, hose: 'free', nozzlePos: [0.45, HOLD, 0.35] }); G.add(ex.g);
      spray?.mesh.parent?.remove(spray.mesh); spray = new Spray(s.agent, 900); G.add(spray.mesh);
      cyl = cylinder(s.agent); key = s.agent;
      I.fill(1); outAt = -1; elapsed = 0; usedAt = 0;
    };
    rebuild();
    const probe = (x, y, z, age, a) => {
      if (Math.abs(x) < 0.52 && Math.abs(z) < 0.52) {
        const c = clamp(Math.floor((z + 0.5) / CW), 0, NC - 1);
        if (y < 0.13) { I[c] = Math.max(0, I[c] - HIT[s.agent]); return true; }
        if (y < 0.1 + 1.25 * I[c] * 0.9) { I[c] = Math.max(0, I[c] - AIR[s.agent]); return false; }
      }
      return false;
    };
    const frame = framer(stage, (mode, k) => {
      const d = +k || 2.2, cx = -d / 2;
      return mode === 'tall' ? fitView(stage, [cx, 0.9, 0], [-0.1, 0.35, 1], 5.5 + d) : mode === 'narrow' ? fitView(stage, [cx, 0.8, 0], [-0.1, 0.4, 1], 6 + d) : fitView(stage, [cx, 0.8, 0], [-0.12, 0.33, 1], 4.6 + d * 0.75);
    });
    return {
      again() { I.fill(1); cyl.reset(); spray.clear(); outAt = -1; elapsed = 0; usedAt = 0; },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; const d = s.dist;
        const mode = frame(Math.round(d * 2) / 2); fitNarrow(stage, [flameL, baseL], -0.1, 0.06);
        if (key !== s.agent) rebuild();
        pinK = approach(pinK, s.pin ? 1 : 0, 9, dt); sq = approach(sq, s.squeeze && s.pin ? 1 : 0, 14, dt);
        const flowing = s.pin && s.squeeze && !cyl.empty();
        if (flowing) { cyl.step(dt); if (!usedAt) usedAt = T; }
        // place the person and the cylinder; the nozzle is at about (-d + 0.05, HOLD, 0)
        const px = -d - 0.4; person.position.set(px, 0, 0); ex.g.position.set(px - 0.05, 0, -0.35);
        you.position.set(px, 1.95, 0); ring.position.set(px, 0.01, -0.0);
        // aim: pick the elevation for the chosen height, refreshed as the pressure falls
        const ak = [s.agent, d.toFixed(1), s.aim, cyl.speed().toFixed(0)].join();
        if (ak !== aimKey) { aimKey = ak; aim = aimElevation(s.agent, Math.max(cyl.a.v0 * 0.5, cyl.speed()), d - 0.2, HOLD, TARGET[s.aim]); }
        const span = Math.atan2(0.62, Math.max(0.8, d));
        yaw = s.sweep ? Math.sin(T * 1.7) * span : 0;
        // nozzle world position, then orient in world space (the cylinder group has no rotation)
        noz.set(ex.g.position.x + 0.45, HOLD, ex.g.position.z + 0.35);
        dir.set(Math.cos(aim.el) * Math.cos(yaw), Math.sin(aim.el), Math.cos(aim.el) * Math.sin(yaw));
        dir.normalize();
        ex.parts.nozzle.rotation.set(0, Math.atan2(-dir.z, dir.x), Math.asin(dir.y));
        origin.copy(noz).addScaledVector(dir, 0.1);
        ex.parts.set({ out: cyl.out, gauge: cyl.gauge(), squeeze: sq, pin: pinK, T, hot: 0.2 + cyl.gauge() / 30 });
        arm.position.set(0.28, 1.28, 0.2); arm.lookAt(noz.x - px, HOLD, noz.z); arm.rotateX(Math.PI / 2);
        spray.emit(dt, flowing ? 300 * (cyl.flow() / (cyl.a.k * Math.sqrt(cyl.a.p0))) : 0, origin, dir, cyl.speed());
        spray.step(dt, probe);
        // fire
        const on = I.some((v) => v > 0.02);
        if (on) elapsed += dt;
        I.forEach((v, c) => {
          const nb = Math.max(I[c - 1] ?? 0, I[c + 1] ?? 0, v);
          if (v > 0.001) I[c] = Math.min(1, v + dt * 0.05 * (nb > 0.3 ? 1 : 0.3) * (1 - v));
          flames[c].set(v > 0.03 ? v : 0, T, 1.3, 0.55, c * 1.7); flames[c].position.set(0, 0.1, (c - 2) * CW);
        });
        if (outAt < 0 && !on) outAt = elapsed;
        const avg = I.reduce((a, b) => a + b, 0) / NC;
        const o = new THREE.Object3D();
        for (let i = 0; i < nSmoke; i++) { const a = (i / nSmoke + T * 0.15) % 1; if (i / nSmoke > avg) { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); } else { o.position.set(Math.sin(i * 7.3) * 0.3 * a, 0.9 + a * 1.6, Math.cos(i * 3.1) * 0.3 * a); o.scale.setScalar(0.12 + a * 0.3); } o.updateMatrix(); smoke.setMatrixAt(i, o.matrix); }
        smoke.instanceMatrix.needsUpdate = true;
        ft.position.set(px / 2, 0.05, 0.3); ft.element.textContent = d.toFixed(1) + ' m';
      },
      readout: (s) => {
        const avg = I.reduce((a, b) => a + b, 0) / NC, used = Math.round((1 - cyl.frac()) * 100);
        const head = outAt >= 0 ? `Out in ${outAt.toFixed(0)} s` : `Fire ${Math.round(avg * 100)}%`;
        const r = reach(s.agent, cyl.speed(), 0.25);
        const note = outAt >= 0 ? `Used ${used}% of the agent.` : !s.pin ? 'The pin is in. Pull it first.' : !s.squeeze ? 'Now squeeze the lever.' : cyl.empty() ? 'Empty. Start again.' : s.aim !== 'base' ? 'Aimed above the base, the agent mostly flies through the flames.' : !s.sweep ? 'Without sweeping, only the middle strip gets agent.' : s.dist > r - 0.3 ? 'Too far: the stream falls short of the base.' : 'Aim at the base and sweep.';
        return rows(head, [['Agent left', Math.round(cyl.frac() * 100) + '%'], ['Gauge', cyl.gauge().toFixed(1) + ' bar'], ['Jet speed', cyl.speed().toFixed(1) + ' m/s'], ['Reach (flat)', r.toFixed(1) + ' m']], note, 3);
      },
    };
  },
};
