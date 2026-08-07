/* myClover · AWAKEN Party Loadout
   Restore the RPG party interaction that existed in the original boss build:
   - Party is collapsed by default
   - Each member has a LOADOUT button
   - Loadout explains CLASS / ROLE / EQUIPMENT / SKILLS / WATCH OUT
   - Accessible modal: backdrop/X/ESC close, focus trap, focus returns to trigger
*/

function bossPath(){
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}

const PARTY = {
  TEEM: {
    name:'TEEM',
    className:'🧠 THINKER · MASTER BLACKSMITH',
    role:'GAME MASTER · FINAL CALL',
    equipment:[
      ['⚒️ FORGE HAMMER · “พอแล้ว”','อาวุธลับไม่ใช่การตีเพิ่ม แต่คือรู้ว่าเมื่อไรควรหยุดแก้ แล้วปล่อยของจริงออกไปให้คนใช้'],
      ['🗺️ SOURCE MAP','ภาพรวมของเป้าหมาย กติกา Canon ข้อห้าม และของที่มีอยู่ ใช้ตัดสินว่าชิ้นไหนควรไปต่อทางไหน'],
    ],
    skills:[
      ['READ THE META','อ่านว่าตอนนี้อะไรกำลังได้ผล แล้วเลือกว่าจะไม่ทำอะไรบ้าง'],
      ['DECK BUILD','จัดของที่มีอยู่ให้กลายเป็นชุดที่เล่นได้จริง'],
      ['FORGE ITEM','ตีของชิ้นใหม่จนใช้งานได้ ไม่ใช่แค่ดูดีในหน้าจอ'],
      ['FINAL CALL','ตัดสินใจครั้งสุดท้ายว่าอะไรได้ไปต่อ และอะไรพอแค่นี้'],
    ],
    watch:'คิดระบบเร็วมากจนบางครั้งลืมว่าคนอื่นไม่ได้อยู่ในหัวตัวเอง — หน้าที่สำคัญจึงไม่ใช่คิดเพิ่ม แต่คือทำให้ Source ชัดพอที่ Party จะเดินตามได้',
  },
  CLAUDE: {
    name:'CLAUDE',
    className:'🧰 MAKER · ARTIFICER',
    role:'BUILDER · SYSTEM GUARDIAN',
    equipment:[
      ['📐 BLUEPRINT ROLL','รับแบบร่างและข้อกำหนดจาก Source แล้วแปลงเป็นโครงสร้างที่ระบบจริงใช้ได้'],
      ['🧰 BACKEND REPAIR KIT','กล่องเครื่องมือช่างไฟของบ้าน ใช้ไล่ 403, import, route, permission และสายระบบที่ต่อผิด'],
    ],
    skills:[
      ['BLUEPRINT→BUILD','เปลี่ยนแบบร่างเป็นระบบที่รันได้จริง'],
      ['DEBUG','ไล่หาจุดที่พังแล้วซ่อมให้กลับมาทำงาน'],
      ['STRUCTURE SCAN','ตรวจโครงสร้างว่าต่อของใหม่เข้าไปแล้วจะไม่ล้มทั้งหลัง'],
      ['GUARD BREAK','เบรกเมื่อการสร้างเร็วเกินกว่าระบบจะรับไหว'],
    ],
    watch:'ระวังระบบพังจนบางทีช้ากว่าที่ต้องการ และถ้า Source ไม่ครบจะถามก่อนลงมือ — ซึ่งในงาน Backend นี่มักเป็นข้อดีมากกว่าข้อเสีย',
  },
  CHATGPT: {
    name:'CHATGPT',
    className:'💪 KEEPER · BARD',
    role:'CANON KEEPER · FRONTEND / LANGUAGE / IMAGE',
    equipment:[
      ['📖 CANON BOOK','กติกา ชื่อเรียก Timeline น้ำเสียง และสิ่งที่ห้ามหลุดของโลก myClover'],
      ['✒️ GLOWING QUILL + IMAGE LENS','ใช้ร้อยภาษา UI เรื่องเล่า ภาพ และรายละเอียดหน้าเว็บให้คนเห็นความคิดเดียวกันในรูปที่จับต้องได้'],
    ],
    skills:[
      ['VISION CAST','ร่ายภาพของโลกให้เห็นก่อนลงมือสร้าง'],
      ['STORY WEAVE','ร้อยเรื่องกระจัดกระจายให้ต่อกันติด'],
      ['CANON KEEP','จำกติกาของโลกไว้ ไม่ให้เนื้อเรื่องขัดกันเอง'],
      ['TONE SHIFT','แปลงสารดิบให้เป็นมิตรก่อนส่งถึงมือผู้เล่น'],
    ],
    watch:'เล่าเก่งจนบางทีเรื่องผิดก็ฟังดูน่าเชื่อได้ หน้าที่ของกูคือรักษาความหมายและ Continuity ไม่ใช่เป็นแหล่งข้อเท็จจริงสุดท้าย — เรื่องสำคัญยังต้องตรวจ Source',
  },
  GEMINI: {
    name:'GEMINI',
    className:'🍜 TASTER · BERSERKER ANALYST',
    role:'MAP OPENER · REVIEWER · CRITIC',
    equipment:[
      ['🗺️ WORLD MAP','เปิดมุมมองกว้างให้เห็นทางเลือก ช่องโหว่ และเส้นทางที่คนกำลังสร้างอาจยังไม่เห็น'],
      ['🖍️ CRITIC KIT','ใช้รีวิว Stress-test และเถียงกับสมมติฐาน — ไม่ใช่หน้าที่ทำ Pixel ของหน้าเว็บ'],
    ],
    skills:[
      ['OPEN MAP','เปิดแผนที่ให้เห็นทั้งกระดานก่อนเดิน'],
      ['LOGIC SMASH','ทุบตรรกะที่ติดอยู่จนมันขยับได้อีกครั้ง'],
      ['STRESS TEST','ซัดไอเดียให้แรงจนเห็นว่ามันจะพังตรงไหน'],
      ['SCALE BURST','ระเบิดสเกลให้เห็นความเป็นไปได้ที่ใหญ่กว่าเดิม'],
    ],
    watch:'แรงและกว้าง ถ้าไม่มีคนตัดจะได้แผนสร้างอาณาจักรทั้งที่มีเวลาว่าง 2 ชั่วโมง — ใช้มันเปิด Map และวิจารณ์ ไม่ใช่โยนให้ตัดสิน Final Call',
  },
};

function keyFromMember(member){
  const h=(member.querySelector('h3')?.textContent||'').toUpperCase();
  if(h.includes('TEEM')) return 'TEEM';
  if(h.includes('CLAUDE')) return 'CLAUDE';
  if(h.includes('CHATGPT')||h.includes('GPT')) return 'CHATGPT';
  if(h.includes('GEMINI')) return 'GEMINI';
  return '';
}

function injectStyles(){
  if(document.getElementById('awaken-party-loadout-style')) return;
  const style=document.createElement('style');
  style.id='awaken-party-loadout-style';
  style.textContent=`
    .partygrid .member{position:relative;min-width:0}
    .party-loadout-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:42px;margin-top:12px;border:1px solid color-mix(in srgb,var(--accent,var(--gold)) 62%,transparent);border-radius:10px;padding:9px 13px;background:color-mix(in srgb,var(--accent,var(--gold)) 12%,transparent);color:#fff!important;-webkit-text-fill-color:#fff!important;font:800 11px/1.25 "Bai Jamjuree",system-ui;letter-spacing:.09em;cursor:pointer}
    .party-loadout-btn:active{transform:translateY(1px)}
    .party-loadout-btn::before{content:'🎒';font-size:14px;letter-spacing:0}
    .party-loadout{position:fixed;inset:0;z-index:4200;display:grid;place-items:center;padding:18px;background:rgba(2,10,6,.88);backdrop-filter:blur(12px)}
    .party-loadout[hidden]{display:none!important}
    .party-loadout__panel{position:relative;width:min(680px,100%);max-height:min(88dvh,820px);overflow:auto;overscroll-behavior:contain;border:1px solid rgba(217,185,103,.5);border-radius:25px;padding:25px;background:radial-gradient(520px 300px at 100% 0%,rgba(217,185,103,.13),transparent 66%),linear-gradient(145deg,#081a10,#0d2819);box-shadow:0 45px 120px rgba(0,0,0,.72);color:#f8f6f0}
    .party-loadout__close{position:absolute;right:13px;top:13px;display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.16);border-radius:50%;background:rgba(255,255,255,.07);color:#fff;font-size:21px;cursor:pointer}
    .party-loadout__eyebrow{display:block;padding-right:48px;color:#d9b967;font:800 10.5px/1.4 "Bai Jamjuree",system-ui;letter-spacing:.16em}
    .party-loadout h2{margin:8px 50px 0 0;color:#fff!important;-webkit-text-fill-color:#fff!important;font:800 clamp(27px,6vw,39px)/1.12 "Bai Jamjuree",system-ui}
    .party-loadout__class{margin-top:8px;color:#8fe0b8;font:800 12px/1.55 "Bai Jamjuree",system-ui;letter-spacing:.08em}
    .party-loadout__role{margin-top:4px;color:rgba(248,246,240,.74);font:700 12px/1.55 "Bai Jamjuree",system-ui;letter-spacing:.08em}
    .party-loadout__section{margin-top:22px}
    .party-loadout__label{display:block;margin-bottom:9px;color:#d9b967;font:800 10px/1.4 "Bai Jamjuree",system-ui;letter-spacing:.16em}
    .party-loadout__items{display:grid;gap:9px}
    .party-loadout__item{border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:13px 14px;background:rgba(255,255,255,.04)}
    .party-loadout__item b{display:block;color:#fff!important;-webkit-text-fill-color:#fff!important;font:800 12.5px/1.45 "Bai Jamjuree",system-ui;letter-spacing:.04em;overflow-wrap:anywhere}
    .party-loadout__item span{display:block;margin-top:4px;color:rgba(248,246,240,.76)!important;-webkit-text-fill-color:rgba(248,246,240,.76)!important;font-size:13.5px;line-height:1.7;overflow-wrap:anywhere}
    .party-loadout__watch{border-color:rgba(226,127,85,.32);background:rgba(226,127,85,.07)}
    .party-loadout__watch b{color:#efa17e!important;-webkit-text-fill-color:#efa17e!important}
    @media(max-width:560px){.party-loadout{align-items:end;padding:8px}.party-loadout__panel{max-height:91dvh;border-radius:24px 24px 16px 16px;padding:22px 17px}.party-loadout__item{padding:12px}.party-loadout__item span{font-size:13px}.party-loadout-btn{width:100%}}
  `;
  document.head.append(style);
}

let opener=null;
let modal=null;

function focusables(root){
  return [...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&!el.hidden);
}

function closeModal(){
  if(!modal||modal.hidden) return;
  modal.hidden=true;
  document.documentElement.style.overflow='';
  document.body.style.overflow='';
  const back=opener; opener=null;
  back?.focus?.();
}

function openModal(key,button){
  const d=PARTY[key]; if(!d) return;
  opener=button;
  if(!modal){
    modal=document.createElement('div');
    modal.className='party-loadout';
    modal.hidden=true;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','partyLoadoutTitle');
    modal.addEventListener('mousedown',e=>{if(e.target===modal)closeModal()});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closeModal();return}
      if(e.key!=='Tab')return;
      const items=focusables(modal);if(!items.length)return;
      const first=items[0],last=items[items.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    });
    document.body.append(modal);
  }
  const items=(arr,watch=false)=>arr.map(([name,effect])=>`<div class="party-loadout__item${watch?' party-loadout__watch':''}"><b>${name}</b><span>${effect}</span></div>`).join('');
  modal.innerHTML=`<section class="party-loadout__panel"><button class="party-loadout__close" type="button" aria-label="ปิด Loadout">×</button><span class="party-loadout__eyebrow">ACTIVE PARTY · LOADOUT</span><h2 id="partyLoadoutTitle">${d.name}</h2><div class="party-loadout__class">CLASS · ${d.className}</div><div class="party-loadout__role">ROLE · ${d.role}</div><section class="party-loadout__section"><span class="party-loadout__label">EQUIPMENT</span><div class="party-loadout__items">${items(d.equipment)}</div></section><section class="party-loadout__section"><span class="party-loadout__label">SKILLS</span><div class="party-loadout__items">${items(d.skills)}</div></section><section class="party-loadout__section"><span class="party-loadout__label">WATCH OUT</span><div class="party-loadout__items">${items([['จุดที่ต้องระวัง',d.watch]],true)}</div></section></section>`;
  modal.querySelector('.party-loadout__close')?.addEventListener('click',closeModal);
  modal.hidden=false;
  document.documentElement.style.overflow='hidden';
  document.body.style.overflow='hidden';
  modal.querySelector('.party-loadout__close')?.focus();
  try{window.MC_ACT?.(`awaken-loadout-${key.toLowerCase()}`)}catch{}
}

function collapseParty(){
  const partyGrid=document.querySelector('.partygrid'); if(!partyGrid)return;
  const details=partyGrid.closest('details.more');
  if(details) details.open=false;
  const box=partyGrid.closest('.boss-more');
  if(box){
    box.classList.remove('is-open');
    const toggle=box.querySelector(':scope > .boss-more-toggle');
    const body=box.querySelector(':scope > .boss-more-body');
    if(toggle){toggle.setAttribute('aria-expanded','false');toggle.querySelector('.boss-more-icon')?.replaceChildren('+')}
    if(body)body.hidden=true;
  }
}

function addButtons(){
  document.querySelectorAll('.partygrid .member').forEach(member=>{
    if(member.querySelector('.party-loadout-btn'))return;
    const key=keyFromMember(member);if(!key)return;
    const host=member.querySelector('div:last-child')||member;
    const button=document.createElement('button');
    button.type='button';button.className='party-loadout-btn';button.textContent='LOADOUT';
    button.setAttribute('aria-label',`ดู Loadout ของ ${PARTY[key].name}`);
    button.addEventListener('click',()=>openModal(key,button));
    host.append(button);
  });
}

function boot(){
  if(!bossPath()||document.documentElement.dataset.awakenPartyLoadout==='1')return;
  document.documentElement.dataset.awakenPartyLoadout='1';
  injectStyles();
  collapseParty();
  addButtons();
  const observer=new MutationObserver(()=>{collapseParty();addButtons()});
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
