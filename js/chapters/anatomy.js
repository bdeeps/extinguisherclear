// Chapter 1: inside the red cylinder. A stored-pressure extinguisher drawn in metres and cut in half.
// The gas above the agent is nitrogen or dry air, squeezed to about 12 bar when full. Open the valve
// and it pushes the agent down onto the surface, up the dip tube and out of the nozzle. As the agent
// leaves, the gas gets more room and its pressure falls (Boyle's law, P·V constant). The jet's speed
// follows the pressure, so a nearly empty extinguisher spits rather than throws (see extinguisher.js).
import { THREE, M, clamp, smooth, approach } from '../kit.js';
import { rows, fitNarrow, framer, fitView } from '../parts.js';
import { AGENTS, cylinder } from '../extinguisher.js';
import { makeStored } from '../models.js';
import { Spray } from '../spray.js';

const NOZ = [0.42, 0.46, 0.14];

export default {
  id: 'anatomy',
  short: 'Inside the cylinder',
  title: 'Inside the red cylinder',
  subtitle: 'A steel bottle of agent, with gas pushing on it and a valve keeping it in.',
  view: { pos: [0.7, 0.75, 1.5], target: [0.1, 0.4, 0] },
  learn: `<p>A fire extinguisher is simpler than it looks. It is a <b>steel (or aluminium) bottle</b> holding the stuff that puts fires out, called the <b>agent</b>, and a gas squeezed in above it. The valve on top keeps the gas shut in.</p>
    <p>In the common <b>stored-pressure</b> kind, the gas is nitrogen or dry air at roughly <b>12 to 15 bar</b> when full, about 12 to 15 times the air pressure around you. Pull the pin and squeeze the lever and the valve opens. The gas presses down on the agent, and the only way out is the <b>dip tube</b>, a pipe that runs from the valve nearly to the bottom. The agent goes up the tube, along the hose and out of the nozzle.</p>
    <p>Watch the gauge and the gas dots as you squeeze. Every litre that leaves gives the gas a litre more room, so it thins out and its pressure falls. At constant temperature, pressure times volume stays the same: <b>Boyle's law</b>. A weaker push means a slower jet, and a slower jet reaches less far. That is why a full extinguisher lasts about a minute, and why the last few seconds are feeble.</p>
    <p>The <b>pin</b> and its <b>tamper seal</b> stop the lever being squeezed by accident, and show at a glance if someone has already used it. The <b>gauge</b>, where fitted, says if the gas is still there. The coloured band tells you the agent: blue for water, cream for foam, and blue (a different shade) for powder in many places. Read the label on yours, not the colour.</p>
    <p class="tip"><b>Try it:</b> pull the pin, squeeze, and watch the gauge. Then switch the agent to powder and squeeze again: powder is lighter, so the same gas pushes it out in a third of the time.</p>`,
  terms: [
    { t: 'Agent', d: 'The stuff in the extinguisher that puts the fire out: water, foam, powder, CO₂ or a wet chemical.' },
    { t: 'Stored pressure', d: 'A design where the agent and its pushing gas are sealed in the same cylinder from the day it is filled.' },
    { t: 'Dip tube', d: 'The pipe from the valve nearly to the bottom, so the gas pushes the agent up and out, not itself.' },
    { t: 'Boyle\'s law', d: 'At constant temperature, a gas\'s pressure times its volume stays the same.' },
    { t: 'Tamper seal', d: 'A thin tie through the pin. It breaks when the pin is pulled, so you can see the extinguisher has been used or meddled with.' },
  ],
  defaults: { agent: 'water', cut: true, pin: false, squeeze: false },
  controls: [
    { key: 'agent', type: 'seg', label: 'What is inside', options: [{ v: 'water', label: 'Water' }, { v: 'foam', label: 'Foam' }, { v: 'powder', label: 'Powder' }] },
    { key: 'cut', type: 'toggle', label: 'Cut it in half' },
    { key: 'pin', type: 'toggle', label: 'Safety pin pulled out', hint: 'With the pin in, the lever cannot be squeezed.' },
    { key: 'squeeze', type: 'toggle', label: 'Squeeze the lever' },
    { key: 'go', type: 'buttons', label: 'Refill', items: [{ label: 'Fill it up again', act: (s, inst) => inst.refill() }] },
  ],
  quiz: [
    { q: 'What pushes the agent out of a stored-pressure extinguisher?', options: ['A pump you work with the lever', 'Gas squeezed in above the agent', 'Gravity', 'A spring'], answer: 1, why: 'Nitrogen or dry air at about 12 to 15 bar sits above the agent. Open the valve and it pushes the agent up the dip tube.' },
    { q: 'As the agent runs out, what happens to the gauge reading?', options: ['It rises', 'It stays the same', 'It falls, because the gas has more room', 'It jumps to zero at once'], answer: 2, why: 'Boyle\'s law: the same gas in a bigger space has less pressure. The jet weakens as the pressure drops.' },
    { q: 'What does the pin do?', options: ['Opens the valve', 'Stops the lever from being squeezed by accident', 'Holds the gauge on', 'Seals the agent inside'], answer: 1, why: 'The pin blocks the lever. A tamper seal through it shows if it has been pulled.' },
  ],
  reel: [
    { ms: 4800, caption: 'A fire extinguisher is a steel bottle of agent with gas squeezed in above it.', set: { agent: 'water', cut: true, pin: false, squeeze: false }, act: (s, inst) => inst.refill(), spin: 0.25 },
    { ms: 5400, caption: 'Pull the pin, squeeze the lever, and the gas pushes the agent up a tube and out.', set: { pin: true, squeeze: true }, spin: 0, view: { pos: [0.75, 0.8, 1.35], target: [0.2, 0.45, 0] } },
  ],

  build({ stage, s }) {
    const G = new THREE.Group(); stage.root.add(G);
    let ex = null, key = '', cyl = cylinder('water'), spray = null, T = 0, sq = 0, pinK = 0, lbl = [];
    const dipDots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006, 8, 6), M.glow(0xffffff), 12); dipDots.frustumCulled = false; G.add(dipDots);
    const o = new THREE.Object3D();
    const rebuild = () => {
      if (ex) { G.remove(ex.g); ex.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
      lbl.forEach((l) => { G.remove(l); l.element.remove(); });
      ex = makeStored(s.agent, { cut: s.cut, hose: 'free', nozzlePos: NOZ }); G.add(ex.g);
      spray?.mesh.parent?.remove(spray.mesh); spray = new Spray(s.agent, 600); G.add(spray.mesh);
      cyl = cylinder(s.agent); key = s.agent + s.cut;
      const a = AGENTS[s.agent], L = (t, p, c = '') => stage.label(t, p, G, c);
      lbl = [L('Gauge', [-0.09, 0.7, 0.06]), L('Pin and tamper seal', [0.19, 0.79, 0.08]), L('Squeeze lever', [0.3, 0.67, 0]), L('Hose and nozzle', [0.3, 0.52, 0.13]),
        L('Dip tube', [0.0, 0.1, 0.0], 'hot'), L(`${a.short} (${a.vol} L)`, [0.0, 0.17, 0.05]), L('Gas, squeezed', [0.0, 0.43, 0.05], 'hot')];
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.12, 0.28, 0], [0.4, 0.2, 1], 1.7) : mode === 'narrow' ? fitView(stage, [0.12, 0.3, 0], [0.55, 0.25, 1], 1.9) : fitView(stage, [0.14, 0.36, 0], [0.55, 0.25, 1], 1.5)));
    rebuild();
    return {
      refill() { cyl.reset(); spray.clear(); },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; const mode = frame();
        fitNarrow(stage, lbl.slice(3), -0.12, 0.08);
        if (key !== s.agent + s.cut) rebuild();
        const wasOpen = pinK > 0.5;
        pinK = approach(pinK, s.pin ? 1 : 0, 9, dt); sq = approach(sq, s.squeeze && s.pin ? 1 : s.squeeze ? 0.15 : 0, 14, dt);
        const flowing = s.pin && s.squeeze && !cyl.empty();
        const q = flowing ? cyl.step(dt) : 0;
        if (wasOpen !== pinK > 0.5) ex.parts.seal.visible = pinK < 0.05;
        ex.parts.set({ out: cyl.out, gauge: cyl.gauge(), squeeze: sq, pin: pinK, T, hot: 0.2 + cyl.gauge() / 30 });
        const v = cyl.speed();
        const origin = new THREE.Vector3(...NOZ).add(new THREE.Vector3(0.09, 0, 0));
        spray.emit(dt, flowing ? 260 * (cyl.flow() / (AGENTS[s.agent].k * Math.sqrt(AGENTS[s.agent].p0))) : 0, origin, new THREE.Vector3(1, -0.08, 0), v);
        spray.step(dt);
        // agent rising up the dip tube
        for (let i = 0; i < 12; i++) {
          if (!flowing) { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); }
          else { const a = (i / 12 + T * (0.5 + 0.12 * v)) % 1; o.position.set(0, 0.03 + a * 0.58, s.cut ? -0.012 : 0); o.scale.setScalar(1); }
          o.updateMatrix(); dipDots.setMatrixAt(i, o.matrix);
        }
        dipDots.instanceMatrix.needsUpdate = true;
        G.userData.q = q;
      },
      readout: (s) => {
        const a = AGENTS[s.agent], blocked = s.squeeze && !s.pin;
        return rows(cyl.gauge().toFixed(1) + ' bar', [
          ['Agent left', (a.vol - cyl.out).toFixed(1) + ' of ' + a.vol + ' L'],
          ['Gas volume', (cyl.Vg0 + cyl.out).toFixed(1) + ' L'],
          ['Jet speed', cyl.speed().toFixed(1) + ' m/s'],
          ['Flow', (cyl.flow()).toFixed(2) + ' L/s'],
        ], blocked ? 'The pin is still in, so the lever will not move.' : cyl.empty() ? 'Empty. Refill to go again.' : 'Pressure times volume stays the same: more room for the gas means less pressure.', 3);
      },
    };
  },
};
