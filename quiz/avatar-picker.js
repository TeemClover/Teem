export function stepAvatar(index, direction, length) {
  if (!Number.isInteger(length) || length < 1) return -1;
  return ((index + direction) % length + length) % length;
}

export function randomAvatar(index, length, random = Math.random) {
  if (length < 2) return length ? 0 : -1;
  const draw = Math.min(length - 2, Math.max(0, Math.floor(random() * (length - 1))));
  return draw >= index ? draw + 1 : draw;
}

// Keep a small decoded-image cache; never download/decode all 68 full-size cards.
export function createAvatarImageLoader({ createImage = () => new Image(), limit = 12 } = {}) {
  const cache = new Map();
  const capacity = Number.isInteger(limit) && limit > 0 ? limit : 12;
  return function load(source, priority = 'low') {
    const existing = cache.get(source);
    if (existing) {
      if (priority === 'high') existing.image.fetchPriority = 'high';
      cache.delete(source);cache.set(source, existing);
      return existing.promise;
    }
    const image = createImage();
    image.decoding = 'async';image.fetchPriority = priority;
    const promise = new Promise((resolve, reject) => {
      image.onerror = () => reject(new Error('AVATAR_IMAGE_FAILED'));
      image.onload = () => { if (!image.decode) resolve(image); };
      image.src = source;
      if (image.decode) image.decode().then(() => resolve(image), reject);
      else if (image.complete && image.naturalWidth) resolve(image);
    }).then(ready => { image.onload = image.onerror = null;return ready; }, error => {
      image.onload = image.onerror = null;
      if (cache.get(source)?.image === image) cache.delete(source);
      throw error;
    });
    cache.set(source, { image, promise });
    while (cache.size > capacity) cache.delete(cache.keys().next().value);
    return promise;
  };
}
const loadAvatarImage = createAvatarImageLoader();
const imageSource = avatar => avatar.preview || avatar.image;

export function mountAvatarPicker(container, { avatars, selectedId, onSelect, random = Math.random, loadImage = loadAvatarImage }) {
  if (!avatars.length) return;
  let index = Math.max(0, avatars.findIndex(a => a.id === selectedId));
  let displayed = index, request = 0, plannedRandom = randomAvatar(index, avatars.length, random), animations = [];
  const view = container.ownerDocument.defaultView;
  container.innerHTML = `<div class="avatar-carousel"><button class="avatar-arrow" type="button" data-avatar-prev aria-label="รูปก่อนหน้า">‹</button><div class="avatar-stage"><img class="avatar-peek avatar-peek-left" alt="" aria-hidden="true" decoding="async"><div class="avatar-card-stack"><img class="avatar-current" alt="รูปประจำตัวที่เลือก" data-active="true" width="252" height="352" decoding="async"></div><img class="avatar-peek avatar-peek-right" alt="" aria-hidden="true" decoding="async"></div><button class="avatar-arrow" type="button" data-avatar-next aria-label="รูปถัดไป">›</button></div><button class="avatar-shuffle" type="button" data-avatar-random><span aria-hidden="true">⚄</span> สุ่มให้หน่อย</button><span class="screen-reader" data-avatar-status role="status"></span>`;
  const stack = container.querySelector('.avatar-card-stack'), stage = container.querySelector('.avatar-stage'), status = container.querySelector('[data-avatar-status]');
  let current = container.querySelector('.avatar-current');
  current.src = imageSource(avatars[index]);
  const reducedMotion = () => view?.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function nextRandom() {
    const draw = randomAvatar(index, avatars.length, random);
    if (draw !== displayed || index === displayed) return draw;
    // During rapid taps, avoid rolling back to the card still visible on screen.
    const candidates = avatars.map((_, i) => i).filter(i => i !== index && i !== displayed);
    return candidates.length ? candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))] : draw;
  }
  function warm() {
    const next = [plannedRandom, stepAvatar(index, -1, avatars.length), stepAvatar(index, 1, avatars.length)];
    new Set(next).forEach(i => loadImage(imageSource(avatars[i])).catch(() => {}));
  }
  function updatePeeks(selected, ticket) {
    for (const [direction, selector] of [[-1, '.avatar-peek-left'], [1, '.avatar-peek-right']]) {
      const source = imageSource(avatars[stepAvatar(selected, direction, avatars.length)]);
      loadImage(source).then(() => {
        if (ticket === request && container.isConnected) container.querySelector(selector).src = source;
      }).catch(() => {});
    }
  }
  async function select(next, direction) {
    const ticket = ++request;
    index = next;
    plannedRandom = nextRandom();
    stage.setAttribute('aria-busy', 'true');
    // Start the requested image first, then prepare the next random choice and neighbors.
    const ready = loadImage(imageSource(avatars[next]), 'high');
    warm();
    try {
      const incoming = await ready;
      if (ticket !== request || !container.isConnected) return;
      animations.forEach(animation => animation.cancel());animations = [];
      incoming.className = 'avatar-current';incoming.alt = 'รูปประจำตัวที่เลือก';
      incoming.width = 252;incoming.height = 352;incoming.dataset.active = 'true';incoming.setAttribute('aria-hidden', 'false');
      if (incoming !== current) {
        current.dataset.active = 'false';current.setAttribute('aria-hidden', 'true');
        stack.replaceChildren(current, incoming);
        if (!reducedMotion() && incoming.animate) {
          animations.push(current.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-direction * 8}px)` }], { duration: 160, easing: 'ease-out' }));
          animations.push(incoming.animate([{ opacity: 0, transform: `translateX(${direction * 10}px) scale(.98)` }, { opacity: 1, transform: 'translateX(0) scale(1)' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.3,1)' }));
        }
        current = incoming;
      }
      displayed = next;stage.setAttribute('aria-busy', 'false');
      status.textContent = `เลือกรูปประจำตัว ${next + 1} แล้ว`;
      updatePeeks(next, ticket);
      onSelect(avatars[next]);
    } catch {
      if (ticket !== request || !container.isConnected) return;
      index = displayed;plannedRandom = nextRandom();
      stage.setAttribute('aria-busy', 'false');
      status.textContent = 'โหลดรูปไม่สำเร็จ กดเลือกอีกครั้งได้เลย';
    }
  }
  container.querySelector('[data-avatar-prev]').onclick = () => select(stepAvatar(index, -1, avatars.length), -1);
  container.querySelector('[data-avatar-next]').onclick = () => select(stepAvatar(index, 1, avatars.length), 1);
  container.querySelector('[data-avatar-random]').onclick = () => select(plannedRandom, 1);
  container.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      select(stepAvatar(index, direction, avatars.length), direction);
    }
  });
  loadImage(imageSource(avatars[index]), 'high').catch(() => {});
  updatePeeks(index, request);warm();
}
