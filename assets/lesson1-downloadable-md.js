/* AI ใส่ซอส · บท 1
   Prompt ทุกขวดต้องขอไฟล์ Markdown จริงพร้อมดาวน์โหลด
   ถ้า AI ตัวนั้นสร้างไฟล์ไม่ได้ จึงค่อยคืน code block เพื่อนำไปเข้าเครื่องบรรจุซอส
*/

function isLessonOne() {
  return /^\/classroom\/free-ai(?:\.html)?$/.test(location.pathname);
}

const OUTPUT_CONTRACT = `รูปแบบผลลัพธ์บังคับ:
- สร้างผลลัพธ์เป็นไฟล์ Markdown จริง นามสกุล .md
- ตั้งชื่อไฟล์ให้สื่อความหมายจากโปรเจกต์ และต้องลงท้ายด้วย .md
- แนบไฟล์ให้ฉันกด Download ได้ทันที
- ห้ามตอบด้วยเนื้อหา Markdown ยาว ๆ ในแชตอย่างเดียว
- ถ้าระบบนี้สร้างไฟล์ดาวน์โหลดไม่ได้จริง ๆ ให้ใส่เนื้อหา Markdown ทั้งหมดใน code block เดียว โดยไม่มีคำอธิบายนอก code block เพื่อให้ฉันนำไปบรรจุด้วยเครื่องบรรจุซอส`;

function patchPrompts() {
  document.querySelectorAll('.prompt').forEach(prompt => {
    if (prompt.dataset.downloadableMd === '1') return;
    prompt.dataset.downloadableMd = '1';

    const block = document.createElement('span');
    block.className = 'prompt-output-contract';
    block.textContent = `\n\n${OUTPUT_CONTRACT}`;
    prompt.append(block);
  });
}

function patchMachineIntro() {
  const machine = document.getElementById('machine');
  const intro = machine?.previousElementSibling;
  if (!intro || intro.dataset.downloadableMdIntro === '1') return;
  intro.dataset.downloadableMdIntro = '1';
  intro.innerHTML = 'Prompt ทุกขวดด้านบนสั่งให้ AI ส่งไฟล์ <code>.md</code> พร้อมปุ่ม Download แล้ว หาก AI ที่คุณใช้ยังคืนมาเป็นข้อความยาว ให้วางข้อความลงเครื่องบรรจุซอสด้านล่าง แล้วดาวน์โหลดเป็นไฟล์ได้ทันที';
}

function injectStyles() {
  if (document.getElementById('lesson1-downloadable-md-style')) return;
  const style = document.createElement('style');
  style.id = 'lesson1-downloadable-md-style';
  style.textContent = `
    .prompt-output-contract{display:block;margin-top:15px;padding-top:14px;border-top:1px solid rgb(190 148 66/.32);color:#f6df9c;font-weight:650}
  `;
  document.head.append(style);
}

function apply() {
  injectStyles();
  patchPrompts();
  patchMachineIntro();
}

function boot() {
  if (!isLessonOne() || document.documentElement.dataset.lesson1DownloadableMd === '1') return;
  document.documentElement.dataset.lesson1DownloadableMd = '1';
  apply();

  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  });
  observer.observe(document.body, { childList:true, subtree:true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
else boot();
