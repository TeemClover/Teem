import {Fault} from './domain.js';
async function boundedBytes(response,max){const reader=response.body?.getReader();if(!reader)throw new Fault('EMPTY_IMAGE');let size=0;const chunks=[];try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new Fault('IMAGE_TOO_LARGE');chunks.push(value);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>{});}}
export function createProviders(env,fetchImpl=fetch){
 const token=env.MEDIRAL_LINE_ACCESS_TOKEN;
 let identity;
 return {
  async validateMessages(messages){
   const r=await fetchImpl('https://api.line.me/v2/bot/message/validate/reply',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messages}),signal:AbortSignal.timeout(7000),redirect:'error'});
   if(!r.ok)throw new Fault('LINE_MESSAGE_INVALID',502);
   return {valid:true};
  },
  async botId(){
   if(!token||!env.MEDIRAL_LINE_BASIC_ID)throw new Fault('LINE_NOT_CONFIGURED',503);
   if(identity)return identity;
   const r=await fetchImpl('https://api.line.me/v2/bot/info',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(7000),redirect:'error'});
   if(!r.ok)throw new Fault('LINE_IDENTITY_UNAVAILABLE',503);
   const info=await r.json();if(info.basicId!==env.MEDIRAL_LINE_BASIC_ID||!/^U[0-9a-f]{32}$/.test(info.userId||''))throw new Fault('LINE_IDENTITY_MISMATCH',503);
   return identity=info.userId;
  },
  async image(id){if(!/^\d{1,40}$/.test(id))throw new Fault('INVALID_IMAGE_ID');const r=await fetchImpl(`https://api-data.line.me/v2/bot/message/${id}/content`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw new Fault('LINE_IMAGE_UNAVAILABLE',503);const bytes=await boundedBytes(r,3*1024*1024);const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));if(!jpeg&&!png)throw new Fault('UNSUPPORTED_IMAGE');return {mime:jpeg?'image/jpeg':'image/png',base64:bytes.toString('base64')};},
  async verify(receipt,order){if(!env.MEDIRAL_EASYSLIP_KEY)return {success:false};const r=await fetchImpl('https://api.easyslip.com/v2/verify/bank',{method:'POST',headers:{Authorization:`Bearer ${env.MEDIRAL_EASYSLIP_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({base64:`data:${receipt.mime};base64,${receipt.base64}`,remark:order.id,matchAccount:true,matchAmount:order.total/100,checkDuplicate:true}),signal:AbortSignal.timeout(12000),redirect:'error'});if(!r.ok)return {success:false};return r.json();},
  async send(row){const reply=row.kind==='reply';const r=await fetchImpl(`https://api.line.me/v2/bot/message/${reply?'reply':'push'}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(!reply?{'X-Line-Retry-Key':row.id}:{})},body:JSON.stringify(reply?{replyToken:row.token,messages:row.messages}:{to:row.user_id,messages:row.messages}),signal:AbortSignal.timeout(7000),redirect:'error'});return {ok:r.ok||(!reply&&r.status===409&&Boolean(r.headers.get('x-line-accepted-request-id'))),retry:r.status>=500||r.status===429,code:`LINE_HTTP_${r.status}`};}
 };
}
export async function dispatch(store,providers,id,now=Date.now()){
 const row=await store.claimMessage(id,now);if(!row)return;
 if(row.order_id&&row.order_status&&(await store.order(row.order_id))?.status!==row.order_status){await store.finishMessage(row,'superseded','ORDER_ADVANCED',now);return;}
 if((row.kind==='reply'&&now-Number(row.created_at)>55000)||now-Number(row.created_at)>23*3600000||row.attempts>8){await store.finishMessage(row,'failed','DELIVERY_EXPIRED',now);return;}
 try{const r=await providers.send(row);await store.finishMessage(row,r.ok?'sent':r.retry?'pending':'failed',r.ok?null:r.code,now);}catch{await store.finishMessage(row,'pending','DELIVERY_UNCERTAIN',now);}
}
