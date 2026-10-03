import {retailAt} from './catalog.js';

const SITE='https://www.myclover.com';
const GREEN='#173F30',MUTED='#677565',PAPER='#F7F6EE';
const money=n=>(n/100).toLocaleString('th-TH');
const text=(value,size='sm',extra={})=>({type:'text',text:value,size,wrap:true,color:GREEN,...extra});
const link=(path,content)=>`${SITE}${path}${path.includes('?')?'&':'?'}utm_source=line&utm_medium=flex&utm_campaign=mediral_shop&utm_content=${content}`;
const button=(label,uri,primary=false)=>({type:'button',style:primary?'primary':'link',color:GREEN,height:'sm',action:{type:'uri',label,uri}});
const chat=(label,value)=>({type:'button',style:'link',color:GREEN,height:'sm',action:{type:'message',label,text:value}});
export const CARD_PRODUCTS=[
 {sku:'CL',name:'มูสล้างหน้า',step:'01 · ล้างให้สะอาด',image:'cl-clover-front-v2',benefit:'คราบมันติดผิวมาทั้งวัน? เริ่มด้วยฟองมูสนุ่ม ให้ผิวสะอาด สดชื่น',ingredients:'ชบา · ลิลลี่ · ชาเขียว',order:'สั่งมูสล้างหน้า'},
 {sku:'AC',name:'เซรั่มขวดขาว',step:'02 · บำรุงเบาสบาย',image:'ac-front',benefit:'ดูแลผิวเป็นสิวง่ายและความมัน พร้อมเติมความชุ่มชื้นด้วยเนื้อบางเบา',ingredients:'ทีทรี · เปลือกมังคุด · ซิงค์ พีซีเอ',order:'สั่งเซรั่มขวดขาว'},
 {sku:'BR',name:'เซรั่มขวดเหลืองเขียว',step:'03 · ดูแลผิวดูหมอง',image:'br-front',benefit:'ดูแลความหมองคล้ำและสีผิวไม่สม่ำเสมอ เกลี่ยง่าย สบายผิว',ingredients:'แบร์เบอร์รี่ · ชะเอมเทศ · อนุพันธ์วิตามินซี',order:'สั่งขวดเหลืองเขียว'},
 {sku:'SU',name:'เซรั่มกันแดด',step:'04 · ก่อนออกไปเจอแดด',image:'su-front-web',benefit:'SPF 50 PA+++ ตามที่แบรนด์ระบุ กันแดดเนื้อเซรั่มพร้อมบำรุงผิว',ingredients:'Zinc Oxide · Titanium Dioxide · ไฮยา',order:'สั่งกันแดด'},
 {sku:'PO',name:'แป้งพัฟตลับเขียว',step:'05 · แต่งผิวบางเบา',image:'po-closed',benefit:'ปกปิดรอยให้ผิวดูเนียน เนื้อละเอียด ไม่หนักหน้า ล้างออกเมื่อจบวัน',ingredients:'ไฮยา · ว่านหางจระเข้ · โรสฮิป',order:'สั่งแป้งพัฟ'}
];
function price(now,set=false){
 const r=retailAt(now),regular=r.regular*(set?5:1),current=set?r.set:r.unit;
 return [
  text(`${money(current)} บาท${set?' / ชุด':' / ชิ้น'}`,'xl',{weight:'bold'}),
  ...(r.discountPercent?[text(`ปกติ ${money(regular)} บาท · ลด ${money(regular-current)} บาท`,'xs',{color:MUTED}),text('คูปอง LINE −20% ถึง 15 ต.ค. 2569','xs',{color:MUTED})]:[text('ราคาปกติใน LINE','xs',{color:MUTED})])
 ];
}
function bubble({image,ratio='1:1',title,kicker,body,actions}){
 return {type:'bubble',size:'mega',hero:{type:'image',url:image,size:'full',aspectRatio:ratio,aspectMode:'fit',backgroundColor:PAPER},
  body:{type:'box',layout:'vertical',spacing:'md',paddingAll:'20px',contents:[text(kicker,'xs',{color:MUTED,weight:'bold'}),text(title,'xl',{weight:'bold'}),...body]},
  footer:{type:'box',layout:'vertical',spacing:'sm',paddingAll:'16px',contents:actions},styles:{body:{backgroundColor:PAPER},footer:{backgroundColor:PAPER}}};
}
export function productCard(sku,now=Date.now()){
 const p=CARD_PRODUCTS.find(p=>p.sku===sku);if(!p)throw Error('UNKNOWN_PRODUCT');
 return bubble({image:`${SITE}/mediral/assets/line/${p.image}.png`,title:p.name,kicker:p.step,
  body:[text(p.benefit),text(p.ingredients,'xs',{color:MUTED}),...price(now)],
  actions:[button('เลือกชิ้นนี้บนเว็บ',link(`/mediral/checkout/?pick=${sku}`,sku),true),button('ส่วนผสมและวิธีใช้',link(`/mediral/${sku.toLowerCase()}/`,`${sku}_details`)),chat('สั่งผ่านแชท',p.order)]});
}
export function shopCarousel(now=Date.now()){
 const overview=bubble({image:`${SITE}/mediral/assets/social/mediral-routine-og-v1.jpg`,ratio:'1200:630',title:'ดูแลผิวให้ครบ 5 ขั้น',kicker:'MYCLOVER PICKS · MEDIRAL',
  body:[text('ล้าง → บำรุง 2 ขั้น → กันแดด → แต่งผิว'),text('เลือกครบรูทีน หรือเริ่มจากชิ้นที่ผิวต้องการ เลื่อนดูแต่ละชิ้นได้เลย','sm'),...price(now,true)],
  actions:[button('เลือกชุดบนเว็บ',link('/mediral/checkout/?pick=set','set'),true),button('ดูรูทีนและเรื่องจากคนใช้',link('/mediral/','routine')),chat('สั่งชุดผ่านแชท','สั่งชุด 5 ชิ้น')]});
 const trust={type:'bubble',size:'mega',body:{type:'box',layout:'vertical',paddingAll:'24px',spacing:'lg',backgroundColor:GREEN,contents:[
  text('🍀 บ้าน myClover','sm',{color:'#DCE6BA',weight:'bold'}),text('เลือกดูได้\nไม่ต้องรีบคุย','xxl',{color:'#FFFFFF',weight:'bold'}),
  text('คนใช้จริงเป็นคนคัด\nอ่านประสบการณ์ของ Teem และดูข้อมูลส่วนผสมก่อนเลือกได้','sm',{color:'#FFFFFF'}),
  text('สั่งเองบนเว็บได้\nเลือกสินค้า กรอกที่อยู่ ตรวจยอด แล้วโอนและแนบสลิป','sm',{color:'#FFFFFF'}),
  text('ค่าส่งบนเว็บ 50 บาท\nส่งฟรีเมื่อยอดหลังส่วนลดเกิน 1,500 บาท','sm',{color:'#FFFFFF'}),
  text('ราคาและอายุคูปองบนเว็บแสดงก่อนชำระ ผลการใช้แตกต่างกันในแต่ละคน ภาพประกอบสินค้าให้ยึดฉลากและแพ็กเกจที่ได้รับ','xs',{color:'#DCE6BA'})]},footer:{type:'box',layout:'vertical',paddingAll:'16px',spacing:'sm',contents:[button('เลือกซื้อบนเว็บ',link('/mediral/checkout/','help'),true),chat('มีคำถาม คุยกับทีม','คุยกับคนดูแล')]}};
 return {type:'flex',altText:`Mediral · ดูภาพชุด 5 ชิ้นและเลือกซื้อ · ราคา LINE ${money(retailAt(now).set)} บาท/ชุด`,contents:{type:'carousel',contents:[overview,...CARD_PRODUCTS.map(p=>productCard(p.sku,now)),trust]},quickReply:{items:[{type:'action',action:{type:'uri',label:'เลือกซื้อบนเว็บ',uri:link('/mediral/checkout/','quick')}},{type:'action',action:{type:'message',label:'คุยกับคนดูแล',text:'คุยกับคนดูแล'}}]}};
}
