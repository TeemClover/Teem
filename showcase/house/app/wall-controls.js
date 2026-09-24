export const WALL_OPTIONS = Object.freeze([
  {mode:'full',label:'Full',title:'ดูผนังเต็มความสูง',path:'M4 20V5l7-2v17M11 3l9 3v14M4 12l7-2 9 3M4 20h16'},
  {mode:'auto',label:'Auto',title:'เปิดผนังที่บังมุมมอง',path:'M4 20V5l7-2v9M11 3l9 3v14M4 20h16M4 14l7-2 9 3M7 17h4m-2-2 2 2-2 2'},
  {mode:'low',label:'Low',title:'มองผังและเฟอร์นิเจอร์ได้ชัดขึ้น',path:'M4 20v-7l7-2 9 3v6M11 11v9M4 20h16M4 5l7-2 9 3',dashed:true},
]);

export function wallControlsVisible(state) {
  return state.lens==='model'&&['f1','f2','exploded'].includes(state.view);
}

/** Display preferences only: the caller dispatches WALL through the existing state flow. */
export function createWallControls({stage,onChange}) {
  const document=stage.ownerDocument,element=document.createElement('div');
  element.id='wall-controls';element.className='wall-controls';element.hidden=true;
  element.setAttribute('role','group');element.setAttribute('aria-label','การแสดงผนัง');
  const buttons=WALL_OPTIONS.map(option=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.wallMode=option.mode;button.dataset.testid=`wall-${option.mode}`;
    button.title=option.title;button.setAttribute('aria-label',`${option.label} — ${option.title}`);
    button.setAttribute('aria-pressed','false');
    button.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${option.path}"${option.dashed?' stroke-dasharray="3 2"':''}/></svg><span>${option.label}</span>`;
    const select=()=>{if(!element.hidden)onChange(option.mode);};
    button.addEventListener('click',select);element.append(button);
    return {button,select};
  });
  stage.append(element);
  return {
    element,
    update(state) {
      element.hidden=!wallControlsVisible(state);
      stage.dataset.wallControls=element.hidden?'hidden':'visible';
      const mode=WALL_OPTIONS.some(option=>option.mode===state.wallMode)?state.wallMode:'auto';
      for(const {button} of buttons)button.setAttribute('aria-pressed',String(button.dataset.wallMode===mode));
    },
    destroy() {
      for(const {button,select} of buttons)button.removeEventListener('click',select);
      element.remove();delete stage.dataset.wallControls;
    },
  };
}
