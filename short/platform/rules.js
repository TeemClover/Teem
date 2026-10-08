export const packs = [{id:'50',coins:50,amount:4900},{id:'150',coins:150,amount:13900},{id:'300',coins:300,amount:26900}];
export const methods = ['promptpay','truemoney','card'];
export const bangkokDay = (at = Date.now()) => new Date(Number(at) + 7*3600000).toISOString().slice(0,10);
export function nextMidnight(at=Date.now()){return new Date(`${bangkokDay(at)}T17:00:00Z`).getTime();}
export const html = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mediaRules(format,role){return role==='cover'?{types:['image/webp','image/jpeg','image/png'],limit:10*1024**2}:format==='drama'?{types:['video/mp4','video/webm'],limit:250*1024**2}:format==='comic'?{types:['image/webp','image/jpeg','image/png'],limit:10*1024**2}:{types:['text/plain'],limit:1024**2};}
export function validateFile(file,format,role='page'){const rule=mediaRules(format,role);if(!rule.types.includes(file.type)||!file.size||file.size>rule.limit)throw Error('ไฟล์ไม่รองรับหรือใหญ่เกินกำหนด');return true;}
export function validateSubmission(input){
  const value={title:String(input.title||'').trim().slice(0,100),summary:String(input.summary||'').trim().slice(0,500),team:String(input.team||'').trim().slice(0,100),format:input.format,episode:Number(input.episode),price:Number(input.price),rights:input.rights===true};
  if(!value.title||!value.summary||!value.team||!['drama','comic','novel'].includes(value.format)||!Number.isInteger(value.episode)||value.episode<1||value.episode>1000||![0,10].includes(value.price)||!value.rights)throw Error('กรอกข้อมูลให้ครบและยืนยันสิทธิ์ในผลงาน');
  return value;
}
export function qualifiedView(seconds,complete,format){return seconds >= (format==='drama'?3:10) || (complete && seconds>=3);}
export function chargeMatches(charge,order,live){return charge.id===order.charge_id&&charge.metadata?.torntor_order===order.id&&charge.metadata?.torntor_user===order.user_id&&charge.amount===Number(order.amount)&&String(charge.currency).toLowerCase()==='thb'&&charge.livemode===live&&charge.status==='successful'&&charge.paid===true&&!charge.refunded&&Number(charge.refunded_amount||0)===0;}
