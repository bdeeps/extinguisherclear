// Chapter 5: carbon dioxide, a liquid that boils into snow. CO2 is stored as a liquid under its own
// vapour pressure: 57 bar at 20 °C, 35 bar at 0 °C, 73.8 bar at the critical point of 31 °C (CO2_PTS
// in extinguisher.js). That pressure depends only on temperature while any liquid is left, so a
// pressure gauge says nothing about how much is inside: you weigh the cylinder instead. Pressure comes
// from the chart; discharge draws liquid up the dip tube at 0.143 kg/s (2 kg in 14 s), and the liquid
// that boils to refill the space left behind (about ρvapour/ρliquid of what leaves, per kg) cools the
// cylinder, so its pressure falls as it empties. Latent heat is taken as 231 − 4.2·T kJ/kg
// (T in °C). Cylinder heat capacity is 3.4 kg of steel at 0.5 kJ/kg·K plus the liquid at 3 kJ/kg·K.
import { THREE, M, clamp, approach } from '../kit.js';
import { rows, fitNarrow, framer, fitView, board, axes, marker, plot } from '../parts.js';
import { co2Pressure, CO2_CRIT, AGENTS } from '../extinguisher.js';
import { makeCO2 } from '../models.js';
import { Spray } from '../spray.js';

const MASS = 2, FLOW = 2 / 14, LITRES_PER_KG = 546;
const ratio = (T) => 0.095 * Math.exp(0.035 * T); // vapour density over liquid density, 0.095 at 0 °C and 0.19 at 20 °C

export default {
  id: 'co2',
  short: 'CO₂: liquid to snow',
  title: 'Carbon dioxide: a liquid that boils into snow',
  subtitle: 'Its pressure depends on temperature, not on how much is left.',
  view: { pos: [0.9, 0.7, 1.9], target: [0.35, 0.3, 0] },
  learn: `<p>A CO₂ extinguisher holds <b>liquid carbon dioxide</b>, squeezed into a small, thick cylinder. The pressure inside is not something put in with a pump. It is simply the <b>vapour pressure</b>: how hard the liquid's own vapour pushes. At 20 °C that is about <b>57 bar</b>, at 0 °C about 35 bar.</p>
    <p>That has a strange effect: <b>while any liquid is left, the pressure depends only on the temperature</b>. A full cylinder and a nearly empty one read the same, so a CO₂ extinguisher has no useful gauge. You check it by <b>weighing</b> it against the weight stamped on the cylinder.</p>
    <p>Open the valve and liquid goes up the dip tube to the horn. It leaves at atmospheric pressure, boils, and cools sharply. Some of it freezes into <b>CO₂ snow</b> (dry ice, at −78 °C), the rest becomes gas: about 540 litres per kilogram. The cloud is heavy and pushes air away from the fire. The cold helps too, but not much.</p>
    <p>The cylinder is cooled as well, because liquid boils inside it to fill the space left behind. Squeeze for a few seconds and the cylinder frosts over and the pressure falls. <b>Never hold the horn.</b> It gets cold enough to freeze skin on contact. And above 31 °C, the critical point, there is no liquid and gas boundary at all.</p>
    <p class="tip"><b>Try it:</b> slide the temperature and watch the pressure. Then spray and watch the pressure fall as the cylinder chills.</p>`,
  terms: [
    { t: 'Vapour pressure', d: 'The pressure a liquid\'s own vapour makes in a closed container. It rises steeply with temperature.' },
    { t: 'Critical point', d: 'The temperature and pressure above which a fluid is no longer separately a liquid or a gas. For CO₂: 31 °C and 73.8 bar.' },
    { t: 'Dry ice', d: 'Solid CO₂. At normal air pressure it turns straight to gas ("sublimes") at −78.5 °C.' },
    { t: 'Latent heat', d: 'The heat a liquid takes up as it boils. It is what chills the cylinder and the snow.' },
    { t: 'Horn', d: 'The wide cone at the end of the hose that slows the jet and keeps the cloud together.' },
  ],
  defaults: { temp: 20, spray: false },
  controls: [
    { key: 'temp', type: 'range', label: 'Air temperature', min: -20, max: 30, step: 1, fmt: (v) => v.toFixed(0) + ' °C', hint: 'The critical point is at 31 °C.' },
    { key: 'spray', type: 'toggle', label: 'Squeeze the lever' },
    { key: 'go', type: 'buttons', label: 'Refill', items: [{ label: 'Fill it up again', act: (s, inst) => inst.refill() }] },
  ],
  quiz: [
    { q: 'Why does a CO₂ extinguisher have no pressure gauge?', options: ['It is too small', 'Pressure depends on temperature while any liquid remains, so it does not show how much is left', 'The gas is poisonous', 'CO₂ has no pressure'], answer: 1, why: 'It is the liquid\'s own vapour pressure. You weigh the cylinder to see if it is full.' },
    { q: 'What is the pressure inside at 20 °C?', options: ['About 5 bar', 'About 12 bar', 'About 57 bar', 'About 500 bar'], answer: 2, why: '57 bar at 20 °C, and 35 bar at 0 °C.' },
    { q: 'Why must you not hold the horn?', options: ['It is heavy', 'It is cold enough to freeze skin', 'It is electrically live', 'It breaks off'], answer: 1, why: 'The snow and gas leave at about −78 °C, and the horn gets just as cold.' },
  ],
  reel: [
    { ms: 5200, caption: 'CO₂ is stored as a liquid at 57 bar. Open the valve and it boils into freezing snow and gas.', set: { temp: 20, spray: true }, act: (s, inst) => inst.refill(), spin: 0, view: { pos: [1.0, 0.6, 1.6], target: [0.5, 0.35, 0] } },
  ],

  build({ stage, s }) {
    const G = new THREE.Group(); stage.root.add(G);
    const ex = makeCO2({ cut: true }); G.add(ex.g);
    const spray = new Spray('co2', 700); G.add(spray.mesh);
    let T = 0, mL = MASS, chill = 0, sq = 0, P = 57;
    const horn = new THREE.Vector3(0.3, 0.52, 0.16), dir = new THREE.Vector3(1, -0.05, 0);
    const lab = [stage.label('Liquid CO₂', [0, 0.14, 0.06], G), stage.label('Vapour', [0, 0.36, 0.06], G, 'hot'), stage.label('Horn: gets very cold', [0.36, 0.62, 0.16], G), stage.label('No gauge', [-0.1, 0.55, 0.08], G, 'hot')];
    let sNow = s;
    const bd = board(G, 2.2, 1.45, 880, 580, (g, w, h) => {
      const { X, Y } = axes(g, w, h, { title: 'CO₂ vapour pressure', sub: sNow ? P.toFixed(0) + ' bar' : '', x0: -30, x1: 40, y0: 0, y1: 90, xt: [-20, 0, 20, 31].map((v) => [v, v + '°']), yt: [0, 20, 40, 60, 80].map((v) => [v, v + '']), xl: 'temperature (°C)', pad: [86, 76, 30, 80] });
      plot(g, X, Y, (t) => co2Pressure(t), -30, CO2_CRIT, '#8ef0ff', 7, 60);
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(X(CO2_CRIT), Y(0)); g.lineTo(X(CO2_CRIT), Y(90)); g.stroke(); g.setLineDash([]);
      g.font = '26px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('critical point, 31 °C', X(CO2_CRIT) + 10, Y(8));
      if (sNow) marker(g, X(clamp(sNow.temp - chill, -30, 31)), Y(P), P.toFixed(0) + ' bar', '#ffb547', w);
    }, [1.0, 0.72, -1.2], -0.12, 0);
    let bk = '';
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.5, 0.45, 0], [0.5, 0.25, 1], 3.2) : mode === 'narrow' ? fitView(stage, [0.25, 0.3, 0], [0.6, 0.25, 1], 2.9) : fitView(stage, [0.55, 0.38, 0], [0.5, 0.2, 1], 2.5)));
    return {
      refill() { mL = MASS; chill = 0; spray.clear(); },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; sNow = s; const mode = frame(); fitNarrow(stage, lab.slice(2), -0.1, 0.06);
        const Tc = clamp(s.temp - chill, -30, CO2_CRIT); P = co2Pressure(Tc);
        const flowing = s.spray && mL > 0.001;
        if (flowing) {
          const dm = Math.min(mL, FLOW * Math.sqrt(P / 57) * dt); mL -= dm;
          const cap = (3.4 * 0.5 + mL * 3.0), L = 231 - 4.2 * Tc;
          chill += (dm * ratio(Tc) / (1 - ratio(Tc)) * L) / cap;
        } else chill *= Math.exp(-dt / 90);
        sq = approach(sq, s.spray ? 1 : 0, 14, dt);
        ex.parts.set({ fill: 0.1 + 0.65 * (mL / MASS), T, hot: 0.2 + P / 120, squeeze: sq });
        spray.emit(dt, flowing ? 220 * Math.sqrt(P / 57) : 0, new THREE.Vector3(0.3 + 0.16, 0.52 - 0.01, 0.16), dir, AGENTS.co2.v0);
        spray.step(dt);
        bd.mesh.visible = mode !== 'narrow';
        const k = Math.round(P * 2) + '|' + s.temp; if (k !== bk) { bk = k; bd.redraw(); }
        if (mode === 'tall') bd.place([0.5, 1.25, -0.8], 0.6, 0, 0); else bd.place();
      },
      readout: (s) => {
        const Tc = clamp(s.temp - chill, -30, CO2_CRIT);
        return rows(P.toFixed(0) + ' bar', [['CO₂ left', mL.toFixed(2) + ' of ' + MASS + ' kg'], ['Cylinder', Tc.toFixed(0) + ' °C'], ['Gas it would make', Math.round(mL * LITRES_PER_KG) + ' L']], mL < 0.001 ? 'Empty.' : chill > 3 ? 'The cylinder has chilled by ' + chill.toFixed(0) + ' °C, so its pressure has dropped.' : 'Full or nearly empty, the pressure is the same. Weigh it to know.', 3);
      },
    };
  },
};
