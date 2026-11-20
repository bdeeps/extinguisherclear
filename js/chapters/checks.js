// Chapter 6: keeping it ready. A gauge, a pin and a seal, and what time and temperature do. A stored-
// pressure extinguisher is a fixed amount of gas in a fixed volume, so its pressure follows the
// absolute temperature (P ∝ T) and falls in proportion to any gas that leaks out (cylinder() in
// extinguisher.js). The "reach" is computed from the jet speed at that pressure, with the same drag
// as the thrown particles; "spray time" runs the discharge forward at that pressure. Low pressure
// means a shorter throw and a shorter spray. The green band (10 to 15 bar) is this model's, not a standard.
import { THREE, M, clamp } from '../kit.js';
import { rows, fitNarrow, framer, fitView } from '../parts.js';
import { AGENTS, cylinder, runtime, reach } from '../extinguisher.js';
import { makeStored, gaugeFace } from '../models.js';

export default {
  id: 'checks',
  short: 'Gauge, pin, checks',
  title: 'Gauge, pin and checks',
  subtitle: 'Why a full-looking extinguisher can fail, and the checks that catch it.',
  view: { pos: [0.9, 0.7, 1.8], target: [0.1, 0.35, 0] },
  learn: `<p>An extinguisher might sit for years and then be needed once. Three things tell you if it is ready.</p>
    <p>The <b>gauge</b> shows the gas pressure. The needle should sit in the <b>green</b>. Gas is the only thing pushing the agent out, so low gas means a weak, short spray, even when the cylinder is full of agent. A slow leak is the most common way an extinguisher fails. Temperature matters a little: at fixed volume gas pressure follows the absolute temperature, so a cold store room reads lower than a warm office.</p>
    <p>The <b>pin and tamper seal</b> should be in place. If the seal is broken, the extinguisher has been used or meddled with, even a little, and it should be serviced or replaced. Also look for dents, rust, a cracked hose, a blocked nozzle, and that it is where it should be, with the label facing out.</p>
    <p>The schedule is set by local rules and standards, so check yours. The pattern is much the same everywhere: a <b>monthly look</b> by whoever is responsible, a <b>yearly service</b> by a competent person, and every five to ten years a <b>deeper overhaul</b> and a pressure test of the cylinder itself. US rules (NFPA 10) ask for a test every 5 years for water and CO₂ models and 12 for dry-chemical ones. <b>CO₂ extinguishers have no gauge</b>, so they are weighed.</p>
    <p class="tip"><b>Try it:</b> let some gas leak out and watch the needle, the reach and the spray time. Then break the seal.</p>`,
  terms: [
    { t: 'Gauge', d: 'A dial showing the gas pressure in the cylinder, with a green band for "ready".' },
    { t: 'Tamper seal', d: 'A thin plastic tie through the pin that breaks when the pin is pulled.' },
    { t: 'Hydrostatic test', d: 'Filling the empty cylinder with water at a high pressure to prove the metal is still strong enough.' },
    { t: 'Service tag', d: 'A label on the extinguisher recording who checked it and when.' },
    { t: 'Recharge', d: 'Refilling a used extinguisher with agent and gas after it has been checked.' },
  ],
  defaults: { agent: 'water', temp: 20, leak: 0, seal: true },
  controls: [
    { key: 'agent', type: 'seg', label: 'Type', options: [{ v: 'water', label: 'Water' }, { v: 'powder', label: 'Powder' }] },
    { key: 'leak', type: 'range', label: 'Gas that has leaked out', min: 0, max: 0.8, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'temp', type: 'range', label: 'Temperature of the room', min: -20, max: 50, step: 1, fmt: (v) => v.toFixed(0) + ' °C' },
    { key: 'seal', type: 'toggle', label: 'Tamper seal intact' },
  ],
  quiz: [
    { q: 'The gauge needle is in the red, low zone. The cylinder looks full. What does that mean?', options: ['It is fine', 'There is too little gas to push the agent out properly', 'There is too much agent', 'The gauge is broken for sure'], answer: 1, why: 'The agent is only pushed out by the gas. Low gas gives a short, weak spray.' },
    { q: 'The tamper seal is broken but the pin is still in. What should you do?', options: ['Ignore it', 'Have it checked or replaced', 'Pull the pin and test it', 'Paint over it'], answer: 1, why: 'A broken seal means it may have been used or meddled with.' },
    { q: 'How do you check a CO₂ extinguisher is full?', options: ['Read the gauge', 'Weigh it', 'Shake it', 'Smell it'], answer: 1, why: 'The pressure only depends on temperature while liquid remains, so weight is the test.' },
  ],
  reel: [
    { ms: 5200, caption: 'Slow leaks are a common failure. Low gas means a weak, short spray, so check the gauge monthly.', set: { agent: 'water', temp: 20, leak: 0, seal: true }, anim: { leak: [0, 0.6] }, spin: 0, view: { pos: [0.6, 0.85, 1.3], target: [0.0, 0.62, 0] } },
  ],

  build({ stage, s }) {
    const G = new THREE.Group(); stage.root.add(G);
    let ex = null, key = '', cyl = cylinder('water'), T = 0;
    const big = gaugeFace(512); const bg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 40), [M.metal(0xb9bec8), new THREE.MeshBasicMaterial({ map: big.tex, toneMapped: false }), M.metal(0xb9bec8)]); bg.rotation.x = Math.PI / 2; bg.position.set(0.8, 0.62, 0.0); G.add(bg);
    const lbl = [stage.label('Pressure', [0.8, 0.98, 0], G, 'hot'), stage.label('Pin and seal', [0.13, 0.78, 0.1], G), stage.label('', [0.8, 0.2, 0], G, 'hot')];
    const rebuild = () => {
      if (ex) { G.remove(ex.g); ex.g.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
      ex = makeStored(s.agent, { cut: false, hose: 'clip' }); G.add(ex.g); cyl = cylinder(s.agent); key = s.agent;
    };
    rebuild();
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.4, 0.45, 0], [0.4, 0.2, 1], 3.0) : mode === 'narrow' ? fitView(stage, [0.4, 0.45, 0], [0.5, 0.2, 1], 3.0) : fitView(stage, [0.38, 0.4, 0], [0.5, 0.2, 1], 2.5)));
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        T += dt; frame(); fitNarrow(stage, [lbl[1]], -0.1, 0.06);
        if (key !== s.agent) rebuild();
        cyl.leak = s.leak; cyl.T = s.temp;
        const a = AGENTS[s.agent], g = cyl.gauge();
        ex.parts.set({ out: 0, gauge: g, squeeze: 0, pin: 0, T, hot: 0.2 + g / 30 });
        ex.parts.seal.visible = s.seal;
        big.draw(g, { max: 20, green: [10, 15] });
        lbl[2].element.textContent = g >= 10 && g <= 15 ? 'In the green' : g < 10 ? 'Too low: service it' : 'Too high';
        lbl[2].element.style.color = g >= 10 && g <= 15 ? '#5ce1a9' : '#ff7a7a';
      },
      readout: (s) => {
        const g = cyl.gauge(), ok = g >= 10 && g <= 15, run = runtime(cyl), r = reach(s.agent, cyl.speed(), 0.25);
        return rows(g.toFixed(1) + ' bar', [['Verdict', !s.seal ? 'seal broken: check it' : ok ? 'ready' : g < 10 ? 'not ready' : 'too high', ok && s.seal ? 'ok' : 'no'], ['Throw (flat)', r.toFixed(1) + ' m'], ['Spray time', run.toFixed(0) + ' s'], ['Pressure when new', AGENTS[s.agent].p0 + ' bar at 20 °C']], !s.seal ? 'A broken tamper seal means it may have been used.' : ok ? 'Monthly: look at the gauge, pin, seal and body.' : 'Gas has leaked out. The agent is still there, but the push is gone.', 4);
      },
    };
  },
};
