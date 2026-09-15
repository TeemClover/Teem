import { createDemoController } from './demo-controller.js';

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'เปิดเมนู');
  mobileNav.hidden = true;
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});

const videoDialog = document.querySelector('#video-dialog');
const player = document.querySelector('#showcase-player');
const videoError = document.querySelector('.video-error');
const templateDialog = document.querySelector('#template-dialog');
const templateContent = document.querySelector('#template-content');
const copyStatus = document.querySelector('#copy-status');
const copyButton = document.querySelector('#copy-template');

for (const dialog of [videoDialog, templateDialog]) {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
}

const wall = document.querySelector('#video-wall');
const wallPause = document.querySelector('#wall-pause');
const wallSoundStatus = document.querySelector('#wall-sound-status');
const demoComposer = document.querySelector('#demo-composer');
const demoGenerate = document.querySelector('#demo-generate');
const demoEnabled = Boolean(wall && demoComposer && demoGenerate);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const wallClips = [...document.querySelectorAll('#video-wall .wall-card')].map(card => ({
  card,
  video: card.querySelector('.wall-video'),
  sound: card.querySelector('.wall-sound'),
  retry: card.querySelector('.wall-retry'),
  revealed: !demoEnabled,
  visible: false,
  loaded: false,
  blocked: false,
  failed: false,
  attempt: 0,
  pending: false
})).filter(clip => clip.video);
let wallPaused = motionPreference.matches;
let audibleClip = null;
let dialogAttempt = 0;

function announceWall(message) {
  if (wallSoundStatus) wallSoundStatus.textContent = message;
}

function updatePauseControl() {
  if (!wallPause) return;
  wallPause.setAttribute('aria-pressed', String(wallPaused));
  wallPause.setAttribute('aria-label', wallPaused ? 'เล่นวิดีโอทั้งหมด' : 'หยุดวิดีโอทั้งหมดชั่วคราว');
  const label = wallPause.querySelector('[data-pause-label]');
  if (label) label.textContent = wallPaused ? 'เล่นวิดีโอทั้งหมด' : 'หยุดชั่วคราว';
  if (wall) wall.dataset.paused = String(wallPaused);
}

function updateClipSound(clip) {
  const audible = !clip.video.muted && clip.video.volume > 0;
  clip.card.dataset.audible = String(audible);
  if (!clip.sound) return;
  const label = audible ? 'ปิดเสียง' : 'เปิดเสียง';
  clip.sound.setAttribute('aria-pressed', String(audible));
  clip.sound.setAttribute('aria-label', `${label} ${clip.card.dataset.title || 'คลิปนี้'}`);
  const text = clip.sound.querySelector('.sound-label');
  if (text) text.textContent = label;
  const offIcon = clip.sound.querySelector('.sound-off');
  const onIcon = clip.sound.querySelector('.sound-on');
  if (offIcon) offIcon.toggleAttribute('hidden', audible);
  if (onIcon) onIcon.toggleAttribute('hidden', !audible);
}

function muteClip(clip) {
  clip.video.muted = true;
  if (audibleClip === clip) audibleClip = null;
  updateClipSound(clip);
}

function muteWall() {
  wallClips.forEach(muteClip);
}

function stopClip(clip) {
  clip.attempt += 1;
  clip.pending = false;
  clip.video.pause();
  clip.card.dataset.playing = 'false';
  const wasAudible = audibleClip === clip;
  muteClip(clip);
  if (wasAudible) announceWall('แตะลำโพงบนคลิปเพื่อเปิดเสียง');
}

function canPlayClip(clip) {
  return clip.revealed && clip.visible && !wallPaused && !document.hidden && !videoDialog.open && !templateDialog.open;
}

function ensureClipSource(clip) {
  if (!clip?.revealed || clip.loaded) return;
  const source = clip.video.dataset.src;
  if (!source) return;
  clip.loaded = true;
  clip.video.preload = 'metadata';
  clip.video.src = source;
}

function updateClipRetry(clip) {
  clip.card.dataset.error = String(clip.failed);
  clip.card.dataset.blocked = String(clip.blocked);
  if (!clip.retry) return;
  clip.retry.hidden = !(clip.failed || clip.blocked);
  clip.retry.textContent = clip.failed ? 'โหลดคลิปอีกครั้ง' : 'แตะเพื่อเล่น';
  clip.retry.setAttribute('aria-label', `${clip.failed ? 'โหลดและเล่น' : 'เล่น'} ${clip.card.dataset.title || 'คลิปนี้'}`);
}

function failClip(clip, failed) {
  clip.pending = false;
  clip.blocked = !failed;
  clip.failed = failed;
  clip.card.dataset.playing = 'false';
  muteClip(clip);
  updateClipRetry(clip);
}

function playClip(clip, userGesture = false) {
  if (!canPlayClip(clip)) return;
  if (!userGesture && (clip.pending || clip.blocked || clip.failed || !clip.video.paused)) return;
  ensureClipSource(clip);
  if (!clip.loaded) return;
  if (userGesture) {
    clip.blocked = false;
    if (clip.failed || clip.video.error) {
      clip.failed = false;
      clip.video.load();
    }
    updateClipRetry(clip);
  }
  const attempt = ++clip.attempt;
  clip.pending = true;
  // Keep play() in the click handler's call stack for browsers that require a gesture.
  const playResult = clip.video.play();
  if (!playResult || typeof playResult.then !== 'function') {
    clip.pending = false;
    return;
  }
  playResult.then(() => {
    if (attempt !== clip.attempt) return;
    clip.pending = false;
    if (!canPlayClip(clip)) stopClip(clip);
  }).catch(error => {
    if (attempt !== clip.attempt) return;
    clip.pending = false;
    if (error.name === 'AbortError' || !canPlayClip(clip)) return;
    failClip(clip, error.name !== 'NotAllowedError');
    if (userGesture) announceWall('ยังเล่นคลิปนี้ไม่ได้ แตะปุ่มบนคลิปเพื่อลองอีกครั้ง');
  });
}

function syncWallPlayback() {
  wallClips.forEach(clip => {
    if (canPlayClip(clip)) playClip(clip);
    else stopClip(clip);
  });
}

function resumeFromGesture(clip) {
  if (!clip.revealed) return;
  // A direct play/sound choice also enables playback after the reduced-motion default.
  wallPaused = false;
  updatePauseControl();
  clip.visible = true;
  playClip(clip, true);
  syncWallPlayback();
}

wallClips.forEach(clip => {
  clip.video.muted = true;
  clip.video.defaultMuted = true;
  clip.video.playsInline = true;
  clip.video.loop = true;
  clip.card.dataset.playing = 'false';
  updateClipSound(clip);
  updateClipRetry(clip);

  clip.sound?.addEventListener('click', () => {
    if (!clip.revealed) return;
    const enableSound = clip.video.muted || clip.video.volume === 0;
    muteWall();
    if (enableSound) {
      audibleClip = clip;
      clip.video.volume = 1;
      clip.video.muted = false;
      updateClipSound(clip);
      announceWall(`กำลังเปิดเสียง: ${clip.card.dataset.title || 'คลิปที่เลือก'} เปิดได้ครั้งละ 1 คลิป`);
    } else {
      announceWall('ปิดเสียงแล้ว แตะลำโพงบนคลิปเพื่อเปิดเสียง');
    }
    resumeFromGesture(clip);
  });

  clip.retry?.addEventListener('click', () => {
    if (!clip.revealed) return;
    muteClip(clip);
    resumeFromGesture(clip);
  });

  clip.video.addEventListener('playing', () => {
    if (!canPlayClip(clip)) {
      stopClip(clip);
      return;
    }
    clip.pending = false;
    clip.blocked = false;
    clip.failed = false;
    clip.card.dataset.playing = 'true';
    updateClipRetry(clip);
  });
  clip.video.addEventListener('pause', () => {
    clip.card.dataset.playing = 'false';
  });
  clip.video.addEventListener('waiting', () => {
    clip.card.dataset.playing = 'false';
  });
  clip.video.addEventListener('error', () => {
    if (clip.loaded) failClip(clip, true);
  });
  clip.video.addEventListener('volumechange', () => {
    // Also keep audio exclusive if the browser's own media controls change volume.
    if (!clip.video.muted && clip.video.volume > 0) {
      if (!canPlayClip(clip)) {
        muteClip(clip);
        return;
      }
      wallClips.forEach(other => { if (other !== clip) muteClip(other); });
      audibleClip = clip;
    } else if (audibleClip === clip) {
      audibleClip = null;
    }
    updateClipSound(clip);
  });
});

function refreshClipVisibility(clip) {
  const box = clip.card.getBoundingClientRect();
  clip.visible = clip.revealed && !clip.card.hidden && box.width > 0 && box.height > 0 &&
    box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth;
  if (clip.revealed && !clip.card.hidden && box.bottom > -480 && box.top < window.innerHeight + 480) {
    ensureClipSource(clip);
  }
  if (canPlayClip(clip)) playClip(clip);
  else stopClip(clip);
}

let demoController = null;
if (demoEnabled) {
  const demoPrompt = document.querySelector('#demo-prompt');
  const demoLabel = document.querySelector('#demo-generate-label');
  const demoRound = document.querySelector('#demo-round');
  const demoCounter = document.querySelector('#demo-counter');
  const demoProgress = document.querySelector('#demo-progress');
  const demoStatus = document.querySelector('#demo-status');
  const demoReset = document.querySelector('#demo-reset');
  const demoOwn = document.querySelector('#demo-own');
  const demoDock = document.querySelector('#demo-dock');
  const demoDockGenerate = document.querySelector('#demo-dock-generate');
  const demoDockLabel = document.querySelector('#demo-dock-label');
  const demoDockCount = document.querySelector('#demo-dock-count');
  const demoDockOwn = document.querySelector('#demo-dock-own');
  const demoActions = demoComposer.querySelector('.demo-actions');
  const demoSection = document.querySelector('#showcase');
  const wallToolbar = document.querySelector('#wall-toolbar');
  const demoPrompts = [
    'แฟชั่นล้ำ ๆ · สินค้าในโลกฝัน · คาแรกเตอร์พูดได้ · มัทฉะช็อตสวย',
    'ลองลุคใหม่ · พอดแคสต์ · สาธิตสินค้า · อวาตาร์ทักทาย',
    'คาเฟ่ไลฟ์สไตล์ · ดีเทลสินค้า · โชว์รูม · พรีเซนเตอร์แบรนด์',
    'ครีเอเตอร์ · เรื่องเล่าสั้น · งานอีเวนต์ · รีวิวแบบ UGC'
  ];
  wall.dataset.demo = 'true';
  demoComposer.hidden = false;
  wallClips.forEach(clip => {
    const slot = document.createElement('div');
    slot.className = 'wall-slot';
    slot.setAttribute('aria-hidden', 'true');
    const symbol = document.createElement('span');
    symbol.className = 'slot-symbol';
    symbol.textContent = '✦';
    const spinner = document.createElement('span');
    spinner.className = 'slot-spinner';
    const label = document.createElement('span');
    label.className = 'slot-label';
    slot.append(symbol, spinner, label);
    clip.card.append(slot);
    clip.slotLabel = label;
  });

  let dockVisibilityFrame = 0;
  const updateDockVisibility = () => {
    dockVisibilityFrame = 0;
    if (!demoDock || !demoSection || !demoActions) return;
    const sectionBox = demoSection.getBoundingClientRect();
    const actionsBox = demoActions.getBoundingClientRect();
    const sectionVisible = sectionBox.bottom > 200 && sectionBox.top < window.innerHeight - 100;
    const actionsVisible = actionsBox.bottom > 0 && actionsBox.top < window.innerHeight;
    demoDock.hidden = !sectionVisible || actionsVisible;
  };
  const queueDockVisibility = () => {
    if (!dockVisibilityFrame) dockVisibilityFrame = requestAnimationFrame(updateDockVisibility);
  };
  window.addEventListener('scroll', queueDockVisibility, { passive: true });
  window.addEventListener('resize', queueDockVisibility, { passive: true });

  const renderDemo = (state, reason) => {
    wallClips.forEach((clip, index) => {
      const wasRevealed = clip.revealed;
      clip.revealed = index < state.revealed;
      clip.card.hidden = index >= state.visible;
      clip.card.inert = !clip.revealed;
      clip.card.dataset.demoState = clip.revealed ? 'ready' : state.busy && index < state.batchEnd ? 'queued' : 'empty';
      clip.card.querySelectorAll('button').forEach(button => { button.disabled = !clip.revealed; });
      clip.slotLabel.textContent = state.busy ? `กำลังเตรียมคลิป ${index + 1}` : `คลิป ${index + 1}`;
      if (reason === 'reset') {
        stopClip(clip);
        clip.video.removeAttribute('src');
        clip.video.load();
        clip.loaded = false;
        clip.visible = false;
        clip.failed = false;
        clip.blocked = false;
        updateClipRetry(clip);
      }
      if (!wasRevealed && clip.revealed) {
        muteClip(clip);
        refreshClipVisibility(clip);
      }
    });
    const round = state.busy ? Math.ceil(state.batchEnd / state.batchSize) : state.round;
    if (demoRound) demoRound.textContent = `${round} / ${Math.ceil(state.total / state.batchSize)}`;
    if (demoPrompt) demoPrompt.textContent = demoPrompts[round - 1] || demoPrompts.at(-1);
    if (demoCounter) demoCounter.textContent = `${state.revealed} / ${state.total}`;
    if (demoProgress) {
      demoProgress.max = state.total;
      demoProgress.value = state.revealed;
    }
    demoComposer.dataset.complete = String(state.complete);
    demoComposer.dataset.busy = String(state.busy);
    demoGenerate.disabled = state.busy || state.complete;
    const generateLabel = state.complete ? 'ครบ 16 คลิปแล้ว' : state.busy ? 'กำลังเตรียมคลิป…' : state.revealed ? 'สร้างอีก 4 คลิป' : 'ลองสร้าง 4 คลิป';
    if (demoLabel) demoLabel.textContent = generateLabel;
    if (demoDockLabel) demoDockLabel.textContent = generateLabel;
    if (demoDockCount) demoDockCount.textContent = `${state.revealed} / ${state.total}`;
    if (demoDock) {
      demoDock.dataset.complete = String(state.complete);
      demoDock.dataset.busy = String(state.busy);
    }
    if (demoDockGenerate) {
      demoDockGenerate.disabled = state.busy || state.complete;
      if (state.complete && document.activeElement === demoDockGenerate) demoDockOwn?.focus({ preventScroll: true });
      demoDockGenerate.hidden = state.complete;
    }
    if (demoStatus) {
      demoStatus.textContent = state.complete ? 'ครบ 16 คลิปแล้ว — ถึงตาของคุณ' :
        state.busy ? `กำลังเปิดคลิปตัวอย่าง ${state.revealed + 1} / ${state.batchEnd}` :
        state.revealed ? `พร้อมแล้ว ${state.revealed} คลิป · ลองอีกชุดได้เลย` : 'กดแล้วดูคลิปขึ้นทีละชิ้น';
    }
    if (wallToolbar) wallToolbar.hidden = state.revealed === 0;
    if (demoReset) demoReset.hidden = state.revealed === 0 && !state.busy;
    if (state.complete && document.activeElement === demoGenerate) demoOwn?.focus({ preventScroll: true });
    demoGenerate.hidden = state.complete;
    if (reason === 'reset') announceWall('แตะลำโพงบนคลิปเพื่อเปิดเสียง');
    updateDockVisibility();
  };
  demoController = createDemoController({ total: wallClips.length, onChange: renderDemo });
  renderDemo(demoController.snapshot(), 'initial');
  const startDemoBatch = () => {
    const firstNewClip = wallClips[demoController.snapshot().revealed];
    if (!demoController.start()) return;
    firstNewClip?.card.scrollIntoView({
      block: 'center',
      behavior: motionPreference.matches ? 'instant' : 'smooth'
    });
  };
  demoGenerate.addEventListener('click', startDemoBatch);
  demoDockGenerate?.addEventListener('click', startDemoBatch);
  demoReset?.addEventListener('click', () => {
    demoController.reset();
    demoGenerate.focus({ preventScroll: true });
  });
  if (document.hidden) demoController.suspend();
}

if ('IntersectionObserver' in window) {
  const clipsByCard = new Map(wallClips.map(clip => [clip.card, clip]));
  const loadObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const clip = clipsByCard.get(entry.target);
      ensureClipSource(clip);
      if (clip.loaded) loadObserver.unobserve(entry.target);
    });
  }, { rootMargin: '480px 0px' });
  const playbackObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const clip = clipsByCard.get(entry.target);
      clip.visible = clip.revealed && entry.isIntersecting;
      if (canPlayClip(clip)) playClip(clip);
      else stopClip(clip);
    });
  }, { threshold: 0.01 });
  wallClips.forEach(clip => {
    loadObserver.observe(clip.card);
    playbackObserver.observe(clip.card);
  });
} else {
  let visibilityFrame = 0;
  const checkVisibility = () => {
    visibilityFrame = 0;
    wallClips.forEach(refreshClipVisibility);
  };
  const queueVisibilityCheck = () => {
    if (!visibilityFrame) visibilityFrame = requestAnimationFrame(checkVisibility);
  };
  window.addEventListener('scroll', queueVisibilityCheck, { passive: true });
  window.addEventListener('resize', queueVisibilityCheck, { passive: true });
  checkVisibility();
}

wallPause?.addEventListener('click', () => {
  wallPaused = !wallPaused;
  updatePauseControl();
  if (!wallPaused) {
    // The explicit play-all gesture can recover videos denied automatic playback.
    wallClips.forEach(clip => { if (canPlayClip(clip)) playClip(clip, true); });
  }
  syncWallPlayback();
  if (wallPaused) announceWall('หยุดวิดีโอทั้งหมดชั่วคราวแล้ว');
  else announceWall('กำลังเล่นวิดีโอแบบปิดเสียง แตะลำโพงบนคลิปเพื่อเปิดเสียง');
});
updatePauseControl();
if (wallPaused) announceWall('หยุดวิดีโอตามการตั้งค่าลดการเคลื่อนไหว แตะเล่นวิดีโอทั้งหมดเพื่อเริ่ม');

function handleMotionPreference(event) {
  if (!event.matches) return;
  wallPaused = true;
  updatePauseControl();
  syncWallPlayback();
  announceWall('หยุดวิดีโอตามการตั้งค่าลดการเคลื่อนไหว แตะเล่นวิดีโอทั้งหมดเพื่อเริ่ม');
}
if (motionPreference.addEventListener) motionPreference.addEventListener('change', handleMotionPreference);
else motionPreference.addListener(handleMotionPreference);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) demoController?.suspend();
  else demoController?.resume();
  if (document.hidden && videoDialog.open) {
    player.pause();
    player.muted = true;
  }
  syncWallPlayback();
});
window.addEventListener('pagehide', () => {
  demoController?.suspend();
  wallClips.forEach(stopClip);
  player.pause();
  player.muted = true;
});
window.addEventListener('pageshow', () => {
  if (!document.hidden) demoController?.resume();
  syncWallPlayback();
});

for (const card of document.querySelectorAll('[data-video]')) {
  card.addEventListener('click', () => {
    const demoCard = card.closest('.wall-card');
    if (demoEnabled && demoCard && demoCard.dataset.demoState !== 'ready') return;
    const attempt = ++dialogAttempt;
    wallClips.forEach(stopClip);
    document.querySelector('#video-title').textContent = card.dataset.title;
    videoError.hidden = true;
    player.poster = card.dataset.poster;
    player.src = card.dataset.video;
    player.muted = false;
    player.volume = 1;
    videoDialog.showModal();
    document.body.classList.add('dialog-open');
    player.play().catch(() => {
      // Native controls remain usable if the browser requires another gesture.
      if (attempt === dialogAttempt && videoDialog.open && player.error) videoError.hidden = false;
    });
  });
}
player.addEventListener('error', () => { if (player.hasAttribute('src')) videoError.hidden = false; });
videoDialog.addEventListener('close', () => {
  dialogAttempt += 1;
  player.pause();
  player.muted = true;
  player.removeAttribute('src');
  player.removeAttribute('poster');
  player.load();
  // Preserve an explicit pause or reduced-motion pause across the expanded view.
  muteWall();
  syncWallPlayback();
});

const templates = {
  product: {
    title: 'เปิดตัวให้คนหยุดดู',
    prompt: `สร้างวิดีโอเปิดตัวสินค้าแนวตั้ง 9:16 ความยาว 8 วินาที\n\nสินค้า: [ชื่อและรายละเอียดสินค้า]\nใช้ภาพสินค้าที่อัปโหลดเป็นภาพอ้างอิง รักษารูปทรง สี และรายละเอียดสินค้าให้ตรงกับต้นฉบับ\n\n0–2 วินาที: เริ่มด้วยภาพใกล้รายละเอียดที่น่าสนใจที่สุดของสินค้า แสงด้านข้างเผยพื้นผิวอย่างสวยงาม\n2–6 วินาที: กล้องค่อย ๆ ถอยออก เผยสินค้าเต็มชิ้นบน [แท่นหรือฉากที่เข้ากับแบรนด์] ให้สินค้าอยู่นิ่งและเด่นที่สุดในภาพ\n6–8 วินาที: จบด้วยภาพ Hero Shot จัดพื้นที่ว่างด้านบนสำหรับใส่ข้อความภายหลัง\n\nโทนภาพ: [หรูหรา / สดใส / อบอุ่น]\nสีหลัก: [สีแบรนด์]\nการเคลื่อนไหวเรียบลื่น สมจริง รักษาความต่อเนื่องของสินค้า ไม่สร้างตัวอักษร โลโก้ใหม่ หรือคำกล่าวอ้างบนภาพ\n\nเคล็ดลับ: เลือกโหมดสร้างจากภาพ อัปโหลดภาพสินค้าที่ชัด และตรวจสอบเครดิตก่อนสร้าง`
  },
  character: {
    title: 'ถ้าของรอบตัวพูดได้',
    prompt: `สร้างวิดีโอคาแรกเตอร์แนวตั้ง 9:16 ความยาว 8 วินาที\n\nตัวเอก: [สิ่งของ ผัก หรือผลไม้ใกล้ตัว] ที่มีใบหน้าและแขนเล็ก ๆ\nบุคลิก: [ขี้เล่น / จริงจังเกินเหตุ / ง่วงตลอดเวลา]\nสถานที่: [สถานการณ์ธรรมดาที่คนดูคุ้นเคย]\n\n0–2 วินาที: เปิดด้วยภาพใกล้สีหน้าตัวเอก กำลังเผชิญ [ปัญหาเล็ก ๆ ที่น่าขำ]\n2–6 วินาที: ตัวเอกแสดงปฏิกิริยาเกินจริงเล็กน้อย ใช้ภาษากายเล่าเรื่อง ให้เข้าใจได้แม้ไม่มีเสียง\n6–8 วินาที: เฉลยด้วย [จุดหักมุมที่ปลอดภัยและเป็นมิตร] จบด้วยสีหน้าที่ชวนดูซ้ำ\n\nสไตล์ 3D สมจริงแต่มีเสน่ห์ แสงสวย ตัวเอกหน้าตาและสัดส่วนเหมือนเดิมตลอดคลิป กล้องเคลื่อนน้อยเพื่อให้ติดตามได้ง่าย\nไม่ใส่ตัวอักษรหรือคำบรรยายในภาพ ไม่เลียนแบบตัวละครที่มีเจ้าของ\n\nเคล็ดลับ: ถ้ามีภาพคาแรกเตอร์ของตัวเอง ให้อัปโหลดเป็นภาพอ้างอิง และเริ่มจากตัวเอกเพียงตัวเดียว`
  },
  cinematic: {
    title: 'เรื่องเล่าสั้น ภาพจำยาว',
    prompt: `สร้างวิดีโอแนวภาพยนตร์แนวตั้ง 9:16 ความยาว 8 วินาที\n\nตัวเอกหรือวัตถุหลัก: [ตัวเอกหรือวัตถุของคุณ]\nสถานที่: [สถานที่และช่วงเวลาที่ชัดเจน]\nอารมณ์: [ตื่นเต้น / สงบ / มีความหวัง]\n\nเปิดด้วยภาพรายละเอียดของ [วัตถุหรือพื้นผิวที่เล่าเรื่อง] จากนั้นใช้กล้องเคลื่อนต่อเนื่องเพียงหนึ่งจังหวะ ค่อย ๆ เผยโลกโดยรอบ และจบด้วยภาพกว้างที่ทำให้เข้าใจว่าตัวเอกอยู่ที่ไหน\n\nจัดแสงแบบภาพยนตร์ มีมิติ ระยะชัดตื้นพอดี พื้นผิวสมจริง ใช้สีหลัก [2 สีที่เลือก] เพื่อคุมบรรยากาศ\nรักษาตัวเอก วัตถุ และทิศทางแสงให้ต่อเนื่อง ไม่มีการเปลี่ยนรูปหรือเพิ่มตัวละครโดยไม่จำเป็น ไม่ใส่ตัวอักษรหรือวอเตอร์มาร์ก\n\nเคล็ดลับ: เลือกการเคลื่อนกล้องเพียงอย่างเดียว เช่น dolly out หรือ slow orbit แล้วเปรียบเทียบผลงานทีละตัวเลือก`
  }
};

for (const button of document.querySelectorAll('[data-template]')) {
  button.addEventListener('click', () => {
    const key = button.dataset.template;
    const template = templates[key];
    document.querySelector('#template-title').textContent = template.title;
    templateContent.textContent = template.prompt;
    copyStatus.textContent = '';
    copyButton.disabled = false;
    document.querySelector('#download-template').href = `/airova/templates/${key}.txt`;
    templateDialog.showModal();
    syncWallPlayback();
    document.body.classList.add('dialog-open');
  });
}
templateDialog.addEventListener('close', syncWallPlayback);

copyButton.addEventListener('click', async () => {
  copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(templateContent.textContent);
    copyStatus.textContent = 'คัดลอกแล้ว — ปรับข้อมูลใน [วงเล็บ] แล้วนำไปลองได้เลย';
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(templateContent);
    selection.removeAllRanges();
    selection.addRange(range);
    templateContent.focus();
    copyStatus.textContent = 'เลือกข้อความให้แล้ว กดคัดลอกจากเมนูของอุปกรณ์ หรือดาวน์โหลดไฟล์ .txt ได้เลย';
  } finally {
    copyButton.disabled = false;
  }
});
