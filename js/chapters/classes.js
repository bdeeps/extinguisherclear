// Chapter 4: which extinguisher for which fire, and why the wrong one is dangerous. A grid of six
// fires against six extinguishers. Each pairing has an outcome and a reason (MATRIX), written from
// the usual European (EN 2) classes: A solids, B liquids, C gases, D metals, F cooking oil, and live
// electrical equipment, which is not a class of its own. US names differ (Class K for cooking oil).
// 'out' puts it out, 'part' helps but is unreliable, 'none' does nothing, 'bad' makes things worse.
// The animation is a story of the outcome, not a simulation of the chemistry.
import { THREE, M, clamp, smooth } from '../kit.js';
import { rows, fitNarrow, framer, fitView, boxAt, cylY, board, panelBg } from '../parts.js';
import { AGENTS } from '../extinguisher.js';
import { Spray, makeFlame } from '../spray.js';

const FIRES = [
  { id: 'A', short: 'A  Wood', name: 'Class A: wood, paper, cloth' },
  { id: 'B', short: 'B  Liquid', name: 'Class B: petrol, solvents, oils' },
  { id: 'C', short: 'C  Gas', name: 'Class C: gas' },
  { id: 'D', short: 'D  Metal', name: 'Class D: burning metal' },
  { id: 'F', short: 'F  Oil', name: 'Class F: cooking oil and fat' },
  { id: 'E', short: 'Live', name: 'Live electrical equipment' },
];
const EXTS = [
  { id: 'water', short: 'Water' }, { id: 'foam', short: 'Foam' }, { id: 'powder', short: 'Powder' }, { id: 'co2', short: 'CO₂' }, { id: 'wet', short: 'Wet chem.' }, { id: 'dpowder', short: 'D powder' },
];
// MATRIX[ext][fire index] = [outcome, reason]
const MATRIX = {
  water: [['out', 'Water cools wood and paper below burning point and soaks in. The best agent for Class A.'], ['bad', 'Most flammable liquids are lighter than water and float. The burning layer spreads out over the water, and the fire gets bigger.'], ['none', 'Water does nothing to burning gas, and the gas keeps leaking. Shut off the supply.'], ['bad', 'Burning metal is hot enough to split water into hydrogen and oxygen. The hydrogen burns or explodes.'], ['bad', 'Water sinks under hot oil and flashes to steam, over 1,700 times its volume, throwing burning oil in a fireball.'], ['bad', 'Water carries electricity. A jet can carry current back to you. Cut the power first.']],
  foam: [['out', 'Foam is mostly water, so it cools, and its blanket cuts off air. Good on Class A.'], ['out', 'Foam floats on the liquid and seals in the vapour. The usual choice for Class B.'], ['none', 'Foam cannot stop a gas fire, which needs its supply shut off.'], ['bad', 'Foam is mostly water, so it has the same danger as water on burning metal.'], ['bad', 'Water in the foam flashes to steam under hot oil and spits burning oil. Use wet chemical.'], ['bad', 'Water-based foam conducts electricity. Do not use it on live equipment.']],
  powder: [['out', 'ABC powder melts into a coating on embers and breaks the chain reaction. Plain BC powder does not work on Class A.'], ['out', 'Powder knocks the flame down very fast. A good all-rounder for liquids.'], ['part', 'Powder stops the flame, but if the gas keeps leaking it can explode or relight. Shut off the supply first.'], ['none', 'ABC powder is not made for metal fires. It does not stop them and the cloud can fan them.'], ['part', 'It can knock the flame down but gives no cooling, so hot oil relights. The blast can also spread burning oil.'], ['out', 'Powder does not conduct, so it is safe on live equipment, but it makes a corrosive mess.']],
  co2: [['part', 'CO₂ pushes the air away but does not cool. A deep fire in wood relights when the gas clears.'], ['out', 'CO₂ works on small liquid fires, but the gas drifts away, so watch for relighting.'], ['part', 'CO₂ can blow out a small gas flame, but the gas is still leaking.'], ['bad', 'Burning magnesium and some other metals are hot enough to pull the oxygen out of CO₂, so it feeds the fire.'], ['part', 'The blast can splash oil, and with no cooling the oil relights.'], ['out', 'The classic choice: it does not conduct, leaves no residue, and does not damage equipment.']],
  wet: [['out', 'Wet chemical also works on Class A, as it is mostly a water mist.'], ['bad', 'It is water-based, so it behaves like water on a burning liquid and can spread it.'], ['none', 'Not made for gas fires.'], ['bad', 'It is water-based, so it reacts with burning metal.'], ['out', 'Designed for it. A fine mist cools the oil, and a soap layer forms on top and seals it from the air.'], ['bad', 'It is water-based and conducts. Do not use on live equipment.']],
  dpowder: [['none', 'Class D powder is made for metals. It is not rated on Class A fires.'], ['none', 'Not made for liquid fires.'], ['none', 'Not made for gas fires.'], ['out', 'Special powder smothers the metal and forms a crust that keeps the air out. It is the only thing rated for the job.'], ['none', 'Not made for cooking oil.'], ['none', 'Not made for live equipment.']],
};
const CODE = { out: ['Fire out', '#5ce1a9'], part: ['Helps, but it can come back', '#ffb547'], none: ['No effect', '#8a909c'], bad: ['DANGEROUS: makes it worse', '#ff5a5a'] };

export default {
  id: 'classes',
  short: 'Which for which',
  title: 'The right extinguisher for the fire',
  subtitle: 'The wrong one does nothing, or something much worse.',
  view: { pos: [1.6, 2.2, 6.2], target: [0.8, 0.9, 0] },
  learn: `<p>Fires are sorted into <b>classes</b> by what is burning, because the fuel decides what works. In Europe: <b>A</b> solids like wood and paper, <b>B</b> liquids, <b>C</b> gases, <b>D</b> metals, and <b>F</b> cooking oil and fat. In the US the cooking class is <b>K</b>. Live electrical equipment is not a class, because once the power is cut it is just an A or B fire.</p>
    <p>Many extinguishers are rated for several. Check the label and the pictograms. The ones that look alike are not interchangeable:</p>
    <p><b>Water on cooking oil or petrol</b> is the classic mistake. Water is denser than oil, so it sinks beneath it and flashes to steam, expanding more than 1,700 times, and throws burning oil into a fireball. Petrol floats on water and just spreads. <b>Water on a live appliance</b> can carry current to you. <b>Water on burning magnesium</b> is split into hydrogen. And <b>CO₂ on a deep wood fire</b> only pauses it.</p>
    <p><b>Gas fires</b> are a special case: the safest fix is usually to shut off the supply and let the flame burn out. Put it out and the gas keeps leaking, ready to explode.</p>
    <p class="tip"><b>Try it:</b> pick a fire and an extinguisher and press Use it. Start with water on cooking oil, from a safe distance.</p>`,
  terms: [
    { t: 'Class A, B, C, D, F', d: 'Fire classes by fuel: solids, liquids, gases, metals and cooking oils (K in the US).' },
    { t: 'Rating', d: 'The classes an extinguisher is tested and approved for, printed on its label.' },
    { t: 'Flash to steam', d: 'Water hitting something far above 100 °C boils almost at once, expanding by more than 1,700 times.' },
    { t: 'Re-ignition', d: 'A flame that returns after the agent is gone, because the fuel is still hot.' },
    { t: 'Saponification', d: 'Hot oil reacting with an alkali to make soap. It is how wet chemical seals a fat fire.' },
  ],
  defaults: { fire: 'F', ext: 'water', answers: false },
  controls: [
    { key: 'fire', type: 'seg', label: 'The fire', options: FIRES.map((f) => ({ v: f.id, label: f.short })) },
    { key: 'ext', type: 'seg', label: 'The extinguisher', options: EXTS.map((e) => ({ v: e.id, label: e.short })) },
    { key: 'go', type: 'buttons', label: 'Go', items: [{ label: 'Use it', act: (s, inst) => inst.use() }, { label: 'Light it again', act: (s, inst) => inst.reset() }] },
    { key: 'answers', type: 'toggle', label: 'Show every answer on the chart' },
  ],
  quiz: [
    { q: 'What happens if you spray water on a burning chip pan?', options: ['It puts it out', 'It sinks, flashes to steam and throws burning oil out', 'It does nothing', 'It makes foam'], answer: 1, why: 'Water is denser than oil, goes under it and boils at once, expanding over 1,700 times and spraying burning oil.' },
    { q: 'Which is the usual choice for a fire in live electrical equipment?', options: ['Water', 'Foam', 'CO₂ or powder', 'Wet chemical'], answer: 2, why: 'CO₂ and powder do not conduct. Cut the power if you safely can.' },
    { q: 'Why is putting out a gas fire not always the right thing?', options: ['The flame is too hot', 'The gas keeps leaking and can explode', 'Extinguishers do not work on gas', 'It is not allowed'], answer: 1, why: 'Out is not safe while the gas still flows. Shut off the supply first.' },
  ],
  reel: [
    { ms: 5200, caption: 'The wrong one makes it worse. Water sinks under burning oil, flashes to steam and throws a fireball.', set: { fire: 'F', ext: 'water' }, act: (s, inst) => { inst.reset(); inst.use(); }, spin: 0 },
    { ms: 4800, caption: 'The right one, wet chemical, cools the oil and seals it under a layer of soap.', set: { fire: 'F', ext: 'wet' }, act: (s, inst) => { inst.reset(); inst.use(); }, spin: 0 },
  ],

  build({ stage, s }) {
    const G = new THREE.Group(); stage.root.add(G);
    G.add(boxAt(3.4, 0.08, 2.6, 0.8, -0.04, 0, M.matte(0x2a2f39)));
    // the fires
    const setup = {};
    const fl = (x, y, z, w, h, col, inner) => { const f = makeFlame(col, inner); f.position.set(x, y, z); G.add(f); return { f, x, y, z, w, h }; };
    const addFire = (id, parts, flames) => { const g = new THREE.Group(); parts.forEach((p) => g.add(p)); G.add(g); setup[id] = { g, flames }; };
    const log = (x, z, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 10), M.matte(0x5b3b24)); m.rotation.z = Math.PI / 2; m.rotation.y = r; m.position.set(x, 0.07, z); return m; };
    addFire('A', [log(0, 0, 0.3), log(0, 0, -0.4), log(0, 0, 1.2), log(0, 0, -1.1).translateY(0.12)], [fl(0, 0.12, 0, 0.9, 0.85, 0xff7a1a, 0xffd24a)]);
    addFire('B', [boxAt(1.0, 0.1, 0.7, 0, 0.05, 0, M.metal(0x6a707c, { roughness: 0.6 })), boxAt(0.9, 0.02, 0.6, 0, 0.1, 0, M.matte(0xc9b04a, { roughness: 0.2 }))], [fl(0, 0.1, 0, 1, 0.9, 0xff8a1a, 0xffe06a)]);
    const pipe = cylY(0.05, 0, 0.9, M.metal(0x8a909c), 14); const nozzle = cylY(0.045, 0, 0.35, M.metal(0xd0a245), 12); nozzle.rotation.z = -Math.PI / 2; nozzle.position.set(0.17, 0.9, 0);
    addFire('C', [pipe, nozzle, boxAt(0.3, 0.08, 0.3, 0, 0.04, 0, M.metal(0x6a707c))], [fl(0.75, 0.9, 0, 0.3, 0.9, 0x5ab0ff, 0xcfeaff)]);
    addFire('D', [cylY(0.28, 0, 0.18, M.metal(0xb9bec8, { roughness: 0.5 }), 12, 0.2), boxAt(0.35, 0.1, 0.25, 0.1, 0.13, 0.05, M.metal(0xb9bec8))], [fl(0, 0.15, 0, 0.8, 0.8, 0xdfe9ff, 0xffffff)]);
    const pan = cylY(0.36, 0.12, 0.26, M.metal(0x23262d), 24, 0.34), oil = cylY(0.32, 0.2, 0.22, M.matte(0xd9a21b, { roughness: 0.2 }), 24); const handle = boxAt(0.5, 0.04, 0.07, 0.62, 0.22, 0, M.metal(0x23262d));
    addFire('F', [boxAt(1.0, 0.12, 0.9, 0, 0.06, 0, M.metal(0x8a909c)), pan, oil, handle], [fl(0, 0.22, 0, 0.8, 0.85, 0xff7a1a, 0xffd24a)]);
    const body = boxAt(0.7, 0.55, 0.5, 0, 0.28, 0, M.plastic(0xd8dce6)); const panel = boxAt(0.5, 0.18, 0.02, 0, 0.35, 0.26, M.matte(0x23262d)); const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.35, 0.15, 0), new THREE.Vector3(0.7, 0.05, 0.2), new THREE.Vector3(1.0, 0.03, 0.0)]), 20, 0.015, 6), M.matte(0x111111));
    addFire('E', [body, panel, cord], [fl(0, 0.56, 0, 0.5, 0.6, 0xff7a1a, 0xffd24a)]);
    const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M.glow(0xff7a1a, { transparent: true, opacity: 0.7 })); fireball.visible = false; G.add(fireball);
    const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 5, 4), M.glow(0xffe06a), 20); sparks.frustumCulled = false; G.add(sparks);
    // the extinguisher on the left
    const ext = new THREE.Group(); ext.position.set(-2.2, 0, 0);
    ext.add(cylY(0.1, 0, 0.55, M.plastic(0xc8261b, { metalness: 0.3 }), 24), cylY(0.04, 0.55, 0.65, M.metal(0xd0a245), 12));
    const band = cylY(0.101, 0.28, 0.4, M.matte(0xffffff), 24); ext.add(band); G.add(ext);
    const origin = new THREE.Vector3(-2.0, 0.55, 0.0);
    let boardKey = '', spray = null, sprayId = '', T = 0, t0 = -1, key = '', fb = null, burn = null;
    const o = new THREE.Object3D();
    const title = stage.label('', [0.2, 1.7, 0], G, 'hot');
    // chart
    const done = {}; let sNow = s;
    const bd = board(G, 2.8, 2.8, 840, 840, (g, w, h) => {
      panelBg(g, w, h); const L = 150, Tp = 150, cw = (w - L - 20) / 6, ch = (h - Tp - 20) / 6;
      g.fillStyle = '#e8eef8'; g.font = 'bold 36px sans-serif'; g.fillText('Which extinguisher on which fire?', 24, 48);
      g.font = '26px sans-serif'; g.textAlign = 'center';
      FIRES.forEach((f, c) => { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(f.id === 'E' ? 'Live' : f.id, L + cw * (c + 0.5), Tp - 14); });
      g.textAlign = 'right'; EXTS.forEach((e, r) => { g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(e.short, L - 12, Tp + ch * (r + 0.5) + 9); });
      EXTS.forEach((e, r) => FIRES.forEach((f, c) => {
        const code = MATRIX[e.id][c][0], seen = done[e.id + f.id] || sNow.answers, sel = sNow.ext === e.id && sNow.fire === f.id;
        g.fillStyle = seen ? CODE[code][1] : 'rgba(255,255,255,.08)'; g.globalAlpha = seen ? 0.85 : 1; g.beginPath(); g.roundRect(L + cw * c + 4, Tp + ch * r + 4, cw - 8, ch - 8, 10); g.fill(); g.globalAlpha = 1;
        if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke(); }
      }));
      g.textAlign = 'left'; g.font = '22px sans-serif'; [['out', 'out'], ['part', 'unreliable'], ['none', 'no effect'], ['bad', 'dangerous']].forEach(([k, t], i) => { g.fillStyle = CODE[k][1]; g.fillRect(24 + i * 195, h - 34, 18, 18); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(t, 48 + i * 195, h - 18); });
    }, [3.1, 1.5, -0.5], -0.25, 0);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.4, 1.3, 0], [0.1, 0.35, 1], 8) : mode === 'narrow' ? fitView(stage, [-0.2, 0.8, 0], [0.1, 0.4, 1], 5.2) : fitView(stage, [1.0, 1.0, 0], [0.1, 0.33, 1], 8.6)));
    const reset = () => { t0 = -1; fb = null; burn?.clear(); spray?.clear(); };
    return {
      use() { if (t0 < 0) { t0 = T; done[sNow.ext + sNow.fire] = true; } },
      reset,
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; sNow = s; const mode = frame(); fitNarrow(stage, [title], -0.1, 0.1);
        const k = s.fire + s.ext; if (k !== key) { key = k; reset(); }
        if (sprayId !== s.ext) { spray?.mesh.parent?.remove(spray.mesh); spray = new Spray(s.ext, 500); G.add(spray.mesh); sprayId = s.ext; if (!burn) { burn = new Spray('fire', 200); G.add(burn.mesh); } }
        const fi = FIRES.findIndex((f) => f.id === s.fire), [code, why] = MATRIX[s.ext][fi], tu = t0 < 0 ? -1 : T - t0;
        Object.entries(setup).forEach(([id, v]) => { v.g.visible = id === s.fire; if (id !== s.fire) v.flames.forEach((p) => { p.f.visible = false; }); });
        band.material.color.set(AGENTS[s.ext].color);
        // flame level over time
        let lvl = 1, big = 1;
        if (tu >= 0) {
          const e = smooth((tu - 0.8) / 1.4);
          if (code === 'out') lvl = 1 - e; else if (code === 'part') lvl = 1 - 0.7 * e + (tu > 2.6 ? 0.6 * smooth((tu - 2.6) / 3) : 0); else if (code === 'bad') { lvl = 1; big = 1 + 1.6 * smooth((tu - 0.9) / 0.4) * (1 - smooth((tu - 3) / 2.5) * 0.6); }
        }
        setup[s.fire].flames.forEach((p, i) => p.f.set(clamp(lvl, 0, 1), T, p.h * (code === 'bad' ? big : 1), p.w * (code === 'bad' ? 1 + (big - 1) * 0.6 : 1), i));
        // spray from the extinguisher for 2.2 s
        const tgt = new THREE.Vector3(setup[s.fire].flames[0].x - 0.1, setup[s.fire].flames[0].y + 0.1, 0);
        const dir = tgt.clone().sub(origin); const sp = 7;
        const aim = dir.clone(); aim.y += 0.25 * dir.length() / sp * 3; aim.normalize();
        const on = tu >= 0 && tu < 2.2;
        spray.emit(dt, on ? 220 : 0, origin, aim, sp);
        spray.step(dt);
        // fireball and droplets for a dangerous pairing
        const fbT = tu - 0.9;
        fireball.visible = code === 'bad' && fbT > 0 && fbT < 2.4;
        if (fireball.visible) { const r = 0.35 + 1.1 * smooth(fbT / 0.5); fireball.scale.setScalar(r); fireball.position.set(setup[s.fire].flames[0].x, 0.6 + 0.4 * smooth(fbT / 0.6), 0); fireball.material.opacity = 0.75 * (1 - smooth((fbT - 0.7) / 1.7)); }
        burn.emit(dt, code === 'bad' && fbT > 0 && fbT < 0.7 ? 260 : 0, new THREE.Vector3(setup[s.fire].flames[0].x, 0.5, 0), new THREE.Vector3(0, 1, 0), 5, 1);
        burn.step(dt);
        for (let i = 0; i < 20; i++) { if (s.fire === 'E' && code === 'bad' && fbT > -0.3 && fbT < 2) { const a = i * 2.4 + T * 9; o.position.set(Math.cos(a) * 0.3 + 0.1, 0.35 + Math.abs(Math.sin(a * 1.7)) * 0.4, Math.sin(a) * 0.3); o.scale.setScalar(1); } else { o.position.set(0, -1e4, 0); o.scale.setScalar(1e-4); } o.updateMatrix(); sparks.setMatrixAt(i, o.matrix); }
        sparks.instanceMatrix.needsUpdate = true;
        title.element.textContent = FIRES[fi].name; title.position.set(setup[s.fire].flames[0].x * 0.3, 1.75, 0);
        const bk = [s.ext, s.fire, s.answers, Object.keys(done).length].join(); if (bk !== boardKey) { boardKey = bk; bd.redraw(); }
        bd.mesh.visible = mode === 'wide' || mode === 'tall'; if (mode === 'tall') bd.place([0.9, 3.0, -0.4], 0.6, 0, 0); else bd.place();
      },
      readout: (s) => {
        const fi = FIRES.findIndex((f) => f.id === s.fire), [code, why] = MATRIX[s.ext][fi], used = t0 >= 0 && T - t0 > 1.2;
        if (!used) return rows('Choose and press Use it', [['Fire', FIRES[fi].name.replace(/^Class \w: /, '')], ['Extinguisher', EXTS.find((e) => e.id === s.ext).short]], 'The chart on the right fills in as you try each pairing.', 2, 320);
        return rows(`<span style="color:${CODE[code][1]}">${CODE[code][0]}</span>`, [['Fire', FIRES[fi].name.replace(/^Class \w: /, '')], ['Extinguisher', EXTS.find((e) => e.id === s.ext).short]], why, 2, 340);
      },
    };
  },
};
