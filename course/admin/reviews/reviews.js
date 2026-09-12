(() => {
  'use strict';
  const API = '/api/course-reviews';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const takeaways = {source:'ซอส / Source',files:'จัดไฟล์และเอกสาร',content:'ภาพและคอนเทนต์',replies:'คำตอบแอดมิน',excel:'Excel / CSV',repeat:'ทำงานซ้ำ',lead:'พาทีมใช้ AI'};
  const consentNames = {private:'ใช้ภายใน',anonymous:'เผยแพร่แบบไม่ระบุชื่อ',named:'เผยแพร่พร้อมชื่อ'};
  const state = {key:'',rows:[],cohorts:[],cohort:'',loadedCohort:'',filter:'all',query:'',pending:false,loaded:false};
  const controllers = new Set();
  let loadController, loadVersion = 0, sessionVersion = 0, toastTimer, returnFocus, returnTarget;
  try { state.key = sessionStorage.getItem('courseReviewAdminKey') || sessionStorage.getItem('firstClassAdminKey') || ''; } catch {}
  const present = value => typeof value === 'string' && value.trim().length > 0;
  const shareable = row => ['named','anonymous'].includes(row.consent) && present(row.testimonial);
  const display = value => value === null || value === undefined || value === '' ? 'ไม่ได้กรอก' : String(value);
  const mean = value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  function date(value) {
    if (!value) return 'ไม่ได้กรอก';
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}).format(parsed) : 'ไม่ได้กรอก';
  }
  function error(target, text) { target.textContent = text || ''; target.hidden = !text; }
  function toast(text) { clearTimeout(toastTimer); $('toast').textContent=text; $('toast').classList.add('visible'); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3500); }
  function clearStoredKeys() {
    try { sessionStorage.removeItem('courseReviewAdminKey'); sessionStorage.removeItem('firstClassAdminKey'); } catch {}
  }
  function closeDialog() { if ($('review-dialog').open) $('review-dialog').close(); }
  function logout(message='') {
    sessionVersion++; loadVersion++;
    controllers.forEach(controller=>controller.abort()); controllers.clear();
    state.key=''; state.rows=[]; state.cohorts=[]; state.cohort=''; state.loadedCohort=''; state.query=''; state.filter='all'; state.pending=false; state.loaded=false;
    clearStoredKeys(); closeDialog();
    $('admin-key').value=''; $('admin-key').type='password'; $('toggle-key').textContent='แสดง'; $('toggle-key').setAttribute('aria-label','แสดงรหัส'); $('toggle-key').setAttribute('aria-pressed','false');
    $('review-list').replaceChildren(); $('summary').replaceChildren(); $('summary-note').textContent=''; $('result-count').textContent='';
    $('dialog-content').replaceChildren(); $('copy-status').textContent=''; $('search').value=''; $('cohort').innerHTML='<option value="">ทุกรุ่น</option>';
    clearTimeout(toastTimer); $('toast').textContent=''; $('toast').classList.remove('visible');
    $('dashboard').hidden=true; $('logout').hidden=true; $('login-panel').hidden=false; $('login-submit').disabled=false; $('login-submit').textContent='เปิดหน้ารีวิว →';
    error($('load-error'),''); error($('login-error'),message); $('admin-key').focus();
  }
  async function request(method, body, controller = new AbortController()) {
    controllers.add(controller);
    let timedOut=false;
    const timeout=setTimeout(()=>{timedOut=true;controller.abort();},15000);
    const query=new URLSearchParams();
    if(method==='GET'){query.set('admin','1');if(state.cohort)query.set('cohort',state.cohort);}
    try {
      const response=await fetch(API+(query.size?'?'+query:''),{method,cache:'no-store',credentials:'same-origin',headers:{'content-type':'application/json','x-admin-key':state.key},body:body?JSON.stringify(body):undefined,signal:controller.signal});
      const result=await response.json().catch(()=>null);
      if(response.status===401)throw Object.assign(new Error('รหัสไม่ถูกต้องหรือสิทธิ์หมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'),{auth:true});
      if(!response.ok||result?.ok!==true)throw new Error(response.status===409?'รายการนี้ยังเผยแพร่ไม่ได้ ต้องมีข้อความและสิทธิ์จากเจ้าของก่อน':'ยังทำรายการไม่สำเร็จ ลองอีกครั้งได้ครับ');
      return result;
    } catch (failure) {
      if(timedOut)throw new Error('การเชื่อมต่อใช้เวลานาน ลองอีกครั้งได้ครับ');
      if(failure.name==='AbortError')throw failure;
      if(failure instanceof TypeError)throw new Error('เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้งครับ');
      throw failure;
    } finally {clearTimeout(timeout);controllers.delete(controller);}
  }
  function renderSummary(summary={}) {
    const n=count(summary.count);
    const stats=[
      ['คำตอบ',n,'คนในรุ่นที่เลือก'],
      ['ประโยชน์ต่อการทำงาน',mean(summary.scoreMean),'/ 10 · ความเห็นผู้เรียน'],
      ['ความมั่นใจ ก่อน → หลัง',mean(summary.beforeMean)+' → '+mean(summary.afterMean),'/ 5 · ประเมินตนเอง'],
      ['มั่นใจเพิ่มขึ้น',count(summary.improvedCount),'จากผู้ตอบ '+n+' คน'],
      ['คัดไว้',count(summary.shortlistedCount),'รายการภายใน'],
      ['เผยแพร่แล้ว',count(summary.publishedCount),'มีสิทธิ์เผยแพร่ '+count(summary.shareableCount)+' รายการ']
    ];
    $('summary').innerHTML=stats.map(item=>'<article class="stat"><span>'+esc(item[0])+'</span><strong>'+esc(item[1])+'</strong><small>'+esc(item[2])+'</small></article>').join('');
    $('summary-note').textContent='สรุปจากคำตอบ '+n+' คนในรุ่นที่เลือก · คะแนนและความมั่นใจเป็นการประเมินของผู้เรียนเอง ไม่ใช่การทดสอบทักษะ';
  }
  function answer(title,value) {
    const missing=value===null||value===undefined||value==='';
    return '<section class="answer"><h4>'+esc(title)+'</h4><p'+(missing?' class="missing"':'')+'>'+esc(display(value))+'</p></section>';
  }
  function card(row) {
    const eligible=shareable(row), privateRow=row.consent==='private', hasQuote=present(row.testimonial);
    const cohort=state.cohorts.find(item=>item.id===row.cohortId);
    const badges='<span class="badge '+(privateRow?'private':'')+'">'+esc(consentNames[row.consent]||'ไม่พบสิทธิ์เผยแพร่')+'</span>'+(row.shortlisted?'<span class="badge">คัดไว้</span>':'')+(row.published?'<span class="badge published">เผยแพร่แล้ว</span>':'');
    const topics=Array.isArray(row.takeaways)&&row.takeaways.length?'<div class="takeaways">'+row.takeaways.map(item=>'<span>'+esc(takeaways[item]||item)+'</span>').join('')+'</div>':'<p class="missing">ไม่ได้กรอก</p>';
    const original='<p>สิทธิ์ตอนส่งคำตอบ: '+esc(consentNames[row.originalConsent]||display(row.originalConsent))+'</p>';
    return '<article class="review-card '+(row.shortlisted?'is-shortlisted':'')+'" data-review="'+esc(row.id)+'">'+
      '<div class="review-heading"><div><h3>'+esc(display(row.displayName))+'</h3><p>'+esc(display(row.role))+'</p><p>'+esc(cohort?.title||row.cohortId||'ไม่ได้กรอก')+'</p></div><div class="score" aria-label="คะแนนประโยชน์ '+esc(display(row.score))+' จาก 10">'+esc(display(row.score))+'<small> / 10</small></div></div>'+
      '<div class="badges">'+badges+'</div><div class="confidence"><span>ความมั่นใจ · ประเมินตนเอง</span><strong>'+esc(display(row.before))+' → '+esc(display(row.after))+' <small>/ 5</small></strong></div>'+
      '<section class="answer"><h4>เรื่องที่ได้ประโยชน์</h4>'+topics+'</section>'+
      answer('งานแรกที่จะนำไปใช้ / จังหวะที่เห็นว่าใช้ได้จริง',row.firstTask)+answer('อยากให้ปรับ หรือให้ช่วยต่อ',row.feedback)+
      '<section class="testimonial '+(privateRow?'private':'')+'"><h4>ข้อความเล่าถึงคลาส · ต้นฉบับ'+(privateRow?' · ใช้ภายในเท่านั้น':'')+'</h4><blockquote>'+esc(display(row.testimonial))+'</blockquote></section>'+
      '<div class="review-details"><p>ส่งเมื่อ '+esc(date(row.createdAt))+'</p><p>'+esc(row.claimedAt?'เวลารับการ์ด: '+date(row.claimedAt):'ยังไม่มีบันทึกผูกรับการ์ด')+'</p>'+original+'<p class="review-id">'+esc(display(row.id))+'</p></div>'+
      '<div class="review-actions"><button class="button '+(row.shortlisted?'is-selected':'')+'" type="button" data-action="shortlist" aria-pressed="'+Boolean(row.shortlisted)+'">'+(row.shortlisted?'✓ คัดไว้แล้ว':'☆ คัดไว้')+'</button>'+
      '<button class="button" type="button" data-action="consent"'+(!hasQuote?' disabled title="ยังไม่มีข้อความเล่าถึงคลาส"':'')+'>เตรียมลิงก์ขออนุญาต</button>'+
      (eligible?'<button class="button" type="button" data-action="preview">ดู / คัดลอกข้อความเผยแพร่</button>':'')+
      '<button class="button '+(row.published?'danger':'primary')+'" type="button" data-action="publish"'+(!row.published&&!eligible?' disabled title="ต้องมีข้อความและสิทธิ์เผยแพร่จากเจ้าของ"':'')+'>'+(row.published?'นำออกจากหน้าเผยแพร่':'เผยแพร่ข้อความ')+'</button></div>'+
      (!eligible?'<p class="eligibility-note">'+(privateRow?'คัดไว้ภายในได้ การเผยแพร่ต้องได้รับอนุญาตเพิ่มเติมจากเจ้าของข้อความ':'ยังไม่มีข้อความหรือสิทธิ์ที่พร้อมเผยแพร่')+'</p>':'')+'</article>';
  }
  function renderRows() {
    const query=state.query.toLocaleLowerCase('th');
    const rows=state.rows.filter(row=>{
      const filter=state.filter==='all'||state.filter==='shortlisted'&&row.shortlisted||state.filter==='eligible'&&shareable(row)||state.filter==='published'&&row.published||state.filter==='private'&&row.consent==='private';
      const haystack=[row.displayName,row.role,row.firstTask,row.feedback,row.testimonial,row.id,...(Array.isArray(row.takeaways)?row.takeaways:[])].join(' ').toLocaleLowerCase('th');
      return filter&&(!query||haystack.includes(query));
    });
    $('review-list').innerHTML=rows.map(card).join('');
    $('empty').hidden=rows.length!==0;
    $('result-count').textContent='แสดง '+rows.length+' / '+state.rows.length+' คำตอบ';
    document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===state.filter)));
    if(state.pending)document.querySelectorAll('[data-action]').forEach(button=>button.disabled=true);
  }
  async function load() {
    if(!state.key)return;
    if(loadController)loadController.abort();
    loadController=new AbortController();
    const version=++loadVersion, session=sessionVersion, requestedCohort=state.cohort;
    $('dashboard').setAttribute('aria-busy','true'); $('refresh').disabled=true; $('refresh').textContent='กำลังโหลด…'; error($('load-error'),''); error($('login-error'),'');
    $('login-submit').disabled=true; $('login-submit').textContent='กำลังเปิดรีวิว…';
    try {
      const result=await request('GET',undefined,loadController);
      if(version!==loadVersion||session!==sessionVersion)return;
      if(!Array.isArray(result.reviews)||!Array.isArray(result.cohorts))throw new Error('ข้อมูลยังไม่พร้อม ลองโหลดใหม่ครับ');
      state.rows=result.reviews.filter(row=>row&&typeof row.id==='string'); state.cohorts=result.cohorts; state.loaded=true; state.loadedCohort=requestedCohort;
      try {sessionStorage.setItem('courseReviewAdminKey',state.key);sessionStorage.setItem('firstClassAdminKey',state.key);} catch {}
      $('admin-key').value=''; $('login-panel').hidden=true; $('dashboard').hidden=false; $('logout').hidden=false;
      $('course-title').textContent=result.course?.title||'AI ใส่ซอส · Workshop 3 ชั่วโมง';
      $('cohort').innerHTML='<option value="">ทุกรุ่น</option>'+state.cohorts.map(item=>'<option value="'+esc(item.id)+'">'+esc(item.title)+'</option>').join('');
      $('cohort').value=state.cohort; renderSummary(result.summary); renderRows();
    } catch (failure) {
      if(session!==sessionVersion||version!==loadVersion||failure.name==='AbortError')return;
      if(failure.auth){logout(failure.message);return;}
      state.cohort=state.loadedCohort; $('cohort').value=state.cohort;
      error(state.loaded?$('load-error'):$('login-error'),failure.message);
    } finally {
      if(version===loadVersion){$('dashboard').setAttribute('aria-busy','false');$('refresh').disabled=false;$('refresh').textContent='↻ โหลดใหม่';$('login-submit').disabled=false;$('login-submit').textContent='เปิดหน้ารีวิว →';}
    }
  }
  function openDialog(title,html,trigger) {
    returnFocus=trigger; returnTarget=trigger?{id:trigger.closest('[data-review]')?.dataset.review,action:trigger.dataset.action}:null;
    $('dialog-title').textContent=title; $('dialog-content').innerHTML=html; $('copy-status').textContent='';
    if(!$('review-dialog').open)$('review-dialog').showModal();
  }
  function publicText(row) {
    const author=row.consent==='anonymous'?'ผู้เรียน AI ใส่ซอส':display(row.displayName)+(present(row.role)?' · '+row.role:'');
    return {author,text:row.testimonial+'\n— '+author};
  }
  function preview(row,trigger) {
    if(!shareable(row))return;
    const quote=publicText(row);
    openDialog('ข้อความตามสิทธิ์ที่ได้รับ','<p>คงข้อความต้นฉบับ'+(row.consent==='anonymous'?' และแสดงผู้เขียนเป็น “ผู้เรียน AI ใส่ซอส”':' พร้อมชื่อที่เจ้าของอนุญาต')+'</p><div class="quote-preview"><blockquote>'+esc(row.testimonial)+'</blockquote><p>'+esc(quote.author)+'</p></div><label for="public-copy">ข้อความสำหรับคัดลอก</label><textarea id="public-copy" class="copy-area" rows="6" readonly>'+esc(quote.text)+'</textarea><button class="button" type="button" data-copy="public-copy">คัดลอกข้อความ</button>',trigger);
  }
  function consentLink(row,value,trigger) {
    let url;
    try {url=new URL(value,location.origin);} catch {throw new Error('ยังสร้างลิงก์ที่ใช้ได้ไม่สำเร็จ ลองอีกครั้งครับ');}
    const trusted=(url.origin===location.origin||url.origin==='https://www.myclover.com')&&url.pathname==='/course/review-consent/'&&/^#[A-Za-z0-9_-]{43}$/.test(url.hash);
    if(!trusted)throw new Error('ยังสร้างลิงก์ที่ใช้ได้ไม่สำเร็จ ลองอีกครั้งครับ');
    const message='สวัสดีครับ ขออนุญาตนำข้อความที่คุณเล่าถึงคลาส AI ใส่ซอสไปใช้แนะนำคอร์สครับ\n\n“'+row.testimonial+'”\n\nเลือกได้ว่าจะให้ใช้แบบไม่ระบุชื่อ พร้อมชื่อ หรือเก็บไว้ภายในเหมือนเดิม ตามสะดวกเลยครับ:\n'+url.href;
    openDialog('เตรียมข้อความขออนุญาต','<p>นี่คือร่างสำหรับผู้สอนคัดลอกไปส่งเอง ระบบยังไม่ได้ส่งข้อความหาใคร และยังไม่ได้เปลี่ยนสิทธิ์ของรีวิว</p><label for="consent-url">ลิงก์ให้เจ้าของข้อความเลือกสิทธิ์</label><textarea id="consent-url" class="copy-area" rows="2" readonly>'+esc(url.href)+'</textarea><button class="button" type="button" data-copy="consent-url">คัดลอกลิงก์</button><label for="consent-message">ข้อความขออนุญาต · ใช้ภายในก่อนส่ง</label><textarea id="consent-message" class="copy-area" rows="10" readonly>'+esc(message)+'</textarea><button class="button primary" type="button" data-copy="consent-message">คัดลอกข้อความพร้อมลิงก์</button>',trigger);
  }
  async function mutate(row,action,trigger) {
    if(state.pending)return;
    if(action==='preview'){preview(row,trigger);return;}
    if(action==='consent'&&!present(row.testimonial))return;
    if(action==='publish'&&!row.published&&!shareable(row))return;
    const session=sessionVersion;
    state.pending=true; document.querySelectorAll('[data-action]').forEach(button=>button.disabled=true); error($('load-error'),'');
    try {
      const body={action:action==='consent'?'consent_link':action,id:row.id};
      if(action==='shortlist')body.value=!row.shortlisted;
      if(action==='publish')body.value=!row.published;
      const result=await request('POST',body);
      if(session!==sessionVersion)return;
      if(action==='consent')consentLink(row,result.url,trigger);
      else {row[action==='shortlist'?'shortlisted':'published']=body.value;await load();if(session===sessionVersion)toast(action==='shortlist'?(body.value?'คัดรายการไว้ภายในแล้ว':'นำออกจากรายการที่คัดไว้แล้ว'):(body.value?'เผยแพร่ข้อความตามสิทธิ์แล้ว':'นำข้อความออกจากหน้าเผยแพร่แล้ว'));}
    } catch (failure) {
      if(session!==sessionVersion||failure.name==='AbortError')return;
      if(failure.auth){logout(failure.message);return;}
      error($('load-error'),failure.message);
    } finally {if(session===sessionVersion){state.pending=false;renderRows();}}
  }
  $('login-form').addEventListener('submit',event=>{event.preventDefault();state.key=$('admin-key').value;if(state.key)load();});
  $('toggle-key').addEventListener('click',()=>{const visible=$('admin-key').type==='password';$('admin-key').type=visible?'text':'password';$('toggle-key').textContent=visible?'ซ่อน':'แสดง';$('toggle-key').setAttribute('aria-label',visible?'ซ่อนรหัส':'แสดงรหัส');$('toggle-key').setAttribute('aria-pressed',String(visible));$('admin-key').focus();});
  $('logout').addEventListener('click',()=>logout());
  $('refresh').addEventListener('click',load);
  $('cohort').addEventListener('change',()=>{state.cohort=$('cohort').value;closeDialog();load();});
  $('search').addEventListener('input',()=>{state.query=$('search').value;renderRows();});
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.filter=button.dataset.filter;renderRows();}));
  $('review-list').addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;const row=state.rows.find(item=>item.id===button.closest('[data-review]').dataset.review);if(row)mutate(row,button.dataset.action,button);});
  $('close-dialog').addEventListener('click',closeDialog);
  $('review-dialog').addEventListener('close',()=>{
    $('dialog-content').replaceChildren();$('copy-status').textContent='';
    if(returnFocus?.isConnected)returnFocus.focus();
    else if(returnTarget){const card=[...document.querySelectorAll('[data-review]')].find(item=>item.dataset.review===returnTarget.id);const button=card?[...card.querySelectorAll('[data-action]')].find(item=>item.dataset.action===returnTarget.action):null;if(button)button.focus();else $('refresh').focus();}
    returnFocus=undefined;returnTarget=undefined;
  });
  $('review-dialog').addEventListener('click',async event=>{
    const button=event.target.closest('[data-copy]');if(!button)return;
    const field=$(button.dataset.copy);if(!field)return;
    try {if(!navigator.clipboard?.writeText)throw new Error('manual');await navigator.clipboard.writeText(field.value);$('copy-status').textContent='คัดลอกแล้ว';}
    catch {field.focus();field.select();$('copy-status').textContent='เลือกข้อความไว้แล้ว กด Ctrl+C / ⌘C หรือแตะค้างเพื่อคัดลอก';}
  });
  window.addEventListener('pagehide',()=>{controllers.forEach(controller=>controller.abort());$('admin-key').value='';});
  if(state.key)load();
})();
