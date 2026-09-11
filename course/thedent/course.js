/* The Dent course — all lesson/prompt state is local to this browser. */
(() => {
  'use strict';
  const data = window.DENT_COURSE;
  if (!data || !Array.isArray(data.modules)) return;
  const $ = (s, root = document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => String(n).padStart(2, '0');
  const STORE = 'dent-course-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch {}
  if(saved.module==='prd')saved.module='files';
  function restoreHomework(value) { return new Set(Array.isArray(value) ? value.filter(id => data.homework.some(m => m.id === id)) : []); }
  const state = { module: data.modules.some(m => m.id === saved.module) ? saved.module : 'start', slide: 1, done: new Set(Array.isArray(saved.done) ? saved.done.filter(id=>data.modules.some(m=>m.id===id)) : []), checks: saved.checks && typeof saved.checks==='object' ? saved.checks : {}, notes: false, homework: restoreHomework(saved.homework) };
  const drafts = new Map();
  const dialog = $('#course-dialog');
  let toastTimeout, lastFocus, timerInterval, timerEnd = 0, timerRemaining = 600, timerDuration = 600;
  const resourceNames = {
    'opening-notes.md':'โน้ตสไลด์เปิดคลาส · AI ใส่ซอส',
    'clinic-public-source.md':'ซอส The Dent · ข้อมูลจริงพร้อมที่มา',
    'tool-quickstart.md':'เลือกและเริ่มใช้ ChatGPT / Claude',
    'website-source-notes.md':'บันทึกจากเว็บ · วัตถุดิบสำหรับสกัดเอง',
    'create-markdown-guide.md':'วิธีสร้างและเก็บไฟล์ .md',
    'clinic-training-brief.md':'ภาพรวมงานออฟฟิศในคลาส',
    'source-example.md':'ใช้ซอสนี้กับงานอะไรได้บ้าง',
    'office-workflow-brief.md':'คำสั่งอ่านและจัดไฟล์ · พร้อมใช้',
    'office-kit-example.md':'ตัวอย่างเอกสารและคำตอบจาก Source จริง',
    'office-file-guide.md':'จัดโฟลเดอร์และส่งงานเป็นไฟล์',
    'review-checklist.md':'ก่อนนำงานไปใช้', 'workflow-template.md':'ใบเก็บวิธีทำซ้ำ',
    'ai-leader-homework.md':'การบ้าน AI Leader · 7 วัน',
    'followup-worksheet.md':'ใบติดตามผลหลังเรียน', 'answer-key.md':'ผลลัพธ์อ้างอิงสำหรับผู้สอน',
    'instructor-guide.md':'คู่มือและแผนการสอน', 'excel-csv-guide.md':'ทำรายงานจาก Export ลูกค้าของตัวเอง', 'prompt-library.md':'พรอมป์พร้อมใช้ทั้งหมด', 'slide-notes.md':'สไลด์และบทพูดผู้สอน'
  };
  function persist() { try { localStorage.setItem(STORE, JSON.stringify({module:state.module,done:[...state.done],checks:state.checks,homework:[...state.homework]})); } catch {} }
  function notify(message) { clearTimeout(toastTimeout); const el=$('#toast');el.textContent=message;el.classList.add('visible');toastTimeout=setTimeout(()=>el.classList.remove('visible'),3300); }
  function go(mode, target) { const hash=`#${mode}/${target}`; if(location.hash===hash) render();else location.hash=hash; }
  function download(name, text, type='text/plain;charset=utf-8') { const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000); }
  let manualCopyDialog, manualCopyReturnFocus;
  function showManualCopy(text, returnFocus) {
    if(!manualCopyDialog){
      manualCopyDialog=document.createElement('dialog');
      manualCopyDialog.id='manual-copy-dialog';
      manualCopyDialog.setAttribute('aria-labelledby','manual-copy-title');
      manualCopyDialog.setAttribute('aria-describedby','manual-copy-help');
      manualCopyDialog.innerHTML='<div class="dialog-head"><h2 id="manual-copy-title">คัดลอกข้อความ</h2><button type="button" class="icon-button" aria-label="ปิดหน้าต่างคัดลอก">×</button></div><div style="padding:24px"><p id="manual-copy-help" class="dialog-intro">เลือกข้อความด้านล่างแล้วกด Ctrl+C / ⌘C หรือแตะค้างเพื่อคัดลอก</p><textarea class="prompt-text" aria-label="ข้อความสำหรับคัดลอก" readonly spellcheck="false"></textarea></div>';
      manualCopyDialog.querySelector('button').addEventListener('click',()=>manualCopyDialog.close());
      manualCopyDialog.addEventListener('close',()=>{
        manualCopyDialog.querySelector('textarea').value='';
        if(manualCopyReturnFocus?.isConnected)manualCopyReturnFocus.focus({preventScroll:true});
        manualCopyReturnFocus=undefined;
      });
      document.body.append(manualCopyDialog);
    }
    manualCopyReturnFocus=returnFocus;
    const field=manualCopyDialog.querySelector('textarea');
    field.value=text;
    if(!manualCopyDialog.open)manualCopyDialog.showModal();
    field.focus();field.select();
  }
  async function copy(text, textarea, message='คัดลอกแล้ว นำไปวางใน Claude หรือ ChatGPT ได้เลย') {
    try { if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);notify(message);return true;} } catch {}
    const returnFocus=document.activeElement;
    if(textarea){const editor=textarea.closest('details');if(editor)editor.open=true;}
    const field=textarea||document.createElement('textarea');
    if(!textarea){field.value=text;field.readOnly=true;field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';(dialog.open?dialog:document.body).append(field);}
    field.focus();field.select();let ok=false;try{ok=document.execCommand('copy');}catch{}
    if(!textarea){
      field.remove();
      if(ok){if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
      else showManualCopy(text,returnFocus);
    }
    notify(ok?message:'คัดลอกอัตโนมัติไม่ได้ เลือกข้อความแล้วกด Ctrl+C / ⌘C หรือแตะค้างเพื่อคัดลอก');return ok;
  }
  function showDialog(title, html) {lastFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
  function closeDialog(){dialog.close();if(lastFocus?.isConnected)lastFocus.focus();}
  function promptCard(id, index=0, open=false, prefix='lesson') {
    const p=data.prompts.find(item=>item.id===id);if(!p)return '';
    const inputId=`${prefix}-prompt-${id}`;
    return `<article class="prompt-card"><div class="prompt-summary"><div><h3><span class="prompt-index">${number(data.prompts.indexOf(p)+1)}</span>${esc(p.title)}</h3><p>${esc(p.input)} → ${esc(p.output)}</p></div><button type="button" class="button primary" data-copy-prompt="${id}" data-input="${inputId}">คัดลอกพรอมป์ ↗</button></div><details class="prompt-editor"><summary>ดูหรือแก้คำสั่ง</summary><div class="prompt-body"><label class="prompt-label" for="${inputId}">คำสั่งพร้อมใช้ ปรับเพิ่มได้ตามงาน</label><textarea id="${inputId}" class="prompt-text" data-prompt-id="${id}" spellcheck="false">${esc(drafts.get(id)??p.text)}</textarea><div class="prompt-actions"><button type="button" class="button small" data-save-prompt="${id}" data-input="${inputId}">บันทึก .md</button><button type="button" class="text-button" data-reset-prompt="${id}" data-input="${inputId}">คืนข้อความตั้งต้น</button></div></div></details></article>`;
  }
  function resourcesInline(files){return `<div class="resources-inline">${files.map(file=>file.endsWith('.xlsx')?`<a class="resource-chip" href="./resources/${esc(file)}" download><span aria-hidden="true">↓</span>${esc(resourceNames[file]||file)}</a>`:`<button type="button" class="resource-chip" data-resource="${esc(file)}"><span aria-hidden="true">↓</span>${esc(resourceNames[file]||file)}</button>`).join('')}</div>`;}
  function sourceLinks(){return `<div class="button-row source-links"><a class="button small" href="https://thedent.co.th/" target="_blank" rel="noopener">เปิดเว็บ The Dent ↗</a><a class="button small" href="https://thedent.co.th/quotation/" target="_blank" rel="noopener">ดูข้อมูลสาขาต้นทาง ↗</a><a class="button small" href="https://www.clinicthedent.com/" target="_blank" rel="noopener">เว็บไซต์อ้างอิงอีกแห่ง ↗</a></div>`;}
  function framework(){return `<div class="framework">${[['01','งาน','อยากให้ AI ช่วยทำอะไร'],['02','ข้อมูล','แนบซอสหรือไฟล์ที่มี'],['03','ผลลัพธ์','บอกว่าจะเอาไฟล์อะไรไปใช้']].map(x=>`<div><small>${x[0]}</small><strong>${x[1]}</strong><p>${x[2]}</p></div>`).join('')}</div>`;}
  function kitLink(label='ดาวน์โหลดชุดเรียน'){return location.protocol==='file:'?'<span class="offline-status">✓ เปิดจากชุดเรียนในเครื่อง</span>':`<a class="button" href="./downloads/the-dent-course-kit.zip" download>${label} ↓</a>`;}
  function startIntro(){return `<div class="start-intro"><div class="intro-label">เริ่มที่นี่ · 10 นาทีแรก</div><h2>Chat / Work / Code ต่างกันอย่างไร</h2><p>รู้จัก ChatGPT และ Claude ก่อน แล้วใช้ Work / Cowork เปลี่ยนไฟล์ของทีมให้เป็นงานพร้อมใช้</p><div class="button-row"><a class="button primary" href="./tools.html">เปิดหน้าเปรียบเทียบเครื่องมือ ↗</a><a class="button" href="./opening.html#slide/1">ต่อด้วยสไลด์ AI ใส่ซอส →</a></div></div><div class="outcomes-grid"><article class="outcome"><div class="outcome-number">01</div><div><div class="outcome-tag">OFFICE FILES</div><h3>เอกสาร ภาพ และคำตอบในโฟลเดอร์เดียว</h3><p>บันทึกให้ทีม · คลังคำตอบ · แผนคอนเทนต์ · ภาพพร้อมใช้</p><a href="#learn/workshop1">ดู Workshop 1 ↗</a></div></article><article class="outcome"><div class="outcome-number">02</div><div><div class="outcome-tag">CUSTOMER EXCEL / CSV</div><h3>ข้อมูลลูกค้าของคุณ สู่รายงานที่ใช้ตัดสินใจ</h3><p>ทำกับไฟล์ของตัวเองในเครื่อง พร้อมคำสั่งสำหรับรอบหน้า</p><a href="#learn/workshop2">ดู Workshop 2 ↗</a></div></article></div>`;}
  function customerLesson(){return `<div class="customer-context"><span class="eyebrow">YOUR FILES · YOUR WORKSPACE</span><h2>ใช้ Export ลูกค้าจากระบบของคุณ</h2><p>ผู้เรียนเปิดและทำงานกับไฟล์ในเครื่องของตนเอง ผู้สอนดูวิธีทำโดยไม่รับไฟล์ลูกค้า</p><div class="customer-benefits"><div><strong>จัดข้อมูลให้อ่านง่าย</strong><span>คอลัมน์ วันที่ รหัส และรายการซ้ำ</span></div><div><strong>เห็นภาพงานของทีม</strong><span>ยอดหรือจำนวน แยกตามช่วงและหมวดที่มี</span></div><div><strong>รู้ว่าจะทำอะไรต่อ</strong><span>ประเด็นที่ต้องติดตามและสรุปให้ผู้จัดการ</span></div></div><details><summary>ถ้าวันนี้ยังไม่มีไฟล์ Export</summary><p>เตรียมขั้นตอนและคำสั่งจากโจทย์ของตัวเองไว้ก่อน เมื่อมีไฟล์จึงให้ AI อ่านคอลัมน์และวิเคราะห์จริง ไม่มีข้อมูลลูกค้าตัวอย่างให้กรอกแทน</p></details></div>`;}
  function renderNav() {
    $('#lesson-nav').innerHTML=data.modules.map((m,i)=>`<a class="lesson-link ${state.done.has(m.id)?'done':''}" href="#learn/${m.id}" ${state.module===m.id?'aria-current="step"':''}><span class="lesson-number">${state.done.has(m.id)?'✓':number(i+1)}</span><span class="lesson-label">${esc(m.label)}<small>${esc(m.minutes)} นาที</small></span></a>`).join('');
    $('#progress-count').textContent=`${state.done.size} / ${data.modules.length}`;$('#progress-bar').style.width=`${state.done.size/data.modules.length*100}%`;$('.course-progress').setAttribute('aria-valuenow',state.done.size);
    if(matchMedia('(max-width:820px)').matches){const nav=$('#lesson-nav'),active=nav.querySelector('[aria-current]');if(active)nav.scrollLeft=active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.clientWidth)/2;}
  }
  function accountLinks() {return location.protocol==='file:'?'':`<div class="account-links"><a href="/course/">← โปรเจกต์ของ myClover</a><button type="button" data-action="logout">ออกจากห้องเรียน</button></div>`;}
  async function logout(button) {button.disabled=true;try{const response=await fetch('/api/course-access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!response.ok)throw new Error('logout');location.assign('/course/');}catch{button.disabled=false;notify('ออกจากห้องเรียนไม่ได้ ลองอีกครั้งครับ');}}
  function leaderHomework() {
    return `<section class="leader-homework" aria-labelledby="homework-heading"><div class="homework-heading"><div><p class="eyebrow">YOUR FIRST WEEK</p><h2 id="homework-heading">3 ภารกิจหลังคลาส</h2></div><p class="homework-progress" aria-live="polite" aria-atomic="true"><strong id="homework-count">${state.homework.size} / ${data.homework.length}</strong> ภารกิจที่ทำแล้ว</p></div><div class="homework-cards">${data.homework.map(m=>`<article class="homework-card ${state.homework.has(m.id)?'is-done':''}" data-homework-card="${esc(m.id)}"><div class="homework-card-top"><span class="homework-number">${number(m.level)}</span><span>${esc(m.when)}</span></div><h3>${esc(m.title)}</h3><p>${esc(m.action)}</p><details class="homework-evidence"><summary>เก็บผลงานอะไรไว้</summary><p>${esc(m.evidence)}</p></details><label class="homework-check"><input type="checkbox" data-homework="${esc(m.id)}" ${state.homework.has(m.id)?'checked':''} aria-label="ทำแล้ว: ${esc(m.title)}"><span>ทำภารกิจนี้แล้ว</span></label></article>`).join('')}</div><div class="homework-foot"><p>ติ๊กเมื่อทำแล้ว · จำความคืบหน้าในเบราว์เซอร์นี้<br>เก็บไฟล์ไว้ในเครื่อง แล้วเปิดคุยวันติดตาม</p><button type="button" class="button small" data-resource="ai-leader-homework.md">ดูการบ้าน / ดาวน์โหลด ↓</button></div></section>`;
  }
  function setHomework(id, checked) {
    if(!data.homework.some(m=>m.id===id))return;
    if(checked)state.homework.add(id);else state.homework.delete(id);
    persist();
    document.querySelectorAll('[data-homework-card]').forEach(card=>card.classList.toggle('is-done',state.homework.has(card.dataset.homeworkCard)));
    document.querySelectorAll('[data-homework]').forEach(input=>input.checked=state.homework.has(input.dataset.homework));
    const count=$('#homework-count');if(count)count.textContent=`${state.homework.size} / ${data.homework.length}`;
  }
  function followupNote() {
    return `<p class="followup-included">นัดติดตามกลุ่ม 30 นาทีในอีก 1–2 สัปดาห์ รวมอยู่ในคอร์สนี้แล้ว เปิดวิธีทำและผลลัพธ์ที่เล่าได้จากเครื่องของตัวเอง</p>`;
  }
  function renderLesson() {
    const m=data.modules.find(item=>item.id===state.module)||data.modules[0],i=data.modules.indexOf(m),next=data.modules[i+1];
    const primary={sauce:['clinic-public-source.md'],files:['office-workflow-brief.md'],workshop1:['clinic-public-source.md','office-kit-example.md'],workshop2:['excel-csv-guide.md']};
    const files=primary[m.id]||[];
    const extra=m.id==='followup'?[]:m.resources.filter(file=>!files.includes(file));
    $('#learning-surface').innerHTML=`<div class="learning-inner">${accountLinks()}<div class="mobile-tools"><button type="button" class="button small" data-action="resources">ไฟล์และพรอมป์</button><button type="button" class="button small" data-action="agenda">ตารางเรียน</button></div><div class="lesson-topline"><p class="eyebrow">${number(i+1)} / ${number(data.modules.length)} &nbsp; ${esc(m.label)}</p><div class="lesson-meta"><span>${esc(m.time)} · ${esc(m.minutes)} นาที</span><button type="button" class="text-button" data-action="share" aria-label="คัดลอกลิงก์บทนี้">ลิงก์บทนี้</button></div></div><header class="lesson-header"><h1>${esc(m.title)}</h1><p class="lesson-subtitle">${esc(m.subtitle)}</p></header>${m.id==='start'?startIntro():m.id==='principles'?`<div class="start-intro"><div class="intro-label">14:10–14:35 · ฟังและคุยกันก่อน</div><h2>Source ก่อน Prompt</h2><p>ใช้สไลด์ AI ใส่ซอส 20 หน้า เชื่อมหลักการกับงานเอกสารและไฟล์ของทีม แล้วเริ่มจับคอมเวลา 14:35</p><a class="button primary" href="./opening.html#slide/1">เปิดสไลด์ปูพื้นฐานต่อ ↗</a></div>`:''}${files.length?`<div class="lesson-files">${resourcesInline(files)}</div>`:''}${m.id==='followup'?leaderHomework():`<div class="section-label"><h2>${m.id==='start'?'เริ่มด้วยกัน':`ทำตาม ${m.steps.length} ขั้นตอน`}</h2></div><div class="steps compact-steps">${m.steps.map((step,n)=>`<article class="step"><span class="step-index">${n+1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p></div></article>`).join('')}</div>`}${m.promptIds.length?`<div class="section-label"><h2>คัดลอกแล้วใช้ได้เลย</h2></div>${m.promptIds.map((id,n)=>promptCard(id,n)).join('')}`:''}${m.id==='workshop2'?customerLesson():''}${extra.length?`<details class="lesson-extra"><summary>ไฟล์ประกอบและวิธีทำเพิ่มเติม</summary>${resourcesInline(extra)}${m.id==='sauce'?sourceLinks():''}</details>`:''}<div class="deliverable"><small>จะได้กลับไป</small><p>${esc(m.deliverable)}</p></div>${m.id==='followup'?followupNote():''}<footer class="lesson-footer">${i?`<a class="footer-back" href="#learn/${data.modules[i-1].id}">← บทก่อนหน้า</a>`:`<button type="button" class="footer-back" data-action="agenda">ดูตารางเรียน</button>`}<div><button type="button" class="button ${state.done.has(m.id)?'success':'primary'}" data-complete="${m.id}" data-next="${next?.id||''}">${next?'พร้อมแล้ว · ไปต่อ →':'เก็บบทเรียนนี้แล้ว ✓'}</button><div class="completed-label">${state.done.has(m.id)?'คุณทำเครื่องหมายบทนี้แล้ว':'บันทึกความคืบหน้าบนเครื่องนี้'}</div></div></footer></div>`;
  }
  function slideMarkup(s){return `<article class="slide kind-${esc(s.kind)}"><div class="slide-kicker"><span>${esc(s.kicker)}</span><span class="slide-chapter">${esc(s.chapter)}</span></div><h1>${esc(s.title).replace(/\n/g,'<br>')}</h1><p class="slide-lead">${esc(s.lead)}</p><div class="slide-points">${s.points.map((point,i)=>`<div class="slide-point"><span class="point-number">${number(i+1)}</span><span>${esc(point)}</span></div>`).join('')}</div><div class="slide-footmark"><span>THE DENT × MYCLOVER</span><span>CLAUDE COWORK + CHATGPT</span></div></article>`;}
  function renderPresentation(){
    const s=data.slides[state.slide-1];
    $('#presentation-surface').innerHTML=`<div class="slide-shell"><div class="slide-toolbar"><label><span class="sr-only">เลือกสไลด์</span><select id="slide-select" aria-label="เลือกสไลด์">${data.slides.map(slide=>`<option value="${slide.id}" ${slide.id===state.slide?'selected':''}>${number(slide.id)} · ${esc(slide.title.replace(/\n/g,' '))}</option>`).join('')}</select></label><div class="slide-toolbar-actions"><button type="button" data-action="share">คัดลอกลิงก์</button><button type="button" data-action="print">พิมพ์ / PDF</button><button type="button" data-action="fullscreen" aria-label="สลับเต็มจอ">⛶ <span class="fullscreen-label">เต็มจอ</span></button></div></div>${slideMarkup(s)}<div class="slide-navigation"><div class="counter"><strong>${number(state.slide)}</strong> / ${number(data.slides.length)}</div><span class="present-hint">ใช้ปุ่ม ← → เพื่อเปลี่ยนสไลด์</span><div class="slide-navigation-right"><a class="button small open-activity" href="#learn/${s.activityId||'start'}">เปิดบทเรียน</a><button type="button" class="button" data-slide="${state.slide-1}" ${state.slide===1?'disabled':''} aria-label="สไลด์ก่อนหน้า">←</button><button type="button" class="button primary" data-slide="${state.slide+1}" ${state.slide===data.slides.length?'disabled':''} aria-label="สไลด์ถัดไป">ถัดไป →</button></div></div><div class="slide-track"><span style="width:${state.slide/data.slides.length*100}%"></span></div><details class="speaker-notes" id="speaker-notes" ${state.notes?'open':''}><summary>โน้ตผู้สอนและเวลาทำกิจกรรม</summary><p>${esc(s.note)}</p><div class="button-row"><a class="button small" href="#learn/${s.activityId||'start'}">เปิดขั้นลงมือ</a><button type="button" class="button small" data-action="timer"><span class="timer-readout">${timerText()}</span><span id="timer-label">${timerInterval?'หยุดพัก':'เริ่มจับเวลา'}</span></button><label class="timer-setting"><span class="sr-only">ระยะเวลากิจกรรม</span><select id="timer-duration" aria-label="ระยะเวลากิจกรรม">${[5,10,15,20].map(n=>`<option value="${n}" ${n*60===timerDuration?'selected':''}>${n} นาที</option>`).join('')}</select></label><button type="button" class="text-button" data-action="timer-reset">ตั้งเวลาใหม่</button><button type="button" class="text-button" data-action="guide">คู่มือสอนทั้งหมด</button></div></details></div>`;
    $('#speaker-notes').addEventListener('toggle',e=>state.notes=e.target.open);
  }
  function render(){
    const route=location.hash.slice(1).split('/'),isPresent=route[0]==='present';
    if(isPresent)state.slide=Math.min(data.slides.length,Math.max(1,Number.parseInt(route[1],10)||1));
    else { const module=route[1]==='prd'?'files':route[1];state.module=data.modules.some(m=>m.id===module)?module:state.module; }
    document.body.classList.toggle('is-presenting',isPresent);$('#learning-surface').hidden=isPresent;$('#presentation-surface').hidden=!isPresent;$('#learn-mode').setAttribute('aria-pressed',!isPresent);$('#present-mode').setAttribute('aria-pressed',isPresent);
    renderNav();if(isPresent)renderPresentation();else renderLesson();persist();
    document.title=isPresent?`${number(state.slide)} · ${data.slides[state.slide-1].title.replace(/\n/g,' ')} | The Dent`:`${data.modules.find(m=>m.id===state.module).label} | The Dent AI Workshop`;
    window.scrollTo({top:0,behavior:'instant'});
  }
  function agendaTable(){return `<table class="agenda-table"><thead><tr><th scope="col">เวลา</th><th scope="col">กิจกรรม</th><th scope="col">นาที</th></tr></thead><tbody>${data.agenda.map(item=>`<tr><td>${esc(item.time)}</td><td>${esc(item.title)}</td><td>${item.minutes}</td></tr>`).join('')}</tbody></table>`;}
  function showAgenda(){showDialog('ตารางเรียน · 180 นาที',`<p class="dialog-intro">12 กันยายน 2026 · 14:00–17:00 น. เรียนต่อเนื่อง 180 นาที</p>${agendaTable()}<div class="guide-note">หลังเรียนมีวิดีโอคอลติดตามผลของกลุ่ม 30 นาที ในอีก 1–2 สัปดาห์ นัดวันและเวลาร่วมกันภายหลัง</div>`);}
  function fileList(){return `<div class="file-list">${Object.entries(resourceNames).map(([file,title])=>`<div class="file-row"><div><strong>${esc(title)}</strong><small>${esc(file)}</small></div><div class="file-actions"><button type="button" class="button small" data-resource="${file}">เปิดดู</button><a class="button small" href="./resources/${file}" download aria-label="ดาวน์โหลด ${esc(title)}">↓ ดาวน์โหลด</a></div></div>`).join('')}</div>`;}
  function showResources(){showDialog('ไฟล์และพรอมป์ทั้งหมด',`<p class="dialog-intro">ไฟล์พร้อมใช้สำหรับเรียนและกลับไปทำต่อ</p><div class="button-row">${kitLink('ดาวน์โหลดชุดเรียนทั้งหมด')}</div>${fileList()}<div class="section-label"><h2>พรอมป์พร้อมใช้ ${data.prompts.length} ใบ</h2></div>${data.prompts.map((p,i)=>promptCard(p.id,i,false,'library')).join('')}`);}
  function showResource(file){
    if(!Object.hasOwn(resourceNames,file))return;
    const resource=window.DENT_RESOURCES?.[file];
    showDialog(resourceNames[file],`<p class="dialog-intro">${esc(file)}</p><div class="button-row"><a class="button primary" href="./resources/${esc(file)}" download>ดาวน์โหลดไฟล์ ↓</a>${resource!==undefined?`<button type="button" class="button" data-copy-resource="${esc(file)}">คัดลอกข้อความ</button>`:''}<button type="button" class="text-button" data-action="resources">กลับไปดูไฟล์ทั้งหมด</button></div>${['clinic-public-source.md','website-source-notes.md','source-example.md'].includes(file)?sourceLinks():''}${resource!==undefined?`<pre class="resource-preview">${esc(resource)}</pre>`:`<p class="empty-note">ดาวน์โหลดไฟล์เพื่อเปิดในเครื่อง</p>`}`);
  }
  function showGuide(){showDialog('คู่มือผู้สอน · พร้อมเดินคลาส',`<p class="dialog-intro">ผู้เรียน 6–10 คน · ผู้สอน 1 คน + ผู้ช่วย 1 คน</p><div class="button-row"><a class="button primary" href="./resources/instructor-guide.md" download>ดาวน์โหลดคู่มือ ↓</a><a class="button" href="./resources/slide-notes.md" download>โน้ตสไลด์ ↓</a><a class="button" href="./tools.html">หน้าเปรียบเทียบเครื่องมือ ↗</a></div><section class="guide-section"><h3>รู้จักเครื่องมือ → หลักการ → ลงมือ</h3><p>14:00 แนะนำ ChatGPT และ Claude · 14:10 เปิด AI ใส่ซอส · 14:35 เริ่มโฟลเดอร์และ Source เรียนต่อเนื่องถึง 17:00 แล้วพักท้ายคลาส</p><a class="button small" href="./opening.html#slide/1">เปิดสไลด์ AI ใส่ซอส ↗</a></section><section class="guide-section"><h3>เดินคลาส 3 ชั่วโมง</h3>${agendaTable()}</section><section class="guide-section"><h3>ผลงานในเครื่องของผู้เรียน</h3><ul><li>office-kit.docx · content-plan.xlsx · ภาพจาก ChatGPT</li><li>customer-workbook.xlsx · team-summary.docx · repeat-workflow.md</li></ul><p>ผู้เรียนทำ Export ลูกค้าของตนเอง ผู้สอนไม่รับไฟล์ ถ้ายังไม่มีไฟล์ ให้เตรียมวิธีทำรอบหน้าโดยไม่สร้างข้อมูลลูกค้าสมมติ</p></section><section class="guide-section"><h3>การบ้านและนัดติดตาม</h3><p>ทำงานเดิมซ้ำด้วยไฟล์รอบใหม่ → พาเพื่อนทำเองได้ → จัดโฟลเดอร์ Source ให้หยิบใช้ง่าย เก็บหลักฐานในเครื่องและคุยกันในคอล 30 นาที อีก 1–2 สัปดาห์</p></section><div class="button-row"><button type="button" class="button small" data-resource="excel-csv-guide.md">คู่มือ Export ลูกค้า</button><button type="button" class="button small" data-resource="answer-key.md">เกณฑ์ดูผลงาน</button></div>`);}
  function timerText(){const t=Math.max(0,timerRemaining);return `${number(Math.floor(t/60))}:${number(t%60)}`;}
  function tick(){timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if(!timerRemaining){clearInterval(timerInterval);timerInterval=undefined;const label=$('#timer-label');if(label)label.textContent='ครบเวลา';notify('ครบเวลาทำกิจกรรมแล้ว');}}
  function toggleTimer(){if(timerInterval){tick();clearInterval(timerInterval);timerInterval=undefined;}else{if(!timerRemaining)timerRemaining=timerDuration;timerEnd=Date.now()+timerRemaining*1000;timerInterval=setInterval(tick,250);}const label=$('#timer-label');if(label)label.textContent=timerInterval?'หยุดพัก':'จับเวลาต่อ';}
  function printSlides(){ $('#print-surface').innerHTML=data.slides.map(slideMarkup).join('');window.print(); }
  document.addEventListener('input',e=>{if(e.target.matches('[data-prompt-id]')){const id=e.target.dataset.promptId;drafts.set(id,e.target.value);document.querySelectorAll(`[data-prompt-id="${id}"]`).forEach(el=>{if(el!==e.target)el.value=e.target.value;});}});
  document.addEventListener('change',e=>{if(e.target.matches('[data-homework]'))setHomework(e.target.dataset.homework,e.target.checked);if(e.target.matches('[data-check]')){state.checks[e.target.dataset.check]=e.target.checked;persist();}if(e.target.id==='slide-select')go('present',e.target.value);if(e.target.id==='timer-duration'){clearInterval(timerInterval);timerInterval=undefined;timerDuration=Number(e.target.value)*60;timerRemaining=timerDuration;document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if($('#timer-label'))$('#timer-label').textContent='เริ่มจับเวลา';}});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.id==='learn-mode'){go('learn',state.module);return;}if(b.id==='present-mode'){if(['start','principles'].includes(state.module)&&!document.body.classList.contains('is-presenting')){location.assign(state.module==='start'?'./tools.html':'./opening.html#slide/1');return;}const first=data.slides.find(s=>s.activityId===state.module);go('present',first?.id||1);return;}if(b.id==='dialog-close'){closeDialog();return;}
    if(b.dataset.slide){go('present',b.dataset.slide);return;}
    if(b.dataset.resource){showResource(b.dataset.resource);return;}
    if(b.dataset.copyResource){await copy(window.DENT_RESOURCES?.[b.dataset.copyResource]||'');return;}
    if(b.dataset.copyPrompt){const area=document.getElementById(b.dataset.input);await copy(area.value,area);return;}
    if(b.dataset.savePrompt){const p=data.prompts.find(p=>p.id===b.dataset.savePrompt);download(`prompt-${p.id}.md`,`# ${p.title}\n\n${document.getElementById(b.dataset.input).value}\n`);notify('บันทึกพรอมป์เป็นไฟล์แล้ว');return;}
    if(b.dataset.resetPrompt){const p=data.prompts.find(p=>p.id===b.dataset.resetPrompt);drafts.delete(p.id);document.querySelectorAll(`[data-prompt-id="${p.id}"]`).forEach(el=>el.value=p.text);notify('คืนข้อความตั้งต้นแล้ว');return;}
    if(b.dataset.complete){state.done.add(b.dataset.complete);persist();if(b.dataset.next){go('learn',b.dataset.next);}else{render();notify('เก็บความคืบหน้าแล้ว พร้อมนำไปลองกับงานจริง');}return;}
    switch(b.dataset.action){case 'logout':await logout(b);break;case 'present':location.assign('./tools.html');break;case 'resources':showResources();break;case 'guide':showGuide();break;case 'agenda':showAgenda();break;case 'share':await copy(location.href,null,'คัดลอกลิงก์หน้านี้แล้ว');break;case 'print':printSlides();break;case 'fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('ใช้ปุ่มเต็มจอของเบราว์เซอร์แทนได้');}break;case 'timer':toggleTimer();break;case 'timer-reset':clearInterval(timerInterval);timerInterval=undefined;timerRemaining=timerDuration;document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if($('#timer-label'))$('#timer-label').textContent='เริ่มจับเวลา';break;}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)closeDialog();}});
  document.addEventListener('keydown',e=>{if(dialog.open||!document.body.classList.contains('is-presenting')||e.target.closest('textarea,input,select,button,a,summary'))return;let next;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')next=state.slide+1;if(e.key==='ArrowLeft'||e.key==='PageUp')next=state.slide-1;if(e.key==='Home')next=1;if(e.key==='End')next=data.slides.length;if(next){e.preventDefault();go('present',Math.max(1,Math.min(data.slides.length,next)));}});
  window.addEventListener('hashchange',()=>{if(dialog.open)closeDialog();render();$('#main').focus({preventScroll:true});});
  window.addEventListener('beforeprint',()=>{if(!$('#print-surface').children.length)$('#print-surface').innerHTML=data.slides.map(slideMarkup).join('');});
  window.addEventListener('pagehide',()=>{if(timerInterval)clearInterval(timerInterval);});
  render();
})();
