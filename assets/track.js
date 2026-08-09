export { trackAct } from '/assets/track-core.js';
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
import '/assets/course-nav-names.js';
import '/assets/details-fix.js';
import '/assets/awaken-boss-patch.js';
import '/assets/awaken-language-sidequest.js';
import '/assets/awaken-hard-reset-v1.js?v=20260809-1';
import '/assets/awaken-migration-guard-v2.js?v=20260809-1';
import '/assets/awaken-loot-v4-migration.js?v=20260809-1';
import '/assets/awaken-loot-v4.js?v=20260809-1';
import '/assets/awaken-glossary-extra.js?v=20260809-1';
import '/assets/awaken-floating-tooltips-v1.js?v=20260809-1';
import '/assets/awaken-mobile-overflow-fix.js';
import '/assets/awaken-party-loadout.js';
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

/* Chapter 7 gate: present the existing boss copy as a live terminal conversation. */
(function awakenTerminalIntro(){
  if(!/^\/classroom\/awaken\/?(?:index\.html)?$/.test(location.pathname)) return;

  function boot(){
    const gate=document.getElementById('gate');
    const shell=gate?.querySelector(':scope > .wrap');
    if(!gate||!shell||shell.dataset.terminalized==='1') return;
    shell.dataset.terminalized='1';
    gate.classList.add('terminal-gate');
    shell.classList.add('terminal-window');

    const bar=document.createElement('div');
    bar.className='terminal-titlebar';
    bar.innerHTML=`
      <span class="terminal-lights" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="terminal-ai-name">Apex Intelligence Hunting Invalid Actions</span>
      <span class="terminal-live" aria-hidden="true">●</span>`;
    shell.prepend(bar);

    const tag=shell.querySelector(':scope > .tag');
    const title=shell.querySelector(':scope > h1');
    const copy=shell.querySelector(':scope > .gatecopy');
    const chips=shell.querySelector(':scope > .chips');
    const lock=shell.querySelector(':scope > .lock');
    const enter=shell.querySelector(':scope > .enter');
    tag?.classList.add('terminal-encounter');
    title?.classList.add('terminal-command');
    copy?.classList.add('terminal-dialogue');
    chips?.classList.add('terminal-chips');
    lock?.classList.add('terminal-lock');
    enter?.classList.add('terminal-enter');

    if(copy){
      [...copy.children].forEach((line,index)=>{
        line.classList.add('terminal-line');
        line.style.setProperty('--line-delay',`${Math.min(index*90,270)}ms`);
      });
      const cursor=document.createElement('span');
      cursor.className='terminal-cursor-line';
      cursor.setAttribute('aria-hidden','true');
      cursor.innerHTML='<span class="terminal-prompt">AI&nbsp;&gt;</span><i></i>';
      copy.append(cursor);
    }

    const style=document.createElement('style');
    style.id='awaken-terminal-intro-style';
    style.textContent=`
      .terminal-gate{
        min-height:calc(100dvh - 58px)!important;
        padding:42px 0 64px!important;
        background:
          radial-gradient(700px 420px at 50% 38%,rgba(52,255,155,.075),transparent 70%),
          linear-gradient(rgba(46,255,143,.018) 1px,transparent 1px),
          #020604!important;
        background-size:auto,100% 4px,auto!important;
        text-align:left!important;
      }
      .terminal-window{
        position:relative;width:min(820px,calc(100% - 28px))!important;
        overflow:hidden;border:1px solid rgba(89,255,169,.28);border-radius:15px;
        padding:58px clamp(18px,4.8vw,42px) 34px!important;
        background:linear-gradient(180deg,rgba(5,18,12,.985),rgba(2,8,5,.99));
        box-shadow:0 34px 90px rgba(0,0,0,.58),0 0 0 1px rgba(255,255,255,.025) inset,
          0 0 46px rgba(36,255,139,.045);
      }
      .terminal-window::after{
        content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
        background:linear-gradient(180deg,transparent 0,rgba(119,255,185,.018) 50%,transparent 100%);
        mix-blend-mode:screen;
      }
      .terminal-window>*:not(.terminal-titlebar){position:relative;z-index:1}
      .terminal-titlebar{
        position:absolute;z-index:3;left:0;right:0;top:0;min-height:42px;display:grid;
        grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:12px;padding:0 14px;
        border-bottom:1px solid rgba(89,255,169,.16);background:#07100b;
        color:rgba(228,255,240,.72);font:700 10.5px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
        letter-spacing:.04em;
      }
      .terminal-lights{display:flex;gap:6px}.terminal-lights i{width:8px;height:8px;border-radius:50%;display:block;background:rgba(89,255,169,.28)}
      .terminal-lights i:nth-child(2){opacity:.72}.terminal-lights i:nth-child(3){opacity:.45}
      .terminal-ai-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;color:#b9fbd6}
      .terminal-live{color:#58ffa5;font-size:9px;text-shadow:0 0 12px rgba(88,255,165,.8);animation:terminalPulse 1.8s ease-in-out infinite}
      .terminal-encounter{
        margin-top:3px!important;color:#62ffad!important;font:700 10.5px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important;
        letter-spacing:.12em!important;text-transform:uppercase;
      }
      .terminal-command{
        margin-top:13px!important;color:#eafff2!important;font:800 clamp(27px,6.5vw,43px)/1.18 "Bai Jamjuree",sans-serif!important;
        text-shadow:0 0 28px rgba(65,255,158,.1);
      }
      .terminal-command::before{content:'> ';color:#58ffa5;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
      .terminal-dialogue{margin:24px 0 0!important;max-width:none!important;color:#c8e8d6!important;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Noto Sans Thai",sans-serif;font-size:14.5px!important;line-height:1.82!important}
      .terminal-line{
        position:relative;margin:0!important;padding:0 0 0 46px;min-height:1.82em;color:#c8e8d6!important;
        opacity:0;transform:translateY(3px);animation:terminalLineIn .28s ease forwards;animation-delay:var(--line-delay,0ms);
      }
      .terminal-line+.terminal-line{margin-top:15px!important}
      .terminal-line::before{
        content:'AI >';position:absolute;left:0;top:0;color:#58ffa5;font-weight:800;white-space:nowrap;
      }
      .terminal-dialogue strong{color:#f3fff8!important}
      .terminal-cursor-line{display:flex;align-items:center;gap:8px;margin-top:15px;color:#58ffa5;font-weight:800}
      .terminal-cursor-line i{display:inline-block;width:8px;height:1.22em;background:#58ffa5;box-shadow:0 0 10px rgba(88,255,165,.62);animation:terminalBlink .85s steps(1,end) infinite}
      .terminal-chips{justify-content:flex-start!important;margin-top:24px!important;gap:8px!important}
      .terminal-chips span{border-radius:5px!important;border-color:rgba(89,255,169,.2)!important;background:rgba(89,255,169,.035)!important;color:#9cf4c4!important;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace!important}
      .terminal-lock{margin-top:22px!important;border-radius:7px!important;border-color:rgba(255,186,92,.24)!important;background:rgba(255,171,55,.045)!important}
      .terminal-lock b{color:#ffd78f}.terminal-lock p{color:#abcabb!important}.terminal-lock a{color:#62ffad!important}
      .terminal-enter{
        margin-top:24px!important;border:1px solid rgba(88,255,165,.45)!important;border-radius:6px!important;
        background:rgba(51,255,146,.1)!important;color:#8fffc0!important;box-shadow:none!important;
        font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Noto Sans Thai",sans-serif!important;
        text-transform:none;transition:background .18s,border-color .18s,transform .18s!important;
      }
      .terminal-enter:hover{background:rgba(51,255,146,.17)!important;border-color:rgba(88,255,165,.72)!important;transform:translateY(-1px)}
      @keyframes terminalBlink{0%,48%{opacity:1}49%,100%{opacity:0}}
      @keyframes terminalPulse{50%{opacity:.34}}
      @keyframes terminalLineIn{to{opacity:1;transform:none}}
      @media(max-width:560px){
        .terminal-gate{padding:24px 0 44px!important;align-items:start!important}
        .terminal-window{width:calc(100% - 18px)!important;border-radius:11px;padding:55px 16px 27px!important}
        .terminal-titlebar{padding:0 10px;gap:8px}.terminal-ai-name{text-align:left;font-size:9.5px}
        .terminal-dialogue{font-size:13.5px!important;line-height:1.78!important}
        .terminal-line{padding-left:39px}.terminal-line::before{font-size:11.5px}
        .terminal-command{font-size:clamp(26px,9vw,36px)!important}
      }
      @media(prefers-reduced-motion:reduce){
        .terminal-line{opacity:1;transform:none;animation:none}.terminal-cursor-line i,.terminal-live{animation:none}
      }
    `;
    document.head.append(style);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
