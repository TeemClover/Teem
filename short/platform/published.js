import {config,call,api,asset} from './client.js';
import {html} from './rules.js';
import {demo} from './demo.js';
export async function mountPublished(notice){
 const c=await config(),section=document.createElement('section');section.id='published-creators';section.className='page-width content-section';section.innerHTML='<div class="section-heading"><h2>เรื่องใหม่จาก Creator ไทย</h2><a href="/short/studio/">ส่งเรื่องของคุณ ↗</a></div><div class="published-grid"></div>';document.querySelector('#continue-section').after(section);
 let works=c.mode==='demo'?await demo.works(true):(await api('published')).works;section.hidden=!works.length;const grid=section.querySelector('.published-grid');let urls=[];
 grid.innerHTML=works.map(w=>`<button class="published-card" data-published="${html(w.id)}"><img alt="" loading="lazy"><strong>${html(w.title)}</strong><small>${html(w.team)} · ตอน ${w.episode}</small></button>`).join('');
 for(const w of works){try{const url=await asset(w.cover);urls.push(url);grid.querySelector(`[data-published="${w.id}"] img`).src=url}catch{}}
 const dialog=document.createElement('dialog');dialog.className='creator-reader-dialog';dialog.innerHTML='<header><strong class="published-title"></strong><button class="published-close" aria-label="ปิด">×</button></header><div class="published-description"></div><div class="published-body"></div>';document.body.append(dialog);dialog.querySelector('.published-close').onclick=()=>dialog.close();let current=null,seconds=0,clock,session;
 dialog.addEventListener('close',()=>{dialog.querySelector('video')?.pause();record(false);clearInterval(clock);});
 function record(complete){if(current&&seconds>=3)call('view',{story:current.id,episode:current.episode,session,format:current.format,seconds,complete}).catch(()=>{});}
 grid.addEventListener('click',async e=>{const button=e.target.closest('[data-published]');if(!button)return;const w=works.find(w=>w.id===button.dataset.published);button.disabled=true;try{
  if(w.price){const wallet=await call('wallet');if(!wallet.unlocked.includes(`${w.id}:${w.episode}`)){if(!confirm(`ปลดล็อก ${w.title} ตอน ${w.episode} ด้วย 10 เหรียญ?`))return;const value=await call('unlock',w.id,w.episode);window.dispatchEvent(new CustomEvent('torntor:wallet',{detail:value}));}}
  current=w;seconds=0;session=crypto.randomUUID();dialog.querySelector('.published-title').textContent=w.title+' · ตอน '+w.episode;dialog.querySelector('.published-description').textContent=w.summary;dialog.querySelector('.published-body').textContent='กำลังโหลด…';dialog.showModal();let content='';
  for(const file of w.files){const url=await asset(file);urls.push(url);if(w.format==='drama')content+=`<video src="${html(url)}" controls playsinline></video>`;else if(w.format==='comic')content+=`<img src="${html(url)}" alt="หน้าการ์ตูน" loading="lazy">`;else content+=`<article>${html(await fetch(url).then(r=>r.text())).split('\n').map(line=>`<p>${line}</p>`).join('')}</article>`;}
  const body=dialog.querySelector('.published-body');body.innerHTML=content;body.scrollTop=0;clearInterval(clock);clock=setInterval(()=>{if(!dialog.open||document.hidden)return;const video=body.querySelector('video');if(video&&(video.paused||video.ended))return;seconds++;if(seconds%5===0)record(body.scrollHeight>body.clientHeight&&body.scrollTop>=body.scrollHeight-body.clientHeight-10)},1000);body.querySelector('video')?.addEventListener('ended',()=>record(true));
 }catch(e){notice(e.message)}finally{button.disabled=false}});
 window.addEventListener('pagehide',()=>urls.forEach(u=>{if(u.startsWith('blob:'))URL.revokeObjectURL(u)}));
}
