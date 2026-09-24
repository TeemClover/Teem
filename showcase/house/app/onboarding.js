export const ONBOARDING_KEY='myclover.house.onboarding.v1';
const fallbackMemory=new Map();
export function createSeenStore({local=()=>globalThis.localStorage,session=()=>globalThis.sessionStorage,memory=fallbackMemory}={}) {
  const resolve=value=>typeof value==='function'?value():value;
  const read=()=>{
    for(const provider of [local,session])try{
      const value=JSON.parse(resolve(provider)?.getItem(ONBOARDING_KEY)||'null');
      if(value?.seen===true)return value;
    }catch{}
    return memory.get(ONBOARDING_KEY)||null;
  };
  return {read,hasSeen:()=>Boolean(read()?.seen),mark(outcome='seen'){
    const value={seen:true,outcome};memory.set(ONBOARDING_KEY,value);
    for(const provider of [local,session])try{const storage=resolve(provider);if(storage){storage.setItem(ONBOARDING_KEY,JSON.stringify(value));}}catch{}
    return value;
  }};
}

/** A small, non-modal guide: it never dispatches model/navigation events. */
export function createOnboarding({getState,isReady,store=createSeenStore()}) {
  const panel=document.createElement('aside');panel.id='house-guide';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','guide-title');
  document.body.append(panel);
  let mode=null,step=0,returnFocus=null,raf=0,highlight=null,disposed=false;
  const touch=()=>matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
  const zoomText=()=>touch()?'ใช้ 2 นิ้วเพื่อซูมและเลื่อนมุมมอง':'ใช้ล้อเมาส์เพื่อซูม';
  const visible=el=>Boolean(el&&!el.hidden&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const clearHighlight=()=>{highlight?.classList.remove('guide-target');highlight=null;};
  function undock(){
    document.body.classList.remove('guide-docked','guide-inside-target','guide-sidebar','guide-floating');
    if(panel.parentElement!==document.body)document.body.append(panel);
    panel.style.removeProperty('height');
  }
  function close(outcome='closed') {
    if(panel.hidden)return;
    const hadFocus=panel.contains(document.activeElement);
    store.mark(outcome);mode=null;panel.hidden=true;clearHighlight();undock();document.body.classList.remove('guide-open');
    const target=visible(returnFocus)&&!returnFocus.closest('[inert]')?returnFocus:document.querySelector('.lens-switch [aria-pressed="true"]');
    if(hadFocus)target?.focus({preventScroll:true});
  }
  function walkthroughContent(){
    const state=getState(),model=state.lens==='model'&&isReady();
    if(step===0)return {title:'หมุนและซูม',text:model?`ลากเพื่อหมุนบ้าน · ${zoomText()}`:`เมื่อเปิดแท็บโมเดล ลากเพื่อหมุนบ้าน และ${zoomText()}`,target:model?document.querySelector('#scene'):null};
    if(step===1){
      if(!model)return {title:'เปิดดูข้างใน',text:'กลับแท็บโมเดลเพื่อเลือกชั้นและปรับผนัง',target:null};
      if(state.view!=='whole')return {title:'เปิดดูข้างใน',text:'เลือกชั้น · Full ผนังเต็ม · Auto หลบสายตา · Low ลดลง',target:document.querySelector('.wall-controls')};
      const inside=document.querySelector('[data-action="inside"]');
      const canRestore=document.body.classList.contains('guide-docked')&&!document.body.classList.contains('view-focused')&&inside?.closest('.inspector.arrival');
      if(inside&&!inside.closest('[inert],[hidden]')&&(visible(inside)||canRestore))return {title:'เปิดดูข้างใน',text:'กด “เปิดดูข้างใน” แล้วเลือกชั้นและปรับผนังได้เลย',target:inside};
      return {title:'เปิดดูข้างใน',text:'เลือกชั้น 1 หรือชั้น 2 เพื่อเปิดดูข้างใน แล้วปรับผนังได้เลย',target:document.querySelector('.floor-dock')};
    }
    return {title:'แวะดูแต่ละห้อง',text:'แตะห้องหรือชื่อในรายการ แล้วสลับดูโมเดล แปลน หรือรูปจริง',target:document.querySelector('.lens-switch')};
  }
  function paint(){
    clearHighlight();panel.dataset.mode=mode;
    const closeButton='<button class="guide-close" data-guide="close" aria-label="ปิดคำแนะนำ">×</button>';
    if(mode==='welcome'){
      panel.innerHTML=`${closeButton}<div class="guide-body"><span class="guide-mark" aria-hidden="true">🍀</span><h2 id="guide-title">ยินดีต้อนรับสู่บ้านของเรา</h2><p class="guide-intro">ลองหมุนดู เปิดแต่ละชั้น แล้วแวะเข้าไปดูห้องต่าง ๆ ได้เลยนะครับ</p><ol class="guide-tips"><li>ลากเพื่อหมุนบ้าน <span>${zoomText()}</span></li><li>เลือกชั้น แล้วปรับผนังเพื่อเปิดดูข้างใน</li><li>แตะห้อง แล้วสลับดูแปลนหรือรูปจริง</li></ol></div><div class="guide-actions"><button class="guide-primary" data-guide="start">เริ่มสำรวจ</button><button data-guide="walk">พาดูปุ่มใช้งาน</button></div>`;
    }else{
      const content=walkthroughContent();
      highlight=content.target;
      panel.innerHTML=`${closeButton}<div class="guide-body"><span class="guide-progress">${step+1} / 3</span><h2 id="guide-title">${content.title}</h2><p>${content.text}</p></div><div class="guide-actions"><button data-guide="skip">ข้าม</button><button class="guide-primary" data-guide="next">${step===2?'เริ่มสำรวจ':'ถัดไป'}</button></div>`;
    }
    position();
    if(visible(highlight))highlight.classList.add('guide-target');
  }
  function position(){
    if(panel.hidden)return;
    const viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    const mobile=matchMedia('(max-width:767px)').matches;
    const landscape=matchMedia('(max-width:1000px) and (orientation:landscape) and (max-height:600px)').matches;
    if(mobile||landscape){
      const workspace=document.querySelector('.workspace');
      document.body.classList.remove('guide-sidebar','guide-floating');
      document.body.classList.add('guide-docked');
      document.body.classList.toggle('guide-inside-target',mode==='walk'&&step===1&&highlight?.dataset.action==='inside');
      if(panel.parentElement!==workspace)workspace.append(panel);
      panel.style.removeProperty('left');panel.style.removeProperty('top');panel.style.removeProperty('max-height');
      if(landscape)panel.style.removeProperty('height');
      else{
        // Reserve the guide's own row, while keeping the house and its docks usable.
        panel.style.height='0px';
        const sceneHeight=document.querySelector('#scene').getBoundingClientRect().height+panel.getBoundingClientRect().height;
        const minimumCanvas=Math.min(200,Math.max(140,height*.26));
        panel.style.height=`${Math.min(mode==='welcome'?230:160,Math.max(104,Math.floor(sceneHeight-minimumCanvas)))}px`;
      }
      return;
    }
    if(!document.body.classList.contains('view-focused')){
      const workspace=document.querySelector('.workspace');
      document.body.classList.remove('guide-docked','guide-inside-target','guide-floating');
      document.body.classList.add('guide-sidebar');
      if(panel.parentElement!==workspace)workspace.append(panel);
      panel.style.removeProperty('left');panel.style.removeProperty('top');panel.style.removeProperty('max-height');
      panel.style.height=`${Math.min(mode==='welcome'?400:190,Math.max(150,Math.floor(workspace.getBoundingClientRect().height*.48)))}px`;
      const inspector=highlight?.closest('.inspector');
      if(inspector){
        const container=inspector.getBoundingClientRect(),target=highlight.getBoundingClientRect();
        if(target.bottom>container.bottom-8)inspector.scrollTop+=target.bottom-container.bottom+8;
        else if(target.top<container.top+8)inspector.scrollTop+=target.top-container.top-8;
      }
      return;
    }
    undock();
    // In focus mode keep the compact card away from the right-hand camera controls.
    document.body.classList.add('guide-floating');
    panel.style.setProperty('--guide-width',`${Math.min(320,width-24)}px`);
    panel.style.height=`${Math.min(mode==='welcome'?380:190,Math.max(150,height-200))}px`;
    panel.style.maxHeight=`${Math.max(150,height-24)}px`;
    const bounds=panel.getBoundingClientRect();
    const x=left+100,y=top+160;
    panel.style.left=`${Math.max(left+12,Math.min(x,left+width-bounds.width-12))}px`;
    panel.style.top=`${Math.max(top+12,Math.min(y,top+height-bounds.height-12))}px`;
  }
  function open(manual=false){
    if(disposed||(!manual&&store.hasSeen()))return;
    returnFocus=document.activeElement;mode='welcome';step=0;panel.hidden=false;document.body.classList.add('guide-open');paint();
    // Mark only after layout actually presents the card. No loading timeout guess.
    requestAnimationFrame(()=>{
      if(panel.hidden||!panel.getBoundingClientRect().width)return;
      store.mark('seen');
      if(manual)panel.querySelector('[data-guide="start"]')?.focus({preventScroll:true});
    });
  }
  function sync(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{
      if(disposed)return;
      if(!panel.hidden){
        if(mode==='walk'){
          const active=panel.contains(document.activeElement)?document.activeElement.dataset.guide:null;
          paint();if(active)panel.querySelector(`[data-guide="${active}"]`)?.focus({preventScroll:true});
        }else position();
        return;
      }
      const state=getState(),scene=document.querySelector('#scene'),rect=scene?.getBoundingClientRect();
      if(!store.hasSeen()&&isReady()&&!document.hidden&&state.lens==='model'&&state.tourIndex===null&&!document.querySelector('dialog[open]')&&rect?.width>0&&rect?.height>0)open();
    });
  }
  panel.addEventListener('click',event=>{
    const action=event.target.closest('[data-guide]')?.dataset.guide;if(!action)return;
    if(action==='walk'){mode='walk';step=0;paint();panel.querySelector('[data-guide="next"]').focus({preventScroll:true});}
    else if(action==='next'){if(step===2)close('completed');else{step++;paint();panel.querySelector('[data-guide="next"]').focus({preventScroll:true});}}
    else close(action==='start'?'started':action==='skip'?'skipped':'closed');
  });
  const keydown=event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();event.stopImmediatePropagation();close('closed');}};
  document.addEventListener('keydown',keydown,true);
  const observer=new ResizeObserver(()=>{if(!panel.hidden)position();else sync();});observer.observe(document.querySelector('.stage'));
  addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);document.addEventListener('visibilitychange',sync);
  return {sync,open:()=>open(true),hide:()=>{if(!panel.hidden)close('closed');},destroy(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();removeEventListener('resize',sync);window.visualViewport?.removeEventListener('resize',sync);document.removeEventListener('visibilitychange',sync);document.removeEventListener('keydown',keydown,true);clearHighlight();undock();document.body.classList.remove('guide-open');panel.remove();}};
}
