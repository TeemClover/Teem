/** Company product entry. Retired personal-service/notebook parameters have no effect. */
export const XIRCLE_HOME='/xircle/';
export const RETIRED_ENTRIES=Object.freeze(['start','ghost','explore','care','opportunity','routinex','circle','care/party']);
export const FOCUS_LABELS=Object.freeze({sleep:'การพัก',move:'การขยับ',food:'มื้ออาหาร'});
export const FOCUS_ANCHORS=Object.freeze({sleep:'sleep',move:'move',food:'eat'});
const single=(params,key)=>params.getAll(key).length===1?params.get(key):null;
export function entryContext(search=''){
  const params=new URLSearchParams(search),compass=single(params,'entry')==='compass';
  const requested=single(params,'focus');
  return {compass,focus:compass&&Object.hasOwn(FOCUS_LABELS,requested)?requested:null};
}
export function latestEntry(pathname,search=''){
  const context=entryContext(search),params=new URLSearchParams();
  if(context.compass){params.set('entry','compass');if(context.focus)params.set('focus',context.focus);}
  const path=pathname.toLowerCase().replace(/\/index\.html$/,'/').replace(/\/+$/,'');
  const anchor=path==='/xircle/routinex'?'#routine':['/xircle/explore','/xircle/circle','/xircle/care/party'].includes(path)?'#start':'';
  return XIRCLE_HOME+(params.size?'?'+params:'')+anchor;
}
