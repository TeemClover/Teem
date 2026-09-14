// Playback state is separate from lesson navigation so a late play() rejection
// from the previous lesson cannot replace the new lesson's controls.
export function createLessonPlayer({ video, overlay, message, button, schedule = setTimeout, cancel = clearTimeout }) {
  let active = false, generation = 0, timer, state = 'idle', resume = 0, restored = false;
  const clearTimer = () => { if (timer !== undefined) cancel(timer); timer = undefined; };
  function show(next, text = '', label = '') {
    state = next; overlay.dataset.state = next;
    overlay.hidden = ['idle', 'playing', 'paused'].includes(next);
    message.textContent = text; button.textContent = label; button.hidden = !label;
    clearTimer();
    if (next === 'loading' || next === 'buffering') {
      const version = generation;
      timer = schedule(() => {
        if (!active || version !== generation) return;
        show('slow', 'กำลังโหลดวิดีโอ อ่านเนื้อหาด้านล่างระหว่างรอได้', 'โหลดใหม่');
      }, 10000);
    }
  }
  async function play() {
    if (!active) return;
    const version = generation;
    show('loading', 'กำลังเตรียมวิดีโอ…');
    try {
      await video.play();
      if (active && version === generation && !video.paused) show('playing');
    } catch (error) {
      if (!active || version !== generation) return;
      if (error?.name === 'NotAllowedError') show('blocked', 'กดเล่นเพื่อเริ่มบทเรียน', 'เล่นวิดีโอ');
      else if (error?.name !== 'AbortError') show('error', 'ยังเปิดวิดีโอไม่ได้ ลองเชื่อมต่อใหม่อีกครั้ง', 'โหลดใหม่');
    }
  }
  function restorePosition() {
    if (!active || restored || !Number.isFinite(video.duration)) return;
    restored = true;
    if (Number.isFinite(resume) && resume > 2 && resume < video.duration - 2) video.currentTime = resume;
  }
  video.addEventListener('loadedmetadata', restorePosition);
  video.addEventListener('playing', () => { if (active) show('playing'); });
  video.addEventListener('play', () => { if (active) show('loading', 'กำลังเตรียมวิดีโอ…'); });
  video.addEventListener('waiting', () => { if (active && !video.paused) show('buffering', 'กำลังโหลดช่วงถัดไป…'); });
  video.addEventListener('pause', () => { if (active && video.paused && ['playing', 'loading', 'buffering', 'slow'].includes(state)) show('paused'); });
  video.addEventListener('ended', () => { if (active) show('paused'); });
  video.addEventListener('error', () => { if (active) show('error', 'ยังเปิดวิดีโอไม่ได้ ลองเชื่อมต่อใหม่อีกครั้ง', 'โหลดใหม่'); });
  button.addEventListener('click', () => {
    if (!active) return;
    if (state === 'blocked') { void play(); return; }
    // Keep the current position when the connection needs a retry.
    if (Number.isFinite(video.currentTime) && video.currentTime > 2) resume = video.currentTime;
    generation += 1; restored = false; video.load(); void play();
  });
  return {
    start(position = 0) {
      generation += 1; active = true; resume = position; restored = false;
      video.preload = 'auto'; video.load(); void play();
    },
    reset() { active = false; generation += 1; restored = false; show('idle'); },
  };
}
