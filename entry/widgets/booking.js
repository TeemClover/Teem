// "จองคิว" widget: pick a day and a time, confirm. Nothing is booked; no data leaves the page.
const TIMES = ['10:00', '11:30', '13:00', '15:30', '17:00'];
export function mount(root, {industry, esc, icon}) {
  const fmt = new Intl.DateTimeFormat('th-TH', {weekday: 'short', day: 'numeric'});
  const days = Array.from({length: 4}, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return {label: i === 0 ? 'พรุ่งนี้' : fmt.format(d), seed: d.getDate()}; });
  let day = 0, time = null;
  const full = (d, t) => (days[d].seed * 7 + t * 3) % 5 === 0; // a couple of slots look taken, same every visit
  function draw() {
    root.innerHTML = `<p class="w-label">${esc(industry.bookingNoun)} · เลือกวัน</p>
      <div class="w-row" role="group" aria-label="เลือกวัน">${days.map((d, i) => `<button type="button" class="w-pill" data-day="${i}" aria-pressed="${i === day}">${esc(d.label)}</button>`).join('')}</div>
      <p class="w-label">เลือกเวลา</p>
      <div class="w-row" role="group" aria-label="เลือกเวลา">${TIMES.map((t, i) => `<button type="button" class="w-pill" data-time="${i}" aria-pressed="${i === time}" ${full(day, i) ? 'disabled aria-label="' + t + ' เต็มแล้ว"' : ''}>${t}</button>`).join('')}</div>
      <button type="button" class="w-go" data-go ${time === null ? 'disabled' : ''}>${time === null ? 'เลือกเวลาก่อน' : `ยืนยัน ${esc(days[day].label)} ${TIMES[time]}`}</button>`;
  }
  draw();
  root.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.day) { day = +b.dataset.day; if (time !== null && full(day, time)) time = null; draw(); root.querySelector(`[data-day="${day}"]`).focus(); }
    else if (b.dataset.time) { time = +b.dataset.time; draw(); root.querySelector(`[data-time="${time}"]`).focus(); }
    else if ('go' in b.dataset) {
      root.innerHTML = `<div class="w-ok" role="status">${icon('check')}<div><b>${esc(industry.bookingNoun)}แล้ว (จำลอง)</b><br>${esc(days[day].label)} เวลา ${TIMES[time]} · ไม่มีการจองจริง</div></div><button type="button" class="w-pill" data-again style="margin-top:10px">ลองจองใหม่</button>`;
    } else if ('again' in b.dataset) { time = null; draw(); }
  });
}
