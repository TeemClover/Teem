import { mountMatch as mountLegacyMatch } from './match-ui-legacy.js';
import { reducedMotion } from './ui.js';
import { COLOR_META, cardById } from './cards.js';
import { cardSVG, cardBackSVG, genericCardSVG } from './art.js';
import { playCardFlip, playSfx } from './audio.js';

let installed = false;
function installStyles() {
  if (installed) return;
  installed = true;
  const s = document.createElement('style');
  s.id = 'c7-physical-table-v2';
  s.textContent = `
  .physical-v2 .stage-slot{position:relative;overflow:visible}
  .physical-v2 .stage-slot>.flip{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
  .pf2-card{position:absolute;inset:0;z-index:3;opacity:0;pointer-events:none;perspective:1000px;filter:drop-shadow(0 15px 18px rgb(0 0 0/.3));transform:scale(.99);transition:opacity .12s,transform .18s}
  .pf2-card.on{opacity:1;transform:scale(1)}
  .pf2-inner{position:absolute;inset:0;transform-style:preserve-3d;transform:rotateY(0);transition:transform .52s cubic-bezier(.18,.72,.18,1)}
  .pf2-card.up .pf2-inner{transform:rotateY(180deg)}
  .pf2-face{position:absolute;inset:0;border-radius:10px;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#071c12;transform:translateZ(.1px)}
  .pf2-face.front{transform:rotateY(180deg) translateZ(.1px)}
  .pf2-face svg{display:block;width:100%;height:100%}
  .pf2-ghost,.pf2-exit{position:fixed;z-index:420;pointer-events:none;perspective:1000px;transform-origin:top left;filter:drop-shadow(0 18px 24px rgb(0 0 0/.38))}
  .pf2-exit{z-index:410;transition:none!important}
  .pf2-ghost-inner{position:absolute;inset:0;transform-style:preserve-3d}
  .pf2-ghost .pf2-face,.pf2-exit .pf2-face{border-radius:9px}
  .physical-v2 .round-result{opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s}
  .physical-v2 .round-result.pf2-show{opacity:1;transform:none}
  .physical-v2 .round-discard{transition:opacity .18s,transform .18s}
  .physical-v2.pf2-next .round-discard{opacity:0;transform:translateY(4px)}
  .physical-v2 .hand-card.pf2-played{opacity:0!important;pointer-events:none!important}
  .physical-v2 .stage-cards.pf2-ready{animation:pf2ready .24s ease-out}
  @keyframes pf2ready{50%{transform:scale(1.012)}}
  @media(prefers-reduced-motion:reduce){.pf2-card,.pf2-inner,.physical-v2 .round-result,.physical-v2 .round-discard{transition:none!important}.pf2-ghost,.pf2-exit{display:none!important}.physical-v2 .stage-cards.pf2-ready{animation:none!important}}
  `;
  document.head.append(s);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const twoFrames = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
const copyRect = r => r && ({ left:r.left, top:r.top, width:r.width, height:r.height });

function face(cardId) {
  const c = cardById(cardId);
  if (!c) return '';
  return c.generic ? genericCardSVG(c.color,{width:150}) : cardSVG(cardId,{width:150,showNumber:false});
}

function cloneView(v) {
  return v && ({ ...v, you:v.you?{...v.you,hand:v.you.hand?[...v.you.hand]:v.you.hand}:v.you, opponent:v.opponent?{...v.opponent}:v.opponent, rounds:v.rounds?[...v.rounds]:[] });
}

function controller(root) {
  let attached=false, initialized=false, real=null;
  let physicalRounds=0, queuedRounds=0, legacyRounds=0;
  let first=null, queue=Promise.resolve(), notify=()=>{};
  let selectedIid=null, launch=null, committedIid=null, observer=null;
  const locked={you:false,opp:false}, arrivals={you:null,opp:null}, live={you:null,opp:null};

  const slot = side => root.querySelector(side==='you'?'#slotYou':'#slotOpp');
  const result = () => root.querySelector('#roundResult');
  const other = side => side==='you'?'opp':'you';

  function makeLive(side) {
    const host=slot(side); if(!host) return null;
    let n=host.querySelector('.pf2-card'); if(n) return n;
    n=document.createElement('div'); n.className=`pf2-card pf2-${side}`;
    n.innerHTML='<div class="pf2-inner"><div class="pf2-face back"></div><div class="pf2-face front"></div></div>';
    n.querySelector('.back').innerHTML=cardBackSVG({width:150}); host.append(n); return n;
  }
  const card = side => live[side] || (live[side]=makeLive(side));
  function setFace(side,id){const n=card(side);if(!n||!id||n.dataset.cid===id)return;n.querySelector('.front').innerHTML=face(id);n.dataset.cid=id}
  function back(side){const n=card(side);if(!n)return;n.classList.remove('up');n.classList.add('on')}
  function up(side,id){setFace(side,id);const n=card(side);if(n)n.classList.add('on','up')}
  function hide(side){card(side)?.classList.remove('on','up')}
  function hideResult(){result()?.classList.remove('pf2-show');root.classList.add('pf2-next')}
  function showResult(){root.classList.remove('pf2-next');result()?.classList.add('pf2-show')}

  function handNode(iid){if(!iid)return null;try{return root.querySelector(`.hand-card[data-iid="${CSS.escape(iid)}"]`)}catch{return root.querySelector(`.hand-card[data-iid="${iid}"]`)}}
  function remember(iid){selectedIid=iid||null;const c=real?.you?.hand?.find(x=>x.iid===iid);const n=handNode(iid);launch={iid,cardId:c?.cardId||null,rect:n?copyRect(n.getBoundingClientRect()):null}}
  function maskHand(){if(!committedIid)return;handNode(committedIid)?.classList.add('pf2-played')}
  function observeHand(){const h=root.querySelector('#hand');if(!h||observer)return;observer=new MutationObserver(maskHand);observer.observe(h,{childList:true})}

  function source(side,to){
    if(side==='you'){
      if(launch?.rect?.width>2)return launch.rect;
      const n=handNode(selectedIid||real?.you?.selected);if(n)return copyRect(n.getBoundingClientRect());
      const h=root.querySelector('#hand')?.getBoundingClientRect();if(h)return {left:h.left+h.width/2-29,top:h.top+h.height/2-40,width:58,height:81};
    }
    const a=root.querySelector('#oppAv')?.getBoundingClientRect();
    return {left:to.left+to.width/2-29,top:a?Math.max(4,a.bottom+2):Math.max(4,to.top-150),width:58,height:81};
  }

  /* Never animate the persistent table card itself out of the slot. That same
     DOM node is immediately reused by the incoming card, which previously let
     an old exit animation finish late and make the new card appear to warp or
     vanish. Snapshot the old card into a fixed ghost, free the slot instantly,
     then let the snapshot travel completely off-screen. */
  async function clear(side,soft=false){
    const n=card(side);if(!n?.classList.contains('on'))return;
    if(reducedMotion()||!n.animate){hide(side);return}
    const rect=copyRect(n.getBoundingClientRect());if(!rect?.width){hide(side);return}
    const exit=n.cloneNode(true);
    exit.classList.add('pf2-exit','on');
    Object.assign(exit.style,{position:'fixed',inset:'auto',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,opacity:'1',transform:'none',transition:'none',pointerEvents:'none'});
    document.body.append(exit);
    hide(side);
    await twoFrames();
    if(!soft)playSfx('fling');
    const d=side==='you'?-1:1;
    const travel=d<0?-(rect.right+Math.max(64,rect.width*.45)):(innerWidth-rect.left+Math.max(64,rect.width*.45));
    const y=soft?5:12;
    const turn=d*(soft?4:9);
    const duration=soft?290:390;
    const a=exit.animate([
      {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',opacity:1,offset:0},
      {transform:`translate3d(${travel*.76}px,${d*y*.35}px,0) rotate(${turn*.68}deg) scale(${soft?.985:.965})`,opacity:1,offset:.72},
      {transform:`translate3d(${travel}px,${d*y}px,0) rotate(${turn}deg) scale(${soft?.975:.94})`,opacity:0,offset:1},
    ],{duration,easing:'cubic-bezier(.24,.72,.18,1)',fill:'forwards'});
    try{await a.finished}catch{}exit.remove();
  }

  function ghost(side,id,from){
    const g=document.createElement('div');g.className='pf2-ghost';Object.assign(g.style,{left:`${from.left}px`,top:`${from.top}px`,width:`${from.width}px`,height:`${from.height}px`});
    const inner=document.createElement('div');inner.className='pf2-ghost-inner';
    const b=document.createElement('div');b.className='pf2-face back';b.innerHTML=cardBackSVG({width:150});
    const f=document.createElement('div');f.className='pf2-face front';f.innerHTML=side==='you'&&id?face(id):cardBackSVG({width:150});
    inner.append(b,f);g.append(inner);document.body.append(g);return {g,inner};
  }

  async function incoming(side,known=null){
    if(!attached)return;if(locked[side])return arrivals[side]||Promise.resolve();locked[side]=true;
    const host=slot(side),to=host&&copyRect(host.getBoundingClientRect());if(!to?.width){back(side);return}
    const id=side==='you'?(known||launch?.cardId||real?.you?.hand?.find(x=>x.iid===(selectedIid||real?.you?.selected))?.cardId):null;
    if(reducedMotion()){back(side);playSfx('cardSwap');return}
    const from=source(side,to),{g,inner}=ghost(side,id,from),dx=to.left-from.left,dy=to.top-from.top,sx=to.width/from.width,sy=to.height/from.height;
    if(side==='you')inner.style.transform='rotateY(180deg)';
    const m=g.animate([{transform:'translate3d(0,0,0) scale(1)',offset:0},{transform:`translate3d(${dx*.56}px,${dy*.56-10}px,0) scale(${1+(sx-1)*.56},${1+(sy-1)*.56})`,offset:.56},{transform:`translate3d(${dx}px,${dy}px,0) scale(${sx},${sy})`,offset:1}],{duration:side==='you'?470:430,easing:'cubic-bezier(.2,.76,.2,1)',fill:'forwards'});
    let turn=null;if(side==='you')turn=inner.animate([{transform:'rotateY(180deg)',offset:0},{transform:'rotateY(180deg)',offset:.3},{transform:'rotateY(92deg)',offset:.56},{transform:'rotateY(0deg)',offset:.82},{transform:'rotateY(0deg)',offset:1}],{duration:430,easing:'cubic-bezier(.22,.68,.18,1)',fill:'forwards'});
    try{await m.finished}catch{}back(side);await twoFrames();playSfx('cardSwap');g.remove();try{turn?.cancel()}catch{}if(side==='you')launch=null;
  }

  function lock(side,known=null){
    if(!attached||locked[side])return arrivals[side]||Promise.resolve();
    if(side==='you'){committedIid=selectedIid||real?.you?.selected||committedIid;maskHand()}
    if(!first){first=side;hideResult();void clear(other(side),false);void clear(side,true)}
    arrivals[side]=incoming(side,known).catch(()=>back(side)).finally(()=>arrivals[side]=null);return arrivals[side];
  }

  function readyPulse(){const s=root.querySelector('.stage-cards');if(!s)return;s.classList.remove('pf2-ready');void s.offsetWidth;s.classList.add('pf2-ready');setTimeout(()=>s.classList.remove('pf2-ready'),280)}
  function paintResult(r){const n=result();if(!n)return;const a=COLOR_META[r.you?.color]?.emoji||'',b=COLOR_META[r.opp?.color]?.emoji||'';if(r.result==='TIE')n.innerHTML=`<span class="rr-word draw">DRAW</span>${a} = ${b}${r.you?.color!==r.opp?.color?' · BLOCK':''}`;else if(r.youWon)n.innerHTML=`<span class="rr-word win">WIN</span>${a} &gt; ${b}`;else n.innerHTML=`<span class="rr-word lose">LOSE</span>${a} &lt; ${b}`}

  async function reveal(r){
    if(!r||!attached)return;hideResult();setFace('you',r.you?.cardId);setFace('opp',r.opp?.cardId);
    const a=locked.you?(arrivals.you||Promise.resolve()):lock('you',r.you?.cardId),b=locked.opp?(arrivals.opp||Promise.resolve()):lock('opp');await Promise.allSettled([a,b]);
    back('you');back('opp');readyPulse();if(!reducedMotion())await sleep(230);playCardFlip(false);card('you')?.classList.add('up');card('opp')?.classList.add('up');if(!reducedMotion())await sleep(540);
    paintResult(r);showResult();physicalRounds=Math.max(physicalRounds+1,Number(r.n||0));legacyRounds=Math.max(legacyRounds,physicalRounds);notify();
    /* This event marks human-visible time zero for the next decision. The bot
       must not spend its thinking delay while these cards are still flipping. */
    try{window.dispatchEvent(new CustomEvent('core7:physical-result-ready',{detail:{round:Number(r.n||physicalRounds),nextRound:Number(r.n||physicalRounds)+1}}))}catch{}
    first=null;locked.you=locked.opp=false;arrivals.you=arrivals.opp=null;selectedIid=launch=committedIid=null;
  }

  function rebuild(v){
    const last=v?.rounds?.at(-1);if(last){up('you',last.you?.cardId);up('opp',last.opp?.cardId);showResult()}else{hide('you');hide('opp');hideResult();root.classList.remove('pf2-next')}
    if(v?.phase==='ROUND_SELECT'&&(v.you?.locked||v.opponent?.locked)){hideResult();if(v.you?.locked){locked.you=true;committedIid=v.you.selected||committedIid;back('you');hide('opp')}if(v.opponent?.locked){locked.opp=true;back('opp');if(!v.you?.locked)hide('you')}maskHand()}
  }

  function accept(v){
    if(!v)return;real=v;
    if(!initialized){initialized=true;physicalRounds=queuedRounds=legacyRounds=v.rounds?.length||0;if(attached)rebuild(v);return}
    const count=v.rounds?.length||0;if(count>queuedRounds){for(let i=queuedRounds;i<count;i++)queue=queue.then(()=>reveal(v.rounds[i])).catch(()=>{});queuedRounds=count;return}
    if(v.phase==='ROUND_SELECT'){if(v.you?.locked&&!locked.you)lock('you');if(v.opponent?.locked&&!locked.opp)lock('opp')}
  }

  function legacy(v){
    if(!v||!initialized||(v.rounds?.length||0)<=legacyRounds)return v;
    const g=cloneView(v);g.rounds=v.rounds.slice(0,legacyRounds);g.discardRequired=false;g.waitingOpponentDiscard=false;g.result=null;g.phase='ROUND_SELECT';g.you={...g.you,locked:true};g.opponent={...g.opponent,locked:true};return g;
  }

  function event(ev){if(ev?.event_type!=='round.selection_locked'||!real?.seat)return;const side=ev.payload?.seat===real.seat?'you':'opp';lock(side)}
  function before(a){if(a?.type==='select_card')remember(a.cardInstanceId);if(a?.type==='lock_choice'){const iid=selectedIid||real?.you?.selected;if(iid&&launch?.iid!==iid)remember(iid)}}
  function after(a,res){if(a?.type==='lock_choice'&&res?.ok)lock('you',launch?.cardId||null)}
  function attach(){attached=true;root.classList.add('physical-v2');live.you=makeLive('you');live.opp=makeLive('opp');observeHand();result()?.classList.remove('pf2-show');if(real)rebuild(real)}
  return {accept,legacy,event,before,after,attach,setNotify:f=>notify=f||(()=>{})};
}

export function mountMatch(root,client,options={}){
  installStyles();const p=controller(root),subs=new Set();
  const get=client.getView.bind(client);client.getView=async(...a)=>{const v=await get(...a);p.accept(v);return p.legacy(v)};
  const sub=client.subscribe.bind(client);client.subscribe=fn=>{subs.add(fn);const off=sub(ev=>{p.event(ev);fn(ev)});return()=>{subs.delete(fn);off?.()}};
  p.setNotify(()=>{const ev={event_type:'physical.presentation_ready'};for(const fn of [...subs])try{fn(ev)}catch{}});
  const send=client.send.bind(client);client.send=async a=>{p.before(a);const r=await send(a);p.after(a,r);return r};
  const api=mountLegacyMatch(root,client,options);p.attach();return api;
}