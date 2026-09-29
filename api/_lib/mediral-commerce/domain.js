import {createHmac, timingSafeEqual, randomUUID} from 'node:crypto';
import {retailPrice} from './catalog.js';
export const PRODUCTS = {CL:'มูสโฟมล้างหน้า',AC:'เซรั่มขวดขาว',BR:'เซรั่มขวดเหลืองเขียว',SU:'เซรั่มกันแดด',PO:'แป้งพัฟตลับเขียว'};
// The owner explicitly selected the existing, public AI Sauce receiving account.
export const BANK = {code:'004',name:'ธนาคารกสิกรไทย (KBank)',number:'0493864300',owner:'นรินทร์ ลีลาภรณ์'};
export const SITE = 'https://www.myclover.com';
export const clean = (s,n=1000) => typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
export const same = (a,b) => {a=Buffer.from(String(a||''));b=Buffer.from(String(b||''));return a.length===b.length&&timingSafeEqual(a,b);};
export const hmac = (s,key) => createHmac('sha256',key).update(s).digest('base64');
export const money = n => (n/100).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
export class Fault extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status;}}
export function amount(s) {if(!/^\d{1,6}(\.\d{1,2})?$/.test(String(s)))throw new Fault('INVALID_AMOUNT');const [a,b='']=String(s).split('.');return Number(a)*100+Number(b.padEnd(2,'0'));}
export const lineText = (text,buttons=[]) => ({type:'text',text:text.slice(0,4900),...(buttons.length?{quickReply:{items:buttons.slice(0,13).map(label=>({type:'action',action:{type:'message',label:label.slice(0,20),text:label}}))}}:{})});
const menu = () => lineText('เลือก Mediral ที่อยากใช้ได้เลยค่ะ 🍀\nชิ้นละ 399 บาท · ครบชุด 5 ชิ้น 1,899 บาท\nไม่มีของแถม ค่าส่งและของพร้อมส่งจะยืนยันก่อนโอน',['ชุด 5 ชิ้น',...Object.values(PRODUCTS),'คุยกับคนดูแล']);
export function cartText(items){return Object.entries(items).map(([id,qty])=>`${PRODUCTS[id]} × ${qty}`).join('\n');}
export function summary(o){return `${o.id}\n${cartText(o.items)}\n\nผู้รับ: ${o.name}\nโทร: ${o.phone}\n${o.address}`;}
export function paymentMessage(o){return lineText(`${summary(o)}\n\nสินค้า ${money(o.subtotal)} บาท\nค่าส่ง ${money(o.shipping)} บาท\nรวมโอน ${money(o.total)} บาท\n\n${BANK.name}\n${BANK.number}\n${BANK.owner}\nชำระภายใน ${new Date(o.expiresAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}\nกรุณาตรวจชื่อบัญชี ยอด และที่อยู่ก่อนโอน แล้วส่งภาพสลิปในแชทนี้\nคำสั่งซื้อนี้มีผลเมื่อเรายืนยันรับชำระ`,['ส่งสลิป','แก้ข้อมูลก่อนโอน','คุยกับคนดูแล']);}
export function reducer(state,event,order,{now=Date.now(),id=()=>`MD-${randomUUID().replaceAll('-','').slice(0,16).toUpperCase()}`}={}){
 const s=structuredClone(state||{});let o=order?structuredClone(order):null;const text=clean(event.message?.text,1800);const reply=(text,buttons)=>({state:s,order:o,messages:[typeof text==='string'?lineText(text,buttons):text]});
 if(event.type==='unfollow'){s.paused=true;return {state:s,order:o,messages:[]};}
 if(event.source?.type!=='user')return {state:s,order:o,messages:[]};
 if(/^(คุยกับคนดูแล|แอดมิน|ขอลบข้อมูล)$/.test(text)){s.paused=true;s.reason=text;return reply(text==='ขอลบข้อมูล'?'รับคำขอแล้วค่ะ คนดูแลจะตรวจและติดต่อกลับเพื่อจัดการข้อมูลของคุณ':'ส่งต่อให้คนดูแลแล้วค่ะ บอทจะพักตอบในระหว่างนี้');}
 if(s.paused)return {state:s,order:o,messages:[]};
 // This is a shared OA: do not hijack AI Sauce or unrelated conversations.
 if(!s.stage&&!s.orderId&&!/mediral|เมดิรัล|สั่งชุด/i.test(text)&&text!=='ชุด 5 ชิ้น'&&!Object.values(PRODUCTS).includes(text))return {state:s,order:o,messages:[]};
 if(text==='สถานะออเดอร์'){return reply(o?`${o.id}\n${({awaiting_quote:'รอยืนยันสินค้าและค่าส่ง',awaiting_payment:'รอชำระเงิน',payment_review:'รอตรวจยอดโอน',paid:'รับชำระแล้ว รอจัดส่ง',packing:'กำลังจัดสินค้า',shipped:'จัดส่งแล้ว',cancelled:'ยกเลิกแล้ว'})[o.status]}${o.tracking?`\n${o.carrier}: ${o.tracking}`:''}`:'ยังไม่มีออเดอร์ค่ะ',['คุยกับคนดูแล']);}
 if(o&&['awaiting_quote','awaiting_payment','payment_review','paid','packing'].includes(o.status)){
  if(text==='แก้ข้อมูลก่อนโอน'&&['awaiting_quote','awaiting_payment'].includes(o.status)){s.paused=true;s.reason='แก้ข้อมูลออเดอร์';return reply('ให้คนดูแลช่วยแก้ข้อมูลก่อนนะคะ กรุณายังไม่โอนยอดเดิม',['คุยกับคนดูแล']);}
  if(event.message?.type==='image'&&o.status==='awaiting_payment')return {...reply('ได้รับสลิปแล้ว กำลังตรวจรายการค่ะ'),verifyImage:event.message.id};
  if(o.status==='awaiting_payment')return reply(now<o.expiresAt?paymentMessage(o):'รายการนี้หมดเวลาชำระแล้วค่ะ กรุณาคุยกับคนดูแลเพื่อยืนยันสินค้าและยอดใหม่',['คุยกับคนดูแล']);
  return reply(o.status==='awaiting_quote'?'ได้รับรายการแล้วค่ะ คนดูแลจะยืนยันสินค้า ราคา และค่าส่งก่อนแจ้งยอดโอน':o.status==='payment_review'?'รายการอยู่ระหว่างตรวจยอดค่ะ ยังไม่ต้องส่งซ้ำหรือโอนเพิ่ม':'รับชำระแล้วค่ะ เตรียมจัดส่งให้ตามออเดอร์',['สถานะออเดอร์','คุยกับคนดูแล']);
 }
 if(event.message?.type==='image'){s.paused=true;s.reason='ภาพนอกขั้นตอนชำระ';return reply('ได้รับภาพแล้วค่ะ ให้คนดูแลช่วยตรวจให้ก่อนนะคะ');}
 if(text==='เริ่มใหม่'){s.stage='cart';s.items={};delete s.name;delete s.phone;delete s.address;return reply(menu());}
 if(!s.stage||s.stage==='cart'){
  s.stage='cart';s.items||={};let selected;
  if(/^(ชุด 5 ชิ้น|สั่งชุด|สนใจสั่ง Mediral ชุดดูแลผิว 5 ชิ้น)/.test(text))s.items=Object.fromEntries(Object.keys(PRODUCTS).map(k=>[k,1]));
  else if((selected=Object.keys(PRODUCTS).find(k=>text===PRODUCTS[k])))s.items[selected]=Math.min(5,(s.items[selected]||0)+1);
  else if(text==='ยืนยันสินค้า'&&Object.keys(s.items).length){s.stage='consent';return reply(`เราขอชื่อ เบอร์โทร และที่อยู่เพื่อรับออเดอร์และจัดส่ง สลิปจะส่งให้ EasySlip ตรวจธุรกรรมเมื่อเปิดบริการ ข้อมูลไม่ใช้สมัครโฆษณาและไม่ส่งให้ AI\nรายละเอียด: ${SITE}/mediral/privacy/\nยินยอมให้ใช้ข้อมูลเพื่อทำรายการนี้ไหมคะ`,['ยินยอมทำรายการ','คุยกับคนดูแล']);}
  else if(/(สารสกัด|ส่วนผสม|วิธีใช้|กันแดด|สิว|แพ้)/.test(text))return reply(`ดูข้อมูลแต่ละชิ้นและส่วนผสมได้ที่ ${SITE}/mediral/\nถ้าอยากให้ช่วยเลือกหรือมีอาการแพ้ ให้คนดูแลช่วยตอบเป็นรายกรณีนะคะ`,['คุยกับคนดูแล','ชุด 5 ชิ้น']);
  else return reply(menu());
  return reply(`ชิ้นที่เลือก 🍀\n${cartText(s.items)}\nราคาสินค้า ${money(retailPrice(s.items).subtotal)} บาท ยังไม่รวมค่าส่ง\nกดสินค้าอีกครั้งเพื่อเพิ่มจำนวน (สูงสุด 5 ต่อชนิด)\nคนดูแลจะเช็กของและแจ้งยอดก่อนรับเงิน`,['ยืนยันสินค้า','เริ่มใหม่',...Object.values(PRODUCTS)]);
 }
 if(s.stage==='consent'){if(text!=='ยินยอมทำรายการ')return reply('กดยินยอมเพื่อเริ่มกรอกข้อมูล หรือคุยกับคนดูแลได้ค่ะ',['ยินยอมทำรายการ','คุยกับคนดูแล']);s.consentAt=now;s.stage='name';return reply('ขอชื่อ–นามสกุลผู้รับค่ะ');}
 if(s.stage==='name'){if(text.length<2||text.length>120)return reply('กรุณาส่งชื่อผู้รับ ความยาวไม่เกิน 120 ตัวอักษรค่ะ');s.name=text;s.stage='phone';return reply('ขอเบอร์โทรผู้รับสำหรับจัดส่งค่ะ');}
 if(s.stage==='phone'){const phone=text.replace(/[\s-]/g,'');if(!/^(?:0\d{8,9}|\+66\d{8,9})$/.test(phone))return reply('กรุณาตรวจเบอร์โทรผู้รับอีกครั้งค่ะ');s.phone=phone;s.stage='address';return reply('ขอที่อยู่จัดส่ง พร้อมตำบล/แขวง อำเภอ/เขต จังหวัด และรหัสไปรษณีย์ 5 หลักค่ะ');}
 if(s.stage==='address'){if(text.length<15||text.length>800||!/(?:^|\D)\d{5}(?:\D|$)/.test(text))return reply('ขอที่อยู่ให้ครบพร้อมรหัสไปรษณีย์ 5 หลักอีกครั้งค่ะ');s.address=text;s.stage='confirm';return reply(`ตรวจข้อมูลก่อนส่งค่ะ\n${cartText(s.items)}\n${s.name}\n${s.phone}\n${s.address}\nยังไม่มีการเรียกเก็บเงิน`,['ส่งรายการให้ร้าน','เริ่มใหม่']);}
 if(s.stage==='confirm'){if(text!=='ส่งรายการให้ร้าน')return reply('กดส่งรายการ หรือเริ่มใหม่เพื่อแก้ข้อมูลค่ะ',['ส่งรายการให้ร้าน','เริ่มใหม่']);o={id:id(),items:s.items,name:s.name,phone:s.phone,address:s.address,consentAt:s.consentAt,status:'awaiting_quote',createdAt:now,history:[{at:now,action:'submitted'}]};s.orderId=o.id;s.stage='ordered';delete s.name;delete s.phone;delete s.address;delete s.items;return reply(`รับรายการ ${o.id} แล้วค่ะ 🍀\nคนดูแลจะเช็กสินค้า ราคา และค่าส่ง แล้วส่งสรุปให้ก่อนโอน`,['สถานะออเดอร์','คุยกับคนดูแล']);}
 s.stage='cart';return reply(menu());
}
export function quote(order,body,now){
 if(order.status!=='awaiting_quote')throw new Fault('ORDER_NOT_QUOTABLE',409);
 if(body.stockConfirmed!==true)throw new Fault('CONFIRM_STOCK_FIRST');
 const prices={};let subtotal=0;for(const [sku,qty] of Object.entries(order.items)){const p=amount(body.prices?.[sku]);if(p<=0)throw new Fault('INVALID_PRICE');prices[sku]=p;subtotal+=p*qty;}
 const retail=body.useRetailPricing===true?retailPrice(order.items):null;
 if(retail)subtotal=retail.subtotal;
 const shipping=amount(body.shipping);if(subtotal+shipping>10000000)throw new Fault('TOTAL_TOO_HIGH');
 return {...order,prices:retail?.prices||prices,discount:retail?.discount||0,subtotal,shipping,total:subtotal+shipping,status:'awaiting_payment',quotedAt:now,expiresAt:now+24*3600000,history:[...order.history,{at:now,action:'quoted'}]};
}
export function inspectSlip(result,order,now){
 const fail=reason=>({ok:false,reason});if(result?.success!==true)return fail('PROVIDER_UNAVAILABLE_OR_INVALID');const d=result.data,a=d?.matchedAccount,r=d?.rawSlip;
 if(d?.isDuplicate!==false)return fail('DUPLICATE_OR_UNKNOWN');
 if(a?.bank?.code!==BANK.code||String(a?.bankNumber||'').replace(/[-\s]/g,'')!==BANK.number)return fail('RECEIVER_MISMATCH');
 if(d.isAmountMatched!==true)return fail('AMOUNT_MISMATCH');try{if(amount(d.amountInSlip)!==order.total||amount(r?.amount?.amount)!==order.total)return fail('AMOUNT_MISMATCH');}catch{return fail('AMOUNT_MISMATCH');}
 const at=Date.parse(r?.date);if(!Number.isFinite(at)||at<order.quotedAt||at>order.expiresAt||at>now+60000||now>order.expiresAt+15*60000)return fail('TIME_MISMATCH');
 if(r.countryCode!=='TH'||r.amount?.local?.currency!=='THB'||r.receiver?.bank?.id!==BANK.code)return fail('BANK_OR_CURRENCY_MISMATCH');
 if(!/^[A-Za-z0-9._:/-]{6,120}$/.test(r.transRef||''))return fail('MISSING_TRANSACTION');
 return {ok:true,transRef:r.transRef.toUpperCase(),amount:order.total,transferredAt:at,receiver:BANK.number};
}
