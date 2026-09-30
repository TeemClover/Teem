import {createHmac, timingSafeEqual, randomUUID} from 'node:crypto';
import {retailPrice,RETAIL} from './catalog.js';
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
const menu = () => lineText('กดชื่อสินค้าเพื่อดูข้อมูลก่อนสั่งได้เลยค่ะ 🍀\nชิ้นละ 399 บาท · ครบชุด 5 ชิ้น 1,899 บาท\nค่าส่งและของพร้อมส่งจะยืนยันก่อนโอน',['สั่งชุด 5 ชิ้น',...Object.values(PRODUCTS),'คุยกับคนดูแล']);
const normalizeInquiry = text => clean(text,1800).toLowerCase().replace(/เซรั้ม|เซรัม|เซรม|เชรั่ม|เชรั้ม|serum/gi,'เซรั่ม');
const productPatterns={
 CL:/มูส|โฟม|คลีนเซอร์|(?:อยาก|หา|สนใจ|สั่ง|ซื้อ|เอา)?(?:ตัว)?ล้างหน้า/,
 AC:/ขวดขาว|เซรั่มสิว|สิว|หน้ามัน|ผิวมัน|ความมัน/,
 BR:/ขวดเหลือง|เหลืองเขียว|เซรั่มหน้าใส|หน้าใส|หมอง|สีผิวไม่สม่ำเสมอ|แบร์เบอร์รี่|แบร์เบอรี่|แบรเบอร์รี่/,
 SU:/กันแดด|spf|ยูวี|\buv\b/,
 PO:/แป้ง|พัฟ|พัพ|ตลับเขียว/
};
// These summaries deliberately stay within the cosmetic roles and ingredients in
// mediral/data/details.json. No diagnosis, treatment guarantee or inferred health tag.
const productInfo={
 CL:{lead:'มูสโฟมล้างหน้าช่วยล้างคราบมันและเครื่องสำอาง ฟองนุ่ม ให้ผิวรู้สึกสะอาด สดชื่น ไม่แห้งตึงค่ะ',ingredients:'มีส่วนผสมจากชบา ลิลลี่ ชาเขียว และว่านหางจระเข้ตามข้อมูล Mediral',use:'ใช้ล้างหน้าและเครื่องสำอางตามวิธีบนฉลาก แล้วล้างน้ำให้สะอาดก่อนบำรุงผิวค่ะ'},
 AC:{lead:'เซรั่มขวดขาวเน้นดูแลผิวเป็นสิวง่ายและความมัน เนื้อบางเบา พร้อมเติมความชุ่มชื้นค่ะ',ingredients:'มีทีทรี เปลือกมังคุด ซิงค์ พีซีเอ และไฮยาตามข้อมูล Mediral',use:'ใช้บำรุงหลังล้างหน้า ตามวิธีบนฉลาก หากใช้ทั้งสองเซรั่ม เริ่มขวดขาวแล้วตามด้วยขวดเหลืองเขียวค่ะ'},
 BR:{lead:'เซรั่มแบร์เบอร์รี่ ขวดเหลืองเขียว เน้นดูแลความหมองคล้ำและสีผิวที่ดูไม่สม่ำเสมอ เนื้อบางเบา เกลี่ยง่ายค่ะ',ingredients:'มีแบร์เบอร์รี่ ชะเอมเทศ และอนุพันธ์วิตามินซีตามข้อมูล Mediral',use:'ใช้บำรุงหลังล้างหน้า ตามวิธีบนฉลาก หากใช้คู่กับขวดขาว ให้ตามหลังขวดขาว และใช้กันแดดในตอนกลางวันค่ะ'},
 SU:{lead:'กันแดดเนื้อเซรั่ม SPF 50 PA+++ ตามที่ Mediral ระบุ เนื้อบางเบา เกลี่ยง่าย พร้อมบำรุงความชุ่มชื้นค่ะ',ingredients:'มี Zinc Oxide, Titanium Dioxide, ไฮยา และกลุ่มพืช Giga White® ตามข้อมูล Mediral',use:'ใช้หลังขั้นบำรุงและก่อนแต่งหน้า โดยดูปริมาณและวิธีทาซ้ำบนฉลากของหลอดที่ได้รับค่ะ'},
 PO:{lead:'แป้งพัฟตลับเขียวช่วยปกปิดรอยให้ผิวดูเนียน เนื้อละเอียด บางเบา เกลี่ยง่ายค่ะ',ingredients:'มีโซเดียมไฮยาลูรอเนต ว่านหางจระเข้ และโรสฮิปตามข้อมูล Mediral',use:'ใช้แต่งผิวหลังขั้นบำรุงและกันแดด เลือกเฉดให้เหมาะกับผิว และล้างออกเมื่อจบวันค่ะ'}
};
const sensitiveSkin = /(?:ผิว)?แพ้ง่าย|ระคายเคืองง่าย|ผิวบอบบาง|กลัว(?:จะ)?แพ้|แพ้(?:ไหม|มั้ย)/g;
export function isMediralInquiry(text){const value=normalizeInquiry(text);return /mediral|เมดิรัล|เซรั่ม|ดูแลผิว|แพ้|ผื่น|แสบหน้า|ระคายเคือง|ผิวบอบบาง|รักษาสิว|สั่งชุด|ชุด\s*5\s*ชิ้น/.test(value)||Object.values(productPatterns).some(pattern=>pattern.test(value));}
const purchaseLabels={CL:'สั่งมูสล้างหน้า',AC:'สั่งเซรั่มขวดขาว',BR:'สั่งขวดเหลืองเขียว',SU:'สั่งกันแดด',PO:'สั่งแป้งพัฟ'};
const focusButtons = sku => [purchaseLabels[sku],'วิธีใช้','ส่วนผสม'];
function productAnswer(s,sku,kind='intro'){
 s.productFocus=sku;delete s.inquiry;
 const info=productInfo[sku],link=`${SITE}/mediral/${sku.toLowerCase()}/`;
 if(kind==='price')return lineText(`${PRODUCTS[sku]} ชิ้นละ ${RETAIL.unit/100} บาทค่ะ\nถ้าต้องการสั่ง กดปุ่มด้านล่างได้เลย เราจะยืนยันของและค่าส่งก่อนโอนค่ะ`,focusButtons(sku));
 if(kind==='use')return lineText(`${info.use}\nดูรายละเอียด: ${link}`,focusButtons(sku));
 if(kind==='ingredients')return lineText(`${PRODUCTS[sku]} ${info.ingredients}\nดูส่วนผสมทั้งหมด: ${link}`,focusButtons(sku));
 return lineText(`${info.lead}\n${info.ingredients}\n\nชิ้นละ ${RETAIL.unit/100} บาท ค่าส่งและของพร้อมส่งยืนยันก่อนโอนค่ะ`,focusButtons(sku));
}
function serumQuestion(s){s.inquiry='serum';delete s.productFocus;return lineText('เซรั่มบำรุงมี 2 ขวดค่ะ 🍀\nขวดขาว: ดูแลผิวเป็นสิวง่ายและความมัน\nขวดเหลืองเขียว: ดูแลความหมองคล้ำ\n\nอยากเน้นดูแลเรื่องไหนคะ?',['ผิวเป็นสิวง่าย','หน้าหมอง','เทียบเซรั่มสองขวด']);}
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
 if(!s.stage&&!s.orderId&&!isMediralInquiry(text))return {state:s,order:o,messages:[]};
 const collecting=['consent','name','phone','address','confirm'].includes(s.stage);
 const reactionText=text.replace(sensitiveSkin,'').replace(/ไม่มีผื่น|ไม่แพ้|ไม่แสบ|ไม่คัน|ไม่บวม/g,'');
 const activeReaction=/^(?:ใช้|ทา).*(?:แล้ว|เกิด).*(?:แพ้|ผื่น|คัน|แสบ|บวม)|^(?:หน้าบวม|หายใจไม่ออก)/.test(reactionText);
 if((!collecting||activeReaction)&&/(?:ใช้|ทา).*(?:แล้ว|เกิด).*(?:แพ้|ผื่น|คัน|แสบ|บวม)|(?:แพ้|ผื่น|แสบหน้า|หน้าบวม|หายใจไม่ออก)|รักษา(?:สิว|ฝ้า)|(?:กิน|ทา)ยา|แทนยา|หยุดยา|ตั้งครรภ์|ให้นม/.test(reactionText)){
  s.paused=true;s.reason='คำถามอาการหรือการใช้ร่วมกับการรักษา';
  return reply(/หายใจไม่ออก|หน้าบวม/.test(text)?'ถ้ามีหน้าบวมหรือหายใจไม่ออก ให้ไปพบแพทย์ฉุกเฉินทันทีนะคะ ส่งต่อให้คนดูแลแล้วค่ะ':'เรื่องอาการแพ้หรือการใช้ร่วมกับการรักษา ให้คนดูแลช่วยตรวจข้อมูลก่อนนะคะ หากใช้แล้วมีผื่นหรือแสบ ให้หยุดใช้และปรึกษาแพทย์หรือเภสัชกรค่ะ บอทจะพักตอบระหว่างนี้');
 }
 if(text==='สถานะออเดอร์'){return reply(o?`${o.id}\n${({awaiting_quote:'รอยืนยันสินค้าและค่าส่ง',awaiting_payment:'รอชำระเงิน',payment_review:'รอตรวจยอดโอน',paid:'รับชำระแล้ว รอจัดส่ง',packing:'กำลังจัดสินค้า',shipped:'จัดส่งแล้ว',cancelled:'ยกเลิกแล้ว'})[o.status]}${o.tracking?`\n${o.carrier}: ${o.tracking}`:''}`:'ยังไม่มีออเดอร์ค่ะ',['คุยกับคนดูแล']);}
 if(o&&['awaiting_quote','awaiting_payment','payment_review','paid','packing'].includes(o.status)){
  if(text==='แก้ข้อมูลก่อนโอน'&&['awaiting_quote','awaiting_payment'].includes(o.status)){s.paused=true;s.reason='แก้ข้อมูลออเดอร์';return reply('ให้คนดูแลช่วยแก้ข้อมูลก่อนนะคะ กรุณายังไม่โอนยอดเดิม',['คุยกับคนดูแล']);}
  if(event.message?.type==='image'&&o.status==='awaiting_payment')return {...reply('ได้รับสลิปแล้ว กำลังตรวจรายการค่ะ'),verifyImage:event.message.id};
  if(o.status==='awaiting_payment')return reply(now<o.expiresAt?paymentMessage(o):'รายการนี้หมดเวลาชำระแล้วค่ะ กรุณาคุยกับคนดูแลเพื่อยืนยันสินค้าและยอดใหม่',['คุยกับคนดูแล']);
  return reply(o.status==='awaiting_quote'?'ได้รับรายการแล้วค่ะ คนดูแลจะยืนยันสินค้า ราคา และค่าส่งก่อนแจ้งยอดโอน':o.status==='payment_review'?'รายการอยู่ระหว่างตรวจยอดค่ะ ยังไม่ต้องส่งซ้ำหรือโอนเพิ่ม':'รับชำระแล้วค่ะ เตรียมจัดส่งให้ตามออเดอร์',['สถานะออเดอร์','คุยกับคนดูแล']);
 }
 if(event.message?.type==='image'){s.paused=true;s.reason='ภาพนอกขั้นตอนชำระ';return reply('ได้รับภาพแล้วค่ะ ให้คนดูแลช่วยตรวจให้ก่อนนะคะ');}
 // A clear question during checkout is not the recipient's name/address.
 // Keep classification bounded so actual names and addresses containing product words survive.
 if(collecting&&/^(?:ราคา(?:เท่าไหร่|เท่าไร)?|ส่วนผสม|สารสกัด|วิธีใช้|ใช้ยังไง|ใช้ตอนไหน)(?:คะ|ค่ะ|ครับ|\?)?$/.test(text.replace(/\s/g,''))){
  const sku=s.productFocus||(Object.keys(s.items||{}).length===1?Object.keys(s.items)[0]:null);
  const info=/ราคา/.test(text)?`รวมสินค้า ${money(retailPrice(s.items||{}).subtotal)} บาท ยังไม่รวมค่าส่งค่ะ`:sku?productAnswer(s,sku,/ส่วนผสม|สารสกัด/.test(text)?'ingredients':'use').text:`ดูส่วนผสมและวิธีใช้แต่ละชิ้นได้ที่ ${SITE}/mediral/`;
  const prompts={consent:'ยินยอมให้ใช้ข้อมูลเพื่อทำรายการนี้ไหมคะ?',name:'ขอชื่อ–นามสกุลผู้รับเพื่อทำรายการต่อค่ะ',phone:'ขอเบอร์โทรผู้รับเพื่อทำรายการต่อค่ะ',address:'ขอที่อยู่จัดส่งพร้อมรหัสไปรษณีย์เพื่อทำรายการต่อค่ะ',confirm:'ข้อมูลเดิมยังอยู่ค่ะ กดส่งรายการให้ร้านเมื่อพร้อม'};
  return reply(`${info}\n\n${prompts[s.stage]}`,s.stage==='consent'?['ยินยอมทำรายการ','คุยกับคนดูแล']:s.stage==='confirm'?['ส่งรายการให้ร้าน','เริ่มใหม่']:['คุยกับคนดูแล']);
 }
 if(text==='เริ่มใหม่'){s.stage='cart';s.items={};delete s.name;delete s.phone;delete s.address;delete s.productFocus;delete s.inquiry;return reply(menu());}
 if(!s.stage||s.stage==='cart'){
  s.stage='cart';s.items||={};
  const value=normalizeInquiry(text),named=Object.keys(productPatterns).filter(sku=>productPatterns[sku].test(value));
  if(text.match(sensitiveSkin))return reply('ผิวแต่ละคนตอบสนองต่างกันค่ะ ยังรับรองว่าใช้แล้วจะไม่แพ้ไม่ได้\nตรวจส่วนผสมก่อนเลือกใช้ หรือให้คนดูแลช่วยเช็กข้อมูลได้เลยค่ะ',s.productFocus?['ส่วนผสม','คุยกับคนดูแล']:['เซรั่มขวดขาว','เซรั่มขวดเหลืองเขียว','คุยกับคนดูแล']);
  const wantsInfo=/(?:ราคา|เท่าไหร่|เท่าไร|ต่างกัน|เทียบ|ไหม|มั้ย|อะไร|ไหน|วิธีใช้|ใช้ยังไง|ทายังไง|ใช้ตอนไหน|ส่วนผสม|สารสกัด|สรรพคุณ|สั่งยังไง|ซื้อแล้ว|สั่งแล้ว|สั่งไปแล้ว)/.test(value);
  const buying=/^(?:สนใจ)?(?:ขอ)?(?:สั่ง(?:ซื้อ)?|ซื้อ|เอา|รับ|เพิ่ม)/.test(value)&&!wantsInfo;
  if(/^(?:ชุด\s*5\s*ชิ้น|สั่งชุด|สั่งชุด\s*5\s*ชิ้น|สนใจสั่ง\s*mediral\s*ชุดดูแลผิว\s*5\s*ชิ้น)$/.test(value))s.items=Object.fromEntries(Object.keys(PRODUCTS).map(k=>[k,1]));
  else if(text==='ยืนยันสินค้า'&&Object.keys(s.items).length){s.stage='consent';return reply(`เราขอชื่อ เบอร์โทร และที่อยู่เพื่อรับออเดอร์และจัดส่ง สลิปจะส่งให้ EasySlip ตรวจธุรกรรมเมื่อเปิดบริการ ข้อมูลไม่ใช้สมัครโฆษณาและไม่ส่งให้ AI\nรายละเอียด: ${SITE}/mediral/privacy/\nยินยอมให้ใช้ข้อมูลเพื่อทำรายการนี้ไหมคะ`,['ยินยอมทำรายการ','คุยกับคนดูแล']);}
  else if(buying&&named.length<=1&&(named.length||s.productFocus&&!/เซรั่ม/.test(value))){
   const sku=named[0]||s.productFocus;
   const qty=Number(value.match(/(\d+)\s*(?:ขวด|ชิ้น|ตลับ|หลอด)/)?.[1]||value.match(/^(?:สนใจ)?(?:ขอ)?(?:สั่ง(?:ซื้อ)?|ซื้อ|เอา|รับ|เพิ่ม)\s*(\d+)/)?.[1]||1);
   if(/\d[.,]\d/.test(value))return reply('ขอจำนวนเต็มเป็นขวดหรือชิ้นค่ะ ต้องการกี่ชิ้นคะ?',focusButtons(sku));
   if(qty<1||qty+(s.items[sku]||0)>5)return reply('เลือกได้สูงสุดชนิดละ 5 ชิ้นต่อรายการค่ะ ต้องการจำนวนเท่าไรคะ?',['คุยกับคนดูแล']);
   s.items[sku]=(s.items[sku]||0)+qty;s.productFocus=sku;delete s.inquiry;
  }
  else if((/เทียบ|ต่างกัน|ทั้งสอง|สองขวด/.test(value)&&/เซรั่ม/.test(value))||(named.length>1&&named.every(sku=>['AC','BR'].includes(sku))))return reply(serumQuestion(s));
  else if(s.productFocus&&/^(?:ใช้|ทา)\s*(?:ตัวนี้|อันนี้|ขวดนี้)?\s*(?:ก่อน|หลัง)/.test(value))return reply(productAnswer(s,s.productFocus,'use'));
  else if(named.length>1){delete s.productFocus;delete s.inquiry;return reply('คุยได้ทุกชิ้นค่ะ อยากเริ่มดูตัวไหนก่อนคะ?',named.map(sku=>PRODUCTS[sku]));}
  else if(named.length===1)return reply(productAnswer(s,named[0],/ส่วนผสม|สารสกัด/.test(value)?'ingredients':/วิธีใช้|ใช้ยังไง|ทายังไง|ใช้ตอนไหน/.test(value)?'use':/ราคา|เท่าไหร่|เท่าไร/.test(value)?'price':'intro'));
  else if(/เซรั่ม/.test(value))return reply(serumQuestion(s));
  else if(s.productFocus&&/ส่วนผสม|สารสกัด|วิธีใช้|ใช้ยังไง|ทายังไง|ใช้ตอนไหน|ราคา|เท่าไหร่|เท่าไร|ดูรายละเอียด/.test(value))return reply(productAnswer(s,s.productFocus,/ส่วนผสม|สารสกัด/.test(value)?'ingredients':/วิธีใช้|ใช้ยังไง|ทายังไง|ใช้ตอนไหน/.test(value)?'use':/ราคา|เท่าไหร่|เท่าไร/.test(value)?'price':'intro'));
  else if(s.productFocus)return reply('อยากรู้ส่วนผสม วิธีใช้ หรือสั่งชิ้นที่คุยกันอยู่คะ?',focusButtons(s.productFocus));
  else if(s.inquiry==='serum')return reply(serumQuestion(s));
  else return reply(menu());
  return reply(`เลือกไว้แล้วค่ะ 🍀\n${cartText(s.items)}\nรวมสินค้า ${money(retailPrice(s.items).subtotal)} บาท ยังไม่รวมค่าส่ง\nคนดูแลจะเช็กของและแจ้งยอดก่อนรับเงิน`,['ยืนยันสินค้า','เริ่มใหม่','คุยกับคนดูแล']);
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
