import {blankState} from '../../eggcycle/cycle.js';
export function memoryStore(initial=blankState()){
  let state=structuredClone(initial);const limits=new Map(),notices=new Map();
  return {notices,
    async load(){return structuredClone(state);},
    async save(next){if(state.revision!==next.revision)throw Object.assign(new Error('conflict'),{status:409});state={...structuredClone(next),revision:next.revision+1};return structuredClone(state);},
    async limited(key,now,max=8,window=900000){const k=key+Math.floor(now/window),hits=(limits.get(k)||0)+1;limits.set(k,hits);return hits>max;},
    async claim(key,now){if(notices.has(key)&&notices.get(key).status==='sent')return null;notices.set(key,{status:'pending'});return 'lease';},
    async finish(key,lease,success){notices.set(key,{status:success?'sent':'pending',sent_at:success?new Date().toISOString():null});},
    async status(){return [...notices.values()].at(-1)||null;},
  };
}
export async function call(handler,action,{method='GET',body,cookie='',headers={}}={}){
  const response={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(value){this.body=JSON.parse(value);}};
  await handler({url:`/api/eggcycle?action=${action}`,method,body,headers:{host:'localhost:4197','content-type':'application/json',cookie,...headers},socket:{remoteAddress:'127.0.0.1'}},response);
  return response;
}
