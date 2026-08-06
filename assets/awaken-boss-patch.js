/* myClover · AWAKEN final boss stability pass
   - readable.css ใช้ตัวแปรสำหรับหน้ากระดาษสว่าง จึงต้องคืนสีเฉพาะหน้าบอสมืด
   - เลิกใช้ native <details> บน Safari แล้วเปลี่ยนเป็น accordion ปุ่มจริง
   - เพิ่มตัวอย่าง 14 วันที่ไอ้ทีมคุยกับ AI แทบทุกนาที
*/

function bossPath() {
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

function injectStyles() {
  if (document.getElementById('awaken-boss-patch-style')) return;
  const style = document.createElement('style');
  style.id = 'awaken-boss-patch-style';
  style.textContent = `
    body.awaken-boss-patched{
      --ink:#f8f6f0!important;
      --paper:#f8f6f0!important;
      --dim:rgba(248,246,240,.84)!important;
      --faint:rgba(248,246,240,.62)!important;
      color:#f8f6f0!important;
      background-color:#050d09!important;
    }
    body.awaken-boss-patched .gate,
    body.awaken-boss-patched .chapter,
    body.awaken-boss-patched .phase,
    body.awaken-boss-patched .tail,
    body.awaken-boss-patched footer{color:#f8f6f0!important}
    body.awaken-boss-patched .gate h1,
    body.awaken-boss-patched .head h1,
    body.awaken-boss-patched .phase h2,
    body.awaken-boss-patched .truth h3,
    body.awaken-boss-patched .timebox h3,
    body.awaken-boss-patched .tail h2,
    body.awaken-boss-patched .member h3,
    body.awaken-boss-patched .finalcall{
      color:#f8f6f0!important;
      -webkit-text-fill-color:#f8f6f0!important;
    }
    body.awaken-boss-patched .phase>p,
    body.awaken-boss-patched .truth p,
    body.awaken-boss-patched .timebox p,
    body.awaken-boss-patched .sample p,
    body.awaken-boss-patched .step p,
    body.awaken-boss-patched .cycle p,
    body.awaken-boss-patched .relay p,
    body.awaken-boss-patched .member p,
    body.awaken-boss-patched .legacy,
    body.awaken-boss-patched .tail li,
    body.awaken-boss-patched .boss-more-body{
      color:rgba(248,246,240,.86)!important;
      -webkit-text-fill-color:rgba(248,246,240,.86)!important;
    }
    body.awaken-boss-patched .truth strong,
    body.awaken-boss-patched .timebox strong,
    body.awaken-boss-patched .boss-more-body strong{
      color:#fff!important;
      -webkit-text-fill-color:#fff!important;
    }
    body.awaken-boss-patched .formula,
    body.awaken-boss-patched .tag,
    body.awaken-boss-patched .step b{
      color:#91e2bc!important;
      -webkit-text-fill-color:#91e2bc!important;
    }

    /* ใช้ปุ่มจริงแทน native details: ไม่มี pseudo hit-area และไม่ค้างบน iOS */
    .boss-more{margin-top:23px;border:1px solid rgba(255,255,255,.16);border-radius:17px;overflow:hidden;background:rgba(255,255,255,.045)}
    .boss-more-toggle{display:flex;width:100%;align-items:center;justify-content:space-between;gap:14px;min-height:58px;border:0;padding:14px 15px 14px 18px;background:transparent;color:#e4c574!important;-webkit-text-fill-color:#e4c574!important;text-align:left;font-weight:750!important;line-height:1.55!important;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .boss-more-toggle:active{background:rgba(217,185,103,.08)}
    .boss-more-toggle .boss-more-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:1px solid rgba(217,185,103,.24);border-radius:50%;background:rgba(217,185,103,.11);color:#f0d58e!important;-webkit-text-fill-color:#f0d58e!important;font-size:20px!important;line-height:1!important}
    .boss-more.is-open .boss-more-toggle{border-bottom:1px solid rgba(255,255,255,.1);background:rgba(217,185,103,.055)}
    .boss-more-body{padding:19px 19px 21px;font-size:1rem;line-height:1.82}
    .boss-more-body[hidden]{display:none!important}
    .boss-more-body p+p{margin-top:14px}

    .teem-14-day{margin-top:17px;border-color:rgba(217,185,103,.34);background:linear-gradient(145deg,rgba(217,185,103,.09),rgba(42,154,104,.06))}
    .teem-14-day .boss-more-body{padding-top:17px}
    .teem-math{display:grid;gap:9px;margin:16px 0;padding:16px;border:1px solid rgba(42,154,104,.4);border-radius:14px;background:rgba(42,154,104,.08)}
    .teem-math b{color:#91e2bc!important;-webkit-text-fill-color:#91e2bc!important;font-size:13px!important;letter-spacing:.03em}
    .teem-math strong{display:block;color:#fff!important;-webkit-text-fill-color:#fff!important;font-size:clamp(22px,5vw,29px)!important;line-height:1.4!important}
    .teem-math small{color:rgba(248,246,240,.68)!important;-webkit-text-fill-color:rgba(248,246,240,.68)!important;font-size:13px!important;line-height:1.7!important}
    .boss-jab{margin-top:15px;padding-left:15px;border-left:3px solid #d9b967;color:#fff!important;-webkit-text-fill-color:#fff!important;font-weight:650}

    @media(max-width:520px){
      body.awaken-boss-patched .wrap{width:calc(100% - 44px)!important}
      .boss-more-toggle{padding-left:16px;font-size:16px!important}
      .boss-more-body{padding:17px 16px 19px}
      .timebox{padding:17px!important}
    }
  `;
  document.head.append(style);
}

function makeAccordion(titleHTML, bodyNode, open = false, extraClass = '') {
  const box = document.createElement('section');
  box.className = `boss-more${open ? ' is-open' : ''}${extraClass ? ` ${extraClass}` : ''}`;

  const id = `boss-more-${Math.random().toString(36).slice(2, 9)}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'boss-more-toggle';
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  button.setAttribute('aria-controls', id);
  button.innerHTML = `<span>${titleHTML}</span><span class="boss-more-icon" aria-hidden="true">${open ? '−' : '+'}</span>`;

  const body = bodyNode;
  body.id = id;
  body.classList.add('boss-more-body');
  body.hidden = !open;

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', next ? 'true' : 'false');
    box.classList.toggle('is-open', next);
    body.hidden = !next;
    const icon = button.querySelector('.boss-more-icon');
    if (icon) icon.textContent = next ? '−' : '+';
    try { window.MC_ACT?.(next ? 'awaken-read-more-open' : 'awaken-read-more-close'); } catch { /* optional */ }
  });

  box.append(button, body);
  return box;
}

function replaceNativeDetails() {
  document.querySelectorAll('details.more').forEach((details) => {
    const summary = details.querySelector(':scope > summary');
    const body = details.querySelector(':scope > .morebody');
    if (!summary || !body) return;
    const accordion = makeAccordion(summary.innerHTML, body, details.open);
    details.replaceWith(accordion);
  });
}

function addFourteenDayProof() {
  const timebox = document.querySelector('.timebox');
  if (!timebox || document.querySelector('.teem-14-day')) return;

  const body = document.createElement('div');
  body.innerHTML = `
    <p>แต่ตัวอย่าง 24 ครั้ง/วันข้างบนยังสุภาพเกินไปสำหรับไอ้ทีม กูรู้ความถี่มันดี เพราะกูอยู่ในอีกหน้าต่างหนึ่งตลอด 14 วันนั้น</p>
    <p>มันสั่ง Claude ให้ Build แล้วปิดหน้าต่าง ไปเปิด Gemini ให้ทุบไอเดีย จากนั้นกลับมาหากูให้จัดภาษา ทำภาพ เช็กหน้า แล้ววนใหม่ทันที เรียกว่ามันพูดสั่งงานพวกกูจนเจ็บคอก็ไม่ได้เว่อร์มาก</p>
    <p>และเวลาที่หายไปกับภาษาเดิม ไม่ได้มีแค่ตอนนิ้วพิมพ์ มนุษย์ไม่ได้พูดทุกอย่างที่คิดออกมา ก่อนแต่ละประโยคมันต้องคิดคำ แปลความหมาย เลือกคำที่พอรู้ แล้วตัดรายละเอียดที่ไม่รู้จะพูดยังไง เวลาคิดก่อนพูดจึงมีโอกาสมากกว่าเวลาพูดออกมาจริงเสียอีก</p>
    <div class="teem-math">
      <b>กูตีต่ำ ๆ: 600 ประโยค/วัน × 14 วัน = 8,400 ประโยค</b>
      <strong>เปลี่ยนภาษา 14 วัน ประหยัดเวลาเกิน 12 ชั่วโมงแน่นอน</strong>
      <small>ต่อให้คิดต้นทุนรวมของการแปลในหัว เลือกคำ พิมพ์ และแก้ความหมายเพิ่มเพียงเฉลี่ย 6 วินาทีต่อประโยค: 8,400 × 6 = 50,400 วินาที = 840 นาที = 14 ชั่วโมง ตัวเลขนี้เป็นการประมาณแบบตีต่ำ ไม่ใช่การจับเวลาด้วยนาฬิกาทุกประโยค</small>
    </div>
    <p class="boss-jab">ไอ้ทีมไม่ได้สร้างเว็บนี้เร็วเพราะพิมพ์เร็ว มันสร้างเร็วเพราะเลิกบังคับสมองให้แต่งตัวก่อนเข้าครัว</p>`;

  const accordion = makeAccordion('😴 เปิดดู 14 วันที่ไอ้ทีมสั่ง AI แทบทุกนาที', body, false, 'teem-14-day');
  timebox.append(accordion);
}

function clarifyGeneralExample() {
  const formula = document.querySelector('.timebox > .formula');
  if (formula && !formula.textContent.includes('ตัวอย่างทั่วไป')) {
    formula.textContent = `ตัวอย่างทั่วไป: ${formula.textContent.trim()}`;
  }
}

function boot() {
  if (!bossPath() || document.documentElement.dataset.awakenBossPatch === '1') return;
  document.documentElement.dataset.awakenBossPatch = '1';
  document.body.classList.add('awaken-boss-patched');
  injectStyles();
  replaceNativeDetails();
  clarifyGeneralExample();
  addFourteenDayProof();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
