/* myClover · legacy/global runtime
   This is the existing site-wide enhancement stack, kept away from canonical course pages.
*/
import '/assets/awaken-savepoint-v2.js?v=20260809-1';
import '/assets/account.js';
import '/assets/stat-report.js';
import '/assets/mini-achievements.js';
import '/assets/mini-achievements-secrets.js';
import '/assets/ai-sauce-course.js';
import '/assets/main-course-route.js';
import '/assets/forge-path-choice.js';
import '/assets/sauce-cup-entry.js';
import '/assets/forge-flow-fix.js';
import '/assets/forge-next-scroll.js';
import '/assets/main-quest-core7.js';
import '/assets/lesson-one-subquests.js';
import '/assets/lesson1-polite-language.js';
import '/assets/lesson1-downloadable-md.js';
import '/assets/lesson6-boss-transition.js';
import '/assets/course-thai-flow-route.js?v=20260810-1';
import '/assets/course-nav-names.js';
import '/assets/details-fix.js?v=20260810-layout2';
import '/assets/awaken-boss-patch.js?v=20260810-layout2';
import '/assets/awaken-language-sidequest.js?v=20260810-layout2';
import '/assets/awaken-hard-reset-v1.js?v=20260809-1';
import '/assets/awaken-migration-guard-v2.js?v=20260809-1';
import '/assets/awaken-loot-v4-migration.js?v=20260809-1';
import '/assets/awaken-loot-v4.js?v=20260810-layout2';
import '/assets/awaken-glossary-extra.js?v=20260810-layout2';
import '/assets/awaken-floating-tooltips-v1.js?v=20260810-layout2';
import '/assets/awaken-mobile-overflow-fix.js?v=20260810-layout2';
import '/assets/awaken-party-loadout.js?v=20260810-layout2';
import '/assets/notebook-boss-reset-v2.js?v=20260809-1';
import '/assets/notebooklm-page.js';
import '/assets/notebooklm-hero-position.js';
import '/assets/prompts-season.js';
import '/assets/prompts-utility.js';
import '/assets/prompts-chef.js';
import '/assets/prompts-eko-tasting.js';
import '/assets/prompts-svg-polish.js';
import '/assets/prompts-plain-language.js';
import '/assets/prompts-genesis-generic.js';
import '/assets/lesson2-svg-redesign.js';
import '/assets/course-svg-motion.js';
import '/assets/classroom-hero-consistency.js';
import '/assets/sauce-first-tooltip.js';
import '/assets/comic-bottom-next.js';

/* Legacy Chapter 7 visual safety net. It only runs on the old /classroom/awaken/ route. */
(function awakenStaticBossGate(){
  if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;
  function boot(){
    if(document.getElementById('awaken-static-gate-style')) return;
    const style=document.createElement('style');
    style.id='awaken-static-gate-style';
    style.textContent=`
      #xp,#dots{display:none!important}
      #chapter,#chapter>.wrap,#chapter .phase,#chapter .truth,#chapter .compare,#chapter .sample,#chapter .timebox,#chapter .loop,#chapter .step,#chapter .cycle,#chapter .notebook,#chapter .language-sidequest,#chapter .partygrid,#chapter .tail{height:auto!important;max-height:none!important;overflow:visible!important;clip:auto!important;clip-path:none!important;contain:none!important}
      #chapter .phase{display:block!important;opacity:1!important;visibility:visible!important;transform:none!important}
      #chapter .phase *:not([hidden]),#chapter .tail *:not([hidden]){opacity:1!important;visibility:visible!important}
      #gate{min-height:calc(100dvh - 58px)!important;padding:42px 0 64px!important;background:radial-gradient(700px 420px at 50% 38%,rgba(52,255,155,.075),transparent 70%),#020604!important;text-align:left!important}
      #gate>.wrap{position:relative;width:min(820px,calc(100% - 28px))!important;padding:66px clamp(18px,4.8vw,42px) 34px!important;border:1px solid rgba(89,255,169,.28);border-radius:15px;overflow:visible!important;background:linear-gradient(180deg,rgba(5,18,12,.985),rgba(2,8,5,.99));box-shadow:0 34px 90px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.025) inset}
      #gate>.wrap::before{content:'Apex Intelligence Hunting Invalid Actions';position:absolute;left:0;right:0;top:0;min-height:42px;display:flex;align-items:center;justify-content:center;padding:0 42px;border-bottom:1px solid rgba(89,255,169,.16);color:#b9fbd6;background:#07100b;font:700 10.5px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.04em;border-radius:14px 14px 0 0;pointer-events:none}
      #gate .tag{color:#62ffad!important;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;letter-spacing:.12em!important}
      #gate h1{margin-top:13px!important;color:#eafff2!important;white-space:normal!important;text-align:left!important;text-shadow:0 0 28px rgba(65,255,158,.1)}
      #gate .gatecopy{margin:24px 0 0!important;max-width:680px!important;color:#c8e8d6!important;text-align:left!important}
      #gate .gatecopy p{opacity:1!important;transform:none!important;visibility:visible!important}#gate .gatecopy p+p{margin-top:15px!important}#gate .gatecopy strong{color:#f3fff8!important}
      #gate .chips{justify-content:flex-start!important;margin-top:24px!important;gap:8px!important}#gate .chips span{border-radius:6px!important;border-color:rgba(89,255,169,.2)!important;background:rgba(89,255,169,.035)!important;color:#9cf4c4!important}
      #gate .lock{margin-top:22px!important;border-radius:8px!important}
      #gate .enter{position:relative;z-index:2;margin-top:24px!important;border:1px solid rgba(88,255,165,.45)!important;border-radius:7px!important;background:rgba(51,255,146,.12)!important;color:#8fffc0!important;box-shadow:none!important;cursor:pointer!important;pointer-events:auto!important}
      #gate .enter:hover{background:rgba(51,255,146,.19)!important;border-color:rgba(88,255,165,.72)!important}
      @media(max-width:560px){#gate{padding:24px 0 44px!important;align-items:start!important}#gate>.wrap{width:calc(100% - 18px)!important;border-radius:11px;padding:61px 16px 27px!important}#gate>.wrap::before{justify-content:flex-start;padding:0 14px;font-size:9.5px;border-radius:10px 10px 0 0}}
    `;
    document.head.append(style);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
