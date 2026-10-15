import {addDays,todayBangkok,daysBetween,estimate,calendarDay} from './cycle.js';
const $=id=>document.getElementById(id);
let state,meta,today=todayBangkok(),selected=today,month=today.slice(0,7),toastTimer;
const fmt=(d,year=false)=>new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',...(year?{year:'numeric'}:{}),timeZone:'UTC'}).format(new Date(d));
const range=(a,b)=>`${fmt(a)} – ${fmt(b)}`;
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
async function api(action,data){
  const r=await fetch(`/api/eggcycle?action=${action}`,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',credentials:'same-origin'});
  let body;try{body=await r.json();}catch{throw new Error('เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่');}
  if(!r.ok){if(r.status===401&&action!=='login')lock();throw Object.assign(new Error(body.error||'เชื่อมต่อไม่สำเร็จ'),{status:r.status});}return body;
}
function lock(){state=null;meta=null;$('app').hidden=true;$('login').hidden=false;$('log-dialog').close();$('password').value='';for(const id of ['history-list','history-summary','calendar','selected-day'])$(id).replaceChildren();$('log-note').value='';}
async function unlock(){meta=await api('state');state=meta.state;today=meta.today;selected=today;month=today.slice(0,7);$('login').hidden=true;$('app').hidden=false;render();}
function controlsBusy(form,busy){for(const b of form.querySelectorAll('button'))b.disabled=busy;}
async function commit(next){
  try{const result=await api('save',next);state=result.state;render();}
  catch(e){if(e.status===409){await unlock();toast('มีการแก้ไขจากอีกเครื่อง โหลดข้อมูลล่าสุดแล้ว กรุณาบันทึกอีกครั้ง');}throw e;}
}
function clone(){return structuredClone(state);}
function render(){
  $('today-label').textContent=new Intl.DateTimeFormat('th-TH',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(today));
  $('setup').hidden=state.periods.length>0;$('overview').hidden=!state.periods.length;
  $('initial-date').max=today;if(!$('initial-date').value)$('initial-date').value=addDays(today,-1);
  const e=estimate(state,today);
  if(e.start){
    $('cycle-day').textContent=e.day;$('ring-footer').textContent=`จากรอบประมาณ ${state.cycleLength} วัน`;
    $('cycle-ring').style.background=`conic-gradient(from -90deg,${e.kind==='fertile'?'#aa91bd':'#b96378'} ${Math.min(e.day/state.cycleLength*360,360)}deg,#efdeda 0deg)`;
    $('phase-badge').textContent=e.kind==='unknown'?'รอยืนยัน':e.kind==='period'?'MENSTRUAL PHASE':e.kind==='fertile'?'FERTILE WINDOW':'YOUR RHYTHM';
    $('phase-title').textContent=e.label;
    $('phase-description').textContent=e.kind==='period'?'พักให้พอ ดื่มน้ำ แล้วใจดีกับตัวเองหน่อยนะ':e.kind==='fertile'?'ใช้การป้องกัน หากยังไม่พร้อมตั้งครรภ์':e.kind==='unknown'?'บันทึกวันที่มาจริงเพื่อเริ่มการคาดการณ์รอบใหม่':'ปฏิทินยืนยันวันปลอดภัยไม่ได้ ควรป้องกันทุกครั้ง';
    $('next-period').textContent=fmt(e.next);
    const remaining=daysBetween(today,e.next);$('next-description').textContent=remaining>0?`อีกประมาณ ${remaining} วัน · อาจคลาดเคลื่อน`:`${remaining===0?'ตรงกับวันนี้':`เลยคาดการณ์ ${-remaining} วัน`} · รอยืนยัน`;
    $('ovulation').textContent=e.regular?range(e.ovulationFrom,e.ovulationTo):'ยังประเมินไม่ได้';
  }
  renderCalendar();renderHistory();renderSettings();
}
function renderCalendar(){
  const first=month+'-01',dayOfWeek=new Date(first).getUTCDay(),total=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  $('month-label').textContent=new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(first));
  const grid=$('calendar');grid.replaceChildren();
  for(let i=0;i<dayOfWeek;i++)grid.append(document.createElement('span'));
  for(let d=1;d<=total;d++){
    const date=`${month}-${String(d).padStart(2,'0')}`,e=calendarDay(state,date,today),b=document.createElement('button');
    const ovulation=e.regular&&e.kind==='fertile'&&date>=e.ovulationFrom&&date<=e.ovulationTo;
    b.type='button';b.textContent=d;b.className=`day ${e.kind}${ovulation?' ovulation':''}${date===today?' today':''}${date===selected?' selected':''}${state.notes[date]||state.periods.some(p=>p.start===date||p.end===date)?' has-note':''}`;
    b.setAttribute('aria-label',`${fmt(date,true)} ${e.label}${ovulation?' ช่วงคาดการณ์ไข่ตก':''}${date===today?' วันนี้':''}`);b.setAttribute('aria-pressed',String(date===selected));b.onclick=()=>{selected=date;renderCalendar();};grid.append(b);
  }
  const e=calendarDay(state,selected,today),el=$('selected-day');el.replaceChildren();
  const title=document.createElement('strong');title.textContent=`${fmt(selected,true)} · ${e.label}`;el.append(title);
  const desc=document.createElement('p');desc.textContent=e.kind==='fertile'?`ช่วงวันที่ 8–19 ของรอบ: ${range(e.fertileStart,e.fertileEnd)} · เป็นการประมาณการ`:'ทุกช่วงของปฏิทินยังมีโอกาสตั้งครรภ์ได้';el.append(desc);
  if(state.notes[selected]){const p=document.createElement('p');const n=state.notes[selected];p.textContent=`ปวดระดับ ${n.pain}/3 · ${n.text||'บันทึกอาการแล้ว'}`;el.append(p);}
  if(selected<=today){const b=document.createElement('button');b.className='text-button';b.textContent='＋ บันทึก / แก้ไขวันนี้';b.onclick=()=>openLog(selected);el.append(b);}
}
function renderHistory(){
  const ps=state.periods,intervals=ps.slice(1).map((p,i)=>daysBetween(ps[i].start,p.start));
  $('history-summary').textContent=intervals.length?`${ps.length} รอบที่บันทึก · เฉลี่ย ${(intervals.reduce((a,b)=>a+b,0)/intervals.length).toFixed(1)} วัน · สั้นสุด ${Math.min(...intervals)} / ยาวสุด ${Math.max(...intervals)} วัน`:'เมื่อบันทึกอย่างน้อย 2 รอบ จะเริ่มเห็นระยะห่างจริงของรอบเดือน';
  const list=$('history-list');list.replaceChildren();
  for(const p of [...ps].reverse()){
    const card=document.createElement('article');card.className='card history-item';
    const h=document.createElement('h2');h.textContent=fmt(p.start,true);card.append(h);
    const text=document.createElement('p');text.textContent=p.end?`ถึง ${fmt(p.end)} · มาจริง ${daysBetween(p.start,p.end)+1} วัน`:'ยังไม่ได้บันทึกวันสุดท้าย';card.append(text);
    const edit=document.createElement('button');edit.className='text-button';edit.textContent='แก้ไขวันที่';edit.onclick=()=>editPeriod(p);card.append(edit);
    const del=document.createElement('button');del.className='text-button danger';del.textContent='ลบรอบนี้';del.onclick=async()=>{if(!confirm(`ลบรอบที่เริ่ม ${fmt(p.start,true)}?`))return;const next=clone();next.periods=next.periods.filter(x=>x.start!==p.start);try{await commit(next);toast('ลบรอบแล้ว');}catch(e){toast(e.message);}};card.append(del);list.append(card);
  }
  const notes=Object.entries(state.notes).sort(([a],[b])=>b.localeCompare(a)).slice(0,30);
  for(const [date,n] of notes){const card=document.createElement('article');card.className='card history-item';const h=document.createElement('h2');h.textContent=fmt(date,true);const p=document.createElement('p');p.textContent=`ปวด ${n.pain}/3 · ${n.text||'บันทึกอาการ'}`;const b=document.createElement('button');b.className='text-button';b.textContent='แก้ไขบันทึก';b.onclick=()=>openLog(date);card.append(h,p,b);list.append(card);}
}
function renderSettings(){
  $('cycle-length').value=state.cycleLength;$('period-length').value=state.periodLength;
}
let editingStart=null;
function openLog(date){
  editingStart=null;$('log-date').value=date;$('log-date').max=today;fillLog(date);$('log-dialog').showModal();
}
function fillLog(date){const n=state.notes[date];$('log-start').checked=state.periods.some(p=>p.start===date);$('log-end').checked=state.periods.some(p=>p.end===date);$('log-flow').value=n?.flow||'none';$('log-pain').value=n?.pain||0;$('log-note').value=n?.text||'';$('log-error').textContent='';$('delete-note').hidden=!n;}
function editPeriod(p){openLog(p.start);editingStart=p.start;toast('แก้วันแรกได้ที่ช่องวันที่ หรือเลือกวันสุดท้ายจากปฏิทิน');}
$('log-date').onchange=()=>{if(!editingStart)fillLog($('log-date').value);};
$('open-log').onclick=()=>openLog(today);$('add-past').onclick=()=>openLog(selected<=today?selected:today);$('close-log').onclick=()=>$('log-dialog').close();
$('login-form').onsubmit=async e=>{e.preventDefault();controlsBusy(e.target,true);try{await api('login',{password:$('password').value});$('password').value='';await unlock();}catch(e){toast(e.message);}finally{controlsBusy(e.target,false);}};
$('logout').onclick=async()=>{try{await api('logout',{});lock();toast('ออกจากระบบแล้ว');}catch(e){toast(e.message);}};
$('setup-form').onsubmit=async e=>{e.preventDefault();controlsBusy(e.target,true);try{const next=clone();next.cycleLength=Number($('initial-cycle').value);next.periodLength=Number($('initial-length').value);next.periods=[{start:$('initial-date').value,end:null}];await commit(next);toast('บันทึกรอบแรกแล้ว ♡');}catch(e){toast(e.message);}finally{controlsBusy(e.target,false);}};
$('log-form').onsubmit=async e=>{
  e.preventDefault();controlsBusy(e.target,true);$('log-error').textContent='';
  try{
    const next=clone(),date=$('log-date').value;
    if(editingStart&&editingStart!==date){if(!$('log-start').checked)throw new Error('ติ๊กวันแรกของประจำเดือนเพื่อย้ายวันเริ่มรอบ');if(next.periods.some(p=>p.start===date))throw new Error('มีรอบที่เริ่มวันนี้แล้ว');const p=next.periods.find(p=>p.start===editingStart);p.start=date;if(p.end&&p.end<date)throw new Error('วันแรกต้องอยู่ก่อนวันสุดท้าย');}
    const existing=next.periods.find(p=>p.start===date);
    if($('log-start').checked&&!existing)next.periods.push({start:date,end:null});
    if(!$('log-start').checked&&existing){if(!confirm('เอาวันเริ่มรอบนี้ออกจากประวัติ?'))return;next.periods=next.periods.filter(p=>p.start!==date);}
    next.periods.sort((a,b)=>a.start.localeCompare(b.start));
    // Unchecking an existing end date removes only that marker.
    for(const p of next.periods)if(p.end===date&&!$('log-end').checked)p.end=null;
    if($('log-end').checked){const p=next.periods.filter(p=>p.start<=date).at(-1);if(!p)throw new Error('บันทึกวันแรกของรอบก่อน แล้วค่อยบันทึกวันสุดท้าย');p.end=date;}
    next.notes[date]={text:$('log-note').value,flow:$('log-flow').value,pain:Number($('log-pain').value)};
    await commit(next);$('log-dialog').close();toast('บันทึกแล้ว ดูแลตัวเองด้วยนะ ♡');
  }catch(e){$('log-error').textContent=e.message;}finally{controlsBusy(e.target,false);}
};
$('delete-note').onclick=async()=>{if(!confirm('ลบอาการและข้อความของวันนี้? วันที่เริ่มและสิ้นสุดรอบยังคงอยู่'))return;try{const next=clone();delete next.notes[$('log-date').value];await commit(next);$('log-dialog').close();toast('ลบบันทึกอาการแล้ว');}catch(e){toast(e.message);}};
$('settings-form').onsubmit=async e=>{e.preventDefault();controlsBusy(e.target,true);try{const next=clone();next.cycleLength=Number($('cycle-length').value);next.periodLength=Number($('period-length').value);await commit(next);toast('บันทึกการตั้งค่าแล้ว');}catch(e){toast(e.message);}finally{controlsBusy(e.target,false);}};
function shiftMonth(n){const d=new Date(month+'-01');d.setUTCMonth(d.getUTCMonth()+n);month=d.toISOString().slice(0,7);renderCalendar();}
$('prev-month').onclick=()=>shiftMonth(-1);$('next-month').onclick=()=>shiftMonth(1);$('calendar-today').onclick=()=>{month=today.slice(0,7);selected=today;renderCalendar();};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>{for(const name of ['home','history','settings'])$(name+'-view').hidden=name!==b.dataset.view;for(const x of document.querySelectorAll('[data-view]'))x.classList.toggle('active',x===b);scrollTo({top:0,behavior:'instant'});};
$('export-data').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`eggcycle-${today}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
async function start(){lock();try{const session=await api('session');if(session.authenticated)await unlock();$('connection-status').textContent='สำหรับเราสองคน ♡';}catch(e){$('connection-status').textContent=e.message;}}
// Refresh the Bangkok date and check server session whenever returning to the app.
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&state&&!$('log-dialog').open){try{await unlock();}catch(e){toast(e.message);}}});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/eggcycle/sw.js',{scope:'/eggcycle/'}).catch(()=>{});
start();
