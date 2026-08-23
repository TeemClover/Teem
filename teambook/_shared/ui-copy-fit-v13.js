/* TeamBook V1.3 — targeted UI semantics + compact 5-person Public strip.
   This is deliberately NOT a translation layer. It only reconciles legacy
   verification labels that are still rendered by older surfaces and removes
   one redundant status suffix. */

let queued = false;

const MODE_OLD = new Set(['ต้อง เห็นแล้ว', 'ต้องเห็นแล้ว', 'ต้องมีคนเห็นแล้ว']);
const MODE_NEW = 'ต้องมีคนเห็น';

function normalizeModeNode(node) {
  if (!node) return;
  const text = String(node.textContent || '').trim();
  if (MODE_OLD.has(text)) node.textContent = MODE_NEW;
}

function installStyle() {
  if (document.getElementById('tb-ui-copy-fit-v13-style')) return;
  const style = document.createElement('style');
  style.id = 'tb-ui-copy-fit-v13-style';
  style.textContent = `
    /* Five is the hard member max. When all five seats are occupied on a
       phone, fit the whole group in one glance instead of creating a tiny
       horizontal carousel. One to four members keep the roomier flex layout. */
    @media(max-width:560px){
      #members.preview-members:has(.preview-member:nth-child(5)){
        display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr))!important;
        gap:4px!important;
        width:100%!important;
        overflow:visible!important;
        padding-inline:0!important;
      }
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member{
        width:auto!important;min-width:0!important
      }
      #members.preview-members:has(.preview-member:nth-child(5)) .tb-public-member-visual{
        width:min(100%,50px)!important;max-width:50px!important
      }
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member b{
        font-size:10px!important;line-height:1.25!important
      }
      #members.preview-members:has(.preview-member:nth-child(5)) .preview-member small{
        display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        font-size:8px!important;line-height:1.25!important
      }
    }
  `;
  document.head.appendChild(style);
}

function syncModeCopy() {
  /* Create Book — only the confirm choice's visible label. */
  document.querySelectorAll('#verificationPick .preset-choice b').forEach(normalizeModeNode);

  /* Home/Public cards — both legacy pills and V1.3 metadata. */
  document.querySelectorAll('#homePublicList .status-pill, #homePublicList .tb-public-meta span, .public-party .status-pill')
    .forEach(node => {
      normalizeModeNode(node);
      if (node.textContent?.includes(' · กำลังเขียน')) {
        node.textContent = node.textContent.replace(' · กำลังเขียน', '');
      }
    });

  /* Public Detail + in-book verification line. */
  document.querySelectorAll('#meta span, .tb-public-detail-item b, #verificationLine')
    .forEach(node => {
      const text = String(node.textContent || '').trim();
      if (MODE_OLD.has(text)) {
        node.textContent = MODE_NEW;
        return;
      }
      for (const old of MODE_OLD) {
        if (node.textContent?.includes(old)) node.textContent = node.textContent.replaceAll(old, MODE_NEW);
      }
    });

  /* V1.3 quick-create defaults. */
  document.querySelectorAll('.v13-create-defaults span').forEach(normalizeModeNode);
}

function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    installStyle();
    syncModeCopy();
  });
}

function install() {
  installStyle();
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  schedule();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
else install();
