/* Collection compatibility patch for THE DUNGEON.
   The achievement ids stay `awaken` / `awakened` so existing saves survive,
   but no card should send people to the retired /classroom/awaken/ boss page.
*/
if (/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) {
  function patchCard(id, cfg) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return false;
    if (card.tagName === 'A') card.href = '/classroom/dungeon/';
    const kind = card.querySelector('.kind');
    const name = card.querySelector('.ach-name span:last-child');
    const hint = card.querySelector('.hint');
    const go = card.querySelector('.go');
    if (kind) kind.textContent = cfg.kind;
    if (name) name.textContent = cfg.name;
    if (hint) hint.innerHTML = card.classList.contains('unlocked')
      ? `<b>✓ ปลดแล้ว</b> — ${cfg.done}`
      : `<b>ปลดเมื่อ</b> ${cfg.locked}`;
    if (go) go.textContent = 'ไป THE DUNGEON →';
    return true;
  }

  function patch() {
    patchCard('awaken', {
      kind:'DUNGEON CLEAR',
      name:'THE DUNGEON · ด่านสุดท้าย',
      locked:'เปิดผลหีบใน THE DUNGEON อย่างน้อย 1 รอบ',
      done:'เปิดผลหีบใน THE DUNGEON แล้ว',
    });
    patchCard('awakened', {
      kind:'SIGIL · DUNGEON 5/5',
      name:'ผู้ตื่นรู้ · AWAKENED',
      locked:'เก็บครบ 5/5 แล้วเปิดหีบโดยไม่งัดพัง',
      done:'เปิดหีบ THE DUNGEON ที่ 5/5 และได้รับตรา AWAKENED',
    });
  }

  function boot() {
    const album = document.getElementById('album');
    if (!album) return;
    patch();
    new MutationObserver(patch).observe(album, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
}
