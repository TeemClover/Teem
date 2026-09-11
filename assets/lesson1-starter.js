/* Lesson 1: a small fictional Source learners can try without an existing project. */
(function(){
'use strict';
function boot(){
  const root=document.getElementById('lesson1Example');
  if(!root || root.dataset.ready==='1') return;
  root.dataset.ready='1';
  const style=document.createElement('style');
  style.id='lesson1-example-style';
  style.textContent=`
    .source-example{margin:22px 0;padding:20px;border:1px solid #b5cebb;border-radius:18px;background:#f0f6ec;color:#173d29}
    .source-example__tag{font-size:13px;font-weight:750;color:#49704f}
    .source-example h2{margin:7px 0;font-size:22px;line-height:1.45}.source-example p{margin:8px 0;font-size:15px}
    .source-example summary{padding:12px 0;font-weight:700;cursor:pointer}.source-example h3{font-size:16px;margin:10px 0}
    .source-example__pair{display:grid;grid-template-columns:1fr 1fr;gap:14px}.source-example__pair>div{min-width:0}
    .source-example pre{padding:14px;background:#fff;border:1px solid #dae4d9;border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:14px;line-height:1.75}
    .source-example__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.source-example__actions button,.source-example__actions a{display:inline-flex;justify-content:center;align-items:center;min-height:44px;padding:10px 14px;border:1px solid #1b6a42;border-radius:10px;font:inherit;font-size:14px;font-weight:700;text-decoration:none;cursor:pointer}
    .source-example__actions button{background:#1b6a42;color:#fff}.source-example__actions a{background:#fff;color:#1b6a42}.source-example__hint{color:#52684f}
    @media(max-width:600px){.source-example{padding:17px}.source-example__pair{grid-template-columns:1fr}.source-example__actions>*{width:100%}}
  `;
  document.head.append(style);
  const button=root.querySelector('#lesson1TryExample');
  const status=root.querySelector('#lesson1ExampleStatus');
  button.addEventListener('click',async()=>{
    const text='จัดข้อมูลสมมติต่อไปนี้เป็น Main Source ไฟล์ Markdown (.md) ชื่อ main-source-example.md สำหรับทำสื่อแนะนำร้าน โดยแยกเป้าหมาย ข้อเท็จจริง กติกา สิ่งที่ห้ามเพิ่ม เรื่องที่ยังไม่รู้ และเกณฑ์ตรวจงาน ใช้เฉพาะข้อมูลที่ให้ ห้ามแต่งเพิ่ม สร้างไฟล์ให้ดาวน์โหลดทันที ถ้าสร้างไฟล์ไม่ได้ ให้ส่ง Markdown ใน code block เดียว\n\n'+document.getElementById('lesson1ExampleRaw').textContent;
    let ok=false;
    try{await navigator.clipboard.writeText(text);ok=true}catch(e){}
    if(!ok){const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;opacity:0';document.body.append(area);area.select();try{ok=document.execCommand('copy')}catch(e){}area.remove();}
    status.textContent=ok?'คัดลอกแล้ว เปิดแชทใหม่แล้ววางได้เลย จากนั้นเทียบผลกับ Source ตัวอย่างด้านบน':'คัดลอกไม่สำเร็จ เปิดตัวอย่างแล้วเลือกคัดลอกข้อความ หรือดาวน์โหลดไฟล์แทน';
    button.textContent=ok?'✓ คัดลอกแล้ว':'ลองคัดลอกอีกครั้ง';
    if(ok)setTimeout(()=>button.textContent='คัดลอกโจทย์พร้อมข้อมูล',1600);
  });
  root.querySelector('#lesson1DownloadExample').addEventListener('click',()=>{status.textContent='เมื่อได้ไฟล์แล้ว ให้นำ main-source-example.md ไปใช้เป็นซอสแม่ในบท 2 ได้เลย';});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
