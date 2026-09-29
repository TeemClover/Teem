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
// These tracks use the same reading space. Supporting text in a different space may coexist.
const sharedSpaces = {
  CL: ['cl.word1', 'cl.word2'],
  AC: ['ac.w1', 'ac.w2', 'ac.w3', 'ac.title'],
  BR: ['br.title', 'br.w2'],
  SU: ['su.w1', 'su.w2', 'su.w3'],
  PO: ['po.w1', 'po.w2', 'po.foot'],
};
function timeline(layout) {
  const plan = score(layout);
  const home = {cx: layout.W / 2, cy: layout.H * .2, w: 240, h: 70};
  const tracks = Object.fromEntries(Object.entries(plan.tracks)
    .map(([key, frames]) => [key, resolveTrack(frames, home, layout)]));
  return {plan, at: (key, T) => sample(tracks[key], T)};
}

test('copy that shares a reading space stays separate through its fade boundaries', () => {
  for (const layout of layouts) {
    const {plan, at} = timeline(layout);
    for (const [id, keys] of Object.entries(sharedSpaces)) {
      for (let n = 0; n <= Math.ceil(plan.end * 1000); n++) {
        const T = n / 1000;
        const visible = keys.filter(key => at(key, T).o > 1e-8);
        assert.ok(visible.length <= 1, `${id} at T${T}, ${layout.W}px: ${visible.join(', ')} share a space`);
      }
    }
  }
});

test('product holds retain their selling copy and supporting content together', () => {
  const holds = [
    [2.6, 2.8, ['cl.word2', 'cl.botanical-label', 'cl.foot', 'cl.pack']],
    [5.3, 5.58, ['ac.w3', 'ac.gel']],
    [5.9, 6.2, ['ac.title', 'ac.foot', 'ac.pack']],
    [7.55, 7.82, ['br.title', 'br.bear', 'br.lic', 'br.vitc']],
    [8.5, 8.85, ['br.foot', 'br.pack']],
    [10.62, 10.8, ['su.title', 'su.w2', 'su.pack']],
    [11.46, 11.65, ['su.title', 'su.foot', 'su.pack']],
    [12.95, 13.11, ['po.title', 'po.w1', 'po.pack']],
    [13.3, 13.45, ['po.title', 'po.w2', 'po.pack']],
    [13.64, 13.85, ['po.title', 'po.foot', 'po.pack']],
  ];
  for (const layout of layouts) {
    const {at} = timeline(layout);
    for (const [from, to, keys] of holds) {
      for (let n = Math.ceil(from * 100); n <= Math.floor(to * 100); n++) {
        const T = n / 100;
        for (const key of keys) {
          assert.ok(Math.abs(at(key, T).o - 1) < 1e-8,
            `${key} must remain part of its composed hold at T${T}, ${layout.W}px`);
        }
      }
    }
    assert.equal(at('br.title', 8.6).o, 0, 'The opening BR benefit does not return as another closing headline');
  }
});

test('wide scenes retain a settled supporting kicker while phone questions leave', () => {
  for (const layout of layouts) {
    const {at} = timeline(layout);
    for (const [key, T] of [['cl.problem', 1.8], ['ac.problem', 4.5], ['br.problem', 7.4], ['su.problem', 10], ['po.problem', 13]]) {
      const pose = at(key, T);
      assert.equal(pose.o, layout.tall ? 0 : 1, `${key}: responsive context at ${layout.W}px`);
      if (!layout.tall) {
        assert.equal(pose.s, 1, 'The retained question is secondary, not the opening large question');
        assert.equal(pose.ty, 0, 'It has settled into its authored kicker space');
      }
    }
  }
});

test('BR tells its opening benefit once and retains separate ingredient and later-benefit content', () => {
  const step = routine.steps.find(item => item.id === 'BR');
  const html = SHOTS.BR(step, path => path);
  assert.doesNotMatch(html, /data-layer="br\.(?:w1|w3)"/);
  const heading = html.match(/<h2\b[^>]*id="h-BR"[\s\S]*?<\/h2>/)?.[0];
  assert.ok(heading, 'A real heading remains for the chapter');
  for (const line of step.scene.headline) {
    const token = `<span class="mr-line">${line}</span>`;
    assert.equal(html.split(token).length - 1, 1, `Only one headline occurrence: ${line}`);
  }
  for (const name of step.scene.waves[0].show) assert.ok(html.includes(name), `Keep ingredient identity: ${name}`);
  const block = html.match(/<div class="mr-pairs" data-layer="br\.w2">[\s\S]*?<\/div>/)?.[0];
  assert.ok(block, 'Both supporting benefits share the intentional paired composition');
  assert.equal((block.match(/<p>/g) || []).length, 2);
  for (const index of [1, 2]) {
    assert.ok(block.includes(step.scene.waves[index].label));
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

test('an optional closing product identity uses escaped semantic text before the ordinary tag', () => {
  const step = structuredClone(routine.steps.find(item => item.id === 'BR'));
  delete step.scene.closing_headline;
  assert.doesNotMatch(SHOTS.BR(step, path => path), /class="mr-foot__headline"/);
  step.scene.closing_headline = ['เซรั่ม', 'A & <B>'];
  const html = SHOTS.BR(step, path => path);
  assert.match(html, /<p class="mr-foot__headline"><span class="mr-line">เซรั่ม<\/span><span class="mr-line">A &amp; &lt;B&gt;<\/span><\/p>/);
  assert.ok(html.indexOf('class="mr-foot__headline"') < html.indexOf('class="mr-tag-line"'));
  assert.ok(html.includes('href="br/"'), 'The heading does not replace the working detail link');
});
