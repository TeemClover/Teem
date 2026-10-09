import {somchaiWebtoon as story} from './somchai-webtoon.js';
import {call} from './platform/client.js';
import {html,freeEpisodeCount} from './platform/rules.js';
const $=s=>document.querySelector(s),free=freeEpisodeCount(story);
let range=1,query='',unlocked=new Set(),progress;
try{const state=JSON.parse(localStorage.getItem('tontor:prototype:v1')||'{}');unlocked=new Set(state.unlocked||[]);if(state.contentEditions?.somchai===story.edition)progress=state.progress?.somchai;}catch{}
function render(){
 const eps=Array.from({length:story.episodes},(_,i)=>i+1).filter(ep=>query?(`${ep} ${story.episodeNames[ep-1]}`).toLocaleLowerCase('th').includes(query):(range==='all'||ep>=range&&ep<range+20));
 $('#episode-count').textContent=query?`พบ ${eps.length} ตอน · จากทั้งหมด ${story.episodes} ตอน`:`ทั้งหมด ${story.episodes} ตอน · ${range==='all'?'แสดงทุกตอน':`ตอน ${range}–${Math.min(story.episodes,range+19)}`}`;
 $('#episode-catalog').innerHTML=eps.map((ep,index)=>{const size=story.episodeCardSizes[ep-1],owned=unlocked.has(`somchai:${ep}`),status=ep<=free?'อ่านฟรี':owned?'ปลดล็อกแล้ว':'10 เหรียญ';return `<a class="episode-tile ${progress?.episode===ep?'current':''}" data-episode="${ep}" href="/short/story/somchai/?episode=${ep}" aria-label="ตอน ${ep} ${html(story.episodeNames[ep-1])} · ${status}"><span class="episode-art"><img src="/short/${story.episodeCards[ep-1].replace('./','')}" width="${size.width}" height="${size.height}" alt="ปกตอน ${ep} ${html(story.episodeNames[ep-1])}" loading="${index<4?'eager':'lazy'}" decoding="async"><span class="episode-status ${ep<=free?'free':owned?'unlocked':''}">${status}</span></span><span class="episode-number">ตอน ${ep}${progress?.episode===ep?' · อ่านล่าสุด':''}</span><strong>${html(story.episodeNames[ep-1])}</strong></a>`}).join('');
 $('#no-episodes').hidden=eps.length>0;document.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',String(!query&&String(range)===b.dataset.range)));
}
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.range==='all'?'all':Number(b.dataset.range);query='';$('#find-episode').value='';render()}));
$('#find-episode').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('th');render()});
if(progress){$('#start-reading').href=`/short/story/somchai/?episode=${progress.episode}`;$('#start-reading').textContent=`อ่านต่อ · ตอน ${progress.episode} →`}
render();call('wallet').then(w=>{unlocked=new Set(w.unlocked);render()}).catch(()=>{});
