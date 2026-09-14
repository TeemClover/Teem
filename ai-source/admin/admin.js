(() => {
  'use strict';
  const STATUS = {pending_verification:'รอตรวจเงิน',payment_verified:'รอรับเข้าเรียน',admitted:'รับเข้าเรียนแล้ว',rejected:'ยุติรายการ'};
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
  const state={key:saved,rows:[],selected:'',next:null,channels:{},busy:false,epoch:0,needsRefresh:false,controllers:new Set(),urls:new Set()};
  function node(tag,cls,text) { const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n; }
  function notice(text,tone='info') { $('notice').textContent=text;$('notice').dataset.tone=tone; }
  function controls() {$('refresh').disabled=state.busy;$('load-more').disabled=state.busy;$('login-button').disabled=state.busy;$('search').disabled=state.busy;$('filter').disabled=state.busy;$('test-notification').disabled=state.busy;for(const set of $('detail').querySelectorAll('fieldset'))set.disabled=state.busy||state.needsRefresh;}
  function logout(message='ออกจากระบบแล้ว') {
    state.epoch++;for(const c of state.controllers)c.abort();state.controllers.clear();for(const u of state.urls)URL.revokeObjectURL(u);state.urls.clear();
    state.key='';state.rows=[];state.selected='';state.next=null;state.channels={};state.busy=false;state.needsRefresh=false;
    try{sessionStorage.removeItem(KEY);}catch{}$('admin-key').value='';$('search').value='';$('filter').value='all';
    for(const id of ['queue','detail','summary'])$(id).replaceChildren();$('dashboard').hidden=true;$('logout').hidden=true;$('login-panel').hidden=false;controls();notice(message);$('admin-key').focus();
  }
  async function request(query='',options={},binary=false) {
    if(!state.key)throw new Error('เข้าสู่ระบบก่อนดำเนินการ');
    const epoch=state.epoch,controller=new AbortController();state.controllers.add(controller);let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;controller.abort();},30000);
    try {
      const response=await fetch(API+query,{...options,headers:{...options.headers,'x-admin-key':state.key},credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal});
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
    for(const row of items){const button=node('button','row');button.type='button';button.setAttribute('aria-pressed',String(state.selected===row.reference));const top=node('div','row-top');top.append(node('strong','',row.name||'ไม่ระบุชื่อ'),badge(row.status));button.append(top,node('p','small',row.reference),node('p','',money(row.verifiedAmountTHB??row.submittedAmountTHB)),node('p',dueLate(row)?'urgent small':'small','รับเข้าภายใน '+date(row.admissionDueAt)+(row.datesVerified?'':' · รอตรวจเวลาโอน')));button.addEventListener('click',()=>{if(state.busy)return;state.selected=row.reference;drawQueue();drawDetail();});fragment.append(button);}
    if(!items.length)fragment.append(node('p','empty',state.rows.length?'ไม่พบรายการตามตัวกรอง':'ยังไม่มีรายการลงทะเบียน'));
    $('queue').replaceChildren(fragment);$('load-more').hidden=!state.next;
    const counts=[['โหลดแล้ว',state.rows.length],['รอตรวจเงิน',state.rows.filter(r=>r.status==='pending_verification').length],['รอรับเข้า',state.rows.filter(r=>r.status==='payment_verified').length]];
    $('summary').replaceChildren(...counts.map(([label,count])=>node('span','',`${label} ${count}`)));
  }
  function definition(pairs) {const dl=node('dl');for(const [label,value]of pairs)dl.append(node('dt','',label),node('dd','',value==null||value===''?'—':value));return dl;}
  function field(labelText,type,name) {const label=node('label','',labelText),input=node('input');input.type=type;input.name=name;input.required=true;label.append(input);return {label,input};}
  function check(text) {const label=node('label','check'),input=node('input');input.type='checkbox';input.required=true;label.append(input,node('span','',text));return {label,input};}
  function noteField(value='') {const label=node('label','','หมายเหตุ (ถ้ามี)'),input=node('textarea');input.name='note';input.rows=3;input.maxLength=1000;input.value=value;label.append(input);return {label,input};}
  async function downloadReceipt(row,button) {
    const epoch=state.epoch;button.disabled=true;
    try{const {blob,mime}=await request('?'+new URLSearchParams({action:'receipt',reference:row.reference}),{},true);if(epoch!==state.epoch)return;const url=URL.createObjectURL(blob);state.urls.add(url);const link=node('a');link.href=url;link.download=row.reference+'.'+({'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'}[mime]);link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>{URL.revokeObjectURL(url);state.urls.delete(url);},1000);notice('ดาวน์โหลดสลิปแล้ว เปิดไฟล์และตรวจยอดเงินจริงในบัญชีก่อนยืนยัน');}
    catch(error){if(!error.stale)notice(error.message,'error');}finally{if(epoch===state.epoch)button.disabled=false;}
  }
  async function mutate(payload,fieldset) {
    if(state.busy||state.needsRefresh)return;const epoch=state.epoch;state.busy=true;if(fieldset)fieldset.disabled=true;controls();
    try{const result=await request('',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(epoch!==state.epoch)return;
      if(result.registration){if(result.registration.reference!==payload.reference)throw new Error('ผลตอบกลับไม่ตรงรายการ กรุณารีเฟรช');state.rows=state.rows.map(r=>r.reference===payload.reference?result.registration:r);}
      else if(payload.action==='retry_notification'&&result.notification){state.rows=state.rows.map(r=>r.reference===payload.reference?{...r,notification:result.notification}:r);}
      else throw new Error('ยังยืนยันผลไม่ได้ กรุณารีเฟรชรายการ');
      notice(payload.action==='verify_payment'?'บันทึกการตรวจเงินแล้ว ขั้นต่อไปคือเปิดสิทธิ์ใน Skool และส่งคำเชิญ':payload.action==='mark_admitted'?'บันทึกว่ารับเข้าเรียนแล้ว':payload.action==='reject'?'ยุติรายการและเก็บเหตุผลแล้ว':result.notification?.status==='sent'?'แจ้งผู้จัดแล้ว':'การแจ้งผู้จัดยังไม่สำเร็จ ตรวจช่องทางแจ้งเตือนก่อนลองอีกครั้ง',payload.action==='retry_notification'&&result.notification?.status!=='sent'?'error':'info');
    }catch(error){if(!error.stale){state.needsRefresh=!error.status||error.status>=500||error.status===409;notice(error.message+(state.needsRefresh?' · รีเฟรชสถานะก่อนดำเนินการซ้ำ':''),'error');}}
    finally{if(epoch===state.epoch){state.busy=false;controls();drawQueue();drawDetail();}}
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
    const panel=$('detail'),row=state.rows.find(r=>r.reference===state.selected);panel.replaceChildren();if(!row){panel.append(node('p','empty','เลือกรายการเพื่อดูสลิปและตรวจข้อมูล'));return;}
    const top=node('div','detail-title');top.append(node('h2','',row.name||'ไม่ระบุชื่อ'),badge(row.status));panel.append(top,node('p','reference',row.reference),definition([['อีเมล',row.email],['ช่องทางติดต่อ',row.contact],['ส่งข้อมูลเมื่อ',date(row.createdAt)],['ราคาที่ระบบแจ้ง',money(row.quotedAmountTHB)],['ยอดที่ผู้ซื้อแจ้ง',money(row.submittedAmountTHB)],['เวลาโอนที่ผู้ซื้อแจ้ง',date(row.submittedTransferredAt)]]));
    const receipt=node('button','','ดาวน์โหลดสลิปส่วนตัว');receipt.type='button';receipt.addEventListener('click',()=>downloadReceipt(row,receipt));panel.append(receipt,node('p','small',row.receipt?.name||'สลิปของรายการนี้'));
    const deadline=node('section','section');deadline.append(node('h3','','กำหนดเวลา'),definition([['รับเข้าเรียนภายใน',date(row.admissionDueAt)],['กรอบคืนเงินสิ้นสุด',date(row.guaranteeUntil)],['อ้างจาก',row.datesVerified?'วันเวลาโอนที่ผู้จัดตรวจแล้ว':'วันเวลาโอนที่ผู้ซื้อแจ้ง — ยังไม่ตรวจยืนยัน']]));if(dueLate(row))deadline.append(node('p','urgent','เลยกำหนดรับเข้าเรียนตามเวลานี้แล้ว'));deadline.append(node('p','small','รับเข้าภายใน 1 วัน และกรอบคืนเงิน 30 วันนับจากเวลาโอน เงื่อนไขคืนเงินยังต้องพิจารณาจากการเรียนและการลองใช้จริง'));panel.append(deadline);
    if(state.needsRefresh)panel.append(node('p','detail-hint','รีเฟรชข้อมูลก่อนทำรายการต่อ เพื่อเช็กว่าคำขอล่าสุดถูกบันทึกแล้วหรือยัง'));
    if(row.status==='pending_verification'){
      const form=node('form','section'),set=node('fieldset'),fields=node('div','fields'),amount=field('ยอดเงินเข้าที่ตรวจจริง (บาท)','number','verifiedAmountTHB'),when=field('เวลาโอนที่ตรวจแล้ว (เวลาไทย)','datetime-local','verifiedTransferredAt'),checked=check('ฉันตรวจสลิปและยอดเงินเข้าบัญชีจริงของรายการนี้แล้ว'),note=noteField(row.ownerNote),submit=node('button','primary','ยืนยันยอดเงินที่ตรวจแล้ว');
      amount.input.min='0.01';amount.input.max='1000000';amount.input.step='0.01';when.input.step='1';when.input.min='2020-01-01T00:00';submit.type='submit';submit.disabled=true;set.disabled=state.busy||state.needsRefresh;checked.input.addEventListener('change',()=>submit.disabled=!checked.input.checked||state.busy||state.needsRefresh);
      fields.append(amount.label,when.label);set.append(node('h3','','ตรวจการชำระเงิน'),node('p','detail-hint','เปิดสลิปและเทียบรายการเงินเข้าในบัญชีจริง แล้วกรอกยอดกับเวลาโอนที่ตรวจพบ ข้อมูลที่ผู้ซื้อแจ้งยังไม่ใช่การยืนยันเงินเข้า'),fields,note.label,checked.label,submit);form.append(set);form.addEventListener('submit',event=>{event.preventDefault();if(!checked.input.checked)return;try{mutate({reference:row.reference,action:'verify_payment',verifiedAmountTHB:parseAmount(amount.input.value),verifiedTransferredAt:transferISO(when.input.value),confirmedReceived:true,note:note.input.value},set);}catch(error){notice(error.message,'error');}});panel.append(form);
      const rejectDetails=node('details','section'),rejectForm=node('form'),rejectSet=node('fieldset'),reason=noteField(),rejectButton=node('button','','ยุติรายการนี้');reason.label.firstChild.textContent='เหตุผลที่ยุติรายการ';reason.input.required=true;reason.input.name='rejectionNote';rejectButton.type='submit';rejectSet.disabled=state.busy||state.needsRefresh;rejectSet.append(node('p','small','ใช้กับข้อมูลไม่ถูกต้องหรือรายการทดสอบ เหตุผลจะถูกเก็บในประวัติ ไม่ใช่การคืนเงินหรือยกเลิกสิทธิ์ Skool'),reason.label,rejectButton);rejectForm.append(rejectSet);rejectForm.addEventListener('submit',event=>{event.preventDefault();const note=reason.input.value.trim();if(!note){notice('ใส่เหตุผลก่อนยุติรายการ','error');return;}mutate({reference:row.reference,action:'reject',note},rejectSet);});rejectDetails.append(node('summary','','ยุติรายการที่ไม่ถูกต้อง'),rejectForm);panel.append(rejectDetails);
    }else if(['payment_verified','admitted'].includes(row.status)){
      const verified=node('section','section');verified.append(node('h3','','การชำระเงินที่ตรวจแล้ว'),definition([['ยอดเงินเข้า',money(row.verifiedAmountTHB)],['เวลาโอนที่ตรวจแล้ว',date(row.verifiedTransferredAt)],['บันทึกการตรวจเมื่อ',date(row.verifiedAt)]]));panel.append(verified);
      if(row.status==='payment_verified'){
        const form=node('form','section'),set=node('fieldset'),checked=check('ฉันเปิดสิทธิ์และส่งคำเชิญเข้า Skool ให้ผู้เรียนจริงแล้ว'),note=noteField(row.ownerNote),submit=node('button','primary','บันทึกว่าเปิดสิทธิ์แล้ว');submit.type='submit';submit.disabled=true;set.disabled=state.busy||state.needsRefresh;checked.input.addEventListener('change',()=>submit.disabled=!checked.input.checked||state.busy||state.needsRefresh);set.append(node('h3','','รับเข้าเรียน'),node('p','small','เปิดสิทธิ์ใน Skool และส่งคำเชิญด้วยช่องทางติดต่อข้างต้นให้เรียบร้อยก่อนบันทึก'),note.label,checked.label,submit);form.append(set);form.addEventListener('submit',event=>{event.preventDefault();if(checked.input.checked)mutate({reference:row.reference,action:'mark_admitted',accessSent:true,note:note.input.value},set);});panel.append(form);
      }else panel.append(node('p','notice','บันทึกรับเข้าเรียนเมื่อ '+date(row.admittedAt)));
    }
    if(row.ownerNote)panel.append(node('h3','section','หมายเหตุที่บันทึกไว้'),node('p','',row.ownerNote));
    const notification=node('section','section');notification.append(node('h3','','การแจ้งผู้จัด'),node('p','',NOTIFY[row.notification?.status]||'ยังไม่ทราบสถานะ'));if(row.notification?.code)notification.append(node('p','small',row.notification.code));const retry=node('button','','ลองแจ้งผู้จัดอีกครั้ง');retry.type='button';retry.disabled=state.busy||state.needsRefresh||state.channels.telegram!==true||!['pending','failed','unconfigured'].includes(row.notification?.status);retry.addEventListener('click',()=>mutate({reference:row.reference,action:'retry_notification'}));notification.append(retry);if(state.channels.telegram!==true)notification.append(node('p','small','ยังไม่ได้ตั้งช่องทางแจ้งผู้จัด'));panel.append(notification);
    if(Array.isArray(row.history)&&row.history.length){const details=node('details','section'),list=node('ol','history'),names={verify_payment:'ตรวจเงินเข้า',mark_admitted:'บันทึกรับเข้าเรียน',reject:'ยุติรายการ'};details.append(node('summary','','ประวัติรายการ'));for(const h of row.history){const li=node('li','',(names[h.action]||'อัปเดตรายการ')+' · '+date(h.at));if(h.note)li.append(node('p','small',h.note));list.append(li);}details.append(list);panel.append(details);}
  }
  async function load(more=false) {
    if(state.busy)return;const epoch=state.epoch;state.busy=true;controls();notice(more?'กำลังโหลดรายการก่อนหน้า…':'กำลังโหลดรายการ…');
    try{const query=new URLSearchParams({action:'list',limit:'100'});if(more&&state.next)query.set('before',state.next);const data=await request('?'+query);if(!Array.isArray(data.registrations))throw new Error('รูปแบบรายการไม่ถูกต้อง');if(data.registrations.some(r=>!r||!REFERENCE.test(r.reference)))throw new Error('ข้อมูลรายการไม่ครบ');
      const combined=more?[...state.rows,...data.registrations]:data.registrations;state.rows=[...new Map(combined.map(r=>[r.reference,r])).values()];state.next=typeof data.nextCursor==='string'&&/^[1-9]\d*$/.test(data.nextCursor)?data.nextCursor:null;state.channels=data.channels||{};state.needsRefresh=false;if(!state.rows.some(r=>r.reference===state.selected))state.selected='';
      try{sessionStorage.setItem(KEY,state.key);}catch{}$('admin-key').value='';$('login-panel').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;drawQueue();drawDetail();notice('อัปเดตรายการแล้ว · '+state.rows.length+' รายการที่โหลด');
    }catch(error){if(!error.stale)notice(error.message,'error');}
    finally{if(epoch===state.epoch){state.busy=false;controls();}}
  }
  $('login-form').addEventListener('submit',event=>{event.preventDefault();if(state.busy)return;state.key=$('admin-key').value.trim();if(state.key)load();});
  $('logout').addEventListener('click',()=>logout());$('refresh').addEventListener('click',()=>load());$('load-more').addEventListener('click',()=>load(true));
  $('test-notification').addEventListener('click',testNotification);
  for(const id of ['search','filter'])$(id).addEventListener('input',()=>{state.selected='';drawQueue();drawDetail();});
  if(state.key)load();
})();
