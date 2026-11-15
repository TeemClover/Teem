(() => {
  const trigger = document.querySelector('#web-desk-trigger');
  const dialog = document.querySelector('#web-desk');
  if (!trigger || typeof dialog?.showModal !== 'function') return;

  const demos = {
    cafe: {combo: 'cafe-booking-warm', image: 'cafe-warm', address: 'mosscafe.example', brand: 'มอสคาเฟ่', line: 'กาแฟดี ขนมปังอบเช้า'},
    studio: {combo: 'studio-profile-minimal', image: 'studio-minimal', address: 'framesip.example', brand: 'เฟรมสิบ สตูดิโอ', line: 'ภาพที่เล่าเรื่องแบรนด์คุณ'},
    shop: {combo: 'shop-store-playful', image: 'shop-playful', address: 'thakjai.example', brand: 'ถักใจ', line: 'ไหมพรมถักมือ ทีละชิ้น'},
  };
  const buttons = [...dialog.querySelectorAll('[data-desk-demo]')];
  const preview = dialog.querySelector('.desk-preview');
  const photo = preview.querySelector('[data-desk-image]');
  const address = preview.querySelector('[data-desk-address]');
  const brand = preview.querySelector('[data-desk-brand]');
  const line = preview.querySelector('[data-desk-line]');
  const sample = dialog.querySelector('.desk-sample');

  function showDemo(key) {
    const demo = demos[key];
    preview.dataset.deskPreview = key;
    photo.src = `/entry/media/v4/hero/${demo.image}-640.webp`;
    address.textContent = demo.address;
    brand.textContent = demo.brand;
    line.textContent = demo.line;
    sample.href = `/builder/?r=${demo.combo}`;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.deskDemo === key));
  }

  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', dialog.id);
  trigger.addEventListener('click', event => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!photo.hasAttribute('src')) showDemo('cafe');
    if (!dialog.open) dialog.showModal();
  });
  for (const button of buttons) button.addEventListener('click', () => showDemo(button.dataset.deskDemo));
  dialog.addEventListener('close', () => trigger.focus({preventScroll: true}));
})();
