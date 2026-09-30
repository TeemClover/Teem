import {reducer as mediral,clean,lineText,SITE,isMediralInquiry} from './domain.js';

const TOPICS={mediral:'ดูแลผิว',ai:'AI และการเรียนรู้',home:'ของใช้ในบ้าน'};
const choices=['คุยเรื่อง Mediral','คุยเรื่อง AI','เลือกข่าวที่สนใจ','คุยกับคนดูแล'];
const message=text=>lineText(text,choices);
// Deterministic checkout, consent and preference commands. When enabled,
// handler.js sends open conversation to GPT before reaching this fallback.
// Only coarse, customer-expressed interests are recorded; never inferred conditions.
export function houseReducer(state,event,order,options={}){
 if(event.message?.text==='ติดต่อทีม')event={...event,message:{...event.message,text:'คุยกับคนดูแล'}};
 const s=structuredClone(state||{}),text=clean(event.message?.text,1800),now=options.now??Date.now();
 const h=s.house||={topic:null,interests:{},subscriptions:{}};
 const answer=text=>({state:s,order:null,messages:[typeof text==='string'?message(text):text]});
 if(event.source?.type!=='user')return {state:s,order:null,messages:[]};
 if(event.type==='unfollow'){h.subscriptions={};h.blocked=true;s.paused=true;return {state:s,order:null,messages:[]};}
 if(text==='หยุดข่าวทั้งหมด'){h.subscriptions={};h.stoppedAt=now;return answer('หยุดข่าวและข้อเสนอให้แล้วค่ะ 🍀 ยังสอบถามสินค้าและติดตามออเดอร์ได้ตามปกติ');}
 if(event.type==='follow'){
  h.blocked=false;
  if(options.nativeGreeting)return {state:s,order:null,messages:[]};
  // Do not resume a staff handoff or abandoned checkout on refollow.
  return answer('ยินดีต้อนรับสู่บ้าน myClover 🍀\nอยากคุยเรื่องไหน พิมพ์มาได้เลยค่ะ ทั้งดูแลผิวและเรียนรู้เรื่อง AI\nเพิ่มเพื่อนแล้วเรายังไม่สมัครข่าวให้ จนกว่าคุณจะเลือกเอง');
 }
 if(s.paused)return mediral(s,event,order,options);
 if(text==='เลือกข่าวที่สนใจ')return answer(lineText('เลือกเฉพาะเรื่องที่อยากให้บ้านส่งมาหาได้ค่ะ ไม่เลือกก็ยังสั่งซื้อได้ตามปกติ\nพิมพ์ “หยุดข่าวทั้งหมด” เพื่อหยุดได้ทุกเวลา',['รับข่าวดูแลผิว','รับข่าว AI','รับข่าวของใช้ในบ้าน','หยุดข่าวทั้งหมด']));
 const subscription={'รับข่าวดูแลผิว':'mediral','รับข่าว AI':'ai','รับข่าวของใช้ในบ้าน':'home'}[text];
 if(subscription){h.subscriptions[subscription]={at:now,via:'explicit_message'};h.interests[subscription]||={at:now,via:'explicit_preference'};return answer(`บันทึกไว้แล้วค่ะ จะรับเฉพาะข่าว${TOPICS[subscription]}ที่คุณเลือก 🍀\nหากไม่ต้องการรับต่อ พิมพ์ “หยุดข่าวทั้งหมด” ได้เลย`);}
 if(text==='สถานะออเดอร์'&&!order)return answer('ยังไม่มีออเดอร์ในระบบค่ะ ถ้าเคยสั่งผ่านทีม ส่งเลขออเดอร์ให้คนดูแลช่วยตรวจได้เลย');
 if(/^(คุยกับคนดูแล|แอดมิน|ขอลบข้อมูล|สถานะออเดอร์)$/.test(text))return mediral(s,event,order,options);
 const explicit={'คุยเรื่อง Mediral':'mediral','คุยเรื่อง AI':'ai'}[text];
 const collecting=['consent','name','phone','address','confirm'].includes(s.stage);
 // An explicit checkout action owns the current cart even after a conversation
 // about another topic. Topic selection must not swallow consent or reset actions.
 if(!explicit&&((text==='ยืนยันสินค้า'&&Object.keys(s.items||{}).length)||text==='เริ่มใหม่')){
  h.topic='mediral';return mediral(s,event,order,options);
 }
 // A name/address can contain product words. Never classify it as marketing intent.
 let topic=explicit;
 if(!topic&&!collecting&&event.message?.type==='text'){
  const skin=isMediralInquiry(text);
  const ai=/ai[- ]?source|AI ใส่ซอส|เรียน\s*AI|คอร์ส\s*AI|เรียนฟรี/i.test(text);
  if(skin&&ai)return answer('สนใจทั้งสองเรื่องได้เลยค่ะ อยากเริ่มคุยเรื่องไหนก่อน');
  topic=skin?'mediral':ai?'ai':null;
 }
 if(topic){h.topic=topic;h.interests[topic]={at:now,via:'conversation'};}
 if(h.topic==='ai'){
  if(event.message?.type==='image'){s.paused=true;s.reason='ภาพในบทสนทนา AI ให้คนดูแลตรวจ';return answer('ได้รับภาพแล้วค่ะ ให้คนดูแลเรื่อง AI ช่วยตรวจให้ก่อนนะคะ');}
  return answer(`เรื่อง AI ใส่ซอส ดูรายละเอียดและเส้นทางเริ่มเรียนได้ที่\n${SITE}/ai-source/\nถ้าต้องการถามเรื่องสมัครหรือยอดชำระ กดคุยกับคนดูแลได้เลยค่ะ${order&& !['shipped','cancelled'].includes(order.status)?'\nออเดอร์ Mediral เดิมยังอยู่ กลับไปคุยต่อได้โดยกด “คุยเรื่อง Mediral”':''}`);
 }
 if(collecting&&!explicit)return mediral(s,event,order,options);
 if(h.topic==='mediral'){
  // Explicitly returning to a partially filled checkout should show its prompt,
  // never store the navigation command as the recipient's name or address.
  if(explicit&&collecting){const prompts={consent:'กดยินยอมเพื่อกรอกข้อมูลออเดอร์ต่อค่ะ',name:'ขอชื่อ–นามสกุลผู้รับค่ะ',phone:'ขอเบอร์โทรผู้รับค่ะ',address:'ขอที่อยู่จัดส่งพร้อมรหัสไปรษณีย์ค่ะ',confirm:'ข้อมูลที่กรอกไว้ยังอยู่ค่ะ ส่งรายการให้ร้าน หรือเริ่มใหม่เพื่อแก้ไขได้'};return answer(lineText(prompts[s.stage],s.stage==='consent'?['ยินยอมทำรายการ','คุยกับคนดูแล']:s.stage==='confirm'?['ส่งรายการให้ร้าน','เริ่มใหม่']:['คุยกับคนดูแล']));}
  return mediral(s,event,order,options);
 }
 if(event.message?.type==='image'){s.paused=true;s.reason='ภาพยังไม่ทราบสินค้า';return answer('ภาพนี้เกี่ยวกับรายการไหนคะ ให้คนดูแลช่วยตรวจให้ก่อนค่ะ');}
 return answer('บ้าน myClover คัดสิ่งที่น่าใช้และน่าเรียนรู้มาให้ 🍀\nวันนี้อยากคุยเรื่องอะไรคะ');
}
