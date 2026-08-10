/* myClover · AWAKEN Savepoint V2
   Reset Dungeon = load the save immediately before entering Lv.7.
   Every Lv.7 run state belongs to one Run ID. Permanent achievements stay.
*/
(function(){
'use strict';

const BOSS=/^\/classroom\/awaken\/?(?:index\.html)?$/;
const NOTE=/^\/classroom\/awaken\/notebook\/?(?:index\.html)?$/;
if(!BOSS.test(location.pathname)&&!NOTE.test(location.pathname)) return;

const RESET_EPOCH='mc_awaken_reset_epoch';
const RESET_PENDING='mc_awaken_reset_pending';
const RESET_COUNT='mc_awaken_reset_count';
const CURRENT_RUN='mc_awaken_current_run_epoch';
const MINI='mc_mini_achievements_v1';

const LOOT_STAMP='mc_awaken_loot_run_epoch';
const EXPLORE_STAMP='mc_awaken_explore_run_epoch';
const LOADOUT_STAMP='mc_awaken_loadout_run_epoch';
const NB_SEEN_STAMP='mc_nb_seen_run_epoch';
const NB_REST_STAMP='mc_nb_restored_run_epoch';
const NB_END_STAMP='mc_secret_end_run_epoch';

const LOOT_KEYS=['mc_awaken_loot_v1','mc_awaken_loot_v2','mc_awaken_loot_v3'];
const KEEP=new Set([RESET_EPOCH,RESET_PENDING,RESET_COUNT,CURRENT_RUN]);

function get(storage,key){ try{return storage.getItem(key)}catch{return null} }
function set(storage,key,value){ try{storage.setItem(key,String(value))}catch{} }
function del(storage,key){ try{storage.removeItem(key)}catch{} }
function number(key){ const n=Number(get(localStorage,key)||0); return Number.isFinite(n)?n:0; }
function epoch(){ return number(RESET_EPOCH); }

function isRunKey(key){
  if(!key) return false;
  return ((key.startsWith('mc_awaken_')&&!KEEP.has(key)) ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_nb_') ||
    key.startsWith('mc_secret_end'));
}

function clearRun(storage){
  const keys=[];
  try{
    for(let i=0;i<storage.length;i++){
      const key=storage.key(i);
      if(isRunKey(key)) keys.push(key);
    }
  }catch{}
  keys.forEach(key=>del(storage,key));
  return keys.length;
}

function clearLocal(keys){ keys.forEach(key=>del(localStorage,key)); }

function sanitize(){
  const e=epoch();
  if(!e) return false;

  /* A new reset epoch means a brand-new Lv.7 run. Nothing from the previous
     run is allowed to survive except permanent achievements outside this keyspace. */
  if(number(CURRENT_RUN)!==e){
    clearRun(localStorage);
    clearRun(sessionStorage);
    set(localStorage,CURRENT_RUN,e);
  }

  /* Loot can exist in three historical formats. No matching Run ID = old save. */
  if(number(LOOT_STAMP)!==e){
    clearLocal([...LOOT_KEYS,'mc_awaken_xp_used_v1']);
  }

  if(get(localStorage,'mc_awaken_explore_v1')!==null && number(EXPLORE_STAMP)!==e){
    del(localStorage,'mc_awaken_explore_v1');
  }
  if(get(localStorage,'mc_awaken_loadouts_v1')!==null && number(LOADOUT_STAMP)!==e){
    del(localStorage,'mc_awaken_loadouts_v1');
  }

  let staleRestored=false;
  if(get(localStorage,'mc_nb_restored')==='1' && number(NB_REST_STAMP)!==e){
    del(localStorage,'mc_nb_restored');
    del(localStorage,'mc_secret_end');
    del(localStorage,NB_END_STAMP);
    staleRestored=true;
  }
  if(get(localStorage,'mc_secret_end')==='1' && number(NB_END_STAMP)!==e){
    del(localStorage,'mc_secret_end');
  }

  if(NOTE.test(location.pathname)){
    /* Opening the notebook in this new run is the first legitimate touch. */
    set(localStorage,'mc_nb_seen','1');
    set(localStorage,NB_SEEN_STAMP,e);
  }else if(get(localStorage,'mc_nb_seen')==='1' && number(NB_SEEN_STAMP)!==e){
    del(localStorage,'mc_nb_seen');
  }

  /* While a cloud tombstone is still pending, keep killing any old state that
     account sync or another tab tries to resurrect. */
  if(get(localStorage,RESET_PENDING)==='1'){
    clearRun(localStorage);
    clearRun(sessionStorage);
    set(localStorage,CURRENT_RUN,e);
  }

  return staleRestored;
}

function repairNotebookDOM(staleRestored){
  if(!NOTE.test(location.pathname)||!staleRestored) return;
  const restored=document.getElementById('restored');
  if(!restored?.children.length) return;
  const e=epoch();
  const guard=`mc_awaken_savepoint_reload_${e}`;
  if(get(sessionStorage,guard)==='1') return;
  set(sessionStorage,guard,'1');
  location.replace(`/classroom/awaken/notebook/?run=${e}`);
}

async function pushReset(e){
  const progress={
    [RESET_EPOCH]:String(e),
    [RESET_COUNT]:get(localStorage,RESET_COUNT)||'1',
    [CURRENT_RUN]:String(e),
  };
  const mini=get(localStorage,MINI);
  if(mini!==null) progress[MINI]=mini;

  try{
    const response=await fetch('/api/progress',{
      method:'PUT',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({resetScope:'dungeon',progress}),
    });
    if(response.ok||response.status===401){
      del(localStorage,RESET_PENDING);
      return true;
    }
  }catch{}
  return false;
}

async function hardReset(event){
  event.preventDefault();
  event.stopImmediatePropagation();

  const e=Date.now();
  let count=number(RESET_COUNT)+1;
  if(!Number.isFinite(count)||count<1) count=1;

  try{ window.MC_MINI_UNLOCK?.('dungeon-reset'); }catch{}

  clearRun(localStorage);
  clearRun(sessionStorage);
  set(localStorage,RESET_EPOCH,e);
  set(localStorage,RESET_PENDING,'1');
  set(localStorage,RESET_COUNT,count);
  set(localStorage,CURRENT_RUN,e);

  /* Delay account auto-merge long enough for the reset tombstone to reach cloud. */
  set(localStorage,'mc_account_last_sync',new Date().toISOString());
  /* ธงเดียวที่ด่านใหม่ /classroom/dungeon/ ต้องการ เพื่อปลดล็อกหีบให้เปิดใหม่ */
  set(localStorage,'mc_dungeon_reset_requested','true');
  set(localStorage,'mc_dungeon_reset_v1','true');
  try{ window.MC_ACT?.('awaken-dungeon-savepoint-reset'); }catch{}

  await Promise.race([pushReset(e),new Promise(resolve=>setTimeout(resolve,1800))]);
  location.replace(`/classroom/dungeon/?reset=${e}`);
}

function wireRunStamps(){
  document.addEventListener('click',event=>{
    const e=epoch();
    if(!e) return;

    if(event.target.closest?.('.boss-reset-do')){
      hardReset(event);
      return;
    }

    /* Capture phase runs before the existing Loot/Notebook handlers write state. */
    if(event.target.closest?.('[data-open-loot]')) set(localStorage,LOOT_STAMP,e);
    if(event.target.closest?.('.boss-more-toggle,#chapter summary')) set(localStorage,EXPLORE_STAMP,e);
    if(event.target.closest?.('.member-loadout summary')) set(localStorage,LOADOUT_STAMP,e);
    if(event.target.closest?.('#restoreBtn')){
      set(localStorage,NB_REST_STAMP,e);
      set(localStorage,NB_SEEN_STAMP,e);
    }
  },true);
}

function syncNotebookSecret(){
  if(!NOTE.test(location.pathname)) return;
  const tick=()=>{
    const e=epoch();
    if(!e) return;
    if(get(localStorage,'mc_secret_end')==='1' && number(NB_REST_STAMP)===e){
      set(localStorage,NB_END_STAMP,e);
    }
  };
  tick();
  const timer=setInterval(tick,400);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}

function guard(){ repairNotebookDOM(sanitize()); }

function boot(){
  guard();
  wireRunStamps();
  syncNotebookSecret();
  addEventListener('mc:account-ready',guard);
  addEventListener('pageshow',guard);
  addEventListener('focus',guard);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) guard(); });
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
