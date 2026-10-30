import { analyzeRows, IMPORT_COLUMNS, IMPORT_LIMIT } from './question-import.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function mountImportPanel(root, { onImport, onPending = () => {} }) {
  let worker, timeout, version = 0, sheets = [], analysis;
  root.innerHTML = `<div class="import-heading"><div><span class="eyebrow">FROM YOUR SPREADSHEET</span><h3>นำเข้าคำถามจากไฟล์</h3></div><span class="import-filetypes">XLSX / CSV</span></div><p class="small-note">1 แถว = 1 ข้อ · 5–20 ข้อ · ไฟล์ไม่เกิน 5 MB</p><div class="import-columns">${IMPORT_COLUMNS.map((name, index) => `<span><b>${String.fromCharCode(65 + index)}</b> ${name}</span>`).join('')}</div><div class="import-actions"><button class="secondary" type="button" data-import-choose>เลือกไฟล์ .xlsx / .csv ↑</button><a href="/quiz/templates/quiz-import.csv" download="quiz-import.csv">ดาวน์โหลดตัวอย่าง CSV ↓</a><input type="file" data-import-file accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden></div><p class="import-status" data-import-status role="status"></p><div class="import-review" data-import-review hidden><div class="import-settings"><label data-sheet-label>ชีต<select class="input" data-import-sheet></select></label><label>แถวแรกที่มีข้อมูล<select class="input" data-import-header><option value="auto">ตรวจอัตโนมัติ</option><option value="header">เป็นหัวตาราง · ข้ามแถวนี้</option><option value="question">เป็นคำถาม · เก็บแถวนี้</option></select></label></div><p class="import-detection" data-import-detection></p><div class="import-first-row" data-import-first></div><p class="import-total" data-import-total></p><ul class="import-issues" data-import-issues></ul><div class="import-table-wrap"><table class="import-table"><thead><tr><th>แถว</th>${IMPORT_COLUMNS.map(name => `<th>${name}</th>`).join('')}</tr></thead><tbody data-import-rows></tbody></table></div><p class="small-note">ตรวจชุดนี้ก่อนนำเข้า · จะใช้แทนร่าง “ตั้งคำถามเอง” แล้วแก้ต่อได้ก่อนสร้างห้อง</p><button class="primary wide" type="button" data-import-apply disabled>ใช้คำถามชุดนี้ →</button></div>`;
  const fileInput = root.querySelector('[data-import-file]'), status = root.querySelector('[data-import-status]'), review = root.querySelector('[data-import-review]');
  const sheetSelect = root.querySelector('[data-import-sheet]'), headerSelect = root.querySelector('[data-import-header]'), apply = root.querySelector('[data-import-apply]');
  const cancel = root.ownerDocument.createElement('button');cancel.type = 'button';cancel.className = 'import-cancel';cancel.textContent = 'ยกเลิกนำเข้า';cancel.hidden = true;root.querySelector('.import-actions').append(cancel);
  function pending(value) { cancel.hidden = !value;onPending(value); }
  function stopWorker() { worker?.terminate();worker = null;clearTimeout(timeout); }
  cancel.onclick = () => { ++version;stopWorker();analysis = null;review.hidden = true;pending(false);status.textContent = 'ยกเลิกนำเข้าแล้ว · ยังใช้ร่างเดิม'; };
  function describe() {
    const sheet = sheets[Number(sheetSelect.value) || 0];
    analysis = analyzeRows(sheet.rows, { header: headerSelect.value, rowOffset: sheet.rowOffset || 0, extraRows: sheet.extraRows || [] });
    if (sheet.error) { analysis.issues.unshift({ row: null, message: sheet.error });analysis.valid = false; }
    const first = analysis.first;
    root.querySelector('[data-import-detection]').textContent = first ? `${headerSelect.value === 'auto' ? 'ตรวจอัตโนมัติ: ' : 'เลือกไว้: '}แถว ${first.number} ${analysis.skipHeader ? 'เป็นหัวตาราง จึงข้ามแถวนี้' : 'เป็นคำถาม จึงเก็บแถวนี้'} · เปลี่ยนการเลือกได้หากไม่ตรงกับไฟล์` : 'ยังไม่พบแถวข้อมูลในชีตนี้';
    root.querySelector('[data-import-first]').textContent = first ? `แถว ${first.number}: ${first.row.slice(0, 5).map(value => value || '(ว่าง)').join(' | ')}` : '';
    root.querySelector('[data-import-total]').textContent = `พบ ${analysis.count} ข้อ${analysis.valid ? ' · พร้อมนำเข้า' : ' · ตรวจข้อความด้านล่างก่อน'}${analysis.count > 20 ? ' (แสดงตัวอย่าง 20 ข้อแรก)' : ''}`;
    root.querySelector('[data-import-issues]').innerHTML = analysis.issues.slice(0, 12).map(issue => `<li>${issue.row ? 'แถว ' + issue.row + ': ' : ''}${escape(issue.message)}</li>`).join('') + (analysis.issues.length > 12 ? `<li>และอีก ${analysis.issues.length - 12} จุดที่ต้องแก้ในไฟล์</li>` : '');
    const invalidRows = new Set(analysis.issues.map(issue => issue.row));
    root.querySelector('[data-import-rows]').innerHTML = analysis.data.slice(0, 20).map(entry => `<tr class="${invalidRows.has(entry.number) ? 'import-invalid' : ''}"><th>${entry.number}</th>${Array.from({ length: 5 }, (_, i) => `<td${i === 1 ? ' class="import-answer"' : ''}>${escape(entry.row[i] || '(ว่าง)')}</td>`).join('')}</tr>`).join('');
    apply.disabled = !analysis.valid;
    apply.textContent = analysis.valid ? `นำเข้า ${analysis.count} ข้อ →` : 'แก้ไฟล์หรือการเลือกแถวแรกก่อนนำเข้า';
  }
  root.querySelector('[data-import-choose]').onclick = () => fileInput.click();
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];fileInput.value = '';if (!file) return;
    const ticket = ++version;stopWorker();review.hidden = true;analysis = null;pending(true);
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx'].includes(extension)) { pending(false);status.textContent = 'เลือกไฟล์ .xlsx หรือ .csv เท่านั้น';return; }
    if (!file.size || file.size > IMPORT_LIMIT) { pending(false);status.textContent = 'เลือกไฟล์ที่มีข้อมูลและมีขนาดไม่เกิน 5 MB';return; }
    status.className = 'import-status';status.textContent = `กำลังอ่าน ${file.name}…`;
    try {
      const buffer = await file.arrayBuffer();if (ticket !== version || !root.isConnected) return;
      worker = new Worker(new URL('./import-worker.js', import.meta.url), { type: 'module' });
      timeout = setTimeout(() => { if (ticket === version) { ++version;stopWorker();pending(false);status.textContent = 'อ่านไฟล์นานเกินไป ลองไฟล์ที่มีเฉพาะคำถาม หรือบันทึกเป็น CSV UTF-8'; } }, 20000);
      worker.onerror = () => { if (ticket === version) { ++version;stopWorker();pending(false);status.textContent = 'ตัวอ่านไฟล์ทำงานไม่สำเร็จ ลองเลือกไฟล์ใหม่อีกครั้ง'; } };
      worker.onmessage = ({ data }) => {
        if (ticket !== version || !root.isConnected) return;stopWorker();
        if (!data.ok) { pending(false);status.textContent = data.error;return; }
        sheets = data.sheets;if (!sheets?.length) { pending(false);status.textContent = 'ไฟล์นี้ไม่มีชีตข้อมูล';return; }
        sheetSelect.innerHTML = sheets.map((sheet, i) => `<option value="${i}">${escape(sheet.name)}</option>`).join('');
        let selected = sheets.findIndex(sheet => !sheet.error && analyzeRows(sheet.rows, { rowOffset: sheet.rowOffset || 0, extraRows: sheet.extraRows || [] }).valid);
        if (selected < 0) selected = Math.max(0, sheets.findIndex(sheet => sheet.rows.some(row => row.some(value => String(value ?? '').trim()))));
        sheetSelect.value = String(selected);root.querySelector('[data-sheet-label]').hidden = sheets.length < 2;headerSelect.value = 'auto';
        status.textContent = `อ่าน ${file.name} แล้ว · ตรวจด้านล่างแล้วกด “นำเข้า” เพื่อใช้ชุดนี้`;review.hidden = false;describe();
      };
      worker.postMessage({ buffer, extension }, [buffer]);
    } catch { if (ticket === version) { ++version;stopWorker();pending(false);status.textContent = 'เปิดไฟล์ไม่สำเร็จ ลองเลือกไฟล์ใหม่อีกครั้ง'; } }
  });
  sheetSelect.onchange = describe;headerSelect.onchange = describe;
  apply.onclick = async () => {
    if (!analysis?.valid) return;
    const ticket = version, count = analysis.count;
    apply.disabled = true;
    try {
      await onImport(analysis.questions);
      if (ticket !== version || !root.isConnected) return;
      review.hidden = true;pending(false);status.className = 'import-status import-success';status.textContent = `นำเข้า ${count} ข้อในร่าง “ตั้งคำถามเอง” แล้ว · กดเลขข้อด้านล่างเพื่อแก้ไขต่อได้`;
    } catch { if (ticket === version) { status.textContent = 'นำเข้าร่างไม่สำเร็จ ลองกดนำเข้าอีกครั้ง';apply.disabled = false; } }
  };
  return () => { ++version;stopWorker();pending(false); };
}
