/* myClover · AWAKEN chest object v5
   Chest rules:
   - no automatic loot popup at chapter clear
   - the chest is a physical object at the end of Lv.7
   - first click opens + snapshots + locks this run
   - later clicks only review locked loot
   - Reset Dungeon clears the chest because this file uses run-scoped mc_awaken_* keys
   - salt is based on wall-clock time from the first Lv.7 page visit in this run, so Notebook navigation does not reset the timer
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

const LOOT='mc_awaken_loot_v3';
const LEGACY=['mc_awaken_loot_v2','mc_awaken_loot_v1'];
const EXPLORE='mc_awaken_explore_v1';
const START='mc_awaken_run_started_at_v1';
const RESET='mc_awaken_reset_epoch';
const CURRENT_RUN='mc_awaken_current_run_epoch';
const LOOT_STAMP='mc_awaken_loot_run_epoch';
const EXPLORE_STAMP='mc_awaken_explore_run_epoch';
const LOADOUT='mc_awaken_loadouts_v1';
const LOADOUT_STAMP='mc_awaken_loadout_run_epoch';
const MINI='mc_mini_achievements_v1';
let manualModal=false;
let chestButton=null;

function get(key){try{return localStorage.getItem(key)}catch{return null}}
function set(key,value){try{localStorage.setItem(key,String(value))}catch{}}
function read(key,fallback=null){try{const raw=get(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function flag(key){return get(key)==='1'}
function num(key){const n=Number(get(key)||0);return Number.isFinite(n)?n:0}
function runEpoch(){return num(RESET)||num(CURRENT_RUN)||0}

function ensureRunStart(){
  let started=num(START);
  const reset=runEpoch();
  if(!started || (reset && started<reset)){
    started=reset||Date.now();
    set(START,started);
  }
  return started;
}

function stampRunState(){
  const run=runEpoch();
  if(!run) return;
  if(get(EXPLORE)!==null) set(EXPLORE_STAMP,run);
  if(get(LOADOUT)!==null) set(LOADOUT_STAMP,run);
  const state=read(LOOT,null);
  if(state?.chestOpened) set(LOOT_STAMP,run);
}

function unlockedMini(id){
  if(typeof window.MC_MINI_UNLOCK==='function') return window.MC_MINI_UNLOCK(id);
  const value=read(MINI,[]);
  const ids=new Set(Array.isArray(value)?value:[]);
  if(ids.has(id)) return false;
  ids.add(id);write(MINI,[...ids]);return true;
}

function explored(){
  const value=read(EXPLORE,[]);
  return new Set(Array.isArray(value)?value:[]);
}

function progressSnapshot(){
  const seen=explored();
  return {
    timeSaver:seen.has('time-saver'),
    party:seen.has('party-loadout'),
    restored:flag('mc_nb_restored'),
    secret:flag('mc_secret_end'),
    notebook:seen.has('notebook-entered')||flag('mc_nb_seen'),
  };
}

function starsFor(progress,salt){
  if(salt) return 0;
  return Math.min(5,1+Number(progress.timeSaver)+Number(progress.party)+Number(progress.restored)+Number(progress.secret));
}

function itemsFor(progress,salt){
  if(salt) return [{id:'salt',icon:'🧂',name:'เกลือ 1 ขวด',note:'เปิดหีบภายใน 10 วินาทีจากการเข้าด่านครั้งแรกของ Run นี้'}];
  const items=[{id:'xp-scroll',icon:'📜',name:'ม้วนประสบการณ์ ×3',note:'กดใช้เพื่อเล่น LEVEL UP แบบเดิมได้ 1 ครั้ง',action:'xp'}];
  if(progress.timeSaver)items.push({id:'sleep-debt',icon:'😴',name:'ใบเสร็จหนี้การนอน 14 วัน',note:'หลักฐานช่วงไอ้ทีมสั่ง AI แทบทุกนาที แล้วเอาเวลาที่ประหยัดได้ไปสร้างงานเพิ่มแทนที่จะไปนอน'});
  if(progress.party)items.push({id:'relay-coupler',icon:'🔌',name:'Party Relay Coupler',note:'หัวต่อส่งไม้ระหว่าง GPT หน้าบ้าน, Claude หลังบ้าน, Gemini เปิดแมพ และ Teem กด Final Call'});
  if(progress.notebook)items.push({id:'notebook-map',icon:'📓',name:'แผนที่สมุดลับ',note:'ได้จากการออกนอก Main Quest ไปเปิดของเก่าที่ถูกซ่อนไว้'});
  if(progress.restored)items.push({id:'restored-memory',icon:'🔨',name:'Restored Memory',note:'ใช้ BLACKSMITH ซ่อมสิ่งที่เวลาเคยทำให้เลือนหาย'});
  if(progress.secret)items.push({id:'playmate-relic',icon:'🍀',name:'Playmate Relic',note:'Loot ลับจากการเดินสมุดไปจนถึง WELL PLAYED'});
  return items;
}

function currentState(){return read(LOOT,null)}
function legacyOpened(){
  return LEGACY.some(key=>{const s=read(key,null);return !!(s&&(s.chestOpened||s.claimedAt||Number.isFinite(Number(s.stars))))});
}
function isOpened(){return !!currentState()?.chestOpened||legacyOpened()}

function updateObject(){
  if(!chestButton) return;
  const opened=isOpened();
  chestButton.dataset.state=opened?'open':'closed';
  chestButton.setAttribute('aria-label',opened?'หีบบอสเปิดแล้ว กดเพื่อดู Loot':'หีบบอสปิดอยู่ กดเพื่อเปิดหีบ');
  const status=chestButton.querySelector('.boss-chest-object__status');
  if(status)status.textContent=opened?'OPENED · กดดู LOOT':'SEALED · กดเปิดหีบ';
}

function claim(){
  const existing=currentState();
  if(existing?.chestOpened||legacyOpened()) return existing;
  stampRunState();
  const elapsed=Math.max(0,Date.now()-ensureRunStart());
  const salt=elapsed<=10000;
  const progress=progressSnapshot();
  const stars=starsFor(progress,salt);
  const state={
    version:4,chestOpened:true,stars,salt,xpUsed:false,
    items:itemsFor(progress,salt),progress,
    openedAt:Date.now(),activeMsAtOpen:elapsed,
    timerMode:'run-first-visit-wall-clock-v5',runEpoch:runEpoch()||null,
  };
  write(LOOT,state);
  if(runEpoch())set(LOOT_STAMP,runEpoch());
  unlockedMini('boss-chest');
  if(stars>=3)unlockedMini('boss-3-stars');
  if(stars>=5)unlockedMini('boss-5-stars');
  if(salt)unlockedMini('salt-speedrun');
  try{window.MC_ACT?.(salt?'awaken-loot-salt':`awaken-loot-${stars}-stars`)}catch{}
  updateObject();
  return state;
}

function showLockedLoot(){
  const modal=document.getElementById('awaken');
  const host=document.getElementById('awIn');
  if(!modal||!host)return;
  manualModal=true;
  modal.classList.add('mc-chest-manual');
  host.innerHTML='';
  modal.hidden=false;
  document.body.style.overflow='hidden';
  /* awaken-loot-v4 observes this host/modal and renders the already locked state. */
}

function clickChest(){
  if(!isOpened())claim();
  showLockedLoot();
}

function injectStyles(){
  if(document.getElementById('awaken-chest-object-v5-style'))return;
  const style=document.createElement('style');style.id='awaken-chest-object-v5-style';
  style.textContent=`
    #replay{display:none!important}
    #awaken:not(.mc-chest-manual){display:none!important}
    .boss-chest-object-wrap{margin:34px auto 8px;padding:26px 18px 18px;border:1px solid rgba(217,185,103,.22);border-radius:20px;background:radial-gradient(340px 150px at 50% 18%,rgba(217,185,103,.09),transparent 72%);text-align:center}
    .boss-chest-object-wrap .boss-chest-object__eyebrow{display:block;color:rgba(217,185,103,.7);font:800 10px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.18em}
    .boss-chest-object{display:grid;place-items:center;gap:13px;width:min(260px,100%);margin:16px auto 0;border:0;background:none;color:#d9b967;cursor:pointer;touch-action:manipulation}
    .boss-chest-art{position:relative;display:block;width:134px;height:102px;filter:drop-shadow(0 21px 25px rgba(0,0,0,.52));transition:transform .2s ease}
    .boss-chest-object:hover .boss-chest-art{transform:translateY(-3px)}
    .boss-chest-body{position:absolute;left:13px;right:13px;bottom:8px;height:62px;border:2px solid #b9923e;border-radius:8px 8px 14px 14px;background:linear-gradient(90deg,#4b2b15,#7a4a20 50%,#4a2a15);box-shadow:inset 0 0 0 2px rgba(255,215,112,.08)}
    .boss-chest-lid{position:absolute;z-index:2;left:9px;right:9px;top:17px;height:42px;border:2px solid #c29b46;border-radius:14px 14px 5px 5px;background:linear-gradient(#835425,#523017);transform-origin:18px 38px;transition:transform .38s cubic-bezier(.2,.8,.2,1),top .38s}
    .boss-chest-band{position:absolute;z-index:3;left:59px;top:18px;width:16px;height:75px;background:linear-gradient(90deg,#9c7530,#e0bd62,#8c6728);border-radius:3px}
    .boss-chest-lock{position:absolute;z-index:4;left:51px;top:51px;width:32px;height:28px;border:2px solid #e0bd62;border-radius:6px;background:#30200f;box-shadow:0 0 18px rgba(217,185,103,.18)}
    .boss-chest-lock::after{content:'';position:absolute;left:12px;top:7px;width:5px;height:9px;border-radius:99px;background:#d9b967}
    .boss-chest-object[data-state="open"] .boss-chest-lid{top:4px;transform:rotate(-18deg) translate(-7px,-8px)}
    .boss-chest-object[data-state="open"] .boss-chest-lock{opacity:.42;transform:translateY(8px)}
    .boss-chest-object[data-state="open"] .boss-chest-art::after{content:'';position:absolute;left:28px;right:28px;top:20px;height:45px;background:radial-gradient(ellipse,rgba(255,218,115,.38),transparent 70%);filter:blur(7px)}
    .boss-chest-object__status{color:#d9b967;font:800 11px/1.5 "Bai Jamjuree",sans-serif;letter-spacing:.13em}
    .boss-chest-object__copy{margin-top:10px;color:rgba(248,246,240,.54);font-size:12.5px;line-height:1.65}
    @media(max-width:520px){.boss-chest-object-wrap{padding:22px 12px 16px}.boss-chest-art{transform:scale(.92)}.boss-chest-object:hover .boss-chest-art{transform:scale(.92)}}
    @media(prefers-reduced-motion:reduce){.boss-chest-art,.boss-chest-lid{transition:none}}
  `;document.head.append(style);
}

function mountObject(){
  if(document.querySelector('.boss-chest-object-wrap')){chestButton=document.querySelector('.boss-chest-object');updateObject();return}
  const replay=document.getElementById('replay');
  const tail=replay?.closest('.tail')||document.querySelector('.tail');
  const host=tail||document.querySelector('#chapter .wrap');
  if(!host)return;
  const box=document.createElement('section');box.className='boss-chest-object-wrap';
  box.innerHTML=`<span class="boss-chest-object__eyebrow">BOSS CHEST · RUN LOOT</span><button class="boss-chest-object" type="button"><span class="boss-chest-art" aria-hidden="true"><i class="boss-chest-body"></i><i class="boss-chest-lid"></i><i class="boss-chest-band"></i><i class="boss-chest-lock"></i></span><span class="boss-chest-object__status"></span></button><p class="boss-chest-object__copy">หีบนี้จำผลของ Dungeon รอบปัจจุบัน และจะปิดใหม่เมื่อเริ่ม Dungeon ใหม่</p>`;
  if(replay)host.insertBefore(box,replay);else host.append(box);
  chestButton=box.querySelector('.boss-chest-object');
  chestButton.addEventListener('click',clickChest);
  updateObject();
}

function suppressAutomaticModal(){
  const modal=document.getElementById('awaken');if(!modal)return;
  const sync=()=>{
    if(modal.hidden){modal.classList.remove('mc-chest-manual');manualModal=false;updateObject();return}
    if(manualModal||modal.classList.contains('mc-chest-manual'))return;
    modal.hidden=true;modal.classList.remove('mc-chest-manual');document.body.style.overflow='';
  };
  new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden','class']});
  sync();
}

function keepRunStateStamped(){
  const sync=()=>{stampRunState();updateObject()};
  document.addEventListener('click',()=>queueMicrotask(sync),true);
  document.addEventListener('toggle',()=>queueMicrotask(sync),true);
  addEventListener('focus',sync);
  addEventListener('pageshow',sync);
  sync();
  const timer=setInterval(sync,700);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}

function boot(){
  ensureRunStart();
  injectStyles();
  mountObject();
  suppressAutomaticModal();
  keepRunStateStamped();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
