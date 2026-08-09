/* myClover · AWAKEN hard reset v1
   Reset Dungeon = load the save point immediately before entering Lv.7.
   Permanent achievements/collection remain; every run-scoped Lv.7 state is discarded.
*/

const RESET_EPOCH_KEY = 'mc_awaken_reset_epoch';
const RESET_PENDING_KEY = 'mc_awaken_reset_pending';
const RESET_COUNT_KEY = 'mc_awaken_reset_count';
const MINI_KEY = 'mc_mini_achievements_v1';
const NOTEBOOK_RESTORE_EPOCH = 'mc_nb_restored_run_epoch';
const NOTEBOOK_SECRET_EPOCH = 'mc_secret_end_run_epoch';
const NOTEBOOK_SEEN_EPOCH = 'mc_nb_seen_run_epoch';
const LOOT_KEYS = ['mc_awaken_loot_v1','mc_awaken_loot_v2','mc_awaken_loot_v3'];

function onBoss(){ return /^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname); }
function onNotebook(){ return /^\/classroom\/awaken\/notebook\/?(?:index\.html)?$/.test(location.pathname); }
function inDungeon(){ return onBoss() || onNotebook(); }
function get(storage,key){ try{return storage.getItem(key)}catch{return null} }
function set(storage,key,value){ try{storage.setItem(key,String(value))}catch{} }
function del(storage,key){ try{storage.removeItem(key)}catch{} }
function epoch(){ const n=Number(get(localStorage,RESET_EPOCH_KEY)||0); return Number.isFinite(n)?n:0; }

function permanentRunKey(key){
  return key===RESET_EPOCH_KEY || key===RESET_PENDING_KEY || key===RESET_COUNT_KEY;
}
function isRunKey(key){
  if(!key) return false;
  return ((key.startsWith('mc_awaken_') && !permanentRunKey(key)) ||
    key.startsWith('mc_ch7_') || key.startsWith('mc_nb_') || key==='mc_secret_end');
}
function clearRun(storage){
  const keys=[];
  try{ for(let i=0;i<storage.length;i++){ const k=storage.key(i); if(isRunKey(k)) keys.push(k); } }catch{}
  keys.forEach(k=>del(storage,k));
  return keys.length;
}
function parse(raw){ try{return JSON.parse(raw)}catch{return null} }
function stateTime(state){
  if(!state||typeof state!=='object') return 0;
  const n=Number(state.openedAt||state.claimedAt||state.createdAt||0);
  return Number.isFinite(n)?n:0;
}

/* Legacy migration must never resurrect a chest from before the latest reset. */
function purgeStaleLoot(){
  const e=epoch(); if(!e) return;
  LOOT_KEYS.forEach(key=>{
    const raw=get(localStorage,key); if(raw===null) return;
    const state=parse(raw); const t=stateTime(state);
    if(!t || t<e) del(localStorage,key);
  });
}

/* Notebook flags have no timestamp in the original page. Mark legitimate actions
   with this run's epoch; anything without the current marker is from an old save. */
function purgeStaleNotebook(){
  const e=epoch(); if(!e) return false;
  let staleRestored=false;

  if(get(localStorage,'mc_nb_restored')==='1' && Number(get(localStorage,NOTEBOOK_RESTORE_EPOCH)||0)!==e){
    del(localStorage,'mc_nb_restored');
    del(localStorage,'mc_secret_end');
    del(localStorage,NOTEBOOK_SECRET_EPOCH);
    staleRestored=true;
  }
  if(get(localStorage,'mc_secret_end')==='1' && Number(get(localStorage,NOTEBOOK_SECRET_EPOCH)||0)!==e){
    del(localStorage,'mc_secret_end');
  }

  /* Visiting the notebook in the current run is a legitimate new discovery. */
  if(onNotebook() && get(localStorage,'mc_nb_seen')==='1') set(localStorage,NOTEBOOK_SEEN_EPOCH,e);
  else if(get(localStorage,'mc_nb_seen')==='1' && Number(get(localStorage,NOTEBOOK_SEEN_EPOCH)||0)!==e){
    del(localStorage,'mc_nb_seen');
  }
  return staleRestored;
}

function guardCurrentRun(){
  if(!inDungeon()) return;
  const pending=get(localStorage,RESET_PENDING_KEY)==='1';
  if(pending){
    clearRun(localStorage); clearRun(sessionStorage);
    /* clearRun deliberately preserves reset epoch/pending/count */
  }
  purgeStaleLoot();
  const staleRestored=purgeStaleNotebook();

  /* The notebook inline script may have already rendered the restored DOM before
     this module executes. Force one clean navigation so it boots from page 1. */
  if(onNotebook() && staleRestored){
    const e=epoch();
    const guard=`mc_awaken_nb_reload_${e}`;
    if(get(sessionStorage,guard)!=='1'){
      set(sessionStorage,guard,'1');
      location.replace(`/classroom/awaken/notebook/?run=${e}`);
    }
  }
}

async function pushReset(epochValue){
  const progress={};
  progress[RESET_EPOCH_KEY]=String(epochValue);
  progress[RESET_COUNT_KEY]=get(localStorage,RESET_COUNT_KEY)||'1';
  const mini=get(localStorage,MINI_KEY); if(mini!==null) progress[MINI_KEY]=mini;
  try{
    const res=await fetch('/api/progress',{
      method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({progress})
    });
    if(res.ok || res.status===401){ del(localStorage,RESET_PENDING_KEY); return true; }
  }catch{}
  return false;
}

async function hardReset(event){
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();

  const e=Date.now();
  let count=Number(get(localStorage,RESET_COUNT_KEY)||0)+1;
  if(!Number.isFinite(count)) count=1;
  try{ window.MC_MINI_UNLOCK?.('dungeon-reset'); }catch{}

  clearRun(localStorage);
  clearRun(sessionStorage);
  set(localStorage,RESET_EPOCH_KEY,e);
  set(localStorage,RESET_PENDING_KEY,'1');
  set(localStorage,RESET_COUNT_KEY,count);
  /* Prevent account boot on the destination from eagerly merging an old save. */
  set(localStorage,'mc_account_last_sync',new Date().toISOString());

  try{ window.MC_ACT?.('awaken-dungeon-hard-reset'); }catch{}
  await Promise.race([pushReset(e),new Promise(r=>setTimeout(r,1800))]);
  location.replace(`/classroom/awaken/?reset=${e}`);
}

function wireNotebookRunMarkers(){
  if(!onNotebook()) return;
  const e=epoch(); if(!e) return;

  document.addEventListener('click',event=>{
    if(event.target.closest?.('#restoreBtn')){
      set(localStorage,NOTEBOOK_RESTORE_EPOCH,e);
      set(localStorage,NOTEBOOK_SEEN_EPOCH,e);
    }
  },true);

  const sync=()=>{
    if(get(localStorage,'mc_nb_restored')==='1' && Number(get(localStorage,NOTEBOOK_RESTORE_EPOCH)||0)===e){
      if(get(localStorage,'mc_secret_end')==='1') set(localStorage,NOTEBOOK_SECRET_EPOCH,e);
    }
  };
  sync();
  const timer=setInterval(sync,600);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}

function boot(){
  if(!inDungeon()) return;
  guardCurrentRun();
  wireNotebookRunMarkers();

  /* Capture phase overrides every older reset handler without changing the hidden UI. */
  document.addEventListener('click',event=>{
    if(event.target.closest?.('.boss-reset-do')) hardReset(event);
  },true);

  addEventListener('pageshow',guardCurrentRun);
  addEventListener('focus',guardCurrentRun);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) guardCurrentRun(); });
  addEventListener('mc:account-ready',guardCurrentRun);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
