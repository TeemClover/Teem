// "หน้าร้าน" widget: add sample items to a cart. Prices are sample numbers; nothing is sold.
export function mount(root, {industry, toast, esc}) {
  const money = n => n === 0 ? 'ฟรี' : '฿' + n.toLocaleString('th-TH');
  let count = 0, total = 0;
  root.innerHTML = `<div class="w-items">${industry.items.map((it, i) => `<div class="w-item"><b>${esc(it.name)}</b><span>${esc(it.desc)}</span><span class="w-price">${money(it.price)}</span><button type="button" class="w-add" data-add="${i}" aria-label="ใส่ ${esc(it.name)} ลงตะกร้า">ใส่ตะกร้า</button></div>`).join('')}</div>
    <div class="w-cart" aria-live="polite"><span><b data-count>0</b><span data-total>ตะกร้าว่าง</span></span><button type="button" class="w-go" data-pay disabled>ชำระเงิน</button></div>`;
  const cart = root.querySelector('.w-cart');
  root.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const it = industry.items[+add.dataset.add];
      count++; total += it.price;
      root.querySelector('[data-count]').textContent = count;
      root.querySelector('[data-total]').textContent = `รวม ${money(total)} (ราคาตัวอย่าง)`;
      root.querySelector('[data-pay]').disabled = false;
      cart.classList.remove('bump'); void cart.offsetWidth; cart.classList.add('bump');
      add.textContent = 'เพิ่มอีก';
    }
    if (e.target.closest('[data-pay]')) toast('จำลอง ไม่มีการสั่งซื้อจริง · ในเว็บจริงเชื่อมช่องทางชำระของคุณ');
  });
}
