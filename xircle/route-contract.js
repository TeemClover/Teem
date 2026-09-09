/** One active experience. Legacy keys are read only, never migrated or unlocked. */
export const XIRCLE_HOME = '/xircle/';
export const RETIRED_ENTRIES = Object.freeze(['start','ghost','explore','care','opportunity','routinex','circle','care/party']);
export const INVITE_TTL = 35 * 24 * 60 * 60 * 1000;
export const FOCUS_LABELS = Object.freeze({sleep:'การพัก',move:'การขยับ',food:'มื้ออาหาร'});
const single = (params,key) => params.getAll(key).length === 1 ? params.get(key) : null;
const code = value => typeof value === 'string' && /^\d{5}$/.test(value) ? value : null;

export function savedInvitation(storage,now=Date.now()) {
  try {
    const raw=storage?.getItem('xircle.local.v1');
    if(!raw || raw.length>65536)return null;
    const item=JSON.parse(raw)?.xtyHandoff,age=now-item?.receivedAt;
    return code(item?.partyCode) && Number.isFinite(item?.receivedAt) && age>=0 && age<=INVITE_TTL ? item.partyCode : null;
  } catch { return null; }
}
export function entryContext(search='',storage=null,now=Date.now()) {
  const params=new URLSearchParams(search),compass=single(params,'entry')==='compass';
  const requested=single(params,'focus');
  const focus=compass && Object.hasOwn(FOCUS_LABELS,requested) ? requested : null;
  const invitation=code(single(params,'xty')) || code(single(params,'invite')) ||
    (single(params,'mode')==='join' ? code(single(params,'c')) : null) || savedInvitation(storage,now);
  return {compass,focus,invitation,createNotebook:single(params,'mode')==='create'||single(params,'notebook')==='create'};
}
export function latestEntry(pathname,search='') {
  const path=pathname.toLowerCase().replace(/\/index\.html$/,'/').replace(/\/+$/,'');
  const context=entryContext(search),params=new URLSearchParams();
  if(context.compass){params.set('entry','compass');if(context.focus)params.set('focus',context.focus);}
  if(context.invitation)params.set('invite',context.invitation);
  if(context.createNotebook)params.set('notebook','create');
  const end=['/xircle/circle','/xircle/care/party','/xircle/explore'].includes(path)?'#start':'';
  return XIRCLE_HOME+(params.size?'?'+params:'')+end;
}
export function notebookHref(context) {
  const invitation = !context?.createNotebook && code(context?.invitation);
  return invitation ? `https://teambook.me/join/?c=${invitation}` : 'https://teambook.me/new/?template=xircle_xvisor';
}
