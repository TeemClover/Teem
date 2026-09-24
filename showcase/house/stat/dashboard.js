import {FEATURES,OPT_OUT_KEY} from '../app/analytics-contract.js';
import {house} from '../app/data/house.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v||0).toLocaleString('th-TH'),pct=(a,b)=>b?`${Math.round(a/b*100)}%`:'—';
const duration=s=>s==null?'—':s>=60?`${Math.floor(s/60)} นาที ${Math.round(s%60)} วิ`:`${Math.round(s)} วิ`;
let version=0,controller;
const table=(headers,rows)=>`<table><thead><tr>${headers.map((v,i)=>`<th${i?' class="number"':''}>${esc(v)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(row=>`<tr>${row.map((v,i)=>`<td class="${i?'number':'wrap'}">${v}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">ยังไม่มีข้อมูลในช่วงนี้</td></tr>`}</tbody></table>`;
async function request(url,options={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const data=await r.json();if(!r.ok){const e=new Error(data.error||'REQUEST_FAILED');e.status=r.status;throw e;}return data;}
function login(){version++;controller?.abort();$('#dashboard').hidden=true;$('#login').hidden=false;$('#password').focus();}
function exclude(value){try{localStorage.setItem(OPT_OUT_KEY,value?'1':'0');$('#exclusion-status').textContent=value?'เบราว์เซอร์นี้จะไม่ส่งสถิติในหน้าที่เปิดครั้งถัดไป':'ระหว่างล็อกอินหลังบ้าน ระบบยังงดเก็บให้อัตโนมัติ';}catch{$('#exclusion-status').textContent='บันทึกการตั้งค่าไม่ได้ แต่ระหว่างล็อกอินหลังบ้านระบบยังงดเก็บให้อัตโนมัติ';}}
function render(data){
 const s=data.summary,visits=s.visits;
 $('#updated').textContent=`อัปเดต ${new Date(data.generatedAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'})} · เวลาไทย`;
 $('#empty').hidden=visits>0;
 $('#coverage').textContent=data.coverage.first_visit?`มีข้อมูลตั้งแต่ ${new Date(data.coverage.first_visit).toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium'})} · ก่อนหน้านี้ไม่มีข้อมูลย้อนหลัง`:'';
 const cards=[['ผู้เยี่ยมชม',n(s.visitors),`${n(visits)} ครั้งที่เปิดหน้า · เบราว์เซอร์โดยประมาณ`],['เปิดแล้วเล่นต่อ',pct(s.engaged,visits),`${n(s.engaged)} ครั้ง · โต้ตอบและอยู่ ≥ 10 วิ`],['เวลาเล่นค่ากลาง',duration(s.median_seconds),`เฉลี่ย ${duration(s.average_seconds)} · ไม่นับแท็บที่ซ่อน`],['กดไปหน้าคอร์ส',n(s.course_visitors),`${pct(s.course_visitors,s.visitors)} ของผู้เยี่ยมชม · ไม่ใช่ยอดสมัคร`]];
 $('#cards').innerHTML=cards.map(([label,value,detail],i)=>`<article class="card ${i===3?'accent':''}"><span class="label">${label}</span><strong class="number">${value}</strong><small>${detail}</small></article>`).join('');
 const today=new Date(new Date(data.generatedAt).getTime()+7*3600000).toISOString().slice(0,10),end=Date.parse(`${today}T00:00:00Z`);
 const daily=Array.from({length:data.days},(_,i)=>{const day=new Date(end-(data.days-1-i)*86400000).toISOString().slice(0,10);return data.daily.find(r=>r.day===day)||{day,visitors:0,visits:0,engaged:0,course:0,seconds:0};});
 const max=Math.max(1,...daily.flatMap(r=>[r.visits,r.engaged]));
 $('#trend').innerHTML=daily.map((r,i)=>`<div class="day" tabindex="0" aria-label="${esc(r.day)} ผู้เยี่ยมชม ${n(r.visitors)} เปิดแล้วเล่นต่อ ${n(r.engaged)}"><span class="bar" style="height:${r.visits/max*100}%"></span><span class="bar engaged" style="height:${r.engaged/max*100}%"></span><span class="day-tip">${esc(r.day)}<br>${n(r.visits)} ครั้งเปิดหน้า · เล่นต่อ ${n(r.engaged)} ครั้ง</span>${i%Math.max(1,Math.ceil(data.days/6))===0?`<span class="date">${r.day.slice(8)}/${r.day.slice(5,7)}</span>`:''}</div>`).join('');
 $('#daily').innerHTML=table(['วันที่','ผู้เยี่ยมชม','เปิดหน้า','เล่นต่อ','ไปคอร์ส','เวลาเฉลี่ย'],[...daily].reverse().map(r=>[esc(r.day),n(r.visitors),n(r.visits),n(r.engaged),n(r.course),duration(r.seconds)]));
 const journey=[['เปิดหน้า',visits],['โมเดลพร้อม',s.ready],['เริ่มใช้ฟังก์ชัน',s.played],['เลือกสำรวจห้อง',s.explored],['ลอง HD',s.hd],['เปิดข้อมูลห้องเรียน',s.learn],['กดไปหน้าคอร์ส',s.course_visits]];
 $('#journey').innerHTML=journey.map(([label,value])=>`<div class="journey-row"><div class="row-head"><span>${label}</span><span>${n(value)} · ${pct(value,visits)}</span></div><div class="meter"><i style="width:${visits?value/visits*100:0}%"></i></div></div>`).join('');
 const features=Object.entries(FEATURES).map(([key,label])=>({key,label,uses:0,used:0,exposed:0,...data.features.find(f=>f.key===key)})).sort((a,b)=>b.used-a.used||b.exposed-a.exposed);
 $('#features').innerHTML=table(['ฟังก์ชัน','เห็น','ใช้','ใช้ / เห็น','ใช้ทั้งหมด','ข้อสังเกต'],features.map(f=>[esc(f.label),n(f.exposed),n(f.used),pct(f.used,f.exposed),n(f.uses),`<span class="badge ${f.used?'good':f.exposed?'attention':''}">${!f.exposed?'ยังไม่ถูกเห็น':!f.used?'เห็น แต่ยังไม่ใช้':'มีคนใช้แล้ว'}</span>`]));
 const insights=[];
 if(visits<20)insights.push('ข้อมูลยังน้อย เก็บอย่างน้อย 20 ครั้งเปิดหน้าก่อนเริ่มเทียบแนวโน้ม');
 else{
  if(s.engaged/visits<.4)insights.push('คนส่วนใหญ่ยังไม่เริ่มเล่นต่อ ลองทำลิงก์แชร์ให้ชวนสำรวจจุดเด่นหนึ่งจุด แล้วดูอัตราเล่นต่อ');
  const hidden=features.filter(f=>f.exposed/visits<.2&&['walls','rooms','hd','tour','learn'].includes(f.key)).slice(0,3);
  if(hidden.length)insights.push(`ยังเห็นเครื่องมือนี้น้อย: ${hidden.map(f=>f.label).join(' · ')} ลองทำทางเข้าชัดขึ้น`);
  const idle=features.filter(f=>f.exposed>=10&&f.used/f.exposed<.1).slice(0,3);
  if(idle.length)insights.push(`เห็นแล้วแต่ไม่ค่อยใช้: ${idle.map(f=>f.label).join(' · ')} ลองปรับชื่อหรือจังหวะที่เสนอ`);
  if(s.learn>=10&&s.course_visits/s.learn<.2)insights.push('เปิดข้อมูลห้องเรียนแล้วไปต่อไม่มาก ลองทำข้อความและทางไปคอร์สให้ชัดขึ้น');
  if(s.errors>0)insights.push(`พบโมเดลเปิดไม่สำเร็จ ${n(s.errors)} ครั้ง ลองตรวจแยกตามอุปกรณ์`);
  if(!insights.length)insights.push('เริ่มมีคนสำรวจต่อแล้ว ลองเปรียบเทียบแหล่งที่มากับเวลาเล่นและการกดไปคอร์ส');
 }
 $('#insights').innerHTML=insights.map(t=>`<p>${esc(t)}</p>`).join('');
 $('#health').innerHTML=`<span>โมเดลพร้อมค่ากลาง ${s.median_ready_ms==null?'—':(s.median_ready_ms/1000).toFixed(1)+' วิ'}</span><span>P90 ${s.p90_ready_ms==null?'—':(s.p90_ready_ms/1000).toFixed(1)+' วิ'}</span><span>โมเดลผิดพลาด ${n(s.errors)}</span><span>HD พร้อม ${n(s.hd_ready)} · ผิดพลาด ${n(s.hd_errors)}</span><span>เล่น ≥ 1 นาที ${n(s.minute_visits)} ครั้ง</span>`;
 $('#sources').innerHTML=table(['แหล่งที่มา / แคมเปญ','ผู้เยี่ยมชม','เปิดหน้า','เล่นต่อ','ไปคอร์ส','เวลาเฉลี่ย'],data.sources.map(r=>[`${esc(r.source)}${r.medium||r.campaign?`<br><small>${esc([r.medium,r.campaign].filter(Boolean).join(' / '))}</small>`:''}`,n(r.visitors),n(r.visits),pct(r.engaged,r.visits),n(r.course),duration(r.seconds)]));
 $('#rooms').innerHTML=table(['ห้อง','เปิดสำรวจ','จำนวนเลือก'],data.rooms.map(r=>[esc(house.rooms.find(room=>room.id===r.room)?.name||r.room),n(r.visits),n(r.uses)]));
 $('#devices').innerHTML=table(['อุปกรณ์','เปิดหน้า','เล่นต่อ','ผิดพลาด'],data.devices.map(r=>[esc({mobile:'มือถือ',tablet:'แท็บเล็ต',desktop:'คอมพิวเตอร์'}[r.device]||r.device),n(r.visits),pct(r.engaged,r.visits),n(r.errors)]));
 const signals={guide_seen:'เห็นคำแนะนำ',guide_started:'เริ่มสำรวจ',guide_skipped:'ข้าม walkthrough',guide_closed:'ปิดคำแนะนำ',guide_completed:'ดู walkthrough จบ',tour_complete:'พาชมจนจบ'};
 $('#guides').innerHTML=table(['กิจกรรม','ครั้งเปิดหน้า'],Object.entries(signals).map(([key,label])=>[label,n(data.signals.find(r=>r.key===key)?.visits)]));
 $('#exclusion-status').textContent=`ข้อมูลแรกที่ยังเก็บอยู่: ${data.coverage.first_visit?new Date(data.coverage.first_visit).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}):'ยังไม่มี'} · เริ่มเก็บหลังเผยแพร่ระบบสถิติ`;
}
async function load(){
 $('#login').hidden=true;$('#dashboard').hidden=false;
 const current=++version;controller?.abort();controller=new AbortController();$('#refresh').disabled=true;$('#status').textContent='กำลังโหลดสถิติ…';
 try{const data=await request(`/api/house-stats?days=${$('#range').value}`,{signal:controller.signal});if(current!==version)return;render(data);$('#login').hidden=true;$('#dashboard').hidden=false;$('#status').textContent='';}
 catch(error){if(current!==version||error.name==='AbortError')return;if(error.status===401){login();$('#status').textContent='เข้าสู่ระบบหลังบ้านเพื่อดูสถิติ';}else $('#status').textContent='โหลดข้อมูลไม่ได้ ข้อมูลเดิมยังอยู่ กรุณาลองรีเฟรชอีกครั้ง';}
 finally{if(current===version)$('#refresh').disabled=false;}
}
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;$('#status').textContent='กำลังเข้าสู่ระบบ…';try{await request('/api/backoffice-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:$('#password').value})});$('#password').value='';exclude(true);$('#exclude').checked=true;await load();}catch(error){$('#status').textContent=error.status===401?'รหัสผ่านไม่ถูกต้อง':error.status===429?'ลองหลายครั้งแล้ว พักสักครู่แล้วลองใหม่':'เข้าสู่ระบบไม่ได้ กรุณาลองอีกครั้ง';}finally{button.disabled=false;}});
$('#logout').addEventListener('click',async()=>{try{await request('/api/backoffice-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});login();$('#status').textContent='ออกจากระบบแล้ว';}catch{$('#status').textContent='ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง';}});
$('#range').addEventListener('change',load);$('#refresh').addEventListener('click',load);$('#exclude').addEventListener('change',e=>exclude(e.target.checked));
try{$('#exclude').checked=localStorage.getItem(OPT_OUT_KEY)==='1';}catch{}
try{const session=await request('/api/backoffice-auth');if(session.authenticated){exclude(true);$('#exclude').checked=true;await load();}else {login();$('#status').textContent='';}}catch{login();$('#status').textContent='ตรวจสอบระบบไม่ได้ ลองเข้าสู่ระบบอีกครั้ง';}
