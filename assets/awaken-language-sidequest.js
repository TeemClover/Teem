/* myClover · AWAKEN optional language side quest
   ซอสคือคำช่วยจำ แต่ Source / Markdown คือสะพานไปคุยกับโลกจริง
*/

function isBossPage() {
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

function injectStyles() {
  if (document.getElementById('awaken-language-sidequest-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-language-sidequest-style';
  style.textContent = `
    .language-sidequest{margin:50px 0 10px;padding:24px 22px;border:1px solid rgba(42,154,104,.44);border-radius:21px;background:radial-gradient(520px 220px at 100% 0%,rgba(42,154,104,.14),transparent 68%),rgba(255,255,255,.035)}
    .language-sidequest h2{margin-top:8px;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:clamp(23px,5vw,30px)!important;line-height:1.42!important}
    .language-sidequest>p{margin-top:15px;color:rgba(248,246,240,.86)!important;-webkit-text-fill-color:rgba(248,246,240,.86)!important;font-size:16px!important;line-height:1.85!important}
    .source-passport{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:20px 0 5px;padding:18px;border:1px solid rgba(217,185,103,.36);border-radius:16px;background:rgba(217,185,103,.075)}
    .source-passport div{min-width:0}.source-passport b{display:block;color:#f0d58e!important;-webkit-text-fill-color:#f0d58e!important;font-size:18px!important}.source-passport small{display:block;margin-top:3px;color:rgba(248,246,240,.66)!important;-webkit-text-fill-color:rgba(248,246,240,.66)!important;font-size:13px!important;line-height:1.6!important}.source-passport i{color:rgba(255,255,255,.35);font-style:normal;font-size:19px}
    .language-sidequest .boss-more{margin-top:13px}
    .world-key{display:inline-block;border:1px solid rgba(145,226,188,.35);border-radius:7px;padding:1px 7px;background:rgba(42,154,104,.1);color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}
    .keyword-list{display:grid;gap:10px;margin:16px 0}.keyword-row{display:grid;grid-template-columns:minmax(105px,.42fr) 1fr;gap:13px;padding:13px 14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.18)}.keyword-row b{color:#f0d58e!important;-webkit-text-fill-color:#f0d58e!important;font-size:14px!important}.keyword-row span{color:rgba(248,246,240,.8);font-size:14px;line-height:1.7}
    .relay-chat{display:grid;gap:8px;margin:16px 0}.relay-chat p{margin:0!important;padding:11px 13px;border-radius:13px;background:rgba(42,154,104,.09);border-left:3px solid #2a9a68;color:rgba(248,246,240,.88)!important;-webkit-text-fill-color:rgba(248,246,240,.88)!important;font-size:14px!important}.relay-chat p:nth-child(even){background:rgba(217,185,103,.075);border-left-color:#d9b967}
    .language-sample{display:grid;gap:10px;margin:16px 0}.language-sample article{padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.2)}.language-sample article.short{border-color:rgba(42,154,104,.42);background:rgba(42,154,104,.075)}.language-sample header{display:flex;justify-content:space-between;gap:12px;color:rgba(248,246,240,.55);font-size:11px;font-weight:750;letter-spacing:.08em}.language-sample article.short header{color:#91e2bc}.language-sample p{margin-top:7px!important;color:rgba(248,246,240,.86)!important;-webkit-text-fill-color:rgba(248,246,240,.86)!important;font-size:14px!important;line-height:1.7!important}
    .token-truth{margin-top:13px;padding:14px 15px;border:1px solid rgba(217,185,103,.3);border-radius:13px;background:rgba(217,185,103,.06);color:rgba(248,246,240,.76);font-size:13.5px;line-height:1.75}.token-truth strong{color:#fff!important;-webkit-text-fill-color:#fff!important}
    .rts-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.rts-card{padding:14px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(0,0,0,.18)}.rts-card b{display:block;color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-size:13px!important}.rts-card p{margin-top:4px!important;color:rgba(248,246,240,.78)!important;-webkit-text-fill-color:rgba(248,246,240,.78)!important;font-size:13.5px!important;line-height:1.65!important}
    .boss-verdict{margin-top:16px;padding-left:16px;border-left:3px solid #d9b967;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:650;line-height:1.8}
    @media(max-width:560px){.language-sidequest{margin-top:42px;padding:21px 17px}.source-passport{grid-template-columns:1fr;text-align:left}.source-passport i{rotate:90deg;justify-self:start}.keyword-row{grid-template-columns:1fr;gap:4px}.rts-grid{grid-template-columns:1fr}}
  `;
  document.head.append(style);
}

function makeAccordion(titleHTML, bodyHTML, extraClass = '') {
  const box = document.createElement('section');
  box.className = `boss-more${extraClass ? ` ${extraClass}` : ''}`;
  const id = `language-side-${Math.random().toString(36).slice(2, 9)}`;
  box.innerHTML = `
    <button class="boss-more-toggle" type="button" aria-expanded="false" aria-controls="${id}">
      <span>${titleHTML}</span><span class="boss-more-icon" aria-hidden="true">+</span>
    </button>
    <div class="boss-more-body" id="${id}" hidden>${bodyHTML}</div>`;
  const button = box.querySelector('button');
  const body = box.querySelector('.boss-more-body');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
    box.classList.toggle('is-open', open);
    body.hidden = !open;
    box.querySelector('.boss-more-icon').textContent = open ? '−' : '+';
    try { window.MC_ACT?.(open ? 'awaken-language-side-open' : 'awaken-language-side-close'); } catch { /* optional */ }
  });
  return box;
}

function countCharacters(root) {
  const samples = root.querySelectorAll('[data-language-count]');
  samples.forEach((sample) => {
    const text = sample.querySelector('p')?.textContent.trim() || '';
    const count = [...text.replace(/\s/g, '')].length;
    const label = sample.querySelector('[data-count-label]');
    if (label) label.textContent = `${count} ตัวอักษร`;
  });
  if (samples.length >= 2) {
    const longText = samples[0].querySelector('p')?.textContent.trim() || '';
    const shortText = samples[1].querySelector('p')?.textContent.trim() || '';
    const longCount = [...longText.replace(/\s/g, '')].length;
    const shortCount = [...shortText.replace(/\s/g, '')].length;
    const saved = longCount > 0 ? Math.round((1 - shortCount / longCount) * 100) : 0;
    const target = root.querySelector('[data-char-saving]');
    if (target) target.textContent = `ตัวอย่างนี้ข้อความสั้นลงประมาณ ${saved}% เมื่อทุกคนรู้ศัพท์ชุดเดียวกัน`;
  }
}

function buildSideQuest() {
  const notebook = document.querySelector('.notebook');
  if (!notebook || document.querySelector('.language-sidequest')) return;

  const section = document.createElement('section');
  section.className = 'language-sidequest';
  section.innerHTML = `
    <span class="tag">OPTIONAL SIDE QUEST · WORLD LANGUAGE</span>
    <h2>แล้วเรียนภาษานี้ไป คุยกับคนอื่นจะรู้เรื่องไหม?</h2>
    <p>รู้เรื่อง ถ้ามึงแยกให้ออกว่าอะไรคือ <strong>มุกช่วยจำ</strong> และอะไรคือ <strong>Keyword ที่ใช้ทำงานจริง</strong></p>
    <div class="source-passport">
      <div><b>ซอส · Sauce</b><small>ชื่อเล่นที่ทำให้คนไทยเห็นภาพและจำ Workflow ได้</small></div>
      <i>→</i>
      <div><b>Source</b><small>คำจริงที่ใช้คุยกับคนทำงานและ AI ได้ทั่วโลก</small></div>
    </div>
    <p class="boss-jab">คำว่า “ซอส” พามึงเข้าใจ แต่คำว่า <span class="world-key">Source</span> พามึงออกไปทำงานกับโลกจริง</p>`;

  const sourceBody = `
    <p>ถ้ามึงพูดว่า <span class="world-key">Source</span>, <span class="world-key">Source of Truth</span>, <span class="world-key">Master Brief</span>, <span class="world-key">Canon</span> หรือ <span class="world-key">Definition of Done</span> คนทำงานสาย AI, Content, Design และ Software จำนวนมากจะเข้าใจหน้าที่ของมันได้ทันที โดยไม่ต้องรู้จักมุกซอสของบ้านนี้ก่อน</p>
    <p>ส่วน <span class="world-key">.md</span> มีประโยชน์เพราะมันรักษาหัวข้อ ลำดับ รายการ กฎ ตัวอย่าง และข้อห้ามไว้ในข้อความธรรมดา มึงจึงสั่ง AI ว่า “แปล Source นี้เป็นญี่ปุ่น แต่รักษาโครงสร้างและคำที่ล็อกไว้” ได้ง่ายกว่าการเริ่มอธิบายระบบใหม่ทีละภาษา</p>
    <p><strong>มันไม่ได้ทำให้การแปลถูก 100%</strong> ชื่อเฉพาะ กฎหมาย ตัวเลข และความหมายละเอียดอ่อนยังต้องตรวจ แต่ขวดเดียวช่วยให้ทุกภาษาอ้างต้นทางเดียวกัน แทนการมีเอกสารไทย อังกฤษ จีน และญี่ปุ่นที่ค่อย ๆ กลายพันธุ์คนละทิศ</p>
    <p class="boss-verdict">ในมุมกู เทคนิคนี้มีมูลค่าระยะยาวมหาศาล เพราะมึงไม่ได้สะสมคำตอบจาก AI แต่มึงกำลังสะสม “ความรู้ที่เคลื่อนย้ายได้” เปลี่ยนโมเดล เปลี่ยนทีม เปลี่ยนภาษา หรือหายไป 2 ปี กลับมาก็ยังเปิด Source แล้วเดินต่อได้</p>`;

  const partyBody = `
    <p>Party ของบ้านนี้มีศัพท์สั้น ๆ ใช้รับส่งสถานะ เพราะพอทุกคนรู้ความหมายแล้ว การอธิบายยาวทุกครั้งคือการจ่ายเวลาและ Context ซ้ำ</p>
    <div class="keyword-list">
      <div class="keyword-row"><b>มานาหมด</b><span>โควตา เครดิต Context หรือ Token Budget ในช่วงนั้นหมด ต้องเติม รอ หรือลดงาน ทั้งนี้ต้องดูบริบทว่า “มานา” ชนิดไหนหมด</span></div>
      <div class="keyword-row"><b>สกิลติด cooldown</b><span>ฟีเจอร์หรือโควตายังใช้ซ้ำไม่ได้ เช่น ต้องรออีก 4 ชั่วโมงก่อนสร้างวิดีโอต่อ</span></div>
      <div class="keyword-row"><b>กำลังร่าย</b><span>AI กำลังประมวลผล สร้างไฟล์ Render วิดีโอ หรือรัน Agent อยู่ ยังไม่ควรโยนงานซ้ำให้ชนกัน</span></div>
      <div class="keyword-row"><b>เปิดแมพ</b><span>สำรวจข้อมูล ตลาด โครง repo หรือความเป็นไปได้ก่อนตัดสินใจ Build</span></div>
      <div class="keyword-row"><b>ส่งไม้ / Relay</b><span>ส่ง Output พร้อม Source และข้อสังเกตให้ AI อีกตัวรับช่วงต่อ โดยมนุษย์ยังเป็นคนเดินสาร</span></div>
    </div>
    <div class="relay-chat">
      <p>Claude กำลังร่ายหน้าเกม</p>
      <p>Gemini เปิดแมพตลาดไว้ก่อน</p>
      <p>กูเก็บ Canon และเตรียมภาษา</p>
      <p>มานาวิดีโอหมด สกิลติด cooldown 4 ชม. ไป Build หน้าอื่นก่อน</p>
    </div>
    <div class="language-sample">
      <article data-language-count><header><span>อธิบายใหม่ทุกครั้ง</span><span data-count-label></span></header><p>ขณะนี้ระบบสร้างวิดีโอยังไม่สามารถทำงานต่อได้ เนื่องจากโควตาการใช้งานในรอบเวลาปัจจุบันหมดลง และจะกลับมาใช้งานได้อีกครั้งในอีกประมาณ 4 ชั่วโมง ระหว่างนี้ให้เปลี่ยนไปพัฒนาหน้าเว็บไซต์ส่วนอื่นก่อน</p></article>
      <article class="short" data-language-count><header><span>Party รู้ศัพท์ร่วมกัน</span><span data-count-label></span></header><p>มานาวิดีโอหมด สกิลติด cooldown 4 ชม. ไป Build หน้าอื่นก่อน</p></article>
    </div>
    <div class="token-truth"><strong data-char-saving></strong><br>แต่จำนวน Token จริงขึ้นกับโมเดล ภาษา และ Tokenizer คำสั้นไม่ได้รับประกันว่าจะกิน Token น้อยตามเปอร์เซ็นต์เดียวกัน สิ่งที่ประหยัดแน่กว่าคือ <strong>ไม่ต้องส่งคำอธิบายและบริบทเดิมซ้ำ</strong> และไม่ต้องแก้ความเข้าใจผิดจากสถานะงานที่กำกวม</div>`;

  const rtsBody = `
    <p>ไอ้ทีมมองการสั่ง AI เหมือนเกม RTS เพราะมันไม่ได้ยืนคุมยูนิตตัวเดียว มันเปิดหลายหน้าต่าง จัดลำดับงาน ดูทรัพยากร รอ cooldown และส่งงานจากยูนิตหนึ่งไปอีกยูนิตหนึ่งตลอดเวลา</p>
    <div class="rts-grid">
      <div class="rts-card"><b>AI แต่ละตัว = UNIT</b><p>มี Class, Skill และจุดอ่อนต่างกัน ไม่มีตัวเดียวควรลงทุกสนาม</p></div>
      <div class="rts-card"><b>Token / Credit / เวลา = RESOURCE</b><p>มีจำกัด ใช้ผิดงานก็หมดก่อนถึง Objective</p></div>
      <div class="rts-card"><b>Queue = ลำดับการผลิต</b><p>ระหว่างตัวหนึ่งกำลังร่าย อีกตัวควรเปิดแมพหรือเตรียม Source ไม่ใช่นั่งจ้องแถบโหลด</p></div>
      <div class="rts-card"><b>Hallucination = FOG OF WAR</b><p>ยูนิตมองเห็นเท่าที่ Source เปิดให้เห็น พื้นที่ว่างมันอาจเดาแผนที่ขึ้นมาเอง</p></div>
      <div class="rts-card"><b>Workflow = BUILD ORDER</b><p>รู้ว่าอะไรต้องมาก่อนหลัง ช่วยไม่ให้ใช้ของแพงแก้ปัญหาที่ยังไม่ได้วางฐาน</p></div>
      <div class="rts-card"><b>มนุษย์ = COMMANDER</b><p>กำหนด Objective ตรวจแผนที่ และกด Final Call เพราะ AI ไม่รู้ว่าชัยชนะของชีวิตมึงคืออะไร</p></div>
    </div>
    <p class="boss-verdict">กูคิดว่ามุม RTS ของมันฉลาดมาก ตราบใดที่มันไม่ลืมว่า AI ไม่ใช่ยูนิต deterministic สั่งเหมือนเดิมแล้วไม่ได้ผลเหมือนเดิมทุกครั้ง แผนที่ร่วมคือ Source ส่วนการ Scout, Verify และ Save Game ยังเป็นหน้าที่มนุษย์</p>
    <p>พูดอีกแบบ: <strong>มันไม่ได้บริหาร AI หลายตัว มันบริหารงาน 1 งานผ่านยูนิตหลาย Class</strong> นี่ต่างหากที่ทำให้ Party เร็ว ไม่ใช่จำนวนหน้าต่างที่เปิดค้างไว้</p>`;

  section.append(
    makeAccordion('🌍 เปิดดู · Source และ .md พามึงคุยกับโลกยังไง', sourceBody),
    makeAccordion('⚔️ เปิดดู · ภาษาที่ Party ใช้รับส่งงาน', partyBody),
    makeAccordion('🛰️ เปิดดู · ไอ้ทีมมอง AI เป็นเกม RTS กูคิดยังไง', rtsBody)
  );

  notebook.before(section);
  countCharacters(section);
}

function boot() {
  if (!isBossPage() || document.documentElement.dataset.languageSidequest === '1') return;
  document.documentElement.dataset.languageSidequest = '1';
  injectStyles();
  buildSideQuest();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
