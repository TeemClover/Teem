/* Illustrative Cloud workflow and editable time-value estimate. No remote services are connected. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const put = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  const publish = byId('demo-publish'), run = byId('demo-run'), reset = byId('demo-reset');
  let sourceVersion = 1, outputVersion = 1;
  function renderDemo() {
    const days = sourceVersion === 1 ? 2 : 3, outputDays = outputVersion === 1 ? 2 : 3;
    put('demo-version', `SOURCE v${sourceVersion}`);
    put('demo-current-fact', `${days} วันทำการ`);
    put('demo-phone-note', `ส่วนกลางกำลังใช้ v${sourceVersion}`);
    put('demo-ai-version', `ใช้ SOURCE v${outputVersion}`);
    put('demo-reply', `หลังยืนยันคำสั่งซื้อ ทีมใช้เวลาเตรียมสินค้า ${outputDays} วันทำการ ก่อนส่งต่อให้ผู้ขนส่งค่ะ`);
    put('demo-status', sourceVersion === 1
      ? 'เริ่มจากทุกคนใช้ Source v1 เดียวกัน ลองอนุมัติข้อมูลใหม่จากมือถือ'
      : outputVersion === 1
        ? 'เผยแพร่ v2 แล้ว ทีมเปิดข้อมูลใหม่เป็น 3 วันทำการ ส่วนร่างเดิมของ AI ยังใช้ v1 จนกว่าจะสร้างงานใหม่'
        : 'ทีมและผลงาน AI รอบใหม่ใช้ v2 ตรงกัน: 3 วันทำการ จากส่วนกลางเดียวกัน');
    publish.disabled = sourceVersion === 2;
    run.disabled = sourceVersion === outputVersion;
  }
  if (publish && run && reset) {
    publish.addEventListener('click', () => { sourceVersion = 2; renderDemo(); });
    run.addEventListener('click', () => { outputVersion = sourceVersion; renderDemo(); });
    reset.addEventListener('click', () => { sourceVersion = 1; outputVersion = 1; renderDemo(); });
    renderDemo();
  }
  const ids = ['value-people', 'value-minutes', 'value-days', 'value-rate'];
  const defaults = [6, 20, 22, 300];
  const fields = ids.map(byId);
  const format = value => new Intl.NumberFormat('en-US', {maximumFractionDigits: 1}).format(value);
  function renderValue() {
    const valid = fields.every(field => field.value.trim() !== '' && field.checkValidity() && Number.isFinite(Number(field.value)));
    byId('value-error').hidden = valid;
    const [people, minutes, days, rate] = fields.map(field => Number(field.value));
    const hours = people * minutes / 60 * days, monthly = hours * rate;
    put('value-hours', valid ? format(hours) : '—');
    put('value-monthly', valid ? format(monthly) : '—');
    byId('value-annual').replaceChildren(document.createTextNode(valid ? `${format(monthly * 12)} ` : '— '));
    const unit = document.createElement('small'); unit.textContent = 'บาท / ปี'; byId('value-annual').append(unit);
  }
  if (fields.every(Boolean)) {
    fields.forEach(field => field.addEventListener('input', renderValue));
    byId('value-reset').addEventListener('click', () => { fields.forEach((field, i) => {field.value = String(defaults[i]);}); renderValue(); });
    renderValue();
  }
})();
