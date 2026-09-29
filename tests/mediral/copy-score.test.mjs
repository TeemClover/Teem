import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {score, SHOTS} from '../../mediral/js/score.js';
import {resolveTrack, sample} from '../../mediral/js/cinema.js';

const routine = JSON.parse(readFileSync(new URL('../../mediral/data/routine.json', import.meta.url)));
const layouts = [
  {tall: true, W: 320, H: 740},
  {tall: true, W: 393, H: 852},
  {tall: false, W: 1280, H: 800},
];
// Names and the identity/link share CL's closing composition. All other primary copy takes turns.
const stages = {
  CL: [['cl.problem'], ['cl.word1'], ['cl.word2'], ['cl.botanical-label', 'cl.foot']],
  AC: [['ac.problem'], ['ac.w1'], ['ac.w2'], ['ac.w3'], ['ac.title'], ['ac.foot']],
  BR: [['br.problem'], ['br.title'], ['br.w2'], ['br.w3'], ['br.foot']],
  SU: [['su.problem'], ['su.title'], ['su.w1'], ['su.w2'], ['su.w3'], ['su.foot']],
  PO: [['po.problem'], ['po.title'], ['po.w1'], ['po.w2'], ['po.foot']],
};
function timeline(layout) {
  const plan = score(layout);
  const home = {cx: layout.W / 2, cy: layout.H * .2, w: 240, h: 70};
  const tracks = Object.fromEntries(Object.entries(plan.tracks)
    .map(([key, frames]) => [key, resolveTrack(frames, home, layout)]));
  return {plan, at: (key, T) => sample(tracks[key], T)};
}

test('every chapter reads one primary copy stage at a time, including fade boundaries', () => {
  for (const layout of layouts) {
    const {plan, at} = timeline(layout);
    for (const [id, sequence] of Object.entries(stages)) {
      for (let n = 0; n <= Math.ceil(plan.end * 1000); n++) {
        const T = n / 1000;
        const visible = sequence.filter(group => group.some(key => at(key, T).o > 1e-8));
        assert.ok(visible.length <= 1, `${id} at T${T}, ${layout.W}px: ${visible.flat().join(', ')} overlap`);
      }
    }
  }
});

test('each copy stage retains a fully visible reading hold in the intended order', () => {
  for (const layout of layouts) {
    const {plan, at} = timeline(layout);
    for (const [id, sequence] of Object.entries(stages)) {
      let previousEnd = -Infinity;
      for (const group of sequence) {
        const held = [];
        for (let n = 0; n <= Math.ceil(plan.end * 1000); n++) {
          const T = n / 1000;
          if (group.every(key => Math.abs(at(key, T).o - 1) < 1e-8)) held.push(T);
        }
        assert.ok(held.length >= 80, `${id}: ${group.join('/')} needs a reading hold, not just a flash`);
        assert.ok(held[0] > previousEnd, `${id}: copy stages must preserve the reading order`);
        previousEnd = held.at(-1);
      }
    }
    for (let n = 8950; n <= 9700; n++) {
      const T = n / 1000;
      assert.ok(at('su.problem', T).o < 1e-8 || at('su.protection', T).o < 1e-8,
        'The sunscreen rating waits for the opening question to leave');
    }
  }
});

test('BR tells its opening benefit once and retains separate ingredient and later-benefit content', () => {
  const step = routine.steps.find(item => item.id === 'BR');
  const html = SHOTS.BR(step, path => path);
  assert.doesNotMatch(html, /data-layer="br\.w1"/);
  const heading = html.match(/<h2\b[^>]*id="h-BR"[\s\S]*?<\/h2>/)?.[0];
  assert.ok(heading, 'A real heading remains for the chapter');
  for (const line of step.scene.headline) {
    const token = `<span class="mr-line">${line}</span>`;
    assert.equal(html.split(token).length - 1, 1, `Only one headline occurrence: ${line}`);
  }
  for (const name of step.scene.waves[0].show) assert.ok(html.includes(name), `Keep ingredient identity: ${name}`);
  for (const [index, layer] of [[1, 'br.w2'], [2, 'br.w3']]) {
    const block = html.match(new RegExp(`<p\\b[^>]*data-layer="${layer.replace('.', '\\.')}"[\\s\\S]*?<\\/p>`))?.[0];
    assert.ok(block?.includes(step.scene.waves[index].label), `A separate stage remains for ${layer}`);
    for (const name of step.scene.waves[index].show) assert.ok(block.includes(name));
  }
});

test('an identity-only closing foot keeps its detail link without an empty support paragraph', () => {
  for (const step of routine.steps) {
    const withoutSupport = structuredClone(step);
    withoutSupport.scene.support = '';
    const html = SHOTS[step.id](withoutSupport, path => path);
    assert.doesNotMatch(html, /class="mr-support"/);
    assert.match(html, /class="mr-tag-line"/);
    assert.ok(html.includes(`href="${step.id.toLowerCase()}/"`));
    if (step.scene.support) assert.match(SHOTS[step.id](step, path => path), /class="mr-support"/);
  }
});
