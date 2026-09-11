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
  const state = { module: data.modules.some(m => m.id === saved.module) ? saved.module : 'start', slide: 1, done: new Set(Array.isArray(saved.done) ? saved.done.filter(id=>data.modules.some(m=>m.id===id)) : []), checks: saved.checks && typeof saved.checks==='object' ? saved.checks : {}, notes: false };
  const drafts = new Map();
  const dialog = $('#course-dialog');
  let toastTimeout, lastFocus, timerInterval, timerEnd = 0, timerRemaining = 600, timerDuration = 600;
  const resourceNames = {
    'clinic-public-source.md':'ซอส The Dent · ข้อมูลจริงพร้อมที่มา',
    'tool-quickstart.md':'เริ่ม Cowork / ChatGPT · 3 นาที', 'content-handoff-example.md':'ตัวอย่างบรีฟคลิปพร้อมส่งทีม',
    'website-source-notes.md':'บันทึกจากเว็บ · วัตถุดิบสำหรับสกัดเอง',
    'create-markdown-guide.md':'วิธีสร้างและเก็บไฟล์ .md',
    'clinic-training-brief.md':'บรีฟกิจกรรมจากเว็บไซต์จริง',
    'source-example.md':'ใช้ซอสนี้กับงานอะไรได้บ้าง',
    'workshop-1-example.md':'ร่างโพสต์และคำตอบจากข้อมูลจริง',
    'excel-prd.md':'Mini PRD · จัด Excel พร้อมใช้', 'mini-prd-template.md':'แม่แบบ Mini PRD', 'mini-prd-example.md':'Mini PRD · หน้าข้อมูลสาขา',
    'review-checklist.md':'ก่อนนำงานไปใช้', 'workflow-template.md':'ใบเก็บวิธีทำซ้ำ',
    'followup-worksheet.md':'ใบติดตามผลหลังเรียน', 'answer-key.md':'ผลลัพธ์อ้างอิงสำหรับผู้สอน',
    'instructor-guide.md':'คู่มือและแผนการสอน', 'excel-csv-guide.md':'คู่มือ Excel / CSV', 'thedent-branches.csv':'ข้อมูลสาขา · CSV', 'thedent-branches.xlsx':'ข้อมูลสาขา · Excel', 'prompt-library.md':'พรอมป์พร้อมใช้ทั้งหมด', 'slide-notes.md':'สไลด์และบทพูดผู้สอน'
  };
  function persist() { try { localStorage.setItem(STORE, JSON.stringify({module:state.module,done:[...state.done],checks:state.checks})); } catch {} }
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
  function startIntro(){return `<div class="start-intro"><div class="intro-label">READY TO USE</div><h2>ซอสพร้อมแล้ว เริ่มทำงานได้เลย</h2><p>ใช้ข้อมูลจริงของ The Dent ทำคอนเทนต์ และเปลี่ยนไฟล์ Excel / CSV เป็นงานสรุปที่ทีมใช้ต่อได้</p><div class="button-row"><button type="button" class="button primary" data-resource="clinic-public-source.md">เปิดซอส The Dent</button>${kitLink()}<button type="button" class="button" data-resource="tool-quickstart.md">เริ่มใช้เครื่องมือ</button><button type="button" class="button" data-action="present">เปิดสไลด์สอน</button></div></div><div class="outcomes-grid"><article class="outcome"><div class="outcome-number">01</div><div><div class="outcome-tag">CONTENT + ADMIN</div><h3>ซอสเดียว สื่อสารได้ทั้งทีม</h3><p>โพสต์ 1 ชิ้น + คำตอบแอดมิน 3 แบบ</p><a href="#learn/workshop1">ทำ Workshop 1 ↗</a></div></article><article class="outcome"><div class="outcome-number">02</div><div><div class="outcome-tag">EXCEL + CSV</div><h3>ไฟล์จากระบบ สู่สรุปพร้อมใช้</h3><p>จัดข้อมูล · ทำสรุป · ใช้ซ้ำกับไฟล์รอบหน้า</p><a href="#learn/workshop2">ทำ Workshop 2 ↗</a></div></article></div>`;}
  function bonusLesson(prefix='bonus'){return `<details class="lesson-extra bonus-lesson"><summary>เรียนต่อเอง · สร้างหน้าข้อมูลสาขาด้วย AI</summary><p>เปิดตัวอย่าง แล้วใช้ PRD และพรอมป์สร้างหน้าเว็บของตัวเอง</p><div class="button-row"><a class="button small" href="./daily-brief.html" target="_blank" rel="noopener">ลอง Branch Desk ↗</a><button type="button" class="button small" data-resource="mini-prd-example.md">ดู PRD ที่เขียนแล้ว</button></div>${promptCard('build',0,false,prefix)}</details>`;}
  function renderNav() {
    $('#lesson-nav').innerHTML=data.modules.map((m,i)=>`<a class="lesson-link ${state.done.has(m.id)?'done':''}" href="#learn/${m.id}" ${state.module===m.id?'aria-current="step"':''}><span class="lesson-number">${state.done.has(m.id)?'✓':number(i+1)}</span><span class="lesson-label">${esc(m.label)}<small>${esc(m.minutes)} นาที</small></span></a>`).join('');
    $('#progress-count').textContent=`${state.done.size} / ${data.modules.length}`;$('#progress-bar').style.width=`${state.done.size/data.modules.length*100}%`;$('.course-progress').setAttribute('aria-valuenow',state.done.size);
    if(matchMedia('(max-width:820px)').matches){const nav=$('#lesson-nav'),active=nav.querySelector('[aria-current]');if(active)nav.scrollLeft=active.offsetLeft-nav.offsetLeft-(nav.clientWidth-active.clientWidth)/2;}
  }
  function accountLinks() {return location.protocol==='file:'?'':`<div class="account-links"><a href="/course/">← โปรเจกต์ของ myClover</a><button type="button" data-action="logout">ออกจากห้องเรียน</button></div>`;}
  async function logout(button) {button.disabled=true;try{const response=await fetch('/api/course-access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!response.ok)throw new Error('logout');location.assign('/course/');}catch{button.disabled=false;notify('ออกจากห้องเรียนไม่ได้ ลองอีกครั้งครับ');}}
  function extensionLesson(m){
    if(!m.extensionPromptIds?.length)return '';
    return `<details class="lesson-extra extension-lesson"><summary>สำหรับทีมคอนเทนต์ · ทำบรีฟคลิปพร้อมส่งต่อ</summary>${resourcesInline(m.extensionResources||[])}${m.extensionPromptIds.map(id=>promptCard(id,0,false,'extension')).join('')}</details>`;
  }
  function renderLesson() {
    const m=data.modules.find(item=>item.id===state.module)||data.modules[0],i=data.modules.indexOf(m),next=data.modules[i+1];
    const primary={sauce:['clinic-public-source.md'],prd:['excel-prd.md'],workshop1:['clinic-public-source.md','workshop-1-example.md'],workshop2:['thedent-branches.xlsx','thedent-branches.csv']};
    const files=primary[m.id]||[];
    const extra=m.resources.filter(file=>!files.includes(file));
    $('#learning-surface').innerHTML=`<div class="learning-inner">${accountLinks()}<div class="mobile-tools"><button type="button" class="button small" data-action="resources">ไฟล์และพรอมป์</button><button type="button" class="button small" data-action="agenda">ตารางเรียน</button></div><div class="lesson-topline"><p class="eyebrow">${number(i+1)} / ${number(data.modules.length)} &nbsp; ${esc(m.label)}</p><div class="lesson-meta"><span>${esc(m.time)} · ${esc(m.minutes)} นาที</span><button type="button" class="text-button" data-action="share" aria-label="คัดลอกลิงก์บทนี้">ลิงก์บทนี้</button></div></div><header class="lesson-header"><h1>${esc(m.title)}</h1><p class="lesson-subtitle">${esc(m.subtitle)}</p></header>${m.id==='start'?startIntro():''}${files.length?`<div class="lesson-files">${resourcesInline(files)}</div>`:''}<div class="section-label"><h2>${m.id==='start'?'เริ่มด้วยกัน':`ทำตาม ${m.steps.length} ขั้นตอน`}</h2></div><div class="steps compact-steps">${m.steps.map((step,n)=>`<article class="step"><span class="step-index">${n+1}</span><div><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p></div></article>`).join('')}</div>${m.promptIds.length?`<div class="section-label"><h2>คัดลอกแล้วใช้ได้เลย</h2></div>${m.promptIds.map((id,n)=>promptCard(id,n)).join('')}`:''}${extensionLesson(m)}${extra.length?`<details class="lesson-extra"><summary>ไฟล์ประกอบและวิธีทำเพิ่มเติม</summary>${resourcesInline(extra)}${m.id==='sauce'?sourceLinks():''}</details>`:''}<div class="deliverable"><small>จะได้กลับไป</small><p>${esc(m.deliverable)}</p></div>${['prd','workshop2','followup'].includes(m.id)?bonusLesson():''}<footer class="lesson-footer">${i?`<a class="footer-back" href="#learn/${data.modules[i-1].id}">← บทก่อนหน้า</a>`:`<button type="button" class="footer-back" data-action="agenda">ดูตารางเรียน</button>`}<div><button type="button" class="button ${state.done.has(m.id)?'success':'primary'}" data-complete="${m.id}" data-next="${next?.id||''}">${next?'พร้อมแล้ว · ไปต่อ →':'เก็บบทเรียนนี้แล้ว ✓'}</button><div class="completed-label">${state.done.has(m.id)?'คุณทำเครื่องหมายบทนี้แล้ว':'บันทึกความคืบหน้าบนเครื่องนี้'}</div></div></footer></div>`;
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
    else state.module=data.modules.some(m=>m.id===route[1])?route[1]:state.module;
    document.body.classList.toggle('is-presenting',isPresent);$('#learning-surface').hidden=isPresent;$('#presentation-surface').hidden=!isPresent;$('#learn-mode').setAttribute('aria-pressed',!isPresent);$('#present-mode').setAttribute('aria-pressed',isPresent);
    renderNav();if(isPresent)renderPresentation();else renderLesson();persist();
    document.title=isPresent?`${number(state.slide)} · ${data.slides[state.slide-1].title.replace(/\n/g,' ')} | The Dent`:`${data.modules.find(m=>m.id===state.module).label} | The Dent AI Workshop`;
    window.scrollTo({top:0,behavior:'instant'});
  }
  function agendaTable(){return `<table class="agenda-table"><thead><tr><th scope="col">เวลา</th><th scope="col">กิจกรรม</th><th scope="col">นาที</th></tr></thead><tbody>${data.agenda.map(item=>`<tr><td>${esc(item.time)}</td><td>${esc(item.title)}</td><td>${item.minutes}</td></tr>`).join('')}</tbody></table>`;}
  function showAgenda(){showDialog('ตารางเรียน · 180 นาที',`<p class="dialog-intro">12 กันยายน 2026 · 14:00–17:00 น. รวมพัก 10 นาที</p>${agendaTable()}<div class="guide-note">หลังเรียนมีวิดีโอคอลติดตามผลของกลุ่ม 30 นาที ในอีก 1–2 สัปดาห์ นัดวันและเวลาร่วมกันภายหลัง</div>`);}
  function fileList(){return `<div class="file-list">${Object.entries(resourceNames).map(([file,title])=>`<div class="file-row"><div><strong>${esc(title)}</strong><small>${esc(file)}</small></div><div class="file-actions"><button type="button" class="button small" data-resource="${file}">เปิดดู</button><a class="button small" href="./resources/${file}" download aria-label="ดาวน์โหลด ${esc(title)}">↓ ดาวน์โหลด</a></div></div>`).join('')}</div>`;}
  function showResources(){showDialog('ไฟล์และพรอมป์ทั้งหมด',`<p class="dialog-intro">ไฟล์พร้อมใช้สำหรับเรียนและกลับไปทำต่อ</p><div class="button-row">${kitLink('ดาวน์โหลดชุดเรียนทั้งหมด')}</div>${fileList()}<div class="section-label"><h2>พรอมป์พร้อมใช้ ${data.prompts.length} ใบ</h2></div>${data.prompts.map((p,i)=>promptCard(p.id,i,false,'library')).join('')}${bonusLesson('library-bonus')}`);}
  function showResource(file){
    if(!Object.hasOwn(resourceNames,file))return;
    const resource=window.DENT_RESOURCES?.[file];
    showDialog(resourceNames[file],`<p class="dialog-intro">${esc(file)}</p><div class="button-row"><a class="button primary" href="./resources/${esc(file)}" download>ดาวน์โหลดไฟล์ ↓</a>${resource!==undefined?`<button type="button" class="button" data-copy-resource="${esc(file)}">คัดลอกข้อความ</button>`:''}<button type="button" class="text-button" data-action="resources">กลับไปดูไฟล์ทั้งหมด</button></div>${['clinic-public-source.md','website-source-notes.md','source-example.md'].includes(file)?sourceLinks():''}${resource!==undefined?`<pre class="resource-preview">${esc(resource)}</pre>`:`<p class="empty-note">ดาวน์โหลดไฟล์เพื่อเปิดในเครื่อง</p>`}`);
  }
  function showGuide(){showDialog('คู่มือผู้สอน · พร้อมเดินคลาส',`<p class="dialog-intro">ผู้เรียน 6–10 คน · ผู้สอน 1 คน + ผู้ช่วย 1 คน</p><div class="button-row"><a class="button primary" href="./resources/instructor-guide.md" download>ดาวน์โหลดคู่มือ ↓</a><a class="button" href="./resources/slide-notes.md" download>โน้ต ${data.slides.length} สไลด์ ↓</a><button type="button" class="button" data-action="print">พิมพ์สไลด์ / PDF</button></div><section class="guide-section"><h3>เตรียมก่อนเริ่ม</h3><p>เปิดบัญชี AI ดาวน์โหลดชุดเรียน และเตรียม Excel / CSV ที่ export มาจากระบบเดิม หากยังไม่มี ใช้ตารางสาขาที่เตรียมไว้ในชุดเรียน</p></section><section class="guide-section"><h3>เดินคลาส 3 ชั่วโมง</h3>${agendaTable()}</section><section class="guide-section"><h3>ผลงานวันนี้</h3><ul><li>โพสต์ 1 ชิ้น + คำตอบแอดมิน 3 แบบ</li><li>Excel ที่จัดข้อมูลแล้ว + หน้าสรุป + คำสั่งใช้รอบหน้า</li></ul><p>สาธิตให้ดูก่อน แล้วให้ทุกคนทำตาม ผู้ช่วยดูจุดที่ติดการเปิดและบันทึกไฟล์</p></section><section class="guide-section"><h3>ติดตามผล</h3><p>คอลกลุ่ม 30 นาที ในอีก 1–2 สัปดาห์ เปิดงานที่ลองใช้จริง แก้จุดติด แล้วเลือกงานถัดไป</p></section><div class="button-row"><button type="button" class="button small" data-resource="excel-csv-guide.md">คู่มือ Excel / CSV</button><button type="button" class="button small" data-resource="answer-key.md">ผลลัพธ์อ้างอิง</button></div>`);}
  function timerText(){const t=Math.max(0,timerRemaining);return `${number(Math.floor(t/60))}:${number(t%60)}`;}
  function tick(){timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if(!timerRemaining){clearInterval(timerInterval);timerInterval=undefined;const label=$('#timer-label');if(label)label.textContent='ครบเวลา';notify('ครบเวลาทำกิจกรรมแล้ว');}}
  function toggleTimer(){if(timerInterval){tick();clearInterval(timerInterval);timerInterval=undefined;}else{if(!timerRemaining)timerRemaining=timerDuration;timerEnd=Date.now()+timerRemaining*1000;timerInterval=setInterval(tick,250);}const label=$('#timer-label');if(label)label.textContent=timerInterval?'หยุดพัก':'จับเวลาต่อ';}
  function printSlides(){ $('#print-surface').innerHTML=data.slides.map(slideMarkup).join('');window.print(); }
  document.addEventListener('input',e=>{if(e.target.matches('[data-prompt-id]')){const id=e.target.dataset.promptId;drafts.set(id,e.target.value);document.querySelectorAll(`[data-prompt-id="${id}"]`).forEach(el=>{if(el!==e.target)el.value=e.target.value;});}});
  document.addEventListener('change',e=>{if(e.target.matches('[data-check]')){state.checks[e.target.dataset.check]=e.target.checked;persist();}if(e.target.id==='slide-select')go('present',e.target.value);if(e.target.id==='timer-duration'){clearInterval(timerInterval);timerInterval=undefined;timerDuration=Number(e.target.value)*60;timerRemaining=timerDuration;document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if($('#timer-label'))$('#timer-label').textContent='เริ่มจับเวลา';}});
  document.addEventListener('click',async e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.id==='learn-mode'){go('learn',state.module);return;}if(b.id==='present-mode'){const first=data.slides.find(s=>s.activityId===state.module);go('present',first?.id||1);return;}if(b.id==='dialog-close'){closeDialog();return;}
    if(b.dataset.slide){go('present',b.dataset.slide);return;}
    if(b.dataset.resource){showResource(b.dataset.resource);return;}
    if(b.dataset.copyResource){await copy(window.DENT_RESOURCES?.[b.dataset.copyResource]||'');return;}
    if(b.dataset.copyPrompt){const area=document.getElementById(b.dataset.input);await copy(area.value,area);return;}
    if(b.dataset.savePrompt){const p=data.prompts.find(p=>p.id===b.dataset.savePrompt);download(`prompt-${p.id}.md`,`# ${p.title}\n\n${document.getElementById(b.dataset.input).value}\n`);notify('บันทึกพรอมป์เป็นไฟล์แล้ว');return;}
    if(b.dataset.resetPrompt){const p=data.prompts.find(p=>p.id===b.dataset.resetPrompt);drafts.delete(p.id);document.querySelectorAll(`[data-prompt-id="${p.id}"]`).forEach(el=>el.value=p.text);notify('คืนข้อความตั้งต้นแล้ว');return;}
    if(b.dataset.complete){state.done.add(b.dataset.complete);persist();if(b.dataset.next){go('learn',b.dataset.next);}else{render();notify('เก็บความคืบหน้าแล้ว พร้อมนำไปลองกับงานจริง');}return;}
    switch(b.dataset.action){case 'logout':await logout(b);break;case 'present':go('present',1);break;case 'resources':showResources();break;case 'guide':showGuide();break;case 'agenda':showAgenda();break;case 'share':await copy(location.href,null,'คัดลอกลิงก์หน้านี้แล้ว');break;case 'print':printSlides();break;case 'fullscreen':try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notify('ใช้ปุ่มเต็มจอของเบราว์เซอร์แทนได้');}break;case 'timer':toggleTimer();break;case 'timer-reset':clearInterval(timerInterval);timerInterval=undefined;timerRemaining=timerDuration;document.querySelectorAll('.timer-readout').forEach(el=>el.textContent=timerText());if($('#timer-label'))$('#timer-label').textContent='เริ่มจับเวลา';break;}
  });
  dialog.addEventListener('click',e=>{if(e.target===dialog){const box=dialog.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)closeDialog();}});
  document.addEventListener('keydown',e=>{if(dialog.open||!document.body.classList.contains('is-presenting')||e.target.closest('textarea,input,select,button,a,summary'))return;let next;if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')next=state.slide+1;if(e.key==='ArrowLeft'||e.key==='PageUp')next=state.slide-1;if(e.key==='Home')next=1;if(e.key==='End')next=data.slides.length;if(next){e.preventDefault();go('present',Math.max(1,Math.min(data.slides.length,next)));}});
  window.addEventListener('hashchange',()=>{if(dialog.open)closeDialog();render();$('#main').focus({preventScroll:true});});
  window.addEventListener('beforeprint',()=>{if(!$('#print-surface').children.length)$('#print-surface').innerHTML=data.slides.map(slideMarkup).join('');});
  window.addEventListener('pagehide',()=>{if(timerInterval)clearInterval(timerInterval);});
  render();
})();
