import {createHash} from 'node:crypto';
import {PRODUCTS,lineText,SITE} from './domain.js';

// Summarize known order state, not an invented transcript or medical inference.
export function attention(data){
 const cases=[];
 for(const o of data.orders||[]){
  const next={awaiting_quote:['ยืนยันยอด','ตรวจของพร้อมขาย ราคา และค่าส่ง'],payment_review:['ตรวจเงินเข้า','เทียบธุรกรรมกับบัญชีรับเงินก่อนยืนยัน'],paid:['จัดสินค้า','แพ็กสินค้าและแจ้งเลขพัสดุ'],packing:['ส่งสินค้า','บันทึกขนส่งและเลขพัสดุ']}[o.status];
  if(!next)continue;
  cases.push({key:`order:${o.id}:${o.status}`,orderId:o.id,userId:o.userId,title:next[0],summary:Object.entries(o.items||{}).map(([k,q])=>`${PRODUCTS[k]||k} × ${q}`).join(' · '),next:next[1]});
 }
 for(const h of data.handoffs||[]){
  if(h.house?.blocked||(!h.reason&&!h.orderId))continue;
  if(cases.some(c=>c.userId===h.id))continue;
  cases.push({key:`chat:${h.id}:${h.attentionId||h.reason||'handoff'}`,userId:h.id,orderId:h.orderId||null,title:'แชทรอคนดูแล',summary:h.reason||'ลูกค้าต้องการให้คนช่วย',next:'เปิดแชทรับช่วง แล้วให้บอทตอบต่อเมื่อจบเรื่อง'});
 }
 return cases;
}

export async function queueOwnerAttention(store,env,now){
 if(env.MEDIRAL_MODE!=='live'||!/^U[0-9a-f]{32}$/.test(env.MEDIRAL_OWNER_LINE_ID||''))return 0;
 const cases=attention(await store.list());let count=0;
 for(const item of cases){
  const key=createHash('sha256').update(item.key).digest('hex');
  // No addresses, receipt images, customer identifiers or raw chat in lock-screen alerts.
  const text=`บ้าน myClover มีเรื่องให้ดู 🍀\n${item.title}${item.orderId?' · '+item.orderId:''}\nสิ่งที่ต้องทำ: ${item.next}\nดูสรุปในหลังบ้าน\n${SITE}/mediral/admin/`;
  if(await store.ownerNotice(key,env.MEDIRAL_OWNER_LINE_ID,[lineText(text)],now))count++;
 }
 return count;
}
