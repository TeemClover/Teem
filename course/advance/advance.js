/* Local illustration with fictional business data. No AI or remote repository is connected. */
(() => {
  'use strict';
  const update = document.getElementById('demo-update');
  const refresh = document.getElementById('demo-refresh');
  const reset = document.getElementById('demo-reset');
  if (!update || !refresh || !reset) return;
  const versions = { 1: { label: 'v1', days: 2 }, 2: { label: 'v2', days: 3 } };
  let sourceVersion = 1;
  let teamVersion = 1;
  function put(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
  function render() {
    const source = versions[sourceVersion];
    const team = versions[teamVersion];
    put('example-source-version', `${source.label} · เวลาจัดเตรียมสินค้า`);
    put('example-fact', `${source.days} วันทำการ`);
    put('example-team-a', `เครื่อง A · ทีมบริการ · SOURCE ${team.label}`);
    put('example-team-b', `เครื่อง B · ทีมคอนเทนต์ · SOURCE ${team.label}`);
    put('example-reply', `หลังยืนยันคำสั่งซื้อ เราใช้เวลาจัดเตรียมสินค้า ${team.days} วันทำการ ก่อนส่งต่อให้ผู้ขนส่งค่ะ`);
    put('example-brief', `ระบุเวลาจัดเตรียมสินค้า ${team.days} วันทำการหลังยืนยันคำสั่งซื้อ โดยแยกจากระยะเวลาขนส่ง`);
    const current = sourceVersion === teamVersion;
    put('demo-status', !current
      ? 'Source เปลี่ยนเป็น v2 แล้ว แต่สองเครื่องยังใช้ v1 จนกว่าจะรับและอ่านฉบับใหม่'
      : sourceVersion === 1
        ? 'ทั้งสองเครื่องใช้ Source v1 อยู่'
        : 'ทั้งสองเครื่องรับและอ่าน v2 แล้ว ข้อเท็จจริงในผลงานจึงเปลี่ยนเป็น 3 วันทำการ');
    update.disabled = sourceVersion === 2;
    refresh.disabled = current;
  }
  update.addEventListener('click', () => { sourceVersion = 2; render(); });
  refresh.addEventListener('click', () => { teamVersion = sourceVersion; render(); });
  reset.addEventListener('click', () => { sourceVersion = 1; teamVersion = 1; render(); });
  render();
})();
