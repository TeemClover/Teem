(() => {
  const tasks={
    documents:['เริ่มฟรี: ChatGPT Chat หรือ Claude Chat','จากข้อมูลที่มี → เอกสารที่ทีมเปิดใช้ได้','ให้ Source และโน้ตงาน แล้วขอไฟล์ .docx; Claude Free สร้างไฟล์ใน Chat ได้ตามโควตา ถ้ายังดาวน์โหลดไม่ได้ ขอ Markdown แล้วคัดลอกเก็บในเครื่อง'],
    data:['Chat บนเว็บ · แนบไฟล์ตามสิทธิ์และโควตา','จาก Export ลูกค้า → ตารางสรุปและงานที่ต้องทำต่อ','อ่านไฟล์จริงแล้วสรุปเป็นตาราง; ถ้าทำ .xlsx ไม่ได้ ขอ TSV ไปวางใน Excel ถ้าแนบไม่ได้ ใช้ชื่อคอลัมน์เพื่อเตรียมคำสั่งไว้ก่อน'],
    image:['ChatGPT Free · สร้างภาพตามโควตาบัญชี','จากข้อมูลแบรนด์ → ภาพและแคปชันพร้อมใช้','สร้างหรือปรับภาพใน ChatGPT แล้วบันทึกลงเครื่อง หากโควตาหมด ให้ทำแคปชันและเก็บคำสั่งภาพไว้ใช้ต่อ'],
    reply:['ChatGPT Free หรือ Claude Free','จาก Source ที่ทีมใช้ → คำตอบแอดมินเป็นหมวดหมู่','วาง Source และคำถามที่เจอบ่อย ปรับน้ำเสียง แล้วคัดลอกคลังคำตอบเป็น Markdown หรือเก็บใน Word']
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
