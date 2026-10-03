import {PRODUCTS,clean,lineText,cartText,money,SITE} from './domain.js';
import {retailPrice,retailAt} from './catalog.js';
import {validateDecision} from './ai-provider.js';

const CHECKOUT=new Set(['consent','name','phone','address','confirm','ordered']);
const COMMANDS=new Set(['คุยเรื่อง Mediral','ดูสินค้า Mediral','Mediral','mediral','เมดิรัล','ยืนยันสินค้า','ยินยอมทำรายการ','ส่งรายการให้ร้าน','เริ่มใหม่','สถานะออเดอร์','แก้ข้อมูลก่อนโอน','ส่งสลิป','คุยกับคนดูแล','ติดต่อทีม','แอดมิน','ขอลบข้อมูล','เลือกข่าวที่สนใจ','รับข่าวดูแลผิว','รับข่าว AI','รับข่าวของใช้ในบ้าน','หยุดข่าวทั้งหมด','ใช้รายการนี้','ไม่ใช้รายการนี้']);
const TOPICS=['mediral','ai','absorb','other'];
const AGE=24*3600000;

// Exclude unsolicited contact/payment details before making a model request.
// This is a best-effort filter, not a guarantee that arbitrary free text is anonymous.
export function privateText(text){
 return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\s().-]*){7,}|(?:บ้านเลขที่|ที่อยู่|รหัสไปรษณีย์|ชื่อผู้รับ|นามสกุล|เลขบัญชี|เลขบัตร|พาสเวิร์ด|password|otp|api.?key)\s*[:：]?|\d+\s*\/\s*\d+|(?:แขวง|ตำบล|อำเภอ|เขต)\s*\S+|(?:ผม|ฉัน|ดิฉัน|หนู)ชื่อ\s*\S+|(?:^|\s)(?:sk-|U[0-9a-f]{32})/i.test(text);
}
export function eligibleForAI(state,event,order){
 return event.type==='message'&&event.source?.type==='user'&&event.message?.type==='text'&&!state?.paused&&!CHECKOUT.has(state?.stage)&&(!order||['shipped','cancelled'].includes(order.status))&&!COMMANDS.has(clean(event.message.text,1800));
}
function historyRecords(state,now){
 if(!state?.ai?.at||now-state.ai.at>AGE)return [];
 return (Array.isArray(state.ai.history)?state.ai.history:[]).filter(x=>['user','assistant'].includes(x?.role)&&Number.isFinite(x.at)&&x.at<=now&&now-x.at<=AGE&&typeof x.content==='string'&&!privateText(x.content)).slice(-8).map(x=>({role:x.role,content:clean(x.content,900),at:x.at}));
}
export function historyForAI(state,now){
 return historyRecords(state,now).map(({role,content})=>({role,content}));
}
export function contextForAI(state,text,now){
 return {topic:TOPICS.includes(state?.house?.topic)?state.house.topic:'other',focus:Object.hasOwn(PRODUCTS,state?.productFocus)?state.productFocus:'none',
  cart:Object.entries(state?.items||{}).filter(([k,q])=>Object.hasOwn(PRODUCTS,k)&&Number.isInteger(q)&&q>0&&q<=5).map(([sku,quantity])=>({sku,quantity})),
  conversation:historyForAI(state,now),message:clean(text,1200)};
}
export function privateReply(state){
 const s=structuredClone(state||{});s.paused=true;s.reason='ได้รับข้อมูลส่วนตัวนอกขั้นตอนสั่งซื้อ';delete s.ai;
 return {state:s,order:null,messages:[lineText('ได้รับข้อมูลแล้วค่ะ ให้คนดูแลช่วยตรวจในแชทนี้ก่อนนะคะ ข้อมูลส่วนนี้จะไม่ส่งเข้า AI') ]};
}
export function healthHandoff(state,text){
 const value=text.replace(/ผิวแพ้ง่าย|กลัวแพ้|ไม่มีผื่น|ไม่แพ้|ไม่แสบ|ไม่คัน|ไม่บวม/g,'');
 if(!/(?:ใช้|ทา).*(?:แล้ว|เกิด).*(?:แพ้|ผื่น|คัน|แสบ|บวม)|(?:ฉัน|ผม|หนู|เรา).*(?:เป็นโรค|ป่วย)|หายใจไม่ออก|หน้าบวม|ตั้งครรภ์|ให้นม|(?:กิน|ทา)ยา|หยุดยา|แทนยา/.test(value))return null;
 const s=structuredClone(state||{});s.paused=true;s.reason='คำถามสุขภาพ ให้คนดูแลตรวจ';delete s.ai;
 return {state:s,order:null,messages:[lineText(/หายใจไม่ออก|หน้าบวม/.test(value)?'หากมีหน้าบวมหรือหายใจไม่ออก ให้ไปพบแพทย์ฉุกเฉินทันทีนะคะ ส่งต่อให้คนดูแลช่วยรับเรื่องแล้วค่ะ':'เรื่องอาการหรือการใช้ร่วมกับการรักษา ให้คนดูแลช่วยตรวจข้อมูลก่อนนะคะ ถ้าใช้แล้วมีผื่นหรือแสบ ให้หยุดใช้และปรึกษาแพทย์หรือเภสัชกรค่ะ')]};
}
export function aiUnavailable(state,code='AI_UNAVAILABLE'){
 const s=structuredClone(state||{});s.paused=true;s.reason='AI ตอบไม่ได้ ให้คนดูแลรับช่วง';
 s.aiFailure={at:Date.now(),code:['AI_LIMIT','AI_NOT_CONFIGURED','AI_INVALID_OUTPUT'].includes(code)?code:'AI_UNAVAILABLE'};
 return {state:s,order:null,messages:[lineText('ตอนนี้ผู้ช่วย AI ตอบไม่ได้ชั่วคราวค่ะ ส่งต่อให้คนดูแลช่วยคุยต่อแล้ว ฝากคำถามไว้ในแชทนี้ได้เลยนะคะ')]};
}
function allowedReply(text,now){
 const RETAIL=retailAt(now);
 if(privateText(text))return false;
 const prices=new Set([RETAIL.regular/100,(RETAIL.regular-RETAIL.unit)/100,RETAIL.unit/100,RETAIL.set/100,(5*RETAIL.unit-RETAIL.set)/100]);
 // Any computed quantity quote must still derive from the public catalog.
 for(let count=1;count<=25;count++)for(let sets=0;sets<=Math.min(5,Math.floor(count/5));sets++)prices.add((sets*RETAIL.set+(count-5*sets)*RETAIL.unit)/100);
 if([...text.matchAll(/([0-9][0-9,]*(?:\.\d+)?)\s*บาท|฿\s*([0-9][0-9,]*(?:\.\d+)?)/g)].some(m=>!prices.has(Number((m[1]||m[2]).replaceAll(',','')))))return false;
 // Only our approved public destinations. No model-authored payment links/accounts.
 const links=text.match(/https?:\/\/[^\s<>]+/gi)||[];
 return links.every(link=>{try{const u=new URL(link);return u.protocol==='https:'&&u.hostname==='www.myclover.com'&&!u.search&&!u.hash&&/^\/(?:mediral\/(?:cl\/|ac\/|br\/|su\/|po\/|privacy\/)?|ai-source\/|absorb\/)$/.test(u.pathname);}catch{return false;}})&&!/(?:ยืนยัน|ได้รับ|รับ)ชำระแล้ว|เงินเข้าแล้ว|โอน(?:เงิน)?(?:มา|เข้า|ได้เลย)|หายขาด|หายแน่นอน|รักษา(?:สิว|ฝ้า|โรค).*100|ส่งฟรี|มีของพร้อมส่ง/.test(text);
}
export function applyAIDecision(state,text,response,now){
 const d=validateDecision(response.decision),s=structuredClone(state||{});
 if(d.action!=='propose_cart'&&!allowedReply(d.reply,now))return aiUnavailable(state,'AI_INVALID_OUTPUT');
 s.house||={topic:null,interests:{},subscriptions:{}};s.house.topic=d.topic;
 delete s.aiFailure;
 if(d.focus!=='none')s.productFocus=d.focus;else delete s.productFocus;
 // Keep conversation context without turning model inference into marketing consent/tags.
 const history=[...historyRecords(s,now),{role:'user',content:clean(text,900),at:now}];
 let reply=d.reply,buttons=d.topic==='mediral'?['ดูส่วนผสม','วิธีใช้','คุยกับคนดูแล']:['คุยกับคนดูแล'];
 if(d.action==='propose_cart'){
  const items=Object.fromEntries(d.items.map(x=>[x.sku,x.quantity]));
  s.aiProposal={items,at:now};
  reply=`จัดรายการนี้ให้ตรวจดูก่อนนะคะ 🍀\n${cartText(items)}\nรวมสินค้า ${money(retailPrice(items,now).subtotal)} บาท ยังไม่รวมค่าส่ง\nใช้รายการนี้เพื่อสั่งซื้อต่อไหมคะ?`;
  buttons=['ใช้รายการนี้','ไม่ใช้รายการนี้','คุยกับคนดูแล'];
 }else{
  delete s.aiProposal;
  if(d.action==='handoff'){
   s.paused=true;s.reason=({health:'คำถามสุขภาพ ให้คนดูแลตรวจ',unknown_product:'คำถามสินค้าที่ข้อมูลยังไม่ครบ',staff:'ลูกค้าขอคุยกับคนดูแล',none:'AI ขอให้คนดูแลตรวจ'})[d.handoff_reason];
   reply+='\nส่งต่อให้คนดูแลช่วยคุยต่อในแชทนี้แล้วค่ะ';buttons=[];
  }
 }
 history.push({role:'assistant',content:clean(reply,900),at:now});
 const first=!s.ai?.disclosed;
 s.ai={at:now,disclosed:true,history:history.slice(-8),model:response.model,lastUsage:response.usage};
 if(first)reply+=`\n\nตอบโดยผู้ช่วย AI ของ myClover · คุยกับคนดูแลได้เสมอ\nข้อมูลการใช้แชท: ${SITE}/mediral/privacy/`;
 return {state:s,order:null,messages:[lineText(reply,buttons)]};
}
export function confirmAIProposal(state,text,now){
 if(!['ใช้รายการนี้','ไม่ใช้รายการนี้'].includes(text))return null;
 const s=structuredClone(state||{}),p=s.aiProposal;delete s.aiProposal;
 if(text==='ไม่ใช้รายการนี้')return {state:s,order:null,messages:[lineText('ได้ค่ะ อยากปรับเป็นชิ้นไหนหรือมีอะไรที่อยากรู้เพิ่ม พิมพ์มาได้เลยค่ะ')]};
 if(s.paused||CHECKOUT.has(s.stage)||!p||now-p.at>15*60000)return {state:s,order:null,messages:[lineText('รายการที่เสนอหมดอายุหรือมีรายการอื่นกำลังทำอยู่ค่ะ บอกสินค้าที่ต้องการอีกครั้งได้เลย')]};
 try{retailPrice(p.items,now);}catch{return aiUnavailable(state,'AI_INVALID_OUTPUT');}
 s.stage='cart';s.items=p.items;s.house||={interests:{},subscriptions:{}};s.house.topic='mediral';
 return {state:s,order:null,messages:[lineText(`เลือกไว้แล้วค่ะ 🍀\n${cartText(s.items)}\nรวมสินค้า ${money(retailPrice(s.items,now).subtotal)} บาท ยังไม่รวมค่าส่ง\nกดยืนยันสินค้าเพื่อกรอกข้อมูลจัดส่ง ร้านจะเช็กของและแจ้งยอดก่อนโอน`,['ยืนยันสินค้า','เริ่มใหม่','คุยกับคนดูแล'])]};
}
