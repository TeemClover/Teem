export const BACKUP_KIND = 'myclover-start';
export const BACKUP_VERSION = 1;
export const MAX_ANSWER_LENGTH = 4000;

export function cleanAnswers(values, count = 3) {
  return Array.from({length: count}, (_, i) => typeof values?.[i] === 'string'
    ? values[i].normalize('NFC').slice(0, MAX_ANSWER_LENGTH) : '');
}

export function buildPrompt(episode, values = []) {
  const answers = cleanAnswers(values, episode.fields.length);
  const context = episode.fields.map((field, i) => `${i + 1}. ${field}\n${answers[i].trim() || 'ยังไม่มีข้อมูล — ช่วยถามฉันก่อน'}`).join('\n\n');
  return `ฉันกำลังเริ่มธุรกิจเล็ก ๆ และอยากลงมือทำเรื่องเดียวให้ชัด\nหัวข้อ: ${episode.title} (${episode.id})\n\nเป้าหมายรอบนี้\n${episode.outcome}\n\nข้อมูลจริงของฉัน\n${context}\n\nงานที่อยากให้ช่วย\n${episode.prompt}\n\nวิธีช่วยฉัน\n- ใช้ข้อมูลด้านบนแทนช่อง [วงเล็บ] เท่าที่จับคู่ได้ ถ้าข้อมูลไม่พอ ให้ถามทีละข้อสั้น ๆ ก่อน\n- แยกสิ่งที่ฉันยืนยันแล้ว ออกจากข้อเสนอและข้อที่ยังต้องตรวจ ห้ามแต่งลูกค้า ยอดขาย รีวิว หรือตัวเลขที่ไม่มีข้อมูล\n- เมื่อข้อมูลพอ ให้ร่างชิ้นงานตามหัวข้อนี้ด้วยภาษาง่าย ใช้ตารางหรือรายการเฉพาะที่ช่วยให้ลงมือทำ\n- ปิดท้ายด้วยสิ่งที่ฉันควรตรวจด้วยตัวเอง และงานเล็กหนึ่งอย่างที่ทำต่อได้วันนี้\n- ไม่รับประกันรายได้ และไม่ขอข้อมูลส่วนตัวของลูกค้า\n\nสิ่งที่จะลองทำหลังคุยกับคุณ\n${episode.action}\n\nเริ่มช่วยฉันจากข้อมูลนี้ได้เลย`;
}

export function makeBackup(episode, values) {
  return {kind: BACKUP_KIND, schema_version: BACKUP_VERSION, episode_id: episode.id,
    title: episode.title, answers: cleanAnswers(values, episode.fields.length)};
}

export function parseBackup(text, episode) {
  if (typeof text !== 'string' || text.length > 100000) throw Error('ไฟล์ใหญ่เกินไป');
  let value;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw Error('ไฟล์นี้อ่านเป็น JSON ไม่ได้'); }
  if (!value || value.kind !== BACKUP_KIND || value.schema_version !== BACKUP_VERSION) throw Error('ไฟล์นี้ไม่ใช่ข้อมูลแบบฝึก myClover รุ่นที่รองรับ');
  if (value.episode_id !== episode.id) throw Error(`ไฟล์นี้เป็นของ ${String(value.episode_id).slice(0, 12)} กรุณาเปิดหน้าตอนนั้นก่อน`);
  if (!Array.isArray(value.answers) || value.answers.length !== episode.fields.length ||
    value.answers.some(answer => typeof answer !== 'string' || answer.length > MAX_ANSWER_LENGTH)) throw Error('ข้อมูลในไฟล์ไม่ครบหรือยาวเกินไป');
  return cleanAnswers(value.answers, episode.fields.length);
}

function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+\-@]/u.test(text) || /^[\t\r]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function makeCSV(episode, values = []) {
  const answers = cleanAnswers(values, episode.fields.length);
  return '\uFEFF' + [['หัวข้อ', episode.title], ['คำถาม', 'ข้อมูลของฉัน'],
    ...episode.fields.map((field, i) => [field, answers[i]])].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function sourceLabels(search) {
  const params = new URLSearchParams(search);
  const allowed = new Set(['instagram','facebook','youtube','tiktok','direct']);
  const source = params.get('utm_source') || 'direct';
  return {source: allowed.has(source) ? source : 'direct',
    medium: ['dm','comment','bio','video','link'].includes(params.get('utm_medium')) ? params.get('utm_medium') : 'link'};
}
