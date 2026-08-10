/* Collection compatibility patch for THE DUNGEON.
   The achievement ids stay `awaken` / `awakened` so existing saves survive,
   but no card should send people to the retired /classroom/awaken/ boss page.
*/
if (/^\/collection\/?(?:index\.html)?$/.test(location.pathname)) {
  const CONFIG = {
    awaken: {
      kind:'DUNGEON CLEAR',
      name:'THE DUNGEON · ด่านสุดท้าย',
      locked:'เปิดผลหีบใน THE DUNGEON อย่างน้อย 1 รอบ',
      done:'เปิดผลหีบใน THE DUNGEON แล้ว',
    },
    awakened: {
      kind:'SIGIL · DUNGEON 5/5',
      name:'ผู้ตื่นรู้ · AWAKENED',
      locked:'เก็บครบ 5/5 แล้วเปิดหีบโดยไม่งัดพัง',
      done:'เปิดหีบ THE DUNGEON ที่ 5/5 และได้รับตรา AWAKENED',
    },
  };

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function patchCard(id, cfg) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    if (card.tagName === 'A' && card.getAttribute('href') !== '/classroom/dungeon/') {
      card.setAttribute('href', '/classroom/dungeon/');
    }
    setText(card.querySelector('.kind'), cfg.kind);
    setText(card.querySelector('.ach-name span:last-child'), cfg.name);
    const hint = card.querySelector('.hint');
    if (hint) {
      const html = card.classList.contains('unlocked')
        ? `<b>✓ ปลดแล้ว</b> — ${cfg.done}`
        : `<b>ปลดเมื่อ</b> ${cfg.locked}`;
      if (hint.innerHTML !== html) hint.innerHTML = html;
    }
    setText(card.querySelector('.go'), 'ไป THE DUNGEON →');
  }

  function patch() {
    patchCard('awaken', CONFIG.awaken);
    patchCard('awakened', CONFIG.awakened);
  }

  function boot() {
    const album = document.getElementById('album');
    if (!album) return;
    patch();

    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        observer.disconnect();
        patch();
        observer.observe(album, { childList:true, subtree:true });
      });
    });
    observer.observe(album, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
}
