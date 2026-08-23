function patchOverviewCopy() {
  const panel = document.getElementById('panel-overview');
  if (!panel) return;

  panel.querySelectorAll('.metric-group').forEach(group => {
    const heading = group.querySelector('h2');
    const title = heading?.textContent?.trim() || '';
    if (title === 'Activity') {
      group.querySelectorAll('dt').forEach(label => {
        if (label.textContent.trim() === 'Confirm') label.textContent = 'Seen';
      });
      if (!group.querySelector('.tb-admin-seen-note')) {
        const note = document.createElement('p');
        note.className = 'tb-admin-seen-note';
        note.style.cssText = 'margin:10px 0 0;color:var(--muted,#6f6a5f);font-size:12px;line-height:1.5';
        note.textContent = 'Seen รวมทั้งในสมุดและจาก Public · Public anonymous ไม่นับเป็น Active User';
        group.appendChild(note);
      }
    }
    if (title === 'Confirm health' && heading) {
      heading.textContent = 'ต้องมีคนเห็น · health';
    }
  });

  panel.querySelectorAll('th').forEach(cell => {
    if (cell.textContent.trim() === 'Confirm') cell.textContent = 'Seen';
  });
}

function boot() {
  const panel = document.getElementById('panel-overview');
  if (!panel) return;
  patchOverviewCopy();
  new MutationObserver(patchOverviewCopy).observe(panel, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
