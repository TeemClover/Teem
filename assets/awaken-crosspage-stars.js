/* myClover · AWAKEN cross-page star reconciliation
   The notebook is a separate page but part of the same Dungeon.
   Stars therefore behave as BEST RUN progress: they may upgrade when a player
   completes notebook/restoration/secret progress and returns, but never downgrade.
*/

const LOOT_KEY='mc_awaken_loot_v3';
const EXPLORE_KEY='mc_awaken_explore_v1';

function bossPath(){
  return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname);
}
function readJSON(key,fallback){
  try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}
}
function writeJSON(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function flag(key){try{return localStorage.getItem(key)==='1'}catch{return false}}
function explored(){const raw=readJSON(EXPLORE_KEY,[]);return new Set(Array.isArray(raw)?raw:[])}

function currentProgress(){
  const set=explored();
  return {
    timeSaver:set.has('time-saver'),
    party:set.has('party-loadout'),
    notebook:set.has('notebook-entered')||flag('mc_nb_seen'),
    restored:flag('mc_nb_restored'),
    secret:flag('mc_secret_end'),
  };
}
function mergeProgress(a={},b={}){
  return {
    timeSaver:!!(a.timeSaver||b.timeSaver),
    party:!!(a.party||b.party),
    notebook:!!(a.notebook||b.notebook),
    restored:!!(a.restored||b.restored),
    secret:!!(a.secret||b.secret),
  };
}
function starsFor(p){return Math.min(5,1+Number(p.timeSaver)+Number(p.party)+Number(p.restored)+Number(p.secret))}
function rankFor(stars){return ['☆☆☆☆☆ · SPEEDRUNNER','★ BOSS CLEAR','★★ CURIOUS PLAYER','★★★ DUNGEON SCOUT','★★★★ LORE KEEPER','★★★★★ SECRET SEEKER'][stars]||''}

const ITEM_DEFS={
  'xp-scroll':{id:'xp-scroll',icon:'📜',name:'ม้วนประสบการณ์ ×3',note:'กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง',action:'xp'},
  'sleep-debt':{id:'sleep-debt',icon:'😴',name:'ใบเสร็จหนี้การนอน 14 วัน',note:'ได้จาก Side Quest เรื่องเวลาที่ประหยัดจากการใช้ภาษาตรงกับ AI'},
  'relay-coupler':{id:'relay-coupler',icon:'🔌',name:'Party Relay Coupler',note:'ได้จากการเปิดดู Party และวิธีส่งงานเป็น Relay'},
  'notebook-map':{id:'notebook-map',icon:'📓',name:'แผนที่สมุดลับ',note:'ได้จากการออกนอก Main Quest ไปเปิดสมุดเล่มเก่า'},
  'restored-memory':{id:'restored-memory',icon:'🔨',name:'Restored Memory',note:'ได้จากการใช้ BLACKSMITH ซ่อมสมุดที่เสียหาย'},
  'playmate-relic':{id:'playmate-relic',icon:'🍀',name:'Playmate Relic',note:'ได้จากการเดินสมุดไปจนถึง Secret Ending'},
};
function desiredItems(progress,state){
  const ids=['xp-scroll'];
  if(progress.timeSaver)ids.push('sleep-debt');
  if(progress.party)ids.push('relay-coupler');
  if(progress.notebook)ids.push('notebook-map');
  if(progress.restored)ids.push('restored-memory');
  if(progress.secret)ids.push('playmate-relic');
  const existing=new Map((Array.isArray(state.items)?state.items:[]).map(x=>[x.id,x]));
  return ids.map(id=>existing.get(id)||ITEM_DEFS[id]).filter(Boolean);
}

function reconcile(reason='sync'){
  if(!bossPath())return null;
  const state=readJSON(LOOT_KEY,null);
  if(!state||state.version!==4||!state.chestOpened)return state;
  const progress=mergeProgress(state.progress,currentProgress());
  const target=starsFor(progress);
  const before=Number(state.stars||0);
  if(target<=before){patchVisible(state);return state}

  const next={
    ...state,
    stars:target,
    progress,
    salt:false,
    items:desiredItems(progress,state),
    bestRankUpdatedAt:Date.now(),
    bestRankReason:reason,
  };
  writeJSON(LOOT_KEY,next);
  try{
    if(target>=3)window.MC_MINI_UNLOCK?.('boss-3-stars');
    if(target>=5)window.MC_MINI_UNLOCK?.('boss-5-stars');
    window.MC_ACT?.(`awaken-best-rank-${target}-stars`);
  }catch{}
  patchVisible(next);
  return next;
}

function itemNode(item){
  const div=document.createElement('div');
  div.className='loot-item';
  div.dataset.lootId=item.id;
  div.innerHTML=`<span class="icon">${item.icon}</span><span><b>${item.name}</b><small>${item.note}</small></span>`;
  return div;
}
function patchVisible(state=readJSON(LOOT_KEY,null)){
  if(!state?.chestOpened)return;
  const screen=document.querySelector('.loot-screen');
  if(!screen)return;
  const stars=Math.max(0,Math.min(5,Number(state.stars||0)));
  const starNode=screen.querySelector('.loot-stars');
  if(starNode)starNode.textContent='★'.repeat(stars)+'☆'.repeat(5-stars);
  const rank=screen.querySelector('.loot-rank');
  if(rank)rank.textContent=rankFor(stars);
  const micro=screen.querySelector('.micro');
  if(micro&&/BOSS CHEST OPENED|LOOT LOCKED/.test(micro.textContent))micro.textContent='BOSS CHEST · BEST DUNGEON RANK';
  const say=screen.querySelector('.say');
  if(say&&screen.querySelector('.loot-stars'))say.innerHTML='ดาวจำ <strong>ผลดีที่สุดของ Dungeon นี้</strong> ถ้ากลับไปทำ Side Quest เพิ่มแล้วกลับมา ดาวจะอัปได้ แต่จะไม่ลด';
  const list=screen.querySelector('.loot-list');
  if(list){
    const have=new Set([...list.querySelectorAll('[data-loot-id]')].map(x=>x.dataset.lootId));
    (state.items||[]).forEach(item=>{if(item.action||have.has(item.id))return;list.append(itemNode(item));have.add(item.id)});
  }
}

function patchChestCopy(root=document){
  root.querySelectorAll?.('.loot-screen').forEach(screen=>{
    const big=screen.querySelector('.big');
    const say=screen.querySelector('.say');
    if(big?.textContent.trim()==='หีบบอส'&&say){
      say.textContent='หีบจะอ่านสิ่งที่ทำใน Dungeon รอบนี้ ดาวสามารถอัปได้ถ้ากลับไปสำรวจ Side Quest เพิ่ม และจะไม่ลดจากผลดีที่สุดที่เคยได้';
    }
  });
}

function boot(){
  if(!bossPath()||document.documentElement.dataset.awakenCrosspageStars==='1')return;
  document.documentElement.dataset.awakenCrosspageStars='1';
  reconcile('page-load');
  patchChestCopy();
  addEventListener('pageshow',()=>{reconcile('pageshow');patchChestCopy()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){reconcile('visible');patchChestCopy()}});
  new MutationObserver(()=>{reconcile('dom-update');patchChestCopy()}).observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
