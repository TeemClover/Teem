/* Read-only adapter for the existing mc_read contract. No unlocks or new completion rules. */
function paintReadingRail() {
  let read = [];
  try { read = (localStorage.getItem('mc_read') || '').split(','); } catch { /* Reading works without storage. */ }
  document.querySelectorAll('[data-forge-chapter]').forEach(link => {
    link.dataset.read = String(read.includes(link.dataset.forgeChapter));
  });
}
paintReadingRail();
window.addEventListener('storage', paintReadingRail);
window.addEventListener('pageshow', paintReadingRail);
