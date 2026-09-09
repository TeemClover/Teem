/** Present the actual live discovery in the world on wide screens.
 * Call sync after reward mounting and each onChange. No clones or observers.
 * Narrow viewports return the same node to its exact position in the reward.
 */
export function createExhibit(element) {
  const doc = element?.ownerDocument;
  if (!doc) throw new TypeError('An exhibit element is required');
  const query = doc.defaultView?.matchMedia?.('(min-width: 701px) and (min-height: 601px)');
  let current = null, destroyed = false;
  element.classList.add('seed-exhibit');
  element.setAttribute('role', 'region');
  element.setAttribute('aria-label', 'เว็บที่คุณกำลังสร้าง');
  element.hidden = true;

  const belongs = record => record && record.host.contains(record.anchor);
  function release() {
    if (current) {
      const {preview, anchor} = current;
      // A remounted reward owns its new preview. Never reinsert stale content.
      if (belongs(current)) anchor.parentNode.insertBefore(preview, anchor.nextSibling);
      else if (preview.parentNode === element) preview.remove();
      anchor.remove();
      current = null;
    }
    element.hidden = true;
    element.removeAttribute('data-design');
    element.removeAttribute('data-title-length');
  }
  function place() {
    if (!current || destroyed) return;
    if (!belongs(current)) {release();return;}
    const {preview, anchor} = current;
    if (query?.matches) {
      if (preview.parentNode !== element) element.append(preview);
      element.dataset.design = preview.dataset.design || 'editorial';
      element.dataset.titleLength = Array.from(preview.querySelector('h4')?.textContent || '').length > 28 ? 'long' : 'short';
      element.hidden = false;
    } else {
      if (preview.parentNode === element) anchor.parentNode.insertBefore(preview, anchor.nextSibling);
      element.hidden = true;
    }
  }
  function sync(color, rewardHost, state) {
    if (destroyed) return;
    if (!['silver','blue','green'].includes(color) || !rewardHost) {release();return;}
    const candidate = rewardHost.querySelector(color==='silver'?'.seed-reward-preview':color==='green'?'.seed-reward-rhythm':'.seed-reward-example')
      || (color==='blue'?rewardHost.querySelector('.seed-reward-work'):null);
    if (current && (current.host !== rewardHost || !belongs(current)
      || (candidate && candidate !== current.preview))) release();
    if (!current && candidate) {
      const anchor = doc.createComment('live discovery returns here');
      candidate.parentNode.insertBefore(anchor, candidate);
      current = {preview: candidate, anchor, host: rewardHost};
    }
    // state is intentionally not copied; only the actual preview is presented.
    void state;
    element.dataset.color=color;
    element.setAttribute('aria-label',color==='silver'?'เว็บที่คุณกำลังสร้าง':color==='green'?'จังหวะที่คุณจัดให้วันนี้':'สิ่งที่ประกอบจากโจทย์ของคุณ');
    place();
  }
  if (query?.addEventListener) query.addEventListener('change', place);
  else query?.addListener?.(place);
  return {
    sync,
    clear: release,
    destroy() {
      if (destroyed) return;
      release();destroyed = true;
      if (query?.removeEventListener) query.removeEventListener('change', place);
      else query?.removeListener?.(place);
    }
  };
}
