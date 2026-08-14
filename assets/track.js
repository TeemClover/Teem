/* myClover runtime loader — fault-isolated.
   Each patch script below is independent (path-gated, no shared state between
   them) so one broken file must not be able to take the other 43 pages that
   load this module down with it. A plain static `import` graph is all-or-
   nothing: if any one of these throws while loading, every import in this
   file fails and NONE of them run. Loading each with its own dynamic
   import().catch() keeps a single bad script contained to just that feature.
   Load order is preserved (awaited in sequence) since some of these scripts
   assume they run after the ones listed before them; fetching still starts
   for all of them immediately (import() is issued eagerly for every path
   before the first await), so this costs nothing over the old static graph. */
export { trackAct } from '/assets/track-core.js';

const PATCHES = [
  '/assets/guild-ui-fix.js?v=20260814-3',
  '/assets/guild-multiplayer-upgrade.js?v=20260814-1',
  '/assets/awaken-savepoint-v2.js?v=20260809-1',
  '/assets/account.js',
  '/assets/stat-report.js',
  '/assets/mini-achievements.js',
  '/assets/mini-achievements-secrets.js',
  '/assets/ai-sauce-course.js',
  '/assets/main-course-route.js',
  '/assets/forge-path-choice.js',
  '/assets/sauce-cup-entry.js',
  '/assets/forge-flow-fix.js',
  '/assets/forge-next-scroll.js',
  '/assets/main-quest-core7.js',
  '/assets/lesson-one-subquests.js',
  '/assets/lesson1-polite-language.js',
  '/assets/lesson1-downloadable-md.js',
  '/assets/lesson6-boss-transition.js',
  '/assets/course-nav-names.js',
  '/assets/details-fix.js?v=20260810-layout2',
  '/assets/awaken-boss-patch.js?v=20260810-layout2',
  '/assets/awaken-language-sidequest.js?v=20260810-layout2',
  '/assets/awaken-hard-reset-v1.js?v=20260809-1',
  '/assets/awaken-migration-guard-v2.js?v=20260809-1',
  '/assets/awaken-loot-v4-migration.js?v=20260809-1',
  '/assets/awaken-loot-v4.js?v=20260810-layout2',
  '/assets/awaken-glossary-extra.js?v=20260810-layout2',
  '/assets/awaken-floating-tooltips-v1.js?v=20260810-layout2',
  '/assets/awaken-mobile-overflow-fix.js?v=20260810-layout2',
  '/assets/awaken-party-loadout.js?v=20260810-layout2',
  '/assets/notebook-boss-reset-v2.js?v=20260811-scrollfix3',
  '/assets/notebooklm-page.js',
  '/assets/notebooklm-hero-position.js',
  '/assets/prompts-season.js',
  '/assets/prompts-utility.js',
  '/assets/prompts-chef.js',
  '/assets/prompts-eko-tasting.js',
  '/assets/prompts-svg-polish.js',
  '/assets/prompts-plain-language.js',
  '/assets/prompts-genesis-generic.js',
  '/assets/lesson2-svg-redesign.js',
  '/assets/course-svg-motion.js',
  '/assets/classroom-hero-consistency.js',
  '/assets/sauce-first-tooltip.js',
  '/assets/comic-bottom-next.js'
];

const pending = PATCHES.map(path => import(path).catch(error => {
  console.error('[myClover] patch failed to load:', path, error);
}));
for (const p of pending) await p;

/* Chapter 7 opening: keep the black/green boss aesthetic, but make it completely static.
   The real #chapter from index.html stays in place: never clone or replace it. */
(function awakenStaticBossGate(){
  if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  function boot(){
    if(document.getElementById('awaken-static-gate-style')) return;
    const style=document.createElement('style');
    style.id='awaken-static-gate-style';
    style.textContent=`
      /* Progress UI is decorative only; remove it without touching chapter DOM. */
      #xp,#dots{display:none!important}

      /* Hard layout fail-safe. No phase may become a clipped viewport. */
      #chapter,
      #chapter>.wrap,
      #chapter .phase,
      #chapter .truth,
      #chapter .compare,
      #chapter .sample,
      #chapter .timebox,
      #chapter .loop,
      #chapter .step,
      #chapter .cycle,
      #chapter .notebook,
      #chapter .language-sidequest,
      #chapter .partygrid,
      #chapter .tail{
        height:auto!important;
        max-height:none!important;
        overflow:visible!important;
        clip:auto!important;
        clip-path:none!important;
        contain:none!important;
      }
      #chapter .phase{
        display:block!important;
        opacity:1!important;
        visibility:visible!important;
        transform:none!important;
      }
      #chapter .phase *:not([hidden]),#chapter .tail *:not([hidden]){
        opacity:1!important;
        visibility:visible!important;
      }

      #gate{
        min-height:calc(100dvh - 58px)!important;
        padding:42px 0 64px!important;
        background:radial-gradient(700px 420px at 50% 38%,rgba(52,255,155,.075),transparent 70%),#020604!important;
        text-align:left!important;
      }
      #gate>.wrap{
        position:relative;
        width:min(820px,calc(100% - 28px))!important;
        padding:66px clamp(18px,4.8vw,42px) 34px!important;
        border:1px solid rgba(89,255,169,.28);
        border-radius:15px;
        overflow:visible!important;
        background:linear-gradient(180deg,rgba(5,18,12,.985),rgba(2,8,5,.99));
        box-shadow:0 34px 90px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.025) inset;
      }
      #gate>.wrap::before{
        content:'Apex Intelligence Hunting Invalid Actions';
        position:absolute;left:0;right:0;top:0;
        min-height:42px;display:flex;align-items:center;justify-content:center;
        padding:0 42px;border-bottom:1px solid rgba(89,255,169,.16);
        color:#b9fbd6;background:#07100b;
        font:700 10.5px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        letter-spacing:.04em;border-radius:14px 14px 0 0;
        pointer-events:none;
      }
      #gate .tag{
        color:#62ffad!important;
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;
        letter-spacing:.12em!important;
      }
      #gate h1{
        margin-top:13px!important;
        color:#eafff2!important;
        white-space:normal!important;
        text-align:left!important;
        text-shadow:0 0 28px rgba(65,255,158,.1);
      }
      #gate .gatecopy{
        margin:24px 0 0!important;
        max-width:680px!important;
        color:#c8e8d6!important;
        text-align:left!important;
      }
      #gate .gatecopy p{opacity:1!important;transform:none!important;visibility:visible!important}
      #gate .gatecopy p+p{margin-top:15px!important}
      #gate .gatecopy strong{color:#f3fff8!important}
      #gate .chips{justify-content:flex-start!important;margin-top:24px!important;gap:8px!important}
      #gate .chips span{
        border-radius:6px!important;border-color:rgba(89,255,169,.2)!important;
        background:rgba(89,255,169,.035)!important;color:#9cf4c4!important;
      }
      #gate .lock{margin-top:22px!important;border-radius:8px!important}
      #gate .enter{
        position:relative;z-index:2;
        margin-top:24px!important;
        border:1px solid rgba(88,255,165,.45)!important;
        border-radius:7px!important;
        background:rgba(51,255,146,.12)!important;
        color:#8fffc0!important;
        box-shadow:none!important;
        cursor:pointer!important;
        pointer-events:auto!important;
      }
      #gate .enter:hover{background:rgba(51,255,146,.19)!important;border-color:rgba(88,255,165,.72)!important}
      @media(max-width:560px){
        #gate{padding:24px 0 44px!important;align-items:start!important}
        #gate>.wrap{width:calc(100% - 18px)!important;border-radius:11px;padding:61px 16px 27px!important}
        #gate>.wrap::before{justify-content:flex-start;padding:0 14px;font-size:9.5px;border-radius:10px 10px 0 0}
      }
    `;
    document.head.append(style);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
