// Chapter 2: the fire tetrahedron. A flame needs four things at once: fuel, oxygen, heat and the
// chain reaction between them. Take any one corner away and it dies. Each agent attacks different corners.
// Model: every agent has an effect 0..1 on each corner at full dose; a corner is "removed" in
// proportion to dose × effect, and the flame survives only while the most-removed corner is below
// about 85%. Effects are qualitative and picked for teaching, not measured.
import { THREE, M, clamp, smooth, approach } from '../kit.js';
import { rows, fitNarrow, framer, fitView } from '../parts.js';
import { makeFlame } from '../spray.js';

const CORNERS = [
  { id: 'heat', name: 'Heat', p: [0, 0.2, 1.15], color: 0xff6a3d },
  { id: 'oxygen', name: 'Oxygen', p: [-1.05, 0.2, -0.6], color: 0x6fd0ff },
  { id: 'fuel', name: 'Fuel', p: [1.05, 0.2, -0.6], color: 0x7bd96b },
  { id: 'chain', name: 'Chain reaction', p: [0, 1.95, 0], color: 0xc49bff },
];
// effect of each agent on [heat, oxygen, fuel, chain]
export const EFFECT = {
  none: { e: [0, 0, 0, 0], text: 'Nothing is being added. All four corners hold.' },
  water: { e: [1, 0.25, 0, 0], color: 0x6fd0ff, text: 'Water mainly removes <b>heat</b>. One litre takes about 2.6 MJ to warm from 20 °C and boil away, and it turns to steam about 1,700 times its volume, which pushes some air back as well.' },
  foam: { e: [0.4, 0.3, 0.9, 0], color: 0xf3efe0, text: 'Foam floats as a blanket on a burning liquid. It keeps the <b>fuel</b> vapour apart from the air, and its water cools the surface.' },
  co2: { e: [0.25, 1, 0, 0], color: 0xeaf6ff, text: 'CO₂ is a heavy gas that pushes the air away from the fuel, so it removes <b>oxygen</b>. Many flames go out when oxygen falls from 21% to roughly 15%. It cools a little but leaves no residue.' },
  powder: { e: [0.1, 0.3, 0, 1], color: 0xf3e58f, text: 'Dry powder breaks the <b>chain reaction</b>. In the flame its fine grains soak up the reactive fragments (radicals) that keep the burning going. It also smothers a little.' },
  wet: { e: [0.8, 0.2, 0.7, 0], color: 0xf1e27a, text: 'Wet chemical, for cooking oil, cools the oil (<b>heat</b>) and reacts with it to make a soapy skin that cuts off the <b>fuel</b> vapour (saponification).' },
};

export default {
  id: 'triangle',
  short: 'The fire tetrahedron',
  title: 'Four things a fire needs',
  subtitle: 'Take any one away and the flame dies. Each agent takes a different one.',
  view: { pos: [3.4, 2.6, 4.4], target: [0, 0.95, 0] },
  learn: `<p>Many of us learn the <b>fire triangle</b>: fuel, oxygen and heat. A flame needs all three together. Fire engineers add a fourth, the <b>chain reaction</b>, the flood of reactive fragments inside the flame that keeps the burning going. That gives four corners, a tetrahedron (a triangle-based pyramid).</p>
    <p>The use of this idea is that <b>removing any one corner puts the fire out</b>, and each kind of extinguisher is built to remove a different one. <b>Water</b> soaks up heat. <b>Carbon dioxide</b> pushes oxygen away. <b>Foam</b> blankets a burning liquid so the fuel vapour cannot meet air. <b>Dry powder</b> interrupts the chain reaction. <b>Wet chemical</b> cools hot cooking oil and turns the top into soap.</p>
    <p>Most real agents do more than one thing at once, and that is the point of mixing them. But one wins, and it decides when each is the right tool and when it is the wrong one, which the later chapters show.</p>
    <p class="tip"><b>Try it:</b> click a corner to remove it by hand, and the flame goes at once. Then bring it back and throw an agent with the slider. Look at which corners fade.</p>`,
  terms: [
    { t: 'Fire triangle', d: 'The three things a flame needs together: fuel, oxygen and heat.' },
    { t: 'Fire tetrahedron', d: 'The triangle plus a fourth corner, the chain reaction that sustains the flame.' },
    { t: 'Chain reaction', d: 'Reactive fragments called radicals keep making more of themselves inside the flame, which keeps it going.' },
    { t: 'Smothering', d: 'Putting out a fire by cutting off its oxygen.' },
    { t: 'Latent heat', d: 'The energy a liquid soaks up as it boils, with no rise in temperature. For water it is about 2,260 kJ per kilogram.' },
  ],
  defaults: { agent: 'none', dose: 0.8 },
  controls: [
    { key: 'agent', type: 'seg', label: 'Agent', options: [{ v: 'none', label: 'None' }, { v: 'water', label: 'Water' }, { v: 'foam', label: 'Foam' }, { v: 'co2', label: 'CO₂' }, { v: 'powder', label: 'Powder' }, { v: 'wet', label: 'Wet chem.' }] },
    { key: 'dose', type: 'range', label: 'How much you throw', min: 0, max: 1, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'go', type: 'buttons', label: 'Corners', items: [{ label: 'Restore all corners', act: (s, inst) => inst.restore() }] },
  ],
  quiz: [
    { q: 'Which is the fourth corner of the fire tetrahedron?', options: ['Smoke', 'The chain reaction', 'Wind', 'Light'], answer: 1, why: 'Reactive fragments inside the flame keep making more of themselves. Powder works by interrupting this.' },
    { q: 'A CO₂ extinguisher mainly puts a fire out by:', options: ['Soaking up its heat', 'Pushing the oxygen away', 'Making a soap layer', 'Stopping the chain reaction'], answer: 1, why: 'CO₂ is heavier than air and displaces it, so the flame is starved of oxygen.' },
    { q: 'Why does water work so well on a wood fire?', options: ['It removes the fuel', 'It soaks up huge amounts of heat as it warms and boils', 'It stops the chain reaction', 'It is heavier than air'], answer: 1, why: 'Warming a litre of water and boiling it away absorbs about 2.6 MJ.' },
  ],
  reel: [
    { ms: 5400, caption: 'A fire needs fuel, oxygen, heat and a chain reaction. Take away any one and it dies.', set: { agent: 'water', dose: 0 }, anim: { dose: [0, 1] }, spin: 0.2 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); stage.root.add(G);
    const manual = [0, 0, 0, 0]; let T = 0;
    const spheres = CORNERS.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshBasicMaterial({ color: c.color, toneMapped: false, transparent: true })); m.position.set(...c.p); G.add(m); stage.pickables.push(m); return m; });
    const labels = CORNERS.map((c) => stage.label(c.name, [c.p[0], c.p[1] + 0.42, c.p[2]], G, 'hot'));
    const edges = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const A = new THREE.Vector3(...CORNERS[i].p), B = new THREE.Vector3(...CORNERS[j].p), len = A.distanceTo(B);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 10), new THREE.MeshBasicMaterial({ color: 0x9aa3b5, transparent: true, toneMapped: false }));
      m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); G.add(m); edges.push({ m, i, j });
    }
    const flame = makeFlame(); flame.position.set(0, 0.25, 0); G.add(flame);
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 14), M.matte(0x4a3324)); log.position.set(0, 0.1, 0); G.add(log);
    const ND = 40, dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), ND); dots.frustumCulled = false; G.add(dots);
    const o = new THREE.Object3D(), fr = (v) => v - Math.floor(v);
    let rem = [0, 0, 0, 0], k = 1, kS = 1;
    stage.pickables = spheres.slice();
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0, 0.95, 0], [0.5, 0.35, 1], 5.2) : mode === 'narrow' ? fitView(stage, [0, 0.95, 0], [0.5, 0.35, 1], 5.6) : fitView(stage, [0, 0.95, 0], [0.5, 0.35, 1], 4.8)));
    return {
      restore() { manual.fill(0); },
      pick(obj) { const i = spheres.indexOf(obj); if (i >= 0) manual[i] = manual[i] ? 0 : 1; },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; frame(); fitNarrow(stage, [], -0.1, 0.06);
        const E = EFFECT[s.agent], dose = s.agent === 'none' ? 0 : s.dose;
        rem = E.e.map((e, i) => Math.max(manual[i], e * dose));
        const kill = Math.max(...rem); k = smooth(1 - kill / 0.85); kS = approach(kS, k, 6, dt);
        spheres.forEach((m, i) => { const keep = 1 - rem[i]; m.material.opacity = 0.15 + 0.85 * keep; m.scale.setScalar(0.5 + 0.5 * keep); });
        edges.forEach((e) => { const keep = Math.min(1 - rem[e.i], 1 - rem[e.j]); e.m.material.opacity = 0.12 + 0.7 * keep; e.m.scale.x = e.m.scale.z = 0.4 + 0.6 * keep; });
        flame.set(kS, T, 1.5, 1.1);
        for (let i = 0; i < ND; i++) {
          if (dose <= 0.02 || i / ND > dose + 0.1 || s.agent === 'none') { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); }
          else { const a = fr(i * 0.618 + T * 0.7), az = i * 2.4, r = (1 - a) * 2.0; o.position.set(Math.cos(az) * r, 2.6 - a * 2.2, Math.sin(az) * r); o.scale.setScalar(1 + (s.agent === 'foam' || s.agent === 'powder' ? 0.5 : 0)); }
          o.updateMatrix(); dots.setMatrixAt(i, o.matrix);
        }
        dots.material.color.set(E.color || 0xffffff); dots.instanceMatrix.needsUpdate = true;
      },
      readout: (s) => {
        const E = EFFECT[s.agent], names = CORNERS.filter((c, i) => rem[i] > 0.85).map((c) => c.name.toLowerCase());
        const big = k < 0.04 ? 'Fire out' : 'Burning: ' + Math.round(kS * 100) + '%';
        return rows(big, CORNERS.map((c, i) => [c.name, rem[i] > 0.85 ? 'removed' : rem[i] > 0.05 ? Math.round(rem[i] * 100) + '% gone' : 'holding', rem[i] > 0.85 ? 'ok' : '']), (k < 0.04 ? 'Out, because ' + names.join(' and ') + ' ' + (names.length > 1 ? 'are' : 'is') + ' gone. ' : 'Click a corner to take it away. ') + E.text, 4, 340);
      },
    };
  },
};
