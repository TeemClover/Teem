import {buildPrompt, cleanAnswers, makeBackup, parseBackup, makeCSV, sourceLabels, episodeCode, hasCompletedTopic, answersComplete} from './start-domain.mjs';

const page = document.body.dataset.page;
const status = document.querySelector('#status');
const source = sourceLabels(location.search);
const query = document.querySelector('#search');
const buttons = document.querySelectorAll('[data-batch]');
let selectedBatch = '0';
function notice(text) { if(status) status.textContent = text; }
function event(name, episode = '') {
  // An integration may listen for these labels; answers never leave the page.
  window.dispatchEvent(new CustomEvent('myclover:start', {detail: {event: name, episode_id: episode, ...source}}));
}


function readProgress() {
  try { return JSON.parse(localStorage.getItem('myclover:start:progress:v1') || '{}'); }
  catch { return {}; }
}
if (page === 'claim') {
  const form = document.querySelector('#claim-form');
  const input = document.querySelector('#episode-code');
  document.querySelector('#library-return').hidden = !hasCompletedTopic(readProgress());
  form.addEventListener('submit', event => {
    event.preventDefault();
    const id = episodeCode(input.value);
    if (!id) {
      document.querySelector('#claim-status').textContent = 'ใส่เลขตอน 01–30 เช่น MC02 หรือ 02';
      input.focus(); return;
    }
    const destination = new URL(`/start/${id.toLowerCase()}/`, location.origin);
    const params = new URLSearchParams(location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const value = params.get(key);
      if (value && /^[a-zA-Z0-9_-]{1,64}$/.test(value)) destination.searchParams.set(key, value);
    }
    location.assign(destination.href);
  });
}

if(page === 'catalog') {
  const unlocked = hasCompletedTopic(readProgress());
  document.querySelector('#library-content').hidden = !unlocked;
  document.querySelector('#library-gate').hidden = unlocked;
  const cards = [...document.querySelectorAll('[data-topic]')];
  const count = document.querySelector('#result-count');
  function filter() {
    const text = query.value.trim().toLowerCase().replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
    let total = 0;
    cards.forEach(card => {
      const visible = (selectedBatch === '0' || card.dataset.batch === selectedBatch) && card.dataset.search.includes(text);
      card.hidden = !visible; if(visible) total++;
    });
    count.textContent = total ? `เลือกได้ ${total} เรื่อง` : 'ยังไม่พบ ลองค้นด้วยคำสั้น ๆ หรือเลือกทั้งหมด';
  }
  query.addEventListener('input', filter);
  buttons.forEach(button => button.addEventListener('click', () => {
    selectedBatch = button.dataset.batch;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button))); filter();
  }));
  const origin = (new URLSearchParams(location.search).get('episode') || location.hash.slice(1)).toUpperCase();
  const valid = /^MC(0[1-9]|[12][0-9]|30)$/.test(origin) ? origin : '';
  if(valid) {
    const card = cards.find(c => c.dataset.topic === valid);
    const box = document.querySelector('#incoming');
    const a = document.createElement('a'); a.href = card.querySelector('h3 a').href;
    a.textContent = `เปิดแบบฝึก ${valid} · ${card.querySelector('h3').textContent}`;
    box.replaceChildren(a);box.hidden = false;
  }
  try {
    const progress = JSON.parse(localStorage.getItem('myclover:start:progress:v1') || '{}');
    cards.forEach(card => {
      if(progress[card.dataset.topic]?.started === true) card.querySelector('[data-progress]').textContent = 'คุณบันทึกว่าเริ่มแล้ว';
    });
  } catch {}
  if(unlocked) event('catalog_opened');
}

if(page === 'episode') {
  const episode = JSON.parse(document.querySelector('#episode-data').textContent);
  const key = `myclover:start:answers:${episode.id}:v1`;
  const fields = [...document.querySelectorAll('[data-answer]')];
  const preview = document.querySelector('#prompt-preview');
  const jsonInput = document.querySelector('#import-json');
  let saveProblem = false;
  const finish = document.querySelector('#mark-started');
  const libraryLink = document.querySelector('#library-unlock');
  libraryLink.hidden = !hasCompletedTopic(readProgress());
  const values = () => cleanAnswers(fields.map(field => field.value), episode.fields.length);
  function update(save = true) {
    preview.value = buildPrompt(episode, values());
    finish.disabled = !answersComplete(values());
    if(save) {
      try {localStorage.setItem(key, JSON.stringify(makeBackup(episode, values())));saveProblem=false;notice('เก็บคำตอบไว้บนเครื่องนี้แล้ว');}
      catch {saveProblem=true;notice('เครื่องนี้เก็บอัตโนมัติไม่ได้ กด “เก็บข้อมูลที่กรอก” เพื่อเก็บคำตอบเป็นไฟล์');}
    }
  }
  try {
    const stored = localStorage.getItem(key);
    if(stored) parseBackup(stored, episode).forEach((answer,i) => fields[i].value=answer);
  } catch {notice('โหลดคำตอบเดิมไม่ได้ คุณยังเริ่มกรอกใหม่หรือนำเข้าไฟล์ที่เก็บไว้ได้');}
  fields.forEach(field => field.addEventListener('input', () => update()));
  update(false);
  function download(text, type, filename) {
    const url = URL.createObjectURL(new Blob([text], {type}));
    const a = document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 30000);
  }
  document.querySelector('#copy-prompt').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(preview.value);notice('คัดลอกแล้ว เปิด AI ที่คุณใช้ แล้ววางข้อความนี้ได้เลย');event('prompt_copied',episode.id);}
    catch {preview.closest('details').open=true;preview.focus();preview.select();notice('กดค้างหรือเลือกข้อความในช่องคำสั่ง แล้วคัดลอกได้เลย');}
  });
  document.querySelector('#download-prompt').addEventListener('click', () => {
    download(preview.value, 'text/plain;charset=utf-8', `${episode.id}-my-prompt.txt`);event('prompt_download_clicked',episode.id);
  });
  document.querySelector('#copy-upload-message')?.addEventListener('click', async () => {
    const message=document.querySelector('#upload-message');
    const status=document.querySelector('#upload-status');
    try {
      await navigator.clipboard.writeText(message.textContent);
      status.textContent='คัดลอกแล้ว แนบ PDF แล้ววางข้อความนี้ใน AI ได้เลย';
      event('upload_instruction_copied',episode.id);
    } catch {
      const selection=window.getSelection();const range=document.createRange();
      range.selectNodeContents(message);selection.removeAllRanges();selection.addRange(range);
      status.textContent='กดค้างหรือคัดลอกข้อความที่เลือกไว้ แล้วส่งพร้อมไฟล์ PDF';
    }
  });
  document.querySelector('#save-json').addEventListener('click', () => {
    download(JSON.stringify(makeBackup(episode,values()),null,2),'application/json;charset=utf-8',`${episode.id}-my-answers.json`);
    notice('เตรียมไฟล์ข้อมูลของคุณแล้ว เก็บไฟล์นี้เพื่อนำกลับมาทำต่อได้');event('answers_export_clicked',episode.id);
  });
  document.querySelector('#save-csv').addEventListener('click', () => {
    download(makeCSV(episode,values()),'text/csv;charset=utf-8',`${episode.id}-my-worksheet.csv`);event('worksheet_export_clicked',episode.id);
  });
  jsonInput.addEventListener('change', async () => {
    const file = jsonInput.files[0]; if(!file) return;
    try {
      if(file.size > 100000) throw Error('ไฟล์ใหญ่เกินไป กรุณาเลือกไฟล์ข้อมูลแบบฝึก .json');
      const answers = parseBackup(await file.text(),episode);
      // Import is deliberate, but never silently replace answers already on screen.
      if(values().some(v=>v.trim()) && !window.confirm('ใช้คำตอบจากไฟล์แทนคำตอบที่อยู่บนหน้านี้ไหม? เก็บคำตอบเดิมเป็นไฟล์ก่อนหากยังต้องการใช้')) return;
      answers.forEach((answer,i) => fields[i].value=answer);update();
      if(!saveProblem) notice('นำเข้าคำตอบแล้ว กดคัดลอกคำสั่งเพื่อทำต่อกับ AI ได้เลย');
    } catch(error) {notice(error.message || 'เปิดไฟล์ไม่ได้');}
    finally {jsonInput.value='';}
  });
  finish.addEventListener('click', () => {
    if(!answersComplete(values())) {notice('ตอบแบบฝึกทั้ง 3 ข้อก่อน แล้วค่อยเปิดคลังรวมครับ');return;}
    try {
      const progress=JSON.parse(localStorage.getItem('myclover:start:progress:v1')||'{}');
      progress[episode.id]={started:true,completed:true};localStorage.setItem('myclover:start:progress:v1',JSON.stringify(progress));
      libraryLink.hidden=false;finish.textContent='ทำตอนนี้แล้ว ✓';document.querySelector('#completion-status').textContent='เปิดคลังรวมจากลิงก์ด้านล่างได้แล้วครับ';notice('ทำตอนนี้แล้ว เปิดคลังรวมจากลิงก์ด้านล่างได้ครับ');event('started_self_reported',episode.id);
    } catch {notice('บันทึกบนเครื่องไม่ได้ เก็บคำตอบเป็นไฟล์แทนได้ครับ');}
  });
  document.querySelectorAll('[data-download]').forEach(a => a.addEventListener('click',()=>event('download_clicked',episode.id)));
  document.querySelectorAll('[data-ai]').forEach(a => a.addEventListener('click',()=>event('ai_open_clicked',episode.id)));
  event('episode_opened', episode.id);
}
