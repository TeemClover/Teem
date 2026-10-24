// "หน้าแนะนำตัว" widget: three tabs (story · services · contact). Simulation only.
export function mount(root, {industry, toast, esc}) {
  const tabs = [
    {id: 'story', label: 'เรื่องของเรา', html: `<p>${esc(industry.sub)}</p><p style="margin-top:6px">${esc(industry.sauce[2].split(':').slice(1).join(':').trim())}</p>`},
    {id: 'menu', label: industry.key === 'cafe' ? 'เมนู' : 'บริการ', html: `<ul>${industry.items.map(i => `<li><b>${esc(i.name)}</b><span>${esc(i.desc)}</span></li>`).join('')}</ul>`},
    {id: 'contact', label: 'ติดต่อ', html: `<div class="w-contact"><button type="button" class="w-pill" data-sim>แชต</button><button type="button" class="w-pill" data-sim>โทร</button><button type="button" class="w-pill" data-sim>แผนที่</button></div>`},
  ];
  const uid = 'w' + Math.random().toString(36).slice(2, 7);
  root.innerHTML = `<div class="w-tabs" role="tablist" aria-label="ส่วนของหน้าแนะนำตัว">${tabs.map((t, i) => `<button type="button" class="w-tab" role="tab" id="${uid}-t${i}" aria-controls="${uid}-p" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.label)}</button>`).join('')}</div><div class="w-panel" role="tabpanel" id="${uid}-p" aria-labelledby="${uid}-t0">${tabs[0].html}</div>`;
  const buttons = [...root.querySelectorAll('.w-tab')], panel = root.querySelector('.w-panel');
  const select = i => {
    buttons.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
    panel.setAttribute('aria-labelledby', buttons[i].id);
    panel.innerHTML = tabs[i].html;
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
  };
  buttons.forEach((b, i) => {
    b.addEventListener('click', () => select(i));
    b.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = (i + d + buttons.length) % buttons.length; select(n); buttons[n].focus();
    });
  });
  root.addEventListener('click', e => { if (e.target.closest('[data-sim]')) toast('จำลอง · ในเว็บจริงปุ่มนี้พาไปช่องทางของคุณ'); });
}
