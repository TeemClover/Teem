import test from 'node:test';
import assert from 'node:assert/strict';
import { understand, openQuestions, draftCopy, buildPlan, claimCheck, userLineFrom, STYLE_ORDER, MIN_DURATION, MAX_DURATION } from '../../../xvisor/studio/engine/story.js';
import { buildBrief } from '../../../xvisor/studio/engine/brief.js';
import { wrapBalanced, coverCrop, ZONES, SAFE } from '../../../xvisor/studio/engine/layout.js';
import { SAMPLE_STORY, OFFICIAL_IMAGES, sourceRect } from '../../../xvisor/studio/engine/official-assets.js';

const devicePhoto = { id: 'device-1', origin: 'device', label: 'รูปของพี่', width: 1200, height: 1600, focus: { x: 0.5, y: 0.45 } };
const samplePhotos = ['scaleLifestyle', 'scaleBox'].map(id => { const r = sourceRect(id, OFFICIAL_IMAGES[id].width, OFFICIAL_IMAGES[id].height); return { id, origin: 'sample', label: OFFICIAL_IMAGES[id].label, width: r.sw, height: r.sh, focus: OFFICIAL_IMAGES[id].focus }; });

function planFor(story, style, photos = [devicePhoto], answers = {}, keep = {}) {
  const info = understand(story);
  return { info, plan: buildPlan({ style, photos, copy: draftCopy(info, answers, style, keep), textPos: 'auto', shotPhotos: {} }) };
}

test('reads the sample story without asking what it already says', () => {
  const info = understand(SAMPLE_STORY);
  assert.equal(info.topic, 'scale');
  assert.equal(info.saidNoCamera, true);
  assert.equal(info.friendTone, true);
  assert.equal(info.time, 'เมื่อเช้า');
  assert.equal(info.userLine, 'รูปเครื่องชั่ง ถ่ายไว้เมื่อเช้า');
  const qs = openQuestions(info).map(q => q.id);
  assert.deepEqual(qs, ['audience', 'cta']);
  assert.ok(openQuestions(understand('มีรูปเครื่องชั่ง อยากให้ลูกค้าเซฟไว้')).length === 0, 'audience and CTA given → no questions');
});

test('never invents results or asks for a face on camera', () => {
  const invented = /น้ำหนักลด|ลดลง|ผอม|นอนหลับดี|หลับดีขึ้น|\d+\s*วัน|\d+\s*(กิโล|โล|kg)|ใช้มา|ถ่ายหน้า|ออกกล้อง|หน้ากล้อง|เซลฟี่|อัดคลิปตัวเอง/;
  for (const style of STYLE_ORDER) {
    for (const story of ['มีรูปเครื่องชั่ง', SAMPLE_STORY, 'มีรูปมื้อเช้าวันนี้', 'มีรูปกล่อง RoutineX']) {
      const { plan } = planFor(story, style);
      for (const shot of plan.shots) {
        assert.doesNotMatch(shot.text, invented, `${style}: ${shot.text}`);
        for (const c of shot.choices || []) assert.doesNotMatch(c, invented);
      }
    }
  }
});

test('the person\'s own words reach the clip, meta requests do not', () => {
  assert.equal(userLineFrom('มีรูปเครื่องชั่งเมื่อเช้า พี่ไม่อยากออกกล้อง อยากทำคลิปสั้นแบบคุยกับเพื่อน'), 'รูปเครื่องชั่ง ถ่ายไว้เมื่อเช้า');
  assert.equal(userLineFrom('เช้านี้ทำสลัดกินเอง'), 'เช้านี้ทำสลัดกินเอง');
  const { plan } = planFor(SAMPLE_STORY, 'story');
  assert.ok(plan.shots.some(s => s.text === 'รูปเครื่องชั่ง ถ่ายไว้เมื่อเช้า'));
  assert.ok(!plan.shots.some(s => /อยากทำคลิป|ออกกล้อง/.test(s.text)));
});

test('every style has a beginning, middle and end and runs 15–30 seconds', () => {
  for (const style of STYLE_ORDER) {
    for (const photos of [[devicePhoto], samplePhotos]) {
      const { plan } = planFor(SAMPLE_STORY, style, photos);
      assert.equal(plan.shots[0].kind, 'hook');
      assert.equal(plan.shots.at(-1).kind, 'close');
      assert.ok(plan.shots.length >= 4);
      assert.ok(plan.duration >= MIN_DURATION && plan.duration <= MAX_DURATION, `${style} ${plan.duration}`);
      plan.shots.forEach((s, i) => { if (i) assert.equal(s.start, plan.shots[i - 1].end); assert.ok(s.dur >= 2.2); });
      assert.ok(plan.shots.every(s => s.photo >= 0 && s.photo < photos.length));
    }
  }
});

test('a single photo is used for every shot', () => {
  const { plan } = planFor('มีรูปเครื่องชั่ง ไม่อยากออกกล้อง', 'story');
  assert.equal(plan.photos.length, 1);
  assert.ok(plan.shots.every(s => s.photo === 0));
  assert.equal(plan.photos[0].origin, 'device');
});

test('an edited hook changes the plan id and the brief', () => {
  const longHook = 'เลขบนเครื่องชั่งเช้านี้ทำให้พี่หยุดคิด ว่าเราดูแค่วันเดียวไม่ได้นะ';
  const a = planFor(SAMPLE_STORY, 'story');
  const b = planFor(SAMPLE_STORY, 'story', [devicePhoto], {}, { hook: longHook });
  assert.notEqual(a.plan.id, b.plan.id);
  assert.equal(b.plan.shots[0].text, longHook);
  const brief = buildBrief(b.plan, { story: SAMPLE_STORY, audience: 'คนที่ชั่งแล้วเห็นเลขขึ้นลง แล้วสับสน', nextRequest: 'voice' });
  assert.ok(brief.includes(longHook));
  assert.ok(brief.includes(`ฉบับ ${b.plan.id}`));
  assert.ok(!brief.includes(a.plan.shots[0].text), 'old hook must not linger');
});

test('brief carries the repo link, goal, audience, style, story, script, shots and next request', () => {
  const { plan } = planFor(SAMPLE_STORY, 'steps', [devicePhoto]);
  const brief = buildBrief(plan, { story: SAMPLE_STORY, audience: 'คนที่เพิ่งเริ่มชั่งน้ำหนักที่บ้าน', nextRequest: 'voice' });
  assert.match(brief, /^ชุดความรู้ X-VISOR อยู่ที่ https:\/\/github\.com\/TeemClover\/xvisor/);
  for (const part of ['เป้าหมาย:', 'ผู้ชม: คนที่เพิ่งเริ่มชั่งน้ำหนักที่บ้าน', 'รูปแบบ: โชว์ทีละขั้น', SAMPLE_STORY, 'ประโยคเปิด (Hook)', 'ลำดับช็อต', 'คงประโยคเปิดไว้']) assert.ok(brief.includes(part), part);
  assert.match(brief, /ไม่ได้ส่งมากับข้อความนี้/);
  assert.doesNotMatch(brief, /ติดตั้งสกิลให้แล้ว|แนบรูปให้แล้ว|ส่งรูปให้แล้ว/);
  plan.shots.forEach((s, i) => assert.ok(brief.includes(`${i + 1}) `)));
});

test('sample brief links the official image instead of asking for an attachment', () => {
  const { plan } = planFor(SAMPLE_STORY, 'story', samplePhotos);
  const brief = buildBrief(plan, { story: SAMPLE_STORY, audience: 'x', nextRequest: 'caption' });
  assert.ok(brief.includes('https://www.myclover.com/xircle/assets/official/scale-lifestyle.webp'));
  assert.ok(brief.includes('https://raw.githubusercontent.com/TeemClover/xvisor/main/assets/devices/xircle-scale-photo.jpg'));
  assert.doesNotMatch(brief, /ไม่ได้ส่งมากับข้อความนี้/);
});

test('claim guard flags risky words', () => {
  assert.deepEqual(claimCheck(['ช่วยรักษาเบาหวาน']).map(c => c.word), ['รักษา', 'ชื่อโรค']);
  assert.equal(claimCheck(['ลด 5 กิโลใน 7 วัน'])[0].word, 'ลดกี่กิโล');
  assert.equal(claimCheck(['เลขบนเครื่องชั่งวันเดียว บอกอะไรเราได้ไม่หมด']).length, 0);
});

test('Thai wrapping prefers spaces and never splits a silent-letter syllable', () => {
  const measure = s => [...s].length * 10;
  assert.deepEqual(wrapBalanced('ตอบในคอมเมนต์ ก ข หรือ ค', measure, 140), ['ตอบในคอมเมนต์', 'ก ข หรือ ค']);
  const narrow = wrapBalanced('ตอบในคอมเมนต์', measure, 80);
  assert.ok(narrow.every(l => !/^[\u0E01-\u0E2E]\u0E4C/.test(l)), narrow.join('|'));
  assert.deepEqual(wrapBalanced('เลขบนเครื่องชั่งวันเดียว บอกอะไรเราได้ไม่หมด', measure, 260), ['เลขบนเครื่องชั่งวันเดียว', 'บอกอะไรเราได้ไม่หมด']);
});

test('Thai wrapping breaks at words and keeps marks attached', () => {
  const measure = s => [...s].length * 10;
  const lines = wrapBalanced('เลขบนเครื่องชั่งวันเดียว บอกอะไรเราได้ไม่หมด', measure, 160);
  assert.ok(lines.length >= 2);
  for (const l of lines) assert.doesNotMatch(l, /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/, l);
  assert.equal(lines.join('').replace(/\s/g, ''), 'เลขบนเครื่องชั่งวันเดียวบอกอะไรเราได้ไม่หมด');
});

test('text zone stays away from the focal point', () => {
  for (const style of STYLE_ORDER) {
    const { plan } = planFor(SAMPLE_STORY, style, samplePhotos);
    for (const shot of plan.shots) {
      if (shot.zone === 'center') continue;
      const p = plan.photos[shot.photo];
      const z = (shot.motion.z0 + shot.motion.z1) / 2;
      const c = coverCrop(p.width, p.height, shot.focus, z, shot.target.x, shot.target.y);
      const zone = ZONES[shot.zone];
      assert.ok(c.fy < zone.y0 - 40 || c.fy > zone.y1 + 40, `${style} shot ${shot.index} focus y ${Math.round(c.fy)} in ${shot.zone} zone`);
    }
  }
  assert.ok(ZONES.top.y0 > SAFE.top && ZONES.bottom.y1 < SAFE.bottom);
});
