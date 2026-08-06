/* myClover · AWAKEN Boss Stage refresh
   ห้องเรียนใช้ภาษาครัวเพื่อให้เริ่มง่าย แต่ด่านบอสกลับมาพูดภาษาระบบและเกมเต็มตัว
*/

function setMeta(name, value) {
  const node = document.querySelector(`meta[name="${name}"]`);
  if (node) node.setAttribute('content', value);
}

function setProperty(property, value) {
  const node = document.querySelector(`meta[property="${property}"]`);
  if (node) node.setAttribute('content', value);
}

function bootBossRefresh() {
  if (!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;
  if (document.documentElement.dataset.bossRefresh === '1') return;
  document.documentElement.dataset.bossRefresh = '1';

  document.title = 'บทที่ 7 — ความเงียบ และ ตัวอักษร | AWAKEN · myClover';
  setMeta('description', 'Boss Stage ของ AI ใส่ซอส — เฉลยวงจร SOURCE → TASTE → COOK → MULTIPLY → SEASON → SERVE และคืนการตัดสินใจสุดท้ายให้มนุษย์');
  setProperty('og:description', 'มึงไม่ได้เรียน AI 6 เครื่องมือ มึงเพิ่งสร้างระบบ 1 ระบบที่ย้ายไปใช้กับงานอะไรก็ได้');

  const style = document.createElement('style');
  style.textContent = `
    .boss-voice{margin-top:25px;padding:20px 21px;border:1px solid rgb(190 148 66/.5);border-radius:17px;background:linear-gradient(145deg,rgb(190 148 66/.13),rgb(255 255 255/.025));font-size:17px;line-height:2;color:rgb(255 255 255/.88)}
    .boss-voice strong{color:rgb(var(--gold))}
    .boss-voice .sig{display:block;margin-top:10px;color:rgb(255 255 255/.45);font-family:"Bai Jamjuree";font-size:11px;font-weight:700;letter-spacing:.16em}
    .boss-cycle-note{margin-top:17px;padding-left:16px;border-left:3px solid rgb(var(--gold));color:rgb(255 255 255/.76);font-size:15px;line-height:1.9}
    .tail .boss-last{margin-top:25px;padding:21px;border:1px solid rgb(190 148 66/.48);border-radius:17px;background:rgb(190 148 66/.08);font-size:17px;line-height:2;color:rgb(255 255 255/.86)}
    .tail .boss-last strong{color:rgb(var(--gold))}
  `;
  document.head.append(style);

  const gate = document.getElementById('gate');
  const gateTitle = gate?.querySelector('h1');
  const gateBody = gate?.querySelector('.enc-body');
  const enter = document.getElementById('enterBtn');
  if (gateTitle) gateTitle.textContent = 'ด่านนี้ไม่มีอะไรให้มึงทำ';
  if (gateBody) gateBody.innerHTML = `
    <p>ไม่มีเชฟ ไม่มีขวด<br>ไม่มี Prompt ให้ก๊อป<br>และไม่มีปุ่มลัดให้กดผ่าน</p>
    <p style="margin-top:18px"><em>กูไม่ต้องการให้มึงสร้างอะไรเพิ่มในด่านนี้</em></p>
    <p style="margin-top:18px">แค่หาที่เงียบ ๆ แล้วอ่านให้จบ<br>เพราะสิ่งที่ต้องอัปเกรดคราวนี้ ไม่ใช่เครื่องมือ</p>`;
  if (enter) enter.textContent = 'เข้าด่านบอส →';

  const headerLead = document.querySelector('.ch-head .lead');
  if (headerLead) headerLead.textContent = 'ด่านนี้ไม่มีของแจก มีเพียงระบบที่กูจะเปิดให้มึงเห็นทั้งหมด';

  const phase2 = document.querySelector('.phase[data-phase="2"]');
  if (phase2) {
    const h2 = phase2.querySelector('h2');
    if (h2) h2.textContent = '6 บทที่ผ่านมา คือระบบเดียวกัน';

    const direct = [...phase2.querySelectorAll(':scope > p:not(.clear)')];
    if (direct[0]) direct[0].textContent = 'ชื่อบทอาจฟังเหมือนกำลังทำคนละอย่าง แต่ทุกบทวาง Mechanic 1 ชิ้นลงในวงจรงานเดียวกัน';

    const loop = phase2.querySelector('.loop');
    if (loop) loop.innerHTML = `
      <div class="st"><b class="mono"><span class="lv">LV.1</span>SOURCE</b><p><strong>รวบรวมสิ่งที่รู้ให้เป็นฐานกลาง</strong><br>เก็บเป้าหมาย ข้อเท็จจริง กติกา สิ่งที่ล็อก ข้อห้าม และเรื่องที่ยังไม่รู้ไว้ใน Source เดียว แทนการปล่อยให้มันกระจายอยู่หลายแชต</p></div>
      <div class="st"><b class="mono"><span class="lv">LV.2</span>TASTE</b><p><strong>ตรวจว่า AI เข้าใจโลกเดียวกับมึงไหม</strong><br>ให้มันสรุป ทดลองสร้าง และชนกับ Reference จริง ถ้าผลลัพธ์หลุด อย่าด่าปลายทางอย่างเดียว กลับไปแก้สิ่งที่มันอ่าน</p></div>
      <div class="st"><b class="mono"><span class="lv">LV.3</span>COOK</b><p><strong>ทำ Version แรกให้เกิดขึ้น</strong><br>ความคิดที่ยังอยู่ในหัวไม่มีอะไรให้ทดสอบ Build ของจริงออกมาก่อน แล้วใช้ข้อผิดพลาดเป็นข้อมูล ไม่ใช่เป็นคำตัดสินว่ามึงไม่มีพรสวรรค์</p></div>
      <div class="st"><b class="mono"><span class="lv">LV.4</span>MULTIPLY</b><p><strong>ทำครั้งเดียว แล้วแตกไปหลาย Output</strong><br>ภาพ สไลด์ เสียง เว็บ คู่มือ และคอนเทนต์ไม่ควรเริ่มจากศูนย์คนละรอบ มันควรเกิดจาก Source ที่ผ่านการใช้จริงชุดเดียวกัน</p></div>
      <div class="st"><b class="mono"><span class="lv">LV.5</span>SEASON</b><p><strong>จัด Loadout ให้ถูกกับงาน</strong><br>Prompt, Style, Checklist, Role และเกณฑ์ตรวจคือเครื่องปรุง ไม่ใช่พระเอก หยิบเท่าที่งานต้องใช้ ไม่ต้องเท Inventory ทั้งหมดลงสนาม</p></div>
      <div class="st"><b class="mono"><span class="lv">LV.6</span>SERVE</b><p><strong>ส่งของออกจากแชตให้คนอื่นใช้</strong><br>งานยังไม่จบเพราะ AI บอกว่าเสร็จ มันจบเมื่อคนอื่นเปิด ใช้ เข้าใจ ส่งต่อ และส่ง Feedback กลับมาได้</p></div>`;

    const cycle = phase2.querySelector('.cycle');
    if (cycle) {
      const line = cycle.querySelector('.cycleline');
      if (line) line.innerHTML = '<span>SOURCE</span><span>TASTE</span><span>COOK</span><span>MULTIPLY</span><span>SEASON</span><span>SERVE</span>';
      const title = cycle.querySelector('h3');
      const copy = cycle.querySelector('p');
      if (title) title.textContent = 'นี่ไม่ใช่ Skill Tree ที่อัปครบแล้วทิ้ง';
      if (copy) copy.textContent = 'งานที่ SERVE ออกไปจะเจอคนจริง เกิด Feedback จริง แล้วกลับมาอัปเดต SOURCE ก่อนเริ่มรอบใหม่ วงจรนี้จึงโตตามประสบการณ์ของมึง ไม่ได้จบพร้อมบทเรียน';
      const note = document.createElement('p');
      note.className = 'boss-cycle-note';
      note.textContent = 'SERVE → FEEDBACK → UPDATE SOURCE → เริ่มรอบใหม่';
      cycle.append(note);
    }

    const reveal = phase2.querySelector('.reveal-box');
    if (reveal) reveal.innerHTML = `
      <span class="tag mono">SYSTEM REVEALED</span>
      <h3 class="disp">กูไม่ได้อยากให้มึงจำศัพท์ 6 คำ</h3>
      <p>กูอยากให้มึงเปิดงานตัวเองขึ้นมา แล้วมองออกทันทีว่ามันติดอยู่ตรงไหน</p>
      <p><span class="kbd">SOURCE</span> ไม่ชัด — AI ต้องเดา<br>
         <span class="kbd">TASTE</span> ไม่พอ — มึงไม่รู้ว่ามันเข้าใจผิด<br>
         <span class="kbd">COOK</span> ไม่เกิด — ไม่มี Version จริงให้แก้<br>
         <span class="kbd">MULTIPLY</span> ไม่มี — ทุกชิ้นเริ่มจากศูนย์<br>
         <span class="kbd">SEASON</span> มั่ว — ผลลัพธ์ดีบ้างพังบ้าง<br>
         <span class="kbd">SERVE</span> ไม่ถึง — งานตายอยู่ในแชต</p>
      <p><strong>พอรู้ว่าติดด่านไหน มึงไม่ต้องรอให้ใครมาสอนปุ่มต่อไป</strong><br>มึงแค่หยิบเครื่องมือที่เหมาะ แล้วแก้ Mechanic ตรงนั้น</p>
      <p class="quote" style="margin-top:16px">ปุ่มเปลี่ยนได้ โมเดลเปลี่ยนได้<br>แต่คนที่มองเห็นระบบ จะไม่ต้องเริ่มชีวิตใหม่ทุกครั้งที่แอปอัปเดต</p>`;

    if (direct[1]) direct[1].textContent = 'เมื่อระบบเปลี่ยน อย่าถามก่อนว่าปุ่มอยู่ไหน';
    if (direct[2]) direct[2].innerHTML = '<strong>ถามว่างานมึงติดอยู่ด่านไหน</strong>';
    const beat = phase2.querySelector(':scope > .beat');
    if (beat) beat.innerHTML = `
      <span>ยังไม่รู้ว่ามีอะไรและกำลังทำอะไร — กลับไป SOURCE</span>
      <span>AI ทำออกมาแล้ว แต่ไม่ใช่รสเดียวกับมึง — ไป TASTE</span>
      <span>ยังไม่มีของจริงให้จับ — COOK Version แรกออกมา</span>
      <span>ทำซ้ำทีละชิ้นจนหมดแรง — สร้าง MULTIPLY</span>
      <span>ผลลัพธ์แกว่งเพราะใช้เครื่องมือมั่ว — จัด SEASON เป็น Loadout</span>
      <span>งานยังอยู่กับคนทำคนเดียว — ทำให้ SERVE ได้</span>`;
    if (direct[3]) direct[3].textContent = 'ชื่อโมเดลเปลี่ยนได้ หน้าตาโปรแกรมเปลี่ยนได้ และตัวที่เก่งที่สุดวันนี้อาจไม่ใช่ตัวเดิมในเดือนหน้า';
    if (direct[4]) direct[4].innerHTML = '<strong>แต่คนที่มองเห็นวงจร จะจับเครื่องมือใหม่ใส่ในด่านเดิม และไปต่อได้ทันที</strong>';
  }

  const phase3 = document.querySelector('.phase[data-phase="3"]');
  if (phase3) {
    const h2 = phase3.querySelector('h2');
    if (h2) h2.insertAdjacentElement('afterend', Object.assign(document.createElement('div'), {
      className: 'boss-voice',
      innerHTML: 'กูใช้ภาษาเกมในด่านนี้ ไม่ใช่เพราะอยากให้มึงพูดเหมือนเกมเมอร์ แต่เพราะเกมดีไซน์เก่งมากเรื่อง <strong>บีบระบบยาว ๆ ให้กลายเป็นคำสั้นที่เรียกใช้ซ้ำได้</strong><span class="sig">GM NOTE</span>'
    }));
  }

  const tail = document.querySelector('.tail');
  if (tail) {
    const ps = [...tail.querySelectorAll(':scope > p')];
    if (ps[0]) ps[0].textContent = 'กูไม่ได้พามึงมาเรียน AI 6 เครื่องมือ';
    if (ps[1]) ps[1].textContent = 'กูพามึงสร้างระบบ 1 ระบบที่ย้ายไปใช้กับงานอะไรก็ได้';
    if (ps[2]) ps[2].textContent = 'มึงไม่ได้จำ Prompt วิเศษ มึงเรียนรู้ว่า';
    const list = tail.querySelector(':scope > ul');
    if (list) list.innerHTML = `
      <li>SOURCE — รวมสิ่งที่รู้และสิ่งที่ล็อกเป็นฐานกลาง</li>
      <li>TASTE — ตรวจว่า AI เข้าใจตรงกับมึงหรือไม่</li>
      <li>COOK — ทำ Version แรกให้เกิดขึ้น</li>
      <li>MULTIPLY — ใช้ Source เดียวแตกงานหลายรูปแบบ</li>
      <li>SEASON — จัดเครื่องมือและเกณฑ์ตรวจให้ถูกงาน</li>
      <li>SERVE — ส่งของออกไปให้คนอื่นใช้และส่ง Feedback กลับมา</li>`;
    if (ps[3]) ps[3].textContent = 'ระบบนี้ไม่ได้อยู่ใน ChatGPT, Claude, Gemini หรือเว็บไซต์นี้';
    if (ps[4]) ps[4].innerHTML = '<strong>ตอนนี้มันอยู่ในวิธีที่มึงมองงานแล้ว</strong>';

    const last = document.createElement('div');
    last.className = 'boss-last';
    last.innerHTML = 'ออกจากหน้านี้แล้ว อย่าถามก่อนว่า <strong>AI ตัวไหนดีที่สุด</strong><br>ถามว่างานมึงติดด่านไหน แล้วหยิบตัวที่เหมาะลงปาร์ตี้<br><br>AI ช่วยคิด ช่วยสร้าง ช่วยตรวจ และช่วยทำซ้ำได้ แต่ <strong>Final Call ยังเป็นของมึง</strong>';
    const reveal = tail.querySelector('.reveal-box');
    if (reveal) reveal.insertAdjacentElement('beforebegin', last);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootBossRefresh, { once: true });
else bootBossRefresh();
