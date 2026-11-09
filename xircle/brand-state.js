/** URL-only, bounded state for an illustrative brand showroom; no personal health records. */
export const STATIONS=Object.freeze(['hello','signal','connect','routine','habix','finish']);
export const PATHS=Object.freeze({
  sleep:['hello','signal','connect','routine','habix','finish'],
  eat:['hello','signal','habix','routine','connect','finish'],
  move:['hello','signal','routine','connect','habix','finish']
});
export const PRODUCT_IDS=Object.freeze(['gus','protein-hmb','astamega','vita-matrix','flavor']);
const one=(p,key)=>p.getAll(key).length===1?p.get(key):null;
const allowed=(value,list,fallback)=>list.includes(value)?value:fallback;
export function readBrandState(href){
  const url=new URL(href,'https://www.myclover.com');const p=url.searchParams;
  const legacy={sleep:['signal','sleep'],eat:['signal','eat'],move:['signal','move'],body:['connect','sleep'],devices:['connect','sleep'],routine:['routine','sleep'],start:['finish','sleep'],experience:['hello','sleep']};
  const hash=url.hash.slice(1);const old=legacy[hash];
  const focusMap={food:'eat',sleep:'sleep',move:'move'};
  const requested=one(p,'focus');
  const context=one(p,'entry')==='compass'&&Object.hasOwn(focusMap,requested)?focusMap[requested]:null;
  const focus=allowed(one(p,'path'),Object.keys(PATHS),old?.[1]||context||'sleep');
  const station=allowed(hash.startsWith('visit-')?hash.slice(6):null,STATIONS,old?.[0]||allowed(one(p,'at'),STATIONS,'hello'));
  const sample=(one(p,'sample')||'').split(',').filter(x=>['sleep','eat','move'].includes(x));
  const seen=(one(p,'trail')||'').split(',').filter(x=>STATIONS.includes(x));
  return {station,focus,moment:allowed(one(p,'moment'),['morning','noon','night'],'night'),device:allowed(one(p,'device'),['app','band','scale'],'app'),loop:allowed(one(p,'loop'),['A','B','C','D'],'A'),product:allowed(one(p,'product'),PRODUCT_IDS,'gus'),sample:[...new Set(sample)],seen:[...new Set(['hello',...seen,station])]};
}
export function brandURL(state,href){
  const url=new URL(href,'https://www.myclover.com');
  const previous=new URLSearchParams(url.search);url.search='';
  const category=one(previous,'category'),watch=one(previous,'watch');
  if(['all','app','band','scale','habix'].includes(category))url.searchParams.set('category',category);
  if(watch&&/^[A-Za-z0-9_-]{11}$/.test(watch))url.searchParams.set('watch',watch);
  if(one(previous,'entry')==='compass'){url.searchParams.set('entry','compass');const focus=one(previous,'focus');if(['sleep','food','move'].includes(focus))url.searchParams.set('focus',focus);}
  const values={at:state.station,path:state.focus,moment:state.moment,device:state.device,loop:state.loop,product:state.product,sample:state.sample.join(','),trail:state.seen.join(',')};
  for(const [key,value] of Object.entries(values)){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}
  for(const key of ['invite','notebook','mode','c'])url.searchParams.delete(key);
  url.hash='visit-'+state.station;
  return url.pathname+url.search+url.hash;
}
export function visitStation(state,station){
  if(!STATIONS.includes(station))return state;
  return {...state,station,seen:[...new Set([...state.seen,station])]};
}
export function adjacentStation(state,direction=1){
  const order=PATHS[state.focus];return order[Math.max(0,Math.min(order.length-1,order.indexOf(state.station)+direction))];
}
