(() => {
  const tasks={
    documents:['Claude Cowork หรือ ChatGPT Work','จากไฟล์ที่มี → เอกสารที่ทีมเปิดใช้ได้','ให้ Source และโน้ตงาน สั่งสร้าง .docx แล้วบันทึกใน output/'],
    data:['Claude Cowork หรือ ChatGPT Work · ผู้เรียนทำในเครื่องตนเอง','จาก Export ลูกค้า → ตารางสรุปและงานที่ต้องทำต่อ','อ่านคอลัมน์จริง จัดข้อมูล แยกประเด็นที่พบ แล้วสร้าง .xlsx และรายงาน .docx'],
    image:['ChatGPT สำหรับภาพ · Cowork / Work สำหรับจัดชุดไฟล์','จากข้อมูลแบรนด์ → ภาพ 1 ชิ้นและแคปชันพร้อมใช้','สร้างหรือปรับภาพใน ChatGPT แล้วบันทึกภาพกับเอกสารคอนเทนต์ไว้ในโฟลเดอร์เดียวกัน'],
    reply:['Chat เพื่อร่าง · Cowork / Work เพื่อทำคลังคำตอบ','จาก Source ที่ทีมใช้ → คำตอบแอดมินเป็นหมวดหมู่','เริ่มจากคำถามที่เจอบ่อย ปรับน้ำเสียง แล้วเก็บเป็น reply bank ใน .docx']
  };
  document.querySelectorAll('[data-task]').forEach(button=>button.addEventListener('click',()=>{
    const answer=tasks[button.dataset.task];if(!answer)return;
    document.querySelectorAll('[data-task]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    ['task-tool','task-outcome','task-how'].forEach((id,i)=>document.getElementById(id).textContent=answer[i]);
  }));
  const fullscreen=document.getElementById('tools-fullscreen');
  fullscreen.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{fullscreen.textContent='ใช้เต็มจอจากเบราว์เซอร์';}});
  document.addEventListener('fullscreenchange',()=>fullscreen.textContent=document.fullscreenElement?'ออกจากเต็มจอ ↙':'เต็มจอ ⛶');
})();
