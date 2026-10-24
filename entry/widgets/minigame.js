// "มินิเกมโปรโมต" widget: catch the clover 3 times for a sample coupon. No prize is real.
export function mount(root, {industry, esc, icon}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let left = 3, timer = 0;
  root.innerHTML = `<div class="w-game"><p class="w-game-hud" aria-live="polite">เก็บโคลเวอร์ <b data-left>3</b> ใบ</p><button type="button" class="w-token" aria-label="เก็บโคลเวอร์">${icon('clover')}</button></div>`;
  const game = root.querySelector('.w-game'), token = root.querySelector('.w-token'), hud = root.querySelector('[data-left]');
  const place = () => {
    token.style.left = (14 + Math.random() * 72).toFixed(1) + '%';
    token.style.top = (34 + Math.random() * 50).toFixed(1) + '%';
  };
  const wander = () => { clearInterval(timer); if (!reduced) timer = setInterval(place, 1300); };
  place(); wander();
  token.addEventListener('click', () => {
    left--; hud.textContent = left;
    token.classList.remove('pop'); void token.offsetWidth; token.classList.add('pop');
    if (left > 0) { place(); wander(); return; }
    clearInterval(timer);
    token.remove();
    game.insertAdjacentHTML('beforeend', `<div class="w-coupon" role="status"><span>${esc(industry.brand)} ให้คุณ</span><b>LUCKY-DEMO</b><span>ส่วนลด 10% (คูปองจำลอง)</span><small>ในเว็บจริง คูปองผูกกับร้านของคุณ</small></div>`);
  });
  return () => clearInterval(timer);
}
