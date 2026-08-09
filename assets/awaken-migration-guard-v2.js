/* myClover · AWAKEN migration guard v2
   Runs before every legacy Loot migration. After Reset Dungeon, only Loot stamped
   with the current Lv.7 Run ID may exist; older chest formats are discarded.
*/
(function(){
'use strict';
if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

const RESET='mc_awaken_reset_epoch';
const STAMP='mc_awaken_loot_run_epoch';
const LOOT=['mc_awaken_loot_v1','mc_awaken_loot_v2','mc_awaken_loot_v3'];

function num(key){
  try{
    const value=Number(localStorage.getItem(key)||0);
    return Number.isFinite(value)?value:0;
  }catch{return 0}
}
function remove(key){ try{localStorage.removeItem(key)}catch{} }

const run=num(RESET);
if(!run) return; // Before the first Reset, historical migration still works normally.

if(num(STAMP)!==run){
  LOOT.forEach(remove);
  remove('mc_awaken_xp_used_v1');
  return;
}

/* A chest legitimately opened in the current run always lives in v3.
   Old v1/v2 copies must not be available as fallback migration sources. */
remove('mc_awaken_loot_v1');
remove('mc_awaken_loot_v2');
})();
