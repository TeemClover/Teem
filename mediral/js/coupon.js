// Review offer: the checkout server independently calculates the final discount.
// An exclusive Bangkok expiry keeps the offer valid through 15 October.
export function couponHTML(coupon, now = Date.now()) {
  if (!coupon || !Number.isFinite(coupon.regular_price)) return '';
  const price = coupon.regular_price;
  const active = now >= Date.parse(coupon.valid_from) && now < Date.parse(coupon.expires_at);
  if (!active) return `<p>ราคาปกติชิ้นละ <strong>${price} บาท</strong></p>`;
  const net = Math.round(price * (100 - coupon.discount_percent) / 100);
  return `<p class="mr-coupon__eyebrow">ราคาปกติชิ้นละ ${price} บาท</p>
    <p class="mr-coupon__title">ใช้คูปองอัตโนมัติ <strong>ลด ${coupon.discount_percent}%</strong></p>
    <p class="mr-coupon__price">เหลือ <strong>${net}</strong> บาท / ชิ้น</p>
    <p class="mr-coupon__terms">เมื่อใช้คูปองภายใน 15 ต.ค. 2569 · แจ้งค่าส่งก่อนยืนยันสั่งซื้อ</p>`;
}

export function mountCoupon(element, coupon) {
  if (!element) return;
  const render = () => { element.innerHTML = couponHTML(coupon); };
  render();
  // Refresh open pages too, including tabs restored after sleep.
  const timer = setInterval(render, 30_000);
  document.addEventListener('visibilitychange', render);
  window.addEventListener('pagehide', () => clearInterval(timer), {once: true});
  window.addEventListener('pageshow', render);
}
