(() => {
  'use strict';
  const STATUS = {pending_verification:'รอตรวจเงิน',payment_verified:'รอรับเข้าเรียน',admitted:'เปิดสิทธิ์แล้ว',rejected:'ยุติรายการ'};
  const NOTIFY = {pending:'รอแจ้งผู้จัด',sending:'กำลังแจ้งผู้จัด',sent:'แจ้งผู้จัดแล้ว',failed:'แจ้งผู้จัดไม่สำเร็จ',unconfigured:'ยังไม่ได้ตั้งช่องทางแจ้ง'};
  const REFERENCE = /^SAUCE-[0-9A-F]{32}$/;
  const validDate = x => typeof x === 'string' && Number.isFinite(Date.parse(x));
  const money = x => x == null || x === '' || !Number.isFinite(Number(x)) ? '—' : new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB'}).format(Number(x));
  const date = x => validDate(x) ? new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Bangkok'}).format(new Date(x))+' น.' : '—';
  const dueLate = (row,now=Date.now()) => ['pending_verification','payment_verified'].includes(row.status) && validDate(row.admissionDueAt) && Date.parse(row.admissionDueAt)<now;
  function filterRows(rows,status,query) {
    const q=String(query||'').trim().toLocaleLowerCase('th');
    return rows.filter(r=>(status==='all'||r.status===status) && (!q||[r.reference,r.name,r.email,r.contact].some(v=>String(v||'').toLocaleLowerCase('th').includes(q))));
  }
  function parseAmount(value) {
    const s=String(value).trim(); if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(s))throw new Error('กรอกยอดที่ตรวจจริงเป็นบาท ทศนิยมได้ไม่เกิน 2 ตำแหน่ง');
    const [a,b='']=s.split('.');const satang=Number(a)*100+Number(b.padEnd(2,'0'));
    if(!Number.isSafeInteger(satang)||satang<=0||satang>100000000)throw new Error('ยอดที่ตรวจจริงไม่ถูกต้อง');
    return (satang/100).toFixed(2);
  }
  function transferISO(local) {
    const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(local));
    if(!m)throw new Error('กรอกวันและเวลาโอนที่ตรวจแล้วเป็นเวลาไทย');
    const [y,mo,d,h,mi,se]=m.slice(1).map(v=>Number(v||0));
    if(y<2020||mo<1||mo>12||d<1||d>new Date(Date.UTC(y,mo,0)).getUTCDate()||h>23||mi>59||se>59)throw new Error('วันและเวลาโอนไม่ถูกต้อง');
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]||'00'}+07:00`;
  }
  // Pure helpers are testable without a browser, credentials or API requests.
  if(typeof module!=='undefined'&&module.exports)module.exports={filterRows,parseAmount,transferISO,dueLate,money};
  if(typeof document==='undefined')return;
  const $=id=>document.getElementById(id), API='/api/ai-source', KEY='meetAdminKey';
  let saved='';try{saved=sessionStorage.getItem(KEY)||'';}catch{}
  const state={key:saved,rows:[],selected:'',next:null,channels:{},busy:false,epoch:0,needsRefresh:false,controllers:new Set(),urls:new Set(),stats:null,statsNext:null,statsBusy:false,view:'learners',learnerId:'',learnerTab:'learning',learnerCache:new Map(),learnerError:''};
  function node(tag,cls,text) { const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n; }
  function notice(text,tone='info') { $('notice').textContent=text;$('notice').dataset.tone=tone;if(tone==='error')$('notice').scrollIntoView({block:'nearest'}); }
  function controls() {$('refresh').disabled=state.busy;$('load-more').disabled=state.busy;$('login-button').disabled=state.busy;$('search').disabled=state.busy;$('filter').disabled=state.busy;$('test-notification').disabled=state.busy;for(const set of $('detail').querySelectorAll('fieldset'))set.disabled=state.busy||state.needsRefresh;}
  function logout(message='ออกจากระบบแล้ว') {
    state.epoch++;for(const c of state.controllers)c.abort();state.controllers.clear();for(const u of state.urls)URL.revokeObjectURL(u);state.urls.clear();
    state.key='';state.rows=[];state.selected='';state.next=null;state.channels={};state.busy=false;state.needsRefresh=false;
    state.stats=null;state.statsNext=null;state.statsBusy=false;state.learnerId='';state.learnerError='';state.learnerCache.clear();$('learner-search').value='';$('learner-filter').value='all';$('learner-detail').replaceChildren();$('learner-metrics').replaceChildren();$('pending-count').hidden=true;showView('learners');
    for(const id of ['stats-counts','stats-learners','stats-campaigns','behavior-events','behavior-campaigns'])if($(id))$(id).replaceChildren();
    for(const id of ['stats-notice','stats-progress-note','stats-campaign-note','behavior-note','learner-list-note'])if($(id))$(id).textContent='';
    $('stats-more').hidden=true;$('stats-refresh').disabled=false;$('sales-refresh').disabled=false;
    try{sessionStorage.removeItem(KEY);}catch{}$('admin-key').value='';$('search').value='';$('filter').value='all';
    for(const id of ['queue','detail','summary'])if($(id))$(id).replaceChildren();$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;controls();notice(message);$('admin-key').focus();
  }
  async function request(query='',options={},binary=false,endpoint=API) {
    if(!state.key)throw new Error('เข้าสู่ระบบก่อนดำเนินการ');
    const epoch=state.epoch,controller=new AbortController();state.controllers.add(controller);let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;controller.abort();},30000);
    try {
      const response=await fetch(endpoint+query,{...options,headers:{...options.headers,'x-admin-key':state.key},credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
      if(epoch!==state.epoch)throw Object.assign(new Error('STALE_SESSION'),{stale:true});
      if(response.status===401){logout('รหัสผู้ดูแลไม่ถูกต้อง กรุณาเข้าสู่ระบบอีกครั้ง');throw Object.assign(new Error('UNAUTHORIZED'),{stale:true});}
      if(!response.ok){let data={};try{data=await response.json();}catch{}const err=new Error(typeof data.message==='string'?data.message:'ติดต่อระบบไม่สำเร็จ กรุณาลองใหม่');err.status=response.status;err.code=data.code;if(data.test===true)err.testResult={databaseWriteReadDelete:data.databaseWriteReadDelete===true,notification:data.notification?.status};throw err;}
      if(binary){const mime=(response.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();if(!['image/png','image/jpeg','application/pdf'].includes(mime))throw new Error('ชนิดไฟล์สลิปไม่ถูกต้อง');const blob=await response.blob();if(epoch!==state.epoch)throw Object.assign(new Error('STALE_SESSION'),{stale:true});return {blob,mime};}
      const data=await response.json();if(epoch!==state.epoch)throw Object.assign(new Error('STALE_SESSION'),{stale:true});if(data.ok!==true)throw new Error('ระบบยังไม่ยืนยันผล กรุณารีเฟรชรายการ');return data;
    }catch(error){if(epoch!==state.epoch)error.stale=true;if(timedOut)error.message='ระบบตอบช้า ยังยืนยันผลไม่ได้ กรุณารีเฟรชก่อนลองอีกครั้ง';throw error;}
    finally{clearTimeout(timeout);state.controllers.delete(controller);}
  }
  function badge(status){return node('span','badge '+(Object.hasOwn(STATUS,status)?status:''),STATUS[status]||'สถานะไม่รู้จัก');}
  function drawQueue() {
    const items=filterRows(state.rows,$('filter').value,$('search').value),fragment=document.createDocumentFragment();
    for(const row of items){const button=node('button','row');button.type='button';button.setAttribute('aria-pressed',String(state.selected===row.reference));const top=node('div','row-top');top.append(node('strong','',row.name||'ไม่ระบุชื่อ'),badge(row.status));button.append(top,node('p','small',row.reference),node('p','',money(row.verifiedAmountTHB??row.submittedAmountTHB)),node('p',dueLate(row)?'urgent small':'small','รับเข้าภายใน '+date(row.admissionDueAt)+(row.datesVerified?'':' · รอตรวจเวลาโอน')));button.addEventListener('click',()=>{if(state.busy)return;state.selected=row.reference;drawQueue();drawDetail();focusPanel($('detail'));});fragment.append(button);}
    if(!items.length)fragment.append(node('p','empty',state.rows.length?'ไม่พบรายการตามตัวกรอง':'ยังไม่มีรายการลงทะเบียน'));
    $('queue').replaceChildren(fragment);$('load-more').hidden=!state.next;updatePending();$('payment-workspace').classList.toggle('has-selection',Boolean(state.selected));
    const counts=[['โหลดแล้ว',state.rows.length],['รอตรวจเงิน',state.rows.filter(r=>r.status==='pending_verification').length],['รอรับเข้า',state.rows.filter(r=>r.status==='payment_verified').length]];
    $('summary').replaceChildren(...counts.map(([label,count])=>node('span','',`${label} ${count}`)));
  }
  function definition(pairs) {const dl=node('dl');for(const [label,value]of pairs)dl.append(node('dt','',label),node('dd','',value==null||value===''?'—':value));return dl;}
  const ACCESS={active:'เข้าเรียนได้',expired:'สิทธิ์หมดอายุ',revoked:'ยุติสิทธิ์',scheduled:'ยังไม่ถึงวันเริ่ม',verifiedAwaitingGrant:'รอเปิดสิทธิ์',pending:'รอตรวจเงิน'};
  const position=x=>{const n=Math.max(0,Math.floor(Number(x)||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
  const percent=row=>Math.min(100,Math.round(100*(Number(row.completedLessons)||0)/Math.max(1,Number(row.totalLessons)||0)));
  const latestLesson=row=>(row.lessons||[]).filter(l=>l.updatedAt).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt))[0];
  const started=row=>Boolean(row.lastActivityAt||row.completedLessons||(row.lessons||[]).some(l=>l.updatedAt));
  function accessBadge(row){return node('span','badge '+row.accessStatus,ACCESS[row.accessStatus]||'ตรวจสถานะสิทธิ์');}
  function showView(view){
    if(!['learners','payments','sales'].includes(view))return;
    state.view=view;
    for(const name of ['learners','payments','sales']){$('view-'+name).hidden=name!==view;$('nav-'+name).setAttribute('aria-pressed',String(name===view));}
  }
  function focusPanel(panel){panel.focus({preventScroll:true});if(matchMedia('(max-width:760px)').matches)panel.scrollIntoView({block:'start'});}
  function emptyPanel(title,description){const e=node('div','empty');e.append(node('span','empty-symbol','↖'),node('strong','',title),node('p','small',description));return e;}
  function meter(row){const p=node('progress','progress-track');p.max=Math.max(1,Number(row.totalLessons)||0);p.value=Number(row.completedLessons)||0;p.setAttribute('aria-label','ทำเครื่องหมายจบ '+row.completedLessons+' จาก '+row.totalLessons+' ตอน');return p;}
  function selectedLearner(){return state.learnerCache.get(state.learnerId)||state.stats?.learners?.find(x=>x.userId===state.learnerId);}
  function closeLearner(){state.learnerId='';state.learnerError='';drawLearners();drawLearnerDetail();const first=$('stats-learners').querySelector('button');if(first)first.focus({preventScroll:true});}
  function drawLearners(){
    const rows=state.stats?.learners||[],query=$('learner-search').value.trim().toLocaleLowerCase('th'),filter=$('learner-filter').value;
    const matches=rows.filter(r=>(!query||[r.name,r.email].some(v=>String(v||'').toLocaleLowerCase('th').includes(query)))&&(filter==='all'||filter==='not_started'&&!started(r)||filter==='learning'&&started(r)&&percent(r)<100||filter==='completed'&&percent(r)===100||filter==='downloaded'&&(r.downloads||[]).length));
    const fragment=document.createDocumentFragment();
    for(const row of matches){
      const button=node('button','person-card');button.type='button';button.setAttribute('aria-pressed',String(row.userId===state.learnerId));button.dataset.learner=row.userId;
      const top=node('div','person-top'),identity=node('div','identity');identity.append(node('strong','',row.name||'Clover'),node('span','small',row.email));
      top.append(node('span','avatar',Array.from(row.name||'C')[0]),identity,accessBadge(row));
      const progress=node('div','card-progress');progress.append(node('span','','ทำเครื่องหมายจบ '+row.completedLessons+'/'+row.totalLessons+' ตอน'),node('strong','',percent(row)+'%'));
      const latest=latestLesson(row),last=node('p','last-lesson');last.append(node('span','',latest?'ล่าสุด · ':'การเรียน · '),document.createTextNode(latest?.title||'ยังไม่มีบันทึกการเรียน'));
      const meta=node('div','card-meta');meta.append(node('span','','↓ '+(row.downloads||[]).length+' รายการไฟล์'),node('span','','ดูรายละเอียด →'));
      button.append(top,progress,meter(row),last,meta);button.addEventListener('click',()=>{state.learnerId=row.userId;state.learnerTab='learning';state.learnerError='';drawLearners();drawLearnerDetail();focusPanel($('learner-detail'));});fragment.append(button);
    }
    if(!matches.length)fragment.append(emptyPanel(rows.length?'ไม่พบนักเรียนที่ค้นหา':'ยังไม่มีผู้เรียนในรายการ',rows.length?'ลองเปลี่ยนคำค้นหาหรือตัวกรอง':'เมื่อยืนยันชำระและผูกบัญชีแล้ว รายชื่อจะปรากฏที่นี่'));
    $('stats-learners').replaceChildren(fragment);
    $('learner-list-note').textContent='แสดง '+matches.length+' จาก '+rows.length+' คนที่โหลดแล้ว'+(state.statsNext?' · โหลดเพิ่มเพื่อค้นหารายชื่อก่อนหน้า':'');
    $('stats-more').hidden=!state.statsNext;
    const values=[['นักเรียนในรายการ',rows.length],['มีบันทึกการเรียน',rows.filter(started).length],['ทำเครื่องหมายครบ',rows.filter(r=>percent(r)===100).length],['มีประวัติรับไฟล์',rows.filter(r=>(r.downloads||[]).length).length]];
    $('learner-metrics').replaceChildren(...values.map(([label,value])=>{const box=node('div','metric');box.append(node('strong','',value),node('span','',label));return box;}));
  }
  async function openLearner(userId){
    state.learnerId=userId;state.learnerTab='learning';state.learnerError='';showView('learners');drawLearners();drawLearnerDetail();focusPanel($('learner-detail'));
    const epoch=state.epoch;
    try{const data=await request('?'+new URLSearchParams({courseId:'ai-sauce',userId}),{},false,'/api/learn-admin');
      if(epoch!==state.epoch)return;
      if(data.learners?.[0])state.learnerCache.set(userId,data.learners[0]);
      else{state.learnerCache.delete(userId);if(state.learnerId===userId)state.learnerError='ยังไม่พบบัญชีนี้ในรายชื่อผู้เรียนที่เปิดสิทธิ์แล้ว';}
      if(state.learnerId===userId)drawLearnerDetail();
    }catch(error){if(!error.stale&&state.learnerId===userId){state.learnerError=error.message;drawLearnerDetail();}}
  }
  function drawLearnerDetail(){
    const panel=$('learner-detail');panel.replaceChildren();$('learner-workspace').classList.toggle('has-selection',Boolean(state.learnerId));
    if(!state.learnerId){panel.append(emptyPanel('เลือกนักเรียนที่อยากดูแล','ดูความคืบหน้าและไฟล์ที่รับได้ทีละคน'));return;}
    const back=node('button','back-button','← รายชื่อนักเรียน');back.type='button';back.addEventListener('click',closeLearner);
    const toolbar=node('div','detail-toolbar');toolbar.append(back,node('span','small','รายละเอียดนักเรียน'));panel.append(toolbar);
    if(state.learnerError){panel.append(node('p','notice',state.learnerError));const retry=node('button','','ลองโหลดข้อมูลอีกครั้ง');retry.type='button';retry.addEventListener('click',()=>openLearner(state.learnerId));panel.append(retry);return;}
    const row=selectedLearner();if(!row){panel.append(node('p','empty','กำลังโหลดข้อมูลนักเรียน…'));return;}
    const identity=node('div','detail-identity'),name=node('div');name.append(node('h2','',row.name||'Clover'),node('p','small',row.email));identity.append(node('span','avatar',Array.from(row.name||'C')[0]),name);panel.append(identity);
    const strip=node('div','access-strip');strip.append(accessBadge(row),node('span','','สิทธิ์ถึง '+date(row.expiresAt)));panel.append(strip);
    const tabs=node('div','detail-tabs');tabs.setAttribute('aria-label','ข้อมูลนักเรียน');
    for(const [id,label]of [['learning','การเรียน'],['files','ไฟล์ที่รับ · '+(row.downloads||[]).length]]){const b=node('button','',label);b.type='button';b.setAttribute('aria-pressed',String(state.learnerTab===id));b.addEventListener('click',()=>{state.learnerTab=id;drawLearnerDetail();$('learner-detail').querySelector('.detail-tabs button[aria-pressed=true]').focus({preventScroll:true});});tabs.append(b);}panel.append(tabs);
    if(state.learnerTab==='files'){
      const list=node('ul','file-list');
      for(const f of row.downloads||[]){const item=node('li','file-item'),body=node('div'),ext=(f.filename||'').split('.').pop().toUpperCase();
        body.append(node('h3','',f.title||f.filename),node('p','',f.filename));if(f.context||f.group)body.append(node('p','',[f.group,(f.lessonIds||[]).length>2?'ใช้ร่วมใน '+f.lessonIds.length+' ตอน':f.context].filter(Boolean).join(' · ')));
        body.append(node('p','','กดรับ '+f.requests+' ครั้ง · ล่าสุด '+date(f.lastRequestedAt)));item.append(node('span','file-icon',ext.slice(0,5)||'FILE'),body);list.append(item);
      }
      if(!(row.downloads||[]).length)panel.append(emptyPanel('ยังไม่มีประวัติรับไฟล์','ประวัติเริ่มเก็บตั้งแต่ 21 ก.ย. 2026'));
      else panel.append(node('p','small','รับไฟล์ล่าสุด · '+date(row.lastDownloadAt||(row.downloads||[])[0]?.lastRequestedAt)),list);
      const note=node('details','help');note.append(node('summary','','เกี่ยวกับประวัติไฟล์'),node('p','','บันทึกเมื่อระบบอนุญาตให้ขอไฟล์ ไม่ใช่หลักฐานว่าเซฟลงเครื่องสำเร็จ ไม่นับการเปิดสมุดงานออนไลน์หรือไฟล์ที่ผู้เรียนสร้างและเซฟในสมุดงาน'));panel.append(note);
    }else{
      const heading=node('div','progress-heading'),label=node('div');label.append(node('p','','ทำเครื่องหมายจบ '+row.completedLessons+' / '+row.totalLessons+' ตอน'),node('p','small','รวมทุกตอนในเส้นทางเรียน'));heading.append(label,node('strong','',percent(row)+'%'));panel.append(heading,meter(row));
      panel.append(node('p','small','บันทึกการเรียนล่าสุด · '+(row.lastActivityAt?date(row.lastActivityAt):'ยังไม่มีบันทึก')));
      const list=node('ol','stats-lessons');let group='';
      for(const [index,lesson]of (row.lessons||[]).entries()){
        if(lesson.groupTitle&&lesson.groupTitle!==group){group=lesson.groupTitle;const title=node('li','small',group);title.style.marginTop='22px';list.append(title);}
        const item=node('li','lesson-row '+(lesson.completed?'complete':lesson.updatedAt?'started':'')),body=node('div');
        body.append(node('strong','',lesson.title),node('p','',lesson.completed?'ทำเครื่องหมายจบแล้ว':lesson.updatedAt?'มีบันทึกการเรียน':'ยังไม่มีบันทึก'));
        if(lesson.hasVideo!==false&&lesson.updatedAt)body.append(node('p','','ตำแหน่งล่าสุด '+position(lesson.positionSeconds)+' · ไกลสุด '+position(lesson.maxPositionSeconds)));
        item.append(node('span','lesson-number',lesson.completed?'✓':index+1),body);list.append(item);
      }panel.append(list);
      const note=node('p','small','ตำแหน่งวิดีโอและปุ่มเรียนจบเป็นบันทึกจากผู้เรียน ไม่ยืนยันว่าดูครบทุกวินาที');note.style.marginTop='18px';panel.append(note);
    }
  }
  function drawStats() {
    const data=state.stats;if(!data)return;
    const labels={enrolled:'ลงทะเบียน',pending:'รอตรวจเงิน',verifiedAwaitingGrant:'รอเปิดสิทธิ์',active:'เข้าเรียนได้',expired:'สิทธิ์หมดอายุ',revoked:'ยุติสิทธิ์',scheduled:'สิทธิ์ยังไม่เริ่ม'};
    $('stats-counts').replaceChildren(...Object.entries(labels).map(([key,label])=>node('span','',`${label} ${Number(data.counts?.[key])||0}`)));
    $('stats-progress-note').textContent=data.progressNote||'';$('stats-campaign-note').textContent=(data.campaignNote||'')+' · แสดงไม่เกิน 200 แหล่ง';
    drawLearners();drawLearnerDetail();updatePending();
    const table=node('table','stats-table'),head=node('thead'),tr=node('tr');for(const label of ['แหล่งที่มา / แคมเปญ','ลงทะเบียน','รอตรวจเงิน','เข้าเรียนได้'])tr.append(node('th','',label));head.append(tr);table.append(head);
    const body=node('tbody');for(const row of data.campaigns||[]){const tr=node('tr');for(const value of [[row.source,row.medium,row.campaign].filter(Boolean).join(' / '),row.enrolled,row.pending,row.active])tr.append(node('td','',value));body.append(tr);}table.append(body);$('stats-campaigns').replaceChildren(table);
  }
  function updatePending(){const count=Math.max(state.rows.filter(r=>['pending_verification','payment_verified'].includes(r.status)).length,(Number(state.stats?.counts?.pending)||0)+(Number(state.stats?.counts?.verifiedAwaitingGrant)||0));$('pending-count').textContent=count;$('pending-count').hidden=!count;}
  async function loadBehavior(){
    if(!$('behavior-events'))return;
    try{const data=await request('',{},false,'/api/sales-behavior');
      $('behavior-note').textContent=data.note;
      const labels={page_view:'เข้าหน้า',section_offer:'เห็นข้อเสนอ',section_bonus:'เห็นโบนัส',purchase_click:'กดดู QR',qr_view:'เห็น QR',identity_start:'เริ่มยืนยันอีเมล',receipt_start:'เริ่มกรอกสลิป',engaged_30:'อยู่ในหน้า 30 วินาที',engaged_60:'อยู่ในหน้า 1 นาที',receipt_error:'ส่งสลิปติดขัด',payment_error:'โหลด QR ติดขัด'};
      $('behavior-events').replaceChildren(...data.events.filter(e=>labels[e.event]).map(e=>node('span','',labels[e.event]+' · '+e.visitors+' เบราว์เซอร์')));
      const table=node('table','stats-table'),head=node('tr');for(const label of ['Source / Medium / Campaign / คลิป','เข้าหน้า','กด QR','เห็น QR','ส่งสลิป','ตรวจชำระแล้ว','อัตราซื้อ'])head.append(node('th','',label));table.append(head);
      for(const row of data.campaigns){const tr=node('tr'),c=row.campaign||{};for(const v of [[c.utm_source,c.utm_medium,c.utm_campaign,c.utm_content,c.utm_term].filter(Boolean).join(' / ')||c.referrer_host||'ไม่ระบุ',row.visitors,row.clicked,row.qr,row.submitted,row.paid,row.visitors?(100*row.paid/row.visitors).toFixed(1)+'%':'—'])tr.append(node('td','',v));table.append(tr);}
      $('behavior-campaigns').replaceChildren(table);
    }catch(e){if(!e.stale)$('behavior-note').textContent='ยังโหลดพฤติกรรมไม่ได้ กดรีเฟรชสถิติอีกครั้ง';}
  }
  async function loadStats(more=false) {
    if(!state.key||state.statsBusy)return;const epoch=state.epoch;state.statsBusy=true;$('stats-refresh').disabled=true;$('sales-refresh').disabled=true;$('stats-more').disabled=true;$('stats-notice').textContent='กำลังโหลดสถิติ…';
    try{if(!more)loadBehavior();const query=new URLSearchParams({courseId:'ai-sauce',limit:'50'});if(more&&state.statsNext)query.set('before',state.statsNext);
      const data=await request('?'+query,{},false,'/api/learn-admin');if(!Array.isArray(data.learners)||!Array.isArray(data.campaigns)||!data.counts)throw new Error('ข้อมูลสถิติไม่ครบ');
      if(more)data.learners=[...new Map([...(state.stats?.learners||[]),...data.learners].map(row=>[row.userId,row])).values()];state.stats=data;if(!more)state.learnerCache.clear();for(const row of data.learners)state.learnerCache.set(row.userId,row);state.statsNext=data.nextCursor||null;
      const selectedId=state.learnerId;
      if(selectedId&&!data.learners.some(row=>row.userId===selectedId)){
        try{const detail=await request('?'+new URLSearchParams({courseId:'ai-sauce',userId:selectedId}),{},false,'/api/learn-admin');if(detail.learners?.[0])state.learnerCache.set(selectedId,detail.learners[0]);if(state.learnerId===selectedId)state.learnerError=detail.learners?.[0]?'':'ยังไม่พบสิทธิ์ของบัญชีนี้ในรายการ';}
        catch(error){if(error.stale)throw error;if(state.learnerId===selectedId)state.learnerError='ยังอัปเดตข้อมูลของคนนี้ไม่ได้ กรุณาลองอีกครั้ง';}
      }else state.learnerError='';
      drawStats();if(state.rows.find(r=>r.reference===state.selected)?.status==='admitted')drawDetail();$('stats-notice').textContent='อัปเดต '+date(data.generatedAt)+' · '+data.learners.length+' คนที่โหลดแล้ว';
    }catch(error){if(!error.stale)$('stats-notice').textContent=error.message;}
    finally{if(epoch===state.epoch){state.statsBusy=false;$('stats-refresh').disabled=false;$('sales-refresh').disabled=false;$('stats-more').disabled=false;}}
  }
  function field(labelText,type,name) {const label=node('label','',labelText),input=node('input');input.type=type;input.name=name;input.required=true;label.append(input);return {label,input};}
  function check(text) {const label=node('label','check'),input=node('input');input.type='checkbox';input.required=true;label.append(input,node('span','',text));return {label,input};}
  function noteField(value='') {const label=node('label','','หมายเหตุ (ถ้ามี)'),input=node('textarea');input.name='note';input.rows=3;input.maxLength=1000;input.value=value;label.append(input);return {label,input};}
  async function showReceipt(row,button,container){
    if(container.childNodes.length){container.hidden=!container.hidden;button.textContent=container.hidden?'ดูสลิป':'ซ่อนสลิป';return;}
    const epoch=state.epoch;button.disabled=true;button.textContent='กำลังเปิดสลิป…';
    try{const {blob,mime}=await request('?'+new URLSearchParams({action:'receipt',reference:row.reference}),{},true);
      if(epoch!==state.epoch||!container.isConnected)return;
      const url=URL.createObjectURL(blob);state.urls.add(url);
      if(mime.startsWith('image/')){const image=node('img','receipt-image');image.src=url;image.alt='สลิปที่แนบมากับรายการนี้';container.append(image);}
      else{const link=node('a','button','เปิดสลิป PDF');link.href=url;link.target='_blank';link.rel='noopener';container.append(link);}
      container.hidden=false;button.textContent='ซ่อนสลิป';
    }catch(error){if(!error.stale){notice(error.message,'error');button.textContent='ลองเปิดสลิปอีกครั้ง';}}finally{if(epoch===state.epoch)button.disabled=false;}
  }
  async function downloadReceipt(row,button) {
    const epoch=state.epoch;button.disabled=true;
    try{const {blob,mime}=await request('?'+new URLSearchParams({action:'receipt',reference:row.reference}),{},true);if(epoch!==state.epoch)return;const url=URL.createObjectURL(blob);state.urls.add(url);const link=node('a');link.href=url;link.download=row.reference+'.'+({'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'}[mime]);link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);state.urls.delete(url);},1000);notice('ดาวน์โหลดสลิปแล้ว เปิดไฟล์และตรวจยอดเงินจริงในบัญชีก่อนยืนยัน');}
    catch(error){if(!error.stale)notice(error.message,'error');}finally{if(epoch===state.epoch)button.disabled=false;}
  }
  async function mutate(payload,fieldset) {
    if(state.busy||state.needsRefresh)return;const epoch=state.epoch;let succeeded=false;state.busy=true;if(fieldset)fieldset.disabled=true;controls();
    try{const result=await request('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(epoch!==state.epoch)return;
      if(result.registration){if(result.registration.reference!==payload.reference)throw new Error('ผลตอบกลับไม่ตรงรายการ กรุณารีเฟรช');state.rows=state.rows.map(r=>r.reference===payload.reference?result.registration:r);}
      else if(payload.action==='retry_notification'&&result.notification){state.rows=state.rows.map(r=>r.reference===payload.reference?{...r,notification:result.notification}:r);}
      else throw new Error('ยังยืนยันผลไม่ได้ กรุณารีเฟรชรายการ');
      succeeded=true;notice(payload.action==='verify_payment'?(result.registration?.status==='admitted'?'ยืนยันเงินและเปิดสิทธิ์เรียน 1 ปีแล้ว ผู้เรียนเข้าที่ /learn ได้ทันที':'ยืนยันเงินแล้ว แต่ยังไม่เปิดสิทธิ์: ต้องผูกบัญชีผู้เรียนก่อน'):payload.action==='mark_admitted'?'บันทึกว่ารับเข้าเรียนแล้ว':payload.action==='reject'?'ยุติรายการและเก็บเหตุผลแล้ว':result.notification?.status==='sent'?'แจ้งผู้จัดแล้ว':'การแจ้งผู้จัดยังไม่สำเร็จ ตรวจช่องทางแจ้งเตือนก่อนลองอีกครั้ง',payload.action==='retry_notification'&&result.notification?.status!=='sent'?'error':'info');
    }catch(error){if(!error.stale){state.needsRefresh=!error.status||error.status>=500||error.status===409;notice(error.message+(state.needsRefresh?' · รีเฟรชสถานะก่อนดำเนินการซ้ำ':''),'error');}}
    finally{if(epoch===state.epoch){state.busy=false;controls();drawQueue();drawDetail();if(succeeded&&['verify_payment','mark_admitted'].includes(payload.action))focusPanel($('detail'));loadStats();}}
  }
  async function testNotification() {
    if(state.busy)return;const epoch=state.epoch;state.busy=true;controls();notice('กำลังทดสอบการบันทึกข้อมูลและส่งข้อความ TEST ไป Telegram…');
    try{const result=await request('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test_notification'})});
      if(result.test!==true||result.databaseWriteReadDelete!==true||result.notification?.status!=='sent')throw new Error('ระบบยังยืนยันผลทดสอบไม่ครบ กรุณาตรวจ Telegram และลองอีกครั้งเมื่อพร้อม');
      notice('ทดสอบผ่าน: บันทึก อ่าน และลบข้อมูลทดสอบสำเร็จ · ส่งข้อความ TEST ไป Telegram แล้ว');
    }catch(error){if(!error.stale)notice(error.testResult?'บันทึก อ่าน และลบข้อมูลทดสอบ'+(error.testResult.databaseWriteReadDelete?'สำเร็จ':'ยังไม่ยืนยัน')+' · Telegram ยังส่งไม่สำเร็จ ตรวจการตั้งค่าช่องทางแจ้งเตือน':error.message,'error');}
    finally{if(epoch===state.epoch){state.busy=false;controls();}}
  }
  function drawDetail() {
    const panel=$('detail'),row=state.rows.find(r=>r.reference===state.selected);for(const url of state.urls)URL.revokeObjectURL(url);state.urls.clear();panel.replaceChildren();if(!row){panel.append(node('p','empty','เลือกรายการเพื่อดูสลิปและตรวจข้อมูล'));return;}
    const back=node('button','mobile-back back-button','← กลับไปรายการชำระ');back.type='button';back.addEventListener('click',()=>{state.selected='';drawQueue();drawDetail();$('queue').querySelector('button')?.focus({preventScroll:true});});panel.append(back);const top=node('div','detail-title');top.append(node('h2','',row.name||'ไม่ระบุชื่อ'),badge(row.status));panel.append(top,node('p','reference',row.reference),definition([['อีเมล',row.email],['ช่องทางติดต่อ',row.contact],['ส่งข้อมูลเมื่อ',date(row.createdAt)],['ราคาที่ระบบแจ้ง',money(row.quotedAmountTHB)],['ยอดที่ผู้ซื้อแจ้ง',money(row.submittedAmountTHB)],['เวลาโอนที่ผู้ซื้อแจ้ง',date(row.submittedTransferredAt)]]));
    if(row.status==='admitted'){
      const learner=state.learnerCache.get(row.accountId)||state.stats?.learners?.find(x=>x.userId===row.accountId);
      const access=node('section','section');access.append(node('h3','',learner?.accessStatus==='active'?'เปิดสิทธิ์เรียนแล้ว':'รายการที่เปิดสิทธิ์แล้ว'),node('p','',learner?.accessStatus==='active'?'ผู้เรียนใช้บัญชี myClover อีเมล '+row.email+' เข้าห้องเรียนได้เลย ไม่ต้องกรอกรหัสโอนหรือรหัสเปิดคอร์ส':'บัญชีผู้เรียน '+row.email+' · '+(learner?'สถานะปัจจุบัน: '+(ACCESS[learner.accessStatus]||'ต้องตรวจสิทธิ์'):'กดดูข้อมูลนักเรียนเพื่อตรวจสิทธิ์ปัจจุบัน')));
      access.append(node('p','',learner?.lastActivityAt?'มีบันทึกการเรียนแล้ว · ล่าสุด '+date(learner.lastActivityAt):learner?'ยังไม่มีบันทึกการเรียน':'เปิดดูข้อมูลนักเรียนเพื่อตรวจประวัติการเรียน'));
      if(learner)access.append(definition([['สถานะสิทธิ์ปัจจุบัน',({active:'ใช้งานได้',expired:'หมดอายุ',revoked:'ยุติสิทธิ์',scheduled:'ยังไม่ถึงวันเริ่ม'})[learner.accessStatus]||'ตรวจสถานะในสถิติ'],['สิทธิ์ถึงวันที่',date(learner.expiresAt)]]));
      if(row.accountId){const student=node('button','primary','ดูการเรียนและไฟล์ที่รับ →');student.type='button';student.addEventListener('click',()=>openLearner(row.accountId));access.append(student);}const link=node('a','button','เปิดหน้าห้องเรียน /learn');link.href='/learn/?course=ai-sauce';link.target='_blank';link.rel='noopener';access.append(link,node('p','small','ลิงก์นี้เปิดด้วยบัญชีของผู้กด หากครูเปิดเองจะเป็นบัญชีครู ไม่ใช่การทดสอบแทนนักเรียน'));
      const copy=node('button','','คัดลอกข้อความแจ้งผู้เรียน');copy.type='button';copy.disabled=!row.accountId||Boolean(learner&&learner.accessStatus!=='active');
      copy.addEventListener('click',async()=>{copy.disabled=true;try{
        const data=await request('?'+new URLSearchParams({courseId:'ai-sauce',userId:row.accountId}),{},false,'/api/learn-admin'),fresh=data.learners?.[0];
        if(!fresh||fresh.accessStatus!=='active'){notice('บัญชีนี้ยังไม่มีสิทธิ์ที่ใช้งานได้ กรุณาตรวจข้อมูลนักเรียนก่อนแจ้งให้เข้าเรียน','error');return;}
        state.learnerCache.set(row.accountId,fresh);
        await navigator.clipboard.writeText('เปิดสิทธิ์คอร์ส AI ใส่ซอสให้แล้วครับ เข้าเรียนที่ https://www.myclover.com/learn/?course=ai-sauce ด้วยบัญชีอีเมล '+row.email+' ได้เลย ไม่ต้องกรอกรหัสโอนหรือรหัสเปิดคอร์สครับ');notice('คัดลอกข้อความแล้ว ยังไม่ได้ส่งให้ผู้เรียน');
      }catch(error){if(!error.stale)notice('ยังคัดลอกไม่ได้ กรุณาลองใหม่หรือตรวจสถานะสิทธิ์ก่อนแจ้งผู้เรียน','error');}finally{if(copy.isConnected)copy.disabled=false;}});access.append(copy);panel.append(access);
    }
    const receiptActions=node('div','actions'),receiptView=node('div'),viewReceipt=node('button','','ดูสลิป'),receipt=node('button','','ดาวน์โหลดสลิป');receiptView.hidden=true;viewReceipt.type='button';viewReceipt.addEventListener('click',()=>showReceipt(row,viewReceipt,receiptView));receipt.type='button';receipt.addEventListener('click',()=>downloadReceipt(row,receipt));receiptActions.append(viewReceipt,receipt);panel.append(receiptActions,node('p','small',row.receipt?.name||'สลิปของรายการนี้'),receiptView);
    if(row.legacyBindingEligible===true){
      const form=node('form','section'),set=node('fieldset'),email=field('อีเมลบัญชีผู้เรียนที่ยืนยันแล้ว','email','accountEmail'),note=noteField(),submit=node('button','','ผูกรายการเดิมกับบัญชีนี้');
      email.input.value=row.email||'';email.input.maxLength=120;note.input.required=true;submit.type='submit';set.disabled=state.busy||state.needsRefresh;
      set.append(node('h3','','เชื่อมรายการชำระเดิม'),node('p','detail-hint','ตรวจว่าอีเมลนี้ตรงกับอีเมลในรายการ และเจ้าของบัญชียืนยันอีเมลแล้ว พร้อมบันทึกเหตุผล การผูกบัญชีอย่างเดียวไม่ยืนยันยอดเงินและไม่เปิดสิทธิ์เรียน'),email.label,note.label,submit);form.append(set);
      form.addEventListener('submit',event=>{event.preventDefault();const reason=note.input.value.trim();if(!reason){notice('บันทึกเหตุผลที่ผูกบัญชีก่อน','error');return;}mutate({action:'bind_account',reference:row.reference,accountEmail:email.input.value.trim(),note:reason},set);});panel.append(form);
    }
    const deadline=node('details','section');deadline.append(node('summary','','กำหนดเวลาและเงื่อนไข'),definition([['รับเข้าเรียนภายใน',date(row.admissionDueAt)],['กรอบคืนเงินสิ้นสุด',date(row.guaranteeUntil)],['อ้างจาก',row.datesVerified?'วันเวลาโอนที่ผู้จัดตรวจแล้ว':'วันเวลาโอนที่ผู้ซื้อแจ้ง — ยังไม่ตรวจยืนยัน']]));if(dueLate(row))deadline.append(node('p','urgent','เลยกำหนดรับเข้าเรียนตามเวลานี้แล้ว'));deadline.append(node('p','small','รับเข้าภายใน 1 วัน และกรอบคืนเงิน 30 วันนับจากเวลาโอน เงื่อนไขคืนเงินยังต้องพิจารณาจากการเรียนและการลองใช้จริง'));panel.append(deadline);
    if(state.needsRefresh)panel.append(node('p','detail-hint','รีเฟรชข้อมูลก่อนทำรายการต่อ เพื่อเช็กว่าคำขอล่าสุดถูกบันทึกแล้วหรือยัง'));
    if(row.status==='pending_verification'){
      const form=node('form','section'),set=node('fieldset'),fields=node('div','fields'),amount=field('ยอดเงินเข้าที่ตรวจจริง (บาท)','number','verifiedAmountTHB'),when=field('เวลาโอนที่ตรวจแล้ว (เวลาไทย)','datetime-local','verifiedTransferredAt'),checked=check('ฉันตรวจสลิปและยอดเงินเข้าบัญชีจริงของรายการนี้แล้ว'),note=noteField(row.ownerNote),submit=node('button','primary','ยืนยันเงินและเปิดสิทธิ์เรียน 1 ปี');
      amount.input.min='0.01';amount.input.max='1000000';amount.input.step='0.01';when.input.step='1';when.input.min='2020-01-01T00:00';submit.type='submit';submit.disabled=true;set.disabled=state.busy||state.needsRefresh;checked.input.addEventListener('change',()=>submit.disabled=!checked.input.checked||state.busy||state.needsRefresh);
      amount.input.value=row.submittedAmountTHB || '';if(validDate(row.submittedTransferredAt))when.input.value=new Date(Date.parse(row.submittedTransferredAt)+7*3600000).toISOString().slice(0,19);fields.append(amount.label,when.label);set.append(node('h3','','ตรวจการชำระเงิน'),node('p','detail-hint','เปิดสลิปและเทียบรายการเงินเข้าในบัญชีจริง แล้วกรอกยอดกับเวลาโอนที่ตรวจพบ ข้อมูลที่ผู้ซื้อแจ้งยังไม่ใช่การยืนยันเงินเข้า'),fields,note.label,checked.label,submit);form.append(set);form.addEventListener('submit',event=>{event.preventDefault();if(!checked.input.checked)return;try{mutate({reference:row.reference,action:'verify_payment',verifiedAmountTHB:parseAmount(amount.input.value),verifiedTransferredAt:transferISO(when.input.value),confirmedReceived:true,note:note.input.value},set);}catch(error){notice(error.message,'error');}});panel.append(form);
      const rejectDetails=node('details','section'),rejectForm=node('form'),rejectSet=node('fieldset'),reason=noteField(),rejectButton=node('button','','ยุติรายการนี้');reason.label.firstChild.textContent='เหตุผลที่ยุติรายการ';reason.input.required=true;reason.input.name='rejectionNote';rejectButton.type='submit';rejectSet.disabled=state.busy||state.needsRefresh;rejectSet.append(node('p','small','ใช้กับข้อมูลไม่ถูกต้องหรือรายการทดสอบ เหตุผลจะถูกเก็บในประวัติ ไม่ใช่การคืนเงินหรือยกเลิกสิทธิ์ myClover'),reason.label,rejectButton);rejectForm.append(rejectSet);rejectForm.addEventListener('submit',event=>{event.preventDefault();const note=reason.input.value.trim();if(!note){notice('ใส่เหตุผลก่อนยุติรายการ','error');return;}mutate({reference:row.reference,action:'reject',note},rejectSet);});rejectDetails.append(node('summary','','ยุติรายการที่ไม่ถูกต้อง'),rejectForm);panel.append(rejectDetails);
    }else if(['payment_verified','admitted'].includes(row.status)){
      const verified=node('section','section');verified.append(node('h3','','การชำระเงินที่ตรวจแล้ว'),definition([['ยอดเงินเข้า',money(row.verifiedAmountTHB)],['เวลาโอนที่ตรวจแล้ว',date(row.verifiedTransferredAt)],['บันทึกการตรวจเมื่อ',date(row.verifiedAt)]]));panel.append(verified);
      if(row.status==='payment_verified'&&!row.accountId)panel.append(node('p','detail-hint','ผูกรายการกับบัญชีผู้เรียนที่ยืนยันอีเมลแล้วก่อนเปิดสิทธิ์เรียน'));
      else if(row.status==='payment_verified'){
        const form=node('form','section'),set=node('fieldset'),checked=check('ฉันตรวจบัญชีผู้เรียนแล้วและต้องการเปิดสิทธิ์ 1 ปี'),note=noteField(row.ownerNote),submit=node('button','primary','เปิดสิทธิ์เรียน 1 ปี');submit.type='submit';submit.disabled=true;set.disabled=state.busy||state.needsRefresh;checked.input.addEventListener('change',()=>submit.disabled=!checked.input.checked||state.busy||state.needsRefresh);set.append(node('h3','','รับเข้าเรียน'),node('p','small','ปุ่มนี้จะเปิดสิทธิ์ให้บัญชีที่ผูกกับรายการชำระ ผู้เรียนเปิดคอร์สได้ที่ /learn'),note.label,checked.label,submit);form.append(set);form.addEventListener('submit',event=>{event.preventDefault();if(checked.input.checked)mutate({reference:row.reference,action:'mark_admitted',accessSent:true,note:note.input.value},set);});panel.append(form);
      }else panel.append(node('p','notice','บันทึกรับเข้าเรียนเมื่อ '+date(row.admittedAt)));
    }
    if(row.status==='pending_verification'){const form=panel.querySelector('form.section:has([name=verifiedAmountTHB])');if(form)panel.insertBefore(form,deadline);}
    if(row.ownerNote)panel.append(node('h3','section','หมายเหตุที่บันทึกไว้'),node('p','',row.ownerNote));
    const notification=node('details','section');notification.append(node('summary','','การแจ้งผู้จัด'),node('p','',NOTIFY[row.notification?.status]||'ยังไม่ทราบสถานะ'));if(row.notification?.code)notification.append(node('p','small',row.notification.code));const retry=node('button','','ลองแจ้งผู้จัดอีกครั้ง');retry.type='button';retry.disabled=state.busy||state.needsRefresh||state.channels.telegram!==true||!['pending','failed','unconfigured'].includes(row.notification?.status);retry.addEventListener('click',()=>mutate({reference:row.reference,action:'retry_notification'}));notification.append(retry);if(state.channels.telegram!==true)notification.append(node('p','small','ยังไม่ได้ตั้งช่องทางแจ้งผู้จัด'));panel.append(notification);
    if(Array.isArray(row.history)&&row.history.length){const details=node('details','section'),list=node('ol','history'),names={verify_payment:'ตรวจเงินเข้า',mark_admitted:'บันทึกรับเข้าเรียน',reject:'ยุติรายการ'};details.append(node('summary','','ประวัติรายการ'));for(const h of row.history){const li=node('li','',(names[h.action]||'อัปเดตรายการ')+' · '+date(h.at));if(h.note)li.append(node('p','small',h.note));list.append(li);}details.append(list);panel.append(details);}
  }
  async function load(more=false) {
    if(state.busy)return;const epoch=state.epoch;state.busy=true;controls();notice(more?'กำลังโหลดรายการก่อนหน้า…':'กำลังโหลดรายการ…');
    try{const query=new URLSearchParams({action:'list',limit:'100'});if(more&&state.next)query.set('before',state.next);const data=await request('?'+query);if(!Array.isArray(data.registrations))throw new Error('รูปแบบรายการไม่ถูกต้อง');if(data.registrations.some(r=>!r||!REFERENCE.test(r.reference)))throw new Error('ข้อมูลรายการไม่ครบ');
      const combined=more?[...state.rows,...data.registrations]:data.registrations;state.rows=[...new Map(combined.map(r=>[r.reference,r])).values()];state.next=typeof data.nextCursor==='string'&&/^[1-9]\d*$/.test(data.nextCursor)?data.nextCursor:null;state.channels=data.channels||{};state.needsRefresh=false;if(!state.rows.some(r=>r.reference===state.selected))state.selected='';
      try{sessionStorage.setItem(KEY,state.key);}catch{}$('admin-key').value='';$('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;drawQueue();drawDetail();notice('อัปเดตรายการแล้ว · '+state.rows.length+' รายการที่โหลด');if(!more)loadStats();
    }catch(error){if(!error.stale)notice(error.message,'error');}
    finally{if(epoch===state.epoch){state.busy=false;controls();}}
  }
  $('login-form').addEventListener('submit',event=>{event.preventDefault();if(state.busy)return;state.key=$('admin-key').value.trim();if(state.key)load();});
  $('logout').addEventListener('click',()=>logout());$('refresh').addEventListener('click',()=>load());$('load-more').addEventListener('click',()=>load(true));
  $('test-notification').addEventListener('click',testNotification);
  $('stats-refresh').addEventListener('click',()=>loadStats());$('sales-refresh').addEventListener('click',()=>loadStats());$('stats-more').addEventListener('click',()=>loadStats(true));
  for(const id of ['search','filter'])$(id).addEventListener('input',()=>{state.selected='';drawQueue();drawDetail();});
  for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>showView(button.dataset.view));
  for(const id of ['learner-search','learner-filter'])$(id).addEventListener('input',()=>{state.learnerId='';state.learnerError='';drawLearners();drawLearnerDetail();});
  if(state.key)load();
})();
