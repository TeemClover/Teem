/* AI ใส่ซอส · กติกาภาษาสำหรับ Prompt และคำพูดของเชฟ
   - ใน Prompt ใช้คำว่า Source เสมอ
   - Prompt ต้องลงมือทำจากข้อมูลที่มี โดยไม่ถามกลับ
   - คำลงท้าย ค่ะ / นะคะ / นะครับ อยู่เฉพาะกล่องที่เชฟพูด
*/
(function(){
'use strict';

const GUARDRAIL=`กติกาการลงมือ:
- ใช้ Source เป็นฐานข้อมูลหลัก
- ลงมือทำผลลัพธ์จากข้อมูลที่มีทันที ห้ามถามคำถามกลับ
- ถ้าข้อมูลขาด ให้ระบุ “ยังไม่มีข้อมูล” ในจุดนั้น ทำส่วนที่เหลือต่อ และห้ามแต่งข้อเท็จจริง`;

function normalizePrompt(value){
  let text=String(value||'').replace(/ซอส/g,' Source ').replace(/[ \t]{2,}/g,' ');
  text=text
    .replace(/ถ้าข้อมูลไม่อยู่ใน Source ให้ถามก่อน ห้ามแต่งเพิ่ม/g,'ถ้าข้อมูลไม่อยู่ใน Source ให้ระบุ “ยังไม่มีข้อมูล” และห้ามแต่งเพิ่ม')
    .replace(/ถ้า Source ขัดกัน ให้ถามว่าอะไรเป็น Source หลักที่ยึดเป็นความจริง/g,'ถ้า Source ขัดกัน ให้ระบุจุดขัดกัน ยึดข้อมูลที่มีหลักฐานชัดที่สุด และทำส่วนที่เหลือต่อทันที')
    .replace(/ถ้าข้อมูลสำคัญไม่พอ ให้ถามก่อนเดา(?:\s*\([^\n]*\))?/g,'ถ้าข้อมูลสำคัญไม่พอ ให้ระบุ “ยังไม่มีข้อมูล” แล้วทำส่วนที่เหลือต่อทันที')
    .replace(/ถ้าชื่อเกมซ้ำหรือ Edition ต่างกันให้ถามก่อน/g,'ถ้าชื่อเกมซ้ำหรือ Edition ต่างกัน ให้ยึดเวอร์ชันที่ Source รองรับชัดที่สุดและระบุจุดที่ยังไม่แน่ชัด')
    .replace(/ถ้าข้อมูลไม่พอ ให้ถามแทนการเติมเอง/g,'ถ้าข้อมูลไม่พอ ให้ระบุ “ยังไม่มีข้อมูล” และทำส่วนที่เหลือต่อทันที')
    .replace(/ถามเฉพาะคำถามจำเป็น/g,'ระบุข้อมูลที่ยังไม่มี แล้วส่งผลงานฉบับใช้ได้ทันที')
    .replace(/ถามเช็กความเข้าใจหนึ่งข้อ แล้วรอฉันตอบ/g,'ให้แบบฝึกหัดสั้นหนึ่งข้อพร้อมแนวตรวจคำตอบ โดยไม่รอคำตอบกลับ')
    .replace(/เริ่มด้วยคำถามวัดพื้นฐานไม่เกิน 3 ข้อ/g,'เริ่มอธิบายจากระดับที่ระบุทันที และให้ทางเลือกสำหรับผู้เริ่มต้น')
    .replace(/ยังไม่ต้องสร้างคลิป รอฉันตรวจ Recipe Card ก่อน/g,'สร้าง Production Recipe Card ที่พร้อมนำไปทำคลิปต่อได้ทันที')
    .replace(/ยังไม่ต้องสร้าง Output จนกว่าฉันจะยืนยัน/g,'สร้าง Output ที่เลือกต่อทันทีจากข้อมูลที่มี')
    .replace(/ก่อนตอบ:\s*\n[^\n]*(?:ถามข้อมูล|ถามก่อน)[^\n]*/g,'ก่อนตอบ:\nใช้ข้อมูลที่มีให้เกิดผลงานทันที และระบุช่องว่างโดยไม่ถามกลับ');
  if(!/ห้ามถาม(?:คำถาม)?กลับ/.test(text)) text=`${text.trim()}\n\n${GUARDRAIL}`;
  return text.trim();
}

function promptText(root){
  return [...root.childNodes].filter(node=>node.nodeName!=='BUTTON').map(node=>node.textContent||'').join('').trim();
}

function applyPrompt(root){
  if(!root || root.closest('script,style,noscript')) return;
  if(root.matches('[data-prompt-guard="off"]')) return;
  const current=promptText(root);
  if(!current) return;
  const next=normalizePrompt(current);
  if(current===next) return;
  const button=[...root.children].find(node=>node.nodeName==='BUTTON');
  [...root.childNodes].forEach(node=>{if(node!==button)node.remove()});
  root.insertBefore(document.createTextNode(next),button||null);
}

const CHEF_BOX='.course-chef,.chef-note,.chef,.season-chef';
function cleanParticles(root=document.body){
  if(!root) return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const parent=node.parentElement;
    if(!parent || parent.closest(`${CHEF_BOX},script,style,noscript,textarea`)) return;
    node.nodeValue=node.nodeValue
      .replace(/นะคะ|นะครับ|ค่ะ/g,'')
      .replace(/\s+นะ(?=\s|[,.!?…]|$)/g,'');
  });
}

function apply(root=document){
  root.querySelectorAll?.('.prompt,.prev,[data-prev]').forEach(applyPrompt);
  cleanParticles(root===document?document.body:root);
}

function boot(){
  apply();
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
    if(node.nodeType!==1) return;
    if(node.matches?.('.prompt,.prev,[data-prev]')) applyPrompt(node);
    apply(node);
  }))).observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
