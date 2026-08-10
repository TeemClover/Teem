/* myClover · THE DUNGEON reset + notebook bridge v7
   Safe reset + notebook compatibility bridge + hard scroll guard.
*/

const RESET_EPOCH_KEY='mc_awaken_reset_epoch';
const RESET_PENDING_KEY='mc_awaken_reset_pending';
const DUNGEON_STATE_KEY='mc_dungeon_state_v2';
const NB_REST_EVER='mc_nb_restored_ever_v1';
const NB_END_EVER='mc_secret_end_ever_v1';
const NB_SEEN_EVER='mc_nb_seen_ever_v1';
const KEEP_LOCAL_KEYS=new Set([RESET_EPOCH_KEY,RESET_PENDING_KEY,'mc_awaken_reset_count','mc_mini_achievements_v1','mc_dungeon_cleared_v1','mc_dungeon_awakened_v1',NB_REST_EVER,NB_END_EVER,NB_SEEN_EVER]);

function isNotebookPage(){return /^\/classroom\/awaken\/notebook\/?(?:index\.html)?$/.test(location.pathname)}
function isDungeonPage(){return /^\/classroom\/dungeon\/?(?:index\.html)?$/.test(location.pathname)}
function report(id){try{window.MC_ACT?.(id)}catch{}}
function preserveNotebookAchievements(){try{if(localStorage.getItem('mc_nb_seen')==='1')localStorage.setItem(NB_SEEN_EVER,'1');if(localStorage.getItem('mc_nb_restored')==='1')localStorage.setItem(NB_REST_EVER,'1');if(localStorage.getItem('mc_secret_end')==='1')localStorage.setItem(NB_END_EVER,'1')}catch{}}
function dungeonKey(key){return key===DUNGEON_STATE_KEY||key==='mc_dungeon_reset_requested'||key==='mc_dungeon_reset_v1'||((key.startsWith('mc_awaken_')&&!KEEP_LOCAL_KEYS.has(key))||key.startsWith('mc_ch7_')||key.startsWith('mc_nb_')||key==='mc_secret_end')}
function clearDungeonStorage(storage){const remove=[];try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key&&!KEEP_LOCAL_KEYS.has(key)&&dungeonKey(key))remove.push(key)}remove.forEach(key=>storage.removeItem(key))}catch{}return remove}
function resetPayload(){const progress={};try{[RESET_EPOCH_KEY,'mc_awaken_reset_count','mc_mini_achievements_v1','mc_dungeon_cleared_v1','mc_dungeon_awakened_v1',NB_REST_EVER,NB_END_EVER,NB_SEEN_EVER].forEach(key=>{const value=localStorage.getItem(key);if(value!==null)progress[key]=value})}catch{}return progress}
async function pushResetToCloud(){try{const response=await fetch('/api/progress',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({progress:resetPayload()})});if(response.ok||response.status===401){try{localStorage.removeItem(RESET_PENDING_KEY)}catch{}return true}}catch{}return false}
function guardPendingReset(){let pending=false;try{pending=localStorage.getItem(RESET_PENDING_KEY)==='1'}catch{return}if(!pending)return;clearDungeonStorage(localStorage);clearDungeonStorage(sessionStorage);pushResetToCloud()}
function dungeonState(){try{const s=JSON.parse(localStorage.getItem(DUNGEON_STATE_KEY)||'null');return s&&s.v===2?s:null}catch{return null}}

function syncNotebookRestoreTool(){if(!isNotebookPage())return;const s=dungeonState();const compat=(()=>{try{return localStorage.getItem('mc_awaken_restore_tool_v1')==='1'}catch{return false}})();if(!s?.voice&&!compat)return;try{if(!compat)localStorage.setItem('mc_awaken_restore_tool_v1','1')}catch{}try{if(localStorage.getItem('mc_nb_restored')==='1')return}catch{}const stateA=document.getElementById('stateA'),stateB=document.getElementById('stateB');if(stateA&&stateA.hidden!==true)stateA.hidden=true;if(stateB&&stateB.hidden!==false)stateB.hidden=false}

/* Notebook must remain scrollable unless its own trophy modal is actually open.
   Old AWAKEN helpers and bfcache have historically left overflow/position locks behind. */
function ensureNotebookScrollable(){
  if(!isNotebookPage()||!document.body)return;
  if(document.querySelector('.trophy'))return;
  const html=document.documentElement,body=document.body;
  html.style.setProperty('overflow-y','auto','important');
  html.style.setProperty('overflow-x','hidden','important');
  html.style.setProperty('height','auto','important');
  body.style.setProperty('overflow-y','auto','important');
  body.style.setProperty('overflow-x','hidden','important');
  body.style.setProperty('height','auto','important');
  body.style.setProperty('min-height','100%','important');
  body.style.setProperty('touch-action','pan-y','important');
  body.style.removeProperty('position');
  body.style.removeProperty('top');
  body.style.removeProperty('left');
  body.style.removeProperty('right');
  body.style.removeProperty('width');
}
function installScrollGuard(){
  if(!isNotebookPage()||window.__mcNotebookScrollGuard)return;
  window.__mcNotebookScrollGuard=true;
  ensureNotebookScrollable();
  ['pageshow','focus','resize','orientationchange'].forEach(type=>addEventListener(type,ensureNotebookScrollable,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ensureNotebookScrollable()});
  /* Low-frequency watchdog: cheap, but repairs any late legacy script that re-locks body. */
  setInterval(ensureNotebookScrollable,1200);
}

function injectStyles(){if(document.getElementById('boss-reset-style'))return;const style=document.createElement('style');style.id='boss-reset-style';style.textContent=`html,body{overscroll-behavior-y:auto}.boss-reset-vault{max-width:560px;margin:52px auto 18px;padding:18px 19px;border:1px dashed rgba(255,255,255,.16);border-radius:16px;background:rgba(255,255,255,.025);text-align:center}.boss-reset-vault .micro{display:block;color:rgba(255,255,255,.34);font:750 9.5px/1.5 "Bai Jamjuree",system-ui,sans-serif;letter-spacing:.16em}.boss-reset-vault p{margin-top:8px;color:rgba(255,255,255,.47);font-size:12.5px;line-height:1.72}.boss-reset-open{margin-top:12px;border:0;background:none;color:rgba(190,148,66,.7);font:750 12px/1.5 "Bai Jamjuree",system-ui,sans-serif;cursor:pointer;border-bottom:1px dashed rgba(190,148,66,.38);padding:5px 2px}.boss-reset-confirm{margin-top:15px;padding:16px;border:1px solid rgba(255,143,123,.28);border-radius:13px;background:rgba(151,49,37,.09);text-align:left}.boss-reset-confirm[hidden]{display:none!important}.boss-reset-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.boss-reset-actions button{min-height:44px;border-radius:10px;padding:9px 12px;font-weight:750;cursor:pointer}.boss-reset-cancel{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:rgba(255,255,255,.7)}.boss-reset-do{border:1px solid rgba(255,143,123,.5);background:rgba(151,49,37,.28);color:#ffd6cf}@media(max-width:480px){.boss-reset-actions{grid-template-columns:1fr}}`;document.head.append(style)}

async function resetDungeon({force=false}={}){const epoch=Date.now();preserveNotebookAchievements();let count=1,removedLocal=[],removedSession=[];try{count=Number(localStorage.getItem('mc_awaken_reset_count')||0)+1;window.MC_MINI_UNLOCK?.('dungeon-reset');removedLocal=clearDungeonStorage(localStorage);localStorage.setItem('mc_awaken_reset_count',String(count));localStorage.setItem(RESET_EPOCH_KEY,String(epoch));localStorage.setItem(RESET_PENDING_KEY,'1');localStorage.setItem('mc_account_last_sync',new Date().toISOString())}catch{}try{removedSession=clearDungeonStorage(sessionStorage)}catch{}report(force?'dungeon-force-reset':'awaken-dungeon-reset');try{window.gtag?.('event',force?'dungeon_force_reset':'awaken_dungeon_reset',{reset_count:count,cleared_local:removedLocal.length,cleared_session:removedSession.length})}catch{}await Promise.race([pushResetToCloud(),new Promise(r=>setTimeout(r,force?450:1800))]);location.replace(`/classroom/dungeon/?reset=${epoch}`)}
function handleForceResetURL(){if(!isDungeonPage())return false;const p=new URLSearchParams(location.search);if(p.get('force-reset')!=='1')return false;resetDungeon({force:true});return true}
function createPanel(){const panel=document.createElement('aside');panel.className='boss-reset-vault';panel.innerHTML=`<span class="micro">HIDDEN DEVELOPER MENU · END OF NOTEBOOK</span><p>ปุ่มนี้ซ่อนอยู่ท้ายสมุด เพราะคนที่หาไม่เจอก็ยังไม่จำเป็นต้องกด</p><button class="boss-reset-open" type="button" aria-expanded="false">♻️ Reset THE DUNGEON</button><div class="boss-reset-confirm" hidden><b>เริ่มรอบ THE DUNGEON ใหม่ทั้งหมด</b><p>ดาว หีบ ตำแหน่งแผนที่ และสถานะสมุดของรอบนี้จะเริ่มใหม่ แต่ Achievement ที่เคยปลดแล้วจะยังอยู่ใน Collection</p><div class="boss-reset-actions"><button class="boss-reset-cancel" type="button">ยังไม่รีเซ็ต</button><button class="boss-reset-do" type="button">ยืนยัน</button></div></div>`;const open=panel.querySelector('.boss-reset-open'),confirm=panel.querySelector('.boss-reset-confirm'),cancel=panel.querySelector('.boss-reset-cancel');open.addEventListener('click',()=>{const expanded=open.getAttribute('aria-expanded')==='true';open.setAttribute('aria-expanded',expanded?'false':'true');confirm.hidden=expanded;if(!expanded){report('dungeon-reset-menu-open');cancel.focus()}});cancel.addEventListener('click',()=>{confirm.hidden=true;open.setAttribute('aria-expanded','false');open.focus()});panel.querySelector('.boss-reset-do').addEventListener('click',()=>resetDungeon());return panel}
function mountAtNotebookEnd(){if(document.querySelector('.boss-reset-vault'))return true;const restored=document.getElementById('restored'),finalBox=document.getElementById('finalBox');if(finalBox){finalBox.insertAdjacentElement('afterend',createPanel());return true}if(restored?.children.length){restored.append(createPanel());return true}return false}
function enforceFreshNotebookAfterReset(){if(!isNotebookPage())return;let restored=false;try{restored=localStorage.getItem('mc_nb_restored')==='1'}catch{return}if(restored)return;const story=document.getElementById('restored'),torn=document.getElementById('tornWrap');if((story&&story.children.length>0)||torn?.hidden)location.reload()}
function watchNotebookPermanentMarkers(){if(!isNotebookPage())return;preserveNotebookAchievements();let queued=false;const sync=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;preserveNotebookAchievements();syncNotebookRestoreTool();ensureNotebookScrollable()})};new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});addEventListener('pagehide',preserveNotebookAchievements)}
function boot(){if(handleForceResetURL())return;guardPendingReset();window.addEventListener('mc:account-ready',guardPendingReset);window.addEventListener('pageshow',event=>{guardPendingReset();preserveNotebookAchievements();syncNotebookRestoreTool();ensureNotebookScrollable();if(event.persisted)enforceFreshNotebookAfterReset()});if(!isNotebookPage()||document.documentElement.dataset.bossResetV2==='1')return;document.documentElement.dataset.bossResetV2='1';installScrollGuard();injectStyles();syncNotebookRestoreTool();watchNotebookPermanentMarkers();enforceFreshNotebookAfterReset();if(mountAtNotebookEnd())return;const observer=new MutationObserver(()=>{syncNotebookRestoreTool();preserveNotebookAchievements();ensureNotebookScrollable();if(mountAtNotebookEnd())observer.disconnect()});observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();