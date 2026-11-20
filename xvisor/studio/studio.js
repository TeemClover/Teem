// X-VISOR Studio page controller. One `state`, one `currentPlan()`: the preview, the saved file and the Claude
// brief all read the plan built from the latest state, so an edit reaches all three together.
import { OFFICIAL_IMAGES, SAMPLE_SET, SAMPLE_STORY, CLAUDE_URL, sourceRect } from './engine/official-assets.js';
import { STYLES, STYLE_ORDER, STARTER_IDEAS, understand, openQuestions, audienceLabel, draftCopy, buildPlan, claimCheck } from './engine/story.js';
import { buildBrief, NEXT_REQUESTS } from './engine/brief.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const FORCE = params.get('force') || '';
const MAX_PHOTOS = 3;
const MAX_SIDE = 1600;

const state = {
  mode: null,
  photos: [],
  story: '',
  info: understand(''),
  answers: {},
  style: 'story',
  copies: {},
  hookEdited: null,
  textPos: 'auto',
  shotPhotos: {},
  nextRequest: 'voice',
  customRequest: ''
};

let engine = null; // { drawFrame, loadFonts, layoutReport } once loaded
let plan = null;
let playing = false, playhead = 0, lastTick = 0, raf = 0;

// ---------- demo video (no renderer needed) ----------
const demoVideo = $('demoVideo');
const DEMO = style => ({ src: `/xvisor/studio/demo/xvisor-studio-${style}.mp4`, poster: `/xvisor/studio/demo/xvisor-studio-${style}.jpg` });
$('demoPlay').addEventListener('click', () => { demoVideo.controls = true; demoVideo.play().catch(() => {}); });
demoVideo.addEventListener('play', () => { $('demoPlay').hidden = true; demoVideo.controls = true; });
demoVideo.addEventListener('ended', () => { $('demoPlay').hidden = false; });
document.querySelectorAll('[data-demo]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-demo]').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
  const d = DEMO(btn.dataset.demo);
  demoVideo.poster = d.poster;
  demoVideo.src = d.src;
  $('demoFile').href = d.src;
  demoVideo.play().catch(() => { $('demoPlay').hidden = false; });
}));

// ---------- engine loading ----------
async function loadEngine() {
  if (engine) return engine;
  const [render, fonts] = await Promise.all([import('./engine/render.js'), import('./engine/fonts.js')]);
  await fonts.loadFonts();
  engine = { drawFrame: render.drawFrame, layoutReport: render.layoutReport };
  return engine;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });
}

// Downscale to a canvas: keeps memory low on phones and bakes in EXIF orientation (browsers apply it to <img>).
function toCanvas(img) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

async function samplePhotos() {
  return Promise.all(SAMPLE_SET.map(async key => {
    const meta = OFFICIAL_IMAGES[key];
    const img = await loadImage(meta.src);
    const r = sourceRect(key, img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = r.sw;
    c.height = r.sh;
    c.getContext('2d').drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, r.sw, r.sh);
    return { id: key, origin: 'sample', label: meta.label, width: r.sw, height: r.sh, focus: { ...meta.focus }, source: c, thumb: meta.crop ? c.toDataURL('image/jpeg', 0.8) : meta.src };
  }));
}

const READABLE = /^image\/(jpeg|png|webp|gif|avif|bmp|heic|heif)$/;
async function photoFromFile(file) {
  const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (file.type && !file.type.startsWith('image/')) throw new Error('ไฟล์นี้ไม่ใช่รูปภาพ เลือกไฟล์รูป เช่น JPG หรือ PNG');
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = toCanvas(img);
    return { id: `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, origin: 'device', label: 'รูปของพี่', width: canvas.width, height: canvas.height, focus: { x: 0.5, y: 0.45 }, source: canvas, thumb: canvas.toDataURL('image/jpeg', 0.7) };
  } catch {
    if (heic) throw new Error(`เปิดรูป “${file.name}” ไม่ได้ เพราะเป็นไฟล์ HEIC ที่เบราว์เซอร์นี้อ่านไม่ได้ ลองเลือกรูปผ่านแอปรูปภาพใน Safari (ระบบจะแปลงเป็น JPG ให้) หรือส่งรูปให้ตัวเองเป็น JPG ก่อน`);
    if (file.type && !READABLE.test(file.type)) throw new Error(`เปิดรูป “${file.name}” ไม่ได้ เบราว์เซอร์นี้ไม่รองรับไฟล์ชนิด ${file.type} ลองรูป JPG หรือ PNG`);
    throw new Error(`เปิดรูป “${file.name}” ไม่ได้ ไฟล์อาจเสีย ลองรูปอื่น หรือถ่ายหน้าจอรูปนั้นแล้วเลือกใหม่`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- plan ----------
function copyFor(style) {
  if (!state.copies[style]) state.copies[style] = draftCopy(state.info, state.answers, style);
  const copy = state.copies[style];
  if (state.hookEdited != null) copy.hook = state.hookEdited;
  return copy;
}

function currentPlan() {
  plan = buildPlan({ style: state.style, photos: state.photos, copy: copyFor(state.style), textPos: state.textPos, shotPhotos: state.shotPhotos });
  return plan;
}

function images() { return state.photos.map(p => p.source); }

function briefContext() {
  return { story: state.story, audience: audienceLabel(state.info, state.answers), nextRequest: state.nextRequest, customRequest: state.customRequest };
}

// ---------- flow ----------
$('trySample').addEventListener('click', async () => {
  state.mode = 'sample';
  setBusy($('trySample'), true, 'กำลังเปิดตัวอย่าง…');
  try {
    const [photos] = await Promise.all([samplePhotos(), loadEngine()]);
    state.photos = photos;
    $('story').value = SAMPLE_STORY;
    setStory(SAMPLE_STORY);
    $('photosPanel').hidden = false;
    $('tellPanel').hidden = false;
    renderThumbs();
    startEditor({ autoplay: true });
  } catch {
    alert('เปิดภาพตัวอย่างไม่ได้ ลองรีเฟรชหน้าอีกครั้ง');
  } finally {
    setBusy($('trySample'), false);
  }
});

$('useOwn').addEventListener('click', () => {
  state.mode = 'own';
  state.photos = state.photos.filter(p => p.origin === 'device');
  $('photosPanel').hidden = false;
  renderThumbs();
  $('photosPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  loadEngine().catch(() => {});
  $('fileInput').click();
});

$('fileInput').addEventListener('change', async e => {
  const files = [...e.target.files];
  e.target.value = '';
  const err = $('photoError');
  err.hidden = true;
  if (!files.length) return;
  const own = state.photos.filter(p => p.origin === 'device');
  const room = MAX_PHOTOS - own.length;
  const messages = [];
  if (files.length > room) messages.push(`ใช้ได้สูงสุด ${MAX_PHOTOS} รูป เลือกไว้ ${Math.min(room, files.length)} รูปแรก`);
  const added = [];
  for (const file of files.slice(0, Math.max(0, room))) {
    try { added.push(await photoFromFile(file)); } catch (error) { messages.push(error.message); }
  }
  state.photos = [...own, ...added];
  state.shotPhotos = {};
  if (messages.length) { err.textContent = messages.join(' · '); err.hidden = false; }
  renderThumbs();
  if (state.photos.length) {
    $('tellPanel').hidden = false;
    if (!$('editorPanel').hidden) refresh({ seek: 0.5 });
    else $('tellPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('story').focus({ preventScroll: true });
  }
});

function renderThumbs() {
  const list = $('thumbs');
  list.replaceChildren(...state.photos.map((p, i) => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.src = p.thumb;
    img.alt = `${p.label} รูปที่ ${i + 1}`;
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = p.origin === 'sample' ? 'ภาพตัวอย่าง' : `รูปที่ ${i + 1}`;
    li.append(img, tag);
    if (p.origin === 'device') {
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.setAttribute('aria-label', `เอารูปที่ ${i + 1} ออก`);
      rm.addEventListener('click', () => {
        state.photos.splice(i, 1);
        state.shotPhotos = {};
        renderThumbs();
        if (!state.photos.length) $('editorPanel').hidden = true;
        else if (!$('editorPanel').hidden) refresh({ seek: playhead });
      });
      li.append(rm);
    }
    return li;
  }));
}

function setStory(text) {
  state.story = text;
  state.info = understand(text);
  state.copies = {};
  renderUnderstood();
  renderQuestions();
}

$('story').addEventListener('input', e => {
  setStory(e.target.value);
  if (!$('editorPanel').hidden) refresh({ seek: playhead });
});

$('ideaList').replaceChildren(...[...STARTER_IDEAS, null].map((idea, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span class="letter">${'กขคง'[i]})</span> `;
  b.append(idea || 'พิมพ์เอง');
  b.addEventListener('click', () => {
    if (idea) { $('story').value = idea; setStory(idea); if (!$('editorPanel').hidden) refresh({ seek: 0.5 }); }
    $('ideas').open = false;
    $('story').focus();
  });
  return b;
}));

function renderUnderstood() {
  const info = state.info;
  const el = $('understood');
  if (!info.enough) { el.replaceChildren(); return; }
  const bits = [info.saidNoCamera ? 'ไม่ออกกล้อง ✓' : 'ไม่ต้องออกกล้อง', info.topic !== 'general' ? `เรื่อง${{ scale: 'เครื่องชั่ง', routine: 'กิจวัตร', food: 'มื้ออาหาร' }[info.topic]} ✓` : null, info.friendTone ? 'คุยแบบเพื่อน ✓' : null, info.time ? `${info.time} ✓` : null].filter(Boolean);
  el.replaceChildren(document.createTextNode('เข้าใจว่า: '), ...bits.map(b => Object.assign(document.createElement('span'), { textContent: b })));
}

function renderQuestions() {
  const box = $('questions');
  const qs = state.info.enough ? openQuestions(state.info) : [];
  box.replaceChildren(...qs.map(q => {
    const wrap = document.createElement('div');
    wrap.className = 'q';
    const title = document.createElement('p');
    title.className = 'q-title';
    title.textContent = `${q.title} (ข้ามได้ ใช้ที่แนะนำ)`;
    const list = document.createElement('div');
    list.className = 'choices';
    const current = state.answers[q.id] || q.options.find(o => o.recommended)?.id;
    const custom = document.createElement('input');
    custom.type = 'text';
    custom.maxLength = 80;
    custom.placeholder = 'พิมพ์เอง';
    custom.hidden = current !== 'custom';
    custom.value = state.answers[`${q.id}Text`] || '';
    custom.addEventListener('input', () => { state.answers[`${q.id}Text`] = custom.value.trim(); state.copies = {}; if (!$('editorPanel').hidden) refresh({ seek: playhead }); });
    [...q.options, { id: 'custom', label: 'พิมพ์เอง' }].forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(o.id === current));
      b.innerHTML = `<span class="letter">${'กขคง'[i]})</span> `;
      b.append(o.label);
      if (o.recommended) b.insertAdjacentHTML('beforeend', ' <span class="rec">แนะนำ</span>');
      b.addEventListener('click', () => {
        state.answers[q.id] = o.id;
        if (o.id !== 'custom') delete state.answers[`${q.id}Text`];
        state.copies = {};
        list.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        custom.hidden = o.id !== 'custom';
        if (o.id === 'custom') custom.focus();
        if (!$('editorPanel').hidden) refresh({ seek: playhead });
      });
      list.append(b);
    });
    wrap.append(title, list, custom);
    return wrap;
  }));
}

$('makeDraft').addEventListener('click', async () => {
  if (!state.photos.length) { $('photoError').textContent = 'เลือกรูปอย่างน้อย 1 รูปก่อน'; $('photoError').hidden = false; $('photosPanel').scrollIntoView({ behavior: 'smooth' }); return; }
  if (!state.info.enough) { $('story').focus(); $('ideas').open = true; return; }
  setBusy($('makeDraft'), true, 'กำลังทำคลิป…');
  try { await loadEngine(); startEditor({ autoplay: true }); } finally { setBusy($('makeDraft'), false); }
});

function setBusy(btn, busy, text) {
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = text; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

// ---------- editor ----------
const canvas = $('preview');
const ctx = canvas.getContext('2d');

function sizeCanvas() {
  const css = canvas.getBoundingClientRect().width || 300;
  const w = Math.min(1080, Math.max(540, Math.round(css * (window.devicePixelRatio || 1) / 2) * 2));
  if (canvas.width !== w) { canvas.width = w; canvas.height = Math.round(w * 16 / 9); }
}

function startEditor({ autoplay }) {
  $('editorPanel').hidden = false;
  $('previewLoading').hidden = true;
  renderStyles();
  refresh({ seek: 0 });
  sizeCanvas();
  draw();
  $('editorPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (autoplay) play();
}

function renderStyles() {
  $('styleList').replaceChildren(...STYLE_ORDER.map(id => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === state.style));
    b.textContent = STYLES[id].label;
    b.title = STYLES[id].hint;
    b.addEventListener('click', () => { state.style = id; state.shotPhotos = {}; renderStyles(); refresh({ seek: 0 }); play(); });
    return b;
  }));
}

// Rebuild the plan from state and push it to every view. `seek` keeps the playhead where the person is looking.
function refresh({ seek = null } = {}) {
  currentPlan();
  if (seek != null) playhead = Math.min(seek, plan.duration - 0.01);
  playhead = Math.min(playhead, plan.duration - 0.01);
  const hook = $('hook');
  if (document.activeElement !== hook) hook.value = plan.shots[0].text;
  $('hookCount').textContent = `${[...hook.value].length}/90`;
  renderLineFields();
  renderCrops();
  renderShotPhotos();
  renderWarnings();
  renderSaveLabel();
  if ($('claudeSheet').open) renderBrief();
  draw();
}

function draw() {
  if (!engine || !plan) return;
  engine.drawFrame(ctx, plan, images(), playhead, { guides: $('guides').checked });
  $('scrub').value = String(Math.round((playhead / plan.duration) * 1000));
  $('clock').textContent = `${fmt(playhead)} / ${fmt(plan.duration)}`;
}
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function play() {
  if (!plan) return;
  if (playhead >= plan.duration - 0.05) playhead = 0;
  playing = true;
  $('playBtn').textContent = '❚❚';
  $('playBtn').setAttribute('aria-label', 'หยุด');
  lastTick = performance.now();
  cancelAnimationFrame(raf);
  const tick = now => {
    if (!playing) return;
    playhead += (now - lastTick) / 1000;
    lastTick = now;
    if (playhead >= plan.duration) { playhead = plan.duration - 0.001; draw(); pause(); return; }
    draw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}
function pause() {
  playing = false;
  cancelAnimationFrame(raf);
  $('playBtn').textContent = '▶';
  $('playBtn').setAttribute('aria-label', 'เล่น');
}
$('playBtn').addEventListener('click', () => (playing ? pause() : play()));
$('scrub').addEventListener('input', e => { pause(); playhead = (Number(e.target.value) / 1000) * plan.duration; draw(); });
$('guides').addEventListener('change', draw);
canvas.addEventListener('click', () => (playing ? pause() : play()));
window.addEventListener('resize', () => { sizeCanvas(); draw(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

$('hook').addEventListener('input', e => {
  state.hookEdited = e.target.value;
  const wasPlaying = playing;
  refresh({ seek: wasPlaying ? null : Math.min(1.2, plan?.shots[0].end - 0.1 || 1.2) });
  if (!wasPlaying) draw();
});
$('hookReset').addEventListener('click', () => {
  state.hookEdited = null;
  state.copies = {};
  $('hook').value = '';
  refresh({ seek: 1.2 });
  $('hook').value = plan.shots[0].text;
  $('hookCount').textContent = `${[...$('hook').value].length}/90`;
});

function renderLineFields() {
  const box = $('lineFields');
  if (box.contains(document.activeElement)) return; // do not rebuild under the cursor
  const copy = copyFor(state.style);
  const fields = [];
  const add = (label, value, set, max = 80) => {
    const wrap = document.createElement('label');
    wrap.className = 'line-field';
    const span = document.createElement('span');
    span.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = max;
    input.value = value;
    input.addEventListener('input', () => { set(input.value); const at = plan.shots.find(s => s.text === input.value); refresh({ seek: playing ? null : at ? at.start + 0.8 : playhead }); });
    wrap.append(span, input);
    fields.push(wrap);
  };
  if (copy.kicker != null && state.style !== 'question') add('ป้ายเล็กเหนือคำเปิด', copy.kicker, v => { copy.kicker = v; }, 40);
  if (copy.choices) copy.choices.forEach((c, i) => add(`ตัวเลือก ${'กขค'[i]}`, c, v => { copy.choices[i] = v; }, 30));
  copy.lines.forEach((l, i) => add(state.style === 'steps' ? `ขั้นที่ ${i + 1}` : `ประโยคที่ ${i + 1}`, l, v => { copy.lines[i] = v; }));
  add('ประโยคปิด', copy.close, v => { copy.close = v; });
  box.replaceChildren(...fields);
}

function renderCrops() {
  const box = $('crops');
  if (box.querySelector('.dragging')) return;
  box.replaceChildren(...state.photos.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'crop';
    const wrap = document.createElement('div');
    wrap.className = 'crop-wrap';
    const img = document.createElement('img');
    img.src = p.thumb;
    img.alt = '';
    const frame = document.createElement('span');
    frame.className = 'frame';
    const dot = document.createElement('span');
    dot.className = 'dot';
    wrap.append(img, frame, dot);
    const cap = document.createElement('div');
    cap.className = 'cap';
    cap.append(`รูปที่ ${i + 1}`);
    if (p.origin === 'device') {
      const swap = document.createElement('button');
      swap.type = 'button';
      swap.className = 'link';
      swap.textContent = 'เปลี่ยนรูป';
      swap.addEventListener('click', () => replacePhoto(i));
      cap.append(swap);
    }
    el.append(wrap, cap);
    const place = () => {
      const aspect = p.height / p.width;
      wrap.style.aspectRatio = `${p.width} / ${p.height}`;
      // 9:16 window at the zoom used for the hook, centred on the focus
      const fw = Math.min(1, (9 / 16) * aspect) / 1.1, fh = Math.min(1, (16 / 9) / aspect) / 1.1;
      const left = Math.max(0, Math.min(1 - fw, p.focus.x - fw / 2)), top = Math.max(0, Math.min(1 - fh, p.focus.y - fh / 2));
      Object.assign(frame.style, { left: `${left * 100}%`, top: `${top * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%` });
      Object.assign(dot.style, { left: `${p.focus.x * 100}%`, top: `${p.focus.y * 100}%` });
    };
    place();
    const move = e => {
      const r = wrap.getBoundingClientRect();
      p.focus = { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
      place();
      const shot = plan.shots.find(s => s.photo === i);
      refresh({ seek: playing ? null : shot ? shot.start + Math.min(1, shot.dur / 2) : playhead });
    };
    el.addEventListener('pointerdown', e => { el.classList.add('dragging'); el.setPointerCapture(e.pointerId); pause(); move(e); });
    el.addEventListener('pointermove', e => { if (el.classList.contains('dragging')) move(e); });
    const end = () => { el.classList.remove('dragging'); refresh({ seek: playhead }); };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    return el;
  }));
}
const clamp01 = v => Math.max(0.02, Math.min(0.98, v));

function replacePhoto(index) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const photo = await photoFromFile(file);
      state.photos[index] = photo;
      renderThumbs();
      const shot = plan.shots.find(s => s.photo === index);
      refresh({ seek: shot ? shot.start + 0.8 : playhead });
    } catch (error) {
      $('photoError').textContent = error.message;
      $('photoError').hidden = false;
      $('photosPanel').scrollIntoView({ behavior: 'smooth' });
    }
  });
  input.click();
}

function renderShotPhotos() {
  const box = $('shotPhotos');
  if (state.photos.length < 2) { box.replaceChildren(); return; }
  const kindName = { hook: 'เปิด', line: 'ประโยค', step: 'ขั้น', choices: 'ตัวเลือก', close: 'ปิด' };
  box.replaceChildren(...plan.shots.map((shot, i) => {
    const row = document.createElement('div');
    row.className = 'shot-pick';
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = `ช็อต ${i + 1} · ${kindName[shot.kind]} ${fmt(shot.start)}`;
    row.append(t);
    state.photos.forEach((p, j) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `รูป ${j + 1}`;
      b.setAttribute('aria-pressed', String(shot.photo === j));
      b.addEventListener('click', () => { state.shotPhotos[i] = j; refresh({ seek: shot.start + Math.min(1, shot.dur / 2) }); });
      row.append(b);
    });
    return row;
  }));
}

document.querySelectorAll('#textPos [data-pos]').forEach(b => b.addEventListener('click', () => {
  state.textPos = b.dataset.pos;
  document.querySelectorAll('#textPos [data-pos]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  refresh({ seek: playing ? null : playhead });
}));

function renderWarnings() {
  const claims = claimCheck(plan.shots.map(s => s.text).concat(plan.shots.flatMap(s => s.choices || [])));
  const cw = $('claimWarn');
  cw.hidden = !claims.length;
  cw.textContent = claims.length ? `ตรวจคำก่อนโพสต์: ${claims.map(c => `“${c.word}” → ${c.fix}`).join(' · ')}` : '';
  const fw = $('fitWarn');
  const over = engine ? engine.layoutReport(ctx, plan).filter(r => r.overflow) : [];
  fw.hidden = !over.length;
  fw.textContent = over.length ? `ประโยคยาวเกินพื้นที่ในช็อต ${over.map(o => o.index + 1).join(', ')} ลองตัดให้สั้นลงอีกนิด` : '';
}

// ---------- save ----------
let exporter = null;
async function loadExporter() { return exporter || (exporter = await import('./engine/export.js')); }

async function renderSaveLabel() {
  const ex = await loadExporter();
  const support = ex.exportSupport(FORCE);
  const btn = $('saveBtn');
  if (!btn.disabled) btn.textContent = support.label;
  btn.dataset.kind = support.video ? 'video' : 'stills';
  $('saveNote').textContent = support.video
    ? `บันทึกเป็นไฟล์ .${support.ext} ใช้เวลาเท่าความยาวคลิป (${Math.round(plan.duration)} วิ) ระหว่างนั้นอย่าสลับแอป`
    : 'เบราว์เซอร์นี้บันทึกวิดีโอไม่ได้ จะได้ภาพทุกช็อต (PNG) กับไฟล์บท (TXT) ไปเรียงต่อในแอปตัดต่อ เช่น CapCut';
}

$('saveBtn').addEventListener('click', async () => {
  const ex = await loadExporter();
  const support = ex.exportSupport(FORCE);
  const p = currentPlan();
  const btn = $('saveBtn');
  pause();
  btn.disabled = true;
  try {
    if (support.video) {
      btn.textContent = 'กำลังบันทึก 0%';
      const result = await ex.recordClip(p, images(), { type: support.type, width: 720, onProgress: f => { btn.textContent = `กำลังบันทึก ${Math.round(f * 100)}%`; } });
      const name = `xvisor-clip-${p.id}.${result.ext}`;
      const file = new File([result.blob], name, { type: result.mime });
      await deliver([file], name);
      $('saveNote').textContent = `ได้ไฟล์ ${name} (${(result.blob.size / 1e6).toFixed(1)} MB · ${Math.round(result.duration)} วิ) ฉบับ ${p.id} ตรงกับบรีฟที่ส่ง Claude`;
      window.__studioLastExport = { name, mime: result.mime, size: result.blob.size, id: p.id, url: URL.createObjectURL(result.blob) };
    } else {
      btn.textContent = 'กำลังทำภาพรายฉาก…';
      const stills = await ex.renderStills(p, images());
      const script = new File([scriptText(p)], `xvisor-${p.id}-script.txt`, { type: 'text/plain' });
      await deliver([...stills, script], `xvisor-${p.id}`);
      $('saveNote').textContent = `ได้ภาพ ${stills.length} ช็อต (PNG) กับบท (TXT) ฉบับ ${p.id}`;
      window.__studioLastExport = { name: stills.map(f => f.name).concat(script.name), id: p.id, stills: stills.length };
    }
  } catch (error) {
    $('saveNote').textContent = 'บันทึกไม่สำเร็จ ลองอีกครั้ง หรือใช้ Chrome/Safari รุ่นล่าสุด พรีวิวยังเล่นได้ตามปกติ';
    window.__studioLastExport = { error: String(error?.message || error) };
  } finally {
    btn.disabled = false;
    renderSaveLabel();
  }
});

// Phones: the share sheet saves to Photos/Files. Desktops: a normal download.
async function deliver(files, label) {
  const ex = await loadExporter();
  if (!FORCE.includes('noshare') && navigator.canShare && navigator.canShare({ files }) && matchMedia('(pointer:coarse)').matches) {
    try { await navigator.share({ files, title: label }); return; } catch (error) { if (error?.name === 'AbortError') return; }
  }
  for (const f of files) { ex.downloadBlob(f, f.name); await new Promise(r => setTimeout(r, 350)); }
}

function scriptText(p) {
  return `${buildBrief(p, briefContext())}\n`;
}

// ---------- Claude hand-off ----------
$('claudeBtn').addEventListener('click', () => {
  pause();
  renderNext();
  renderBrief();
  $('copyStatus').textContent = '';
  $('copyManual').hidden = true;
  $('claudeSheet').showModal();
});

function renderNext() {
  const list = $('nextList');
  list.replaceChildren(...[...NEXT_REQUESTS, { id: 'custom', label: 'พิมพ์เอง' }].map((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(r.id === state.nextRequest));
    b.innerHTML = `<span class="letter">${'กขคงจ'[i]})</span> `;
    b.append(r.label);
    if (r.recommended) b.insertAdjacentHTML('beforeend', ' <span class="rec">แนะนำ</span>');
    b.addEventListener('click', () => {
      state.nextRequest = r.id;
      list.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $('customRequest').hidden = r.id !== 'custom';
      if (r.id === 'custom') $('customRequest').focus();
      renderBrief();
    });
    return b;
  }));
  $('customRequest').hidden = state.nextRequest !== 'custom';
}
$('customRequest').addEventListener('input', e => { state.customRequest = e.target.value; renderBrief(); });

function renderBrief() {
  const p = currentPlan();
  $('brief').value = buildBrief(p, briefContext());
  $('briefId').textContent = `ฉบับ ${p.id}`;
  $('photoNote').hidden = !p.photos.some(x => x.origin === 'device');
}

async function copyBrief() {
  renderBrief();
  const text = $('brief').value;
  const ok = await writeClipboard(text);
  $('copyStatus').textContent = ok ? 'คัดลอกแล้ว ไปวางในแชต Claude ได้เลย' : '';
  $('copyManual').hidden = ok;
  if (!ok) { $('brief').focus(); $('brief').select(); }
  window.__studioLastCopy = { ok, text };
  return ok;
}

async function writeClipboard(text) {
  if (FORCE.includes('noclip')) return false;
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* try the older path */ }
  try {
    const ta = $('brief');
    ta.removeAttribute('readonly');
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.setAttribute('readonly', '');
    return ok;
  } catch { return false; }
}

$('copyOnly').addEventListener('click', e => { e.preventDefault(); copyBrief(); });
// The person taps the link themselves; copying starts inside the same tap so the clipboard is allowed.
$('copyOpen').href = CLAUDE_URL;
$('copyOpen').addEventListener('click', e => {
  const pending = copyBrief();
  if (FORCE.includes('noclip')) { e.preventDefault(); return; }
  pending.then(ok => { if (!ok) $('copyStatus').textContent = 'เปิด Claude แล้ว แต่คัดลอกไม่สำเร็จ กลับมาคัดลอกจากกล่องข้อความได้'; });
});

// ---------- test and render hooks (used by tests/xvisor/studio) ----------
window.__studio = {
  state,
  plan: () => currentPlan(),
  brief: () => buildBrief(currentPlan(), briefContext()),
  async renderMode(style) {
    await loadEngine();
    state.photos = await samplePhotos();
    setStory(SAMPLE_STORY);
    state.style = style;
    return currentPlan();
  },
  frame(t, width = 1080, type = 'image/jpeg', quality = 0.94) {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round(width * 16 / 9);
    engine.drawFrame(c.getContext('2d'), plan, images(), t);
    return c.toDataURL(type, quality);
  }
};
