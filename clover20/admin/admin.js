const $=selector=>document.querySelector(selector);
const grid=$('#guest-grid'),status=$('#result-status'),error=$('#error');
const more=$('#load-more'),refresh=$('#refresh'),download=$('#export');
const count=new Intl.NumberFormat('th-TH');
const date=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
let cursor=null,storiesOnly=false,controller,revision=0,shown=0,searchTimer,hasLoaded=false;

function guestCard(guest){
  const card=document.createElement('article');
  card.className='guest-card'+(guest.message.trim()?' has-story':'');
  const heading=document.createElement('div');heading.className='guest-heading';
  const mark=document.createElement('span');mark.className='guest-mark';mark.textContent='✳';mark.setAttribute('aria-hidden','true');
  const identity=document.createElement('div'),name=document.createElement('h3'),time=document.createElement('time');
  name.textContent=guest.name;time.dateTime=guest.createdAt;time.textContent=date.format(new Date(guest.createdAt))+' น.';
  identity.append(name,time);heading.append(mark,identity);card.append(heading);
  const message=document.createElement('p');
  message.className=guest.message.trim()?'guest-message':'no-message';
  message.textContent=guest.message.trim()?guest.message:'ฝากชื่อไว้แล้ว รอเจอกันในวันงาน';
  card.append(message);
  if(guest.message.trim()){
    const label=document.createElement('p');label.className='card-label';label.textContent='A STORY TO SHARE';card.append(label);
  }
  return card;
}

async function load(reset=true){
  const current=++revision;
  controller?.abort();controller=new AbortController();
  const signal=controller.signal;
  const timer=setTimeout(()=>controller?.signal===signal&&controller.abort(),15000);
  grid.setAttribute('aria-busy','true');refresh.disabled=true;more.disabled=true;error.hidden=true;
  if(!hasLoaded)status.textContent='กำลังเปิดรายชื่อเพื่อน…';
  const params=new URLSearchParams({search:$('#search').value.trim(),stories:storiesOnly?'1':'0'});
  if(!reset&&cursor)params.set('before',cursor);
  try{
    const response=await fetch('/api/clover20-guests?'+params,{cache:'no-store',signal});
    const result=await response.json();
    if(!response.ok||!result.ok)throw Error(result.message||'ยังโหลดคำตอบรับไม่ได้ ลองใหม่อีกครั้งนะ');
    if(current!==revision)return;
    if(reset){grid.replaceChildren();shown=0;}
    grid.append(...result.guests.map(guestCard));shown+=result.guests.length;cursor=result.nextCursor;
    $('#total').textContent=count.format(result.summary.total);$('#stories').textContent=count.format(result.summary.withMessages);
    download.disabled=result.summary.total===0;more.hidden=!cursor;
    status.textContent=(params.get('search')||storiesOnly?'พบ '+count.format(result.matching)+' คำตอบรับ':'ทั้งหมด '+count.format(result.summary.total)+' คำตอบรับ')+(cursor?' · แสดงแล้ว '+count.format(shown):'');
    $('#empty').hidden=result.matching!==0;
    $('#empty-title').textContent=result.summary.total===0?'รอเพื่อนคนแรกกลับบ้าน':'ยังไม่เจอคำตอบรับที่ค้นหา';
    $('#empty-copy').textContent=result.summary.total===0?'เมื่อมีคนตอบรับ ชื่อและเรื่องราวจะมาอยู่ตรงนี้':'ลองค้นหาด้วยคำอื่น หรือเลือกดูทั้งหมดนะ';
    $('#updated').textContent='ข้อมูลล่าสุด '+date.format(new Date(result.updatedAt))+' น. · แสดงคำตอบรับใหม่ก่อน';
    hasLoaded=true;
  }catch(problem){
    if(current!==revision)return;
    error.textContent=problem.name==='AbortError'?'การเชื่อมต่อใช้เวลานาน ลองกดอัปเดตอีกครั้งนะ':problem.message;
    error.hidden=false;
    if(!hasLoaded)status.textContent='ยังโหลดรายชื่อไม่สำเร็จ';
  }finally{
    clearTimeout(timer);
    if(current===revision){grid.setAttribute('aria-busy','false');refresh.disabled=false;more.disabled=false;}
  }
}

$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>load(),280);});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  clearTimeout(searchTimer);storiesOnly=button.dataset.filter==='stories';
  document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  load();
}));
refresh.addEventListener('click',()=>{clearTimeout(searchTimer);load();});
more.addEventListener('click',()=>load(false));
download.addEventListener('click',async()=>{
  download.disabled=true;const label=download.querySelector('span');label.textContent='กำลังเตรียมไฟล์…';
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);
  try{
    const response=await fetch('/api/clover20-guests?format=csv',{cache:'no-store',signal:abort.signal});
    if(!response.ok){const result=await response.json();throw Error(result.message||'ยังดาวน์โหลดไม่ได้ ลองใหม่อีกครั้งนะ');}
    const blob=await response.blob(),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download=response.headers.get('Content-Disposition')?.match(/filename="([\w.-]+)"/)?.[1]||'clover20-guests.csv';
    document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(problem){error.textContent=problem.name==='AbortError'?'เตรียมไฟล์นานกว่าปกติ ลองดาวน์โหลดอีกครั้งนะ':problem.message;error.hidden=false;}
  finally{clearTimeout(timer);download.disabled=false;label.textContent='ดาวน์โหลดทั้งหมด · CSV';}
});
load();
