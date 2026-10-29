export function stepAvatar(index, direction, length) {
  if (!Number.isInteger(length) || length < 1) return -1;
  return ((index + direction) % length + length) % length;
}

export function randomAvatar(index, length, random = Math.random) {
  if (length < 2) return length ? 0 : -1;
  const draw = Math.min(length - 2, Math.max(0, Math.floor(random() * (length - 1))));
  return draw >= index ? draw + 1 : draw;
}

export function mountAvatarPicker(container, { avatars, selectedId, onSelect, random = Math.random }) {
  if (!avatars.length) return;
  let index = Math.max(0, avatars.findIndex(a => a.id === selectedId));
  const doc = container.ownerDocument;
  container.innerHTML = `<div class="avatar-carousel"><button class="avatar-arrow" type="button" data-avatar-prev aria-label="อวตารก่อนหน้า">‹</button><div class="avatar-stage"><img class="avatar-peek avatar-peek-left" alt="" aria-hidden="true" decoding="async"><img class="avatar-current" alt="อวตารที่เลือก" decoding="async"><img class="avatar-peek avatar-peek-right" alt="" aria-hidden="true" decoding="async"></div><button class="avatar-arrow" type="button" data-avatar-next aria-label="อวตารถัดไป">›</button></div><button class="avatar-shuffle" type="button" data-avatar-random><span aria-hidden="true">⚄</span> สุ่มให้หน่อย</button><span class="screen-reader" data-avatar-status role="status"></span>`;
  const current = container.querySelector('.avatar-current');
  function update(direction = 0) {
    current.src = avatars[index].image;
    container.querySelector('.avatar-peek-left').src = avatars[stepAvatar(index, -1, avatars.length)].image;
    container.querySelector('.avatar-peek-right').src = avatars[stepAvatar(index, 1, avatars.length)].image;
    container.querySelector('[data-avatar-status]').textContent = `เลือกอวตาร ${index + 1} แล้ว`;
    if (direction && !doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches && current.animate) {
      current.getAnimations?.().forEach(a => a.cancel());
      current.animate([{ opacity: .25, transform: `translateX(${direction * 24}px) rotate(${direction * 7}deg) scale(.94)` }, { opacity: 1, transform: 'translateX(0) rotate(0) scale(1)' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.3,1)' });
    }
  }
  function select(next, direction) {
    index = next;
    update(direction);
    onSelect(avatars[index]);
  }
  container.querySelector('[data-avatar-prev]').onclick = () => select(stepAvatar(index, -1, avatars.length), -1);
  container.querySelector('[data-avatar-next]').onclick = () => select(stepAvatar(index, 1, avatars.length), 1);
  container.querySelector('[data-avatar-random]').onclick = () => select(randomAvatar(index, avatars.length, random), 1);
  container.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      select(stepAvatar(index, direction, avatars.length), direction);
    }
  });
  update();
}
