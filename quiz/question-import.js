import { checkQuestion, checkCustomQuestions, MIN_QUESTIONS, MAX_QUESTIONS } from './question-set.js';

export const IMPORT_LIMIT = 5 * 1024 * 1024;
export const IMPORT_ROW_LIMIT = 1000;
export const IMPORT_COLUMNS = ['โจทย์', 'คำตอบที่ถูก', 'คำตอบผิด 1', 'คำตอบผิด 2', 'คำตอบผิด 3'];
export class ImportError extends Error {
  constructor(message) { super(message);this.name = 'ImportError'; }
}
const text = value => value == null ? '' : String(value).normalize('NFC').trim().replace(/\s+/gu, ' ');
const label = value => text(value).toLowerCase().replace(/[\s\p{P}\p{S}\p{N}]/gu, '');
const questionLabels = new Set(['โจทย์', 'คำถาม', 'ข้อคำถาม', 'โจทย์คำถาม', 'question', 'questions', 'prompt', 'q']);
const correctLabels = new Set(['คำตอบที่ถูก', 'คำตอบถูก', 'คำตอบถูกต้อง', 'คำตอบที่ถูกต้อง', 'คำตอบ', 'เฉลย', 'correct', 'correctanswer', 'answer', 'rightanswer']);
const wrongLabel = value => /^(?:คำตอบ(?:ที่)?(?:ผิด|ผผิด)(?:ข้อ)?|คำตอบหลอก|ตัวเลือก(?:ที่)?ผิด|ตัวเลือก|wrong(?:answer)?|incorrect(?:answer)?|distractor)[abcกขค]?$/.test(label(value));

export function detectHeader(row) {
  // Do not discard a real question merely because its text contains "คำถาม".
  return questionLabels.has(label(row?.[0])) && correctLabels.has(label(row?.[1])) && [2, 3, 4].every(i => !text(row?.[i]) || wrongLabel(row?.[i]));
}

function parseDelimited(input, delimiter) {
  const rows = [];let row = [], value = '', quoted = false, closed = false;
  function cell() { row.push(value);value = '';closed = false;if (row.length > 32) throw new ImportError('ไฟล์มีคอลัมน์มากเกินไป ใช้เฉพาะ 5 คอลัมน์ A–E นะ'); }
  function record() { cell();rows.push(row);row = [];if (rows.length > IMPORT_ROW_LIMIT) throw new ImportError('ไฟล์มีเกิน 1,000 แถว กรุณาแยกเฉพาะคำถาม 5–20 ข้อ'); }
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"') { if (input[i + 1] === '"') { value += '"';i++; } else { quoted = false;closed = true; } }
      else value += c;
    } else if (c === delimiter) cell();
    else if (c === '\r' || c === '\n') { record();if (c === '\r' && input[i + 1] === '\n') i++; }
    else if (closed) { if (c !== ' ' && c !== '\t') throw new ImportError('CSV มีเครื่องหมายคำพูดไม่ถูกต้อง กรุณาบันทึกไฟล์ CSV ใหม่'); }
    else if (c === '"') { if (value.trim()) throw new ImportError('CSV มีเครื่องหมายคำพูดกลางช่องข้อมูล กรุณาครอบข้อความด้วยเครื่องหมายคำพูดให้ครบ');value = '';quoted = true; }
    else value += c;
    if (value.length > 10000) throw new ImportError('มีช่องข้อมูลยาวเกินไป กรุณาใช้เฉพาะโจทย์และคำตอบสั้น ๆ');
  }
  if (quoted) throw new ImportError('CSV มีเครื่องหมายคำพูดที่ยังปิดไม่ครบ');
  if (row.length || value || closed) record();
  return rows;
}
export function parseCSV(input) {
  let source = String(input).replace(/^\uFEFF/, ''), rowOffset = 0;
  const directive = source.match(/^sep=([,;\t])\r?\n/i);
  if (directive) { source = source.slice(directive[0].length);rowOffset = 1; }
  const choices = directive ? [directive[1]] : [',', ';', '\t'];
  const candidates = [];let failure;
  for (const delimiter of choices) {
    try {
      const rows = parseDelimited(source, delimiter);
      const sample = rows.filter(r => r.some(v => text(v))).slice(0, 10);
      const score = sample.reduce((sum, r) => sum + (r.length === 5 ? 10 : r.length > 1 ? 1 : 0), 0);
      candidates.push({ rows, delimiter, rowOffset, score });
    } catch (error) { failure = error; }
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length || (!candidates[0].score && failure)) throw failure || new ImportError('อ่าน CSV ไม่สำเร็จ');
  return candidates[0];
}
export function decodeCSV(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch {
    const decoded = new TextDecoder('windows-874').decode(bytes);
    if (decoded.includes('\uFFFD')) throw new ImportError('อ่านภาษาใน CSV ไม่สำเร็จ กรุณาบันทึกแบบ CSV UTF-8');
    return decoded;
  }
}

const issueText = {
  BAD_QUESTION_TEXT: 'โจทย์ต้องไม่ว่างและไม่เกิน 240 ตัวอักษร',
  BAD_OPTIONS: 'กรอกคำตอบให้ครบ 4 ช่อง ช่องละไม่เกิน 100 ตัวอักษร',
  DUPLICATE_OPTIONS: 'คำตอบทั้ง 4 ช่องต้องไม่ซ้ำกัน',
};
export function analyzeRows(rows, { header = 'auto', rowOffset = 0, extraRows = [] } = {}) {
  if (!['auto', 'header', 'question'].includes(header)) throw new ImportError('เลือกรูปแบบแถวแรกอีกครั้ง');
  const extras = new Set(extraRows);
  const entries = rows.map((row, index) => ({ row: Array.from(row || [], text), number: index + rowOffset + 1 }))
    .filter(entry => entry.row.some(Boolean) || extras.has(entry.number));
  const first = entries[0] || null, detectedHeader = !!first && detectHeader(first.row);
  const skipHeader = header === 'header' || (header === 'auto' && detectedHeader);
  const data = first && skipHeader ? entries.slice(1) : entries;
  const issues = [], questions = [];
  if (data.length < MIN_QUESTIONS || data.length > MAX_QUESTIONS) issues.push({ row: null, message: `พบ ${data.length} ข้อ · นำเข้าได้ ${MIN_QUESTIONS}–${MAX_QUESTIONS} ข้อต่อห้อง` });
  for (const entry of data) {
    if (entry.row.slice(5).some(Boolean) || extras.has(entry.number)) issues.push({ row: entry.number, message: 'พบข้อมูลเกินคอลัมน์ E กรุณาใช้ 5 คอลัมน์ตามลำดับที่กำหนด' });
    const item = { text: entry.row[0] || '', options: Array.from({ length: 4 }, (_, i) => entry.row[i + 1] || '') };
    const checked = checkQuestion(item, questions.length);
    if (checked.error) issues.push({ row: entry.number, message: issueText[checked.error] || 'ตรวจข้อมูลแถวนี้อีกครั้ง' });
    questions.push(checked.question || item);
  }
  return { first, detectedHeader, skipHeader, data, count: data.length, issues, questions, valid: issues.length === 0 && checkCustomQuestions(questions).ok };
}

// Keep physical row numbers, formatted numeric choices and rows with extra columns.
export function workbookSheets(XLSX, workbook) {
  if (!workbook?.SheetNames?.length) throw new ImportError('ไฟล์ Excel ไม่มีชีตข้อมูล');
  if (workbook.SheetNames.length > 30) throw new ImportError('ไฟล์มีชีตมากเกินไป กรุณาแยกชีตคำถามออกมาเป็นไฟล์ใหม่');
  return workbook.SheetNames.map(name => {
    try {
    const sheet = workbook.Sheets[name];
    if (!sheet?.['!ref']) return { name, rows: [], extraRows: [] };
    const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref']);
    if (range.e.r >= IMPORT_ROW_LIMIT) throw new ImportError(`ชีต “${name}” มีช่วงข้อมูลเกิน 1,000 แถว กรุณาแยกเฉพาะคำถาม`);
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true, range: { s: { r: 0, c: 0 }, e: { r: range.e.r, c: 4 } } });
    const extraRows = [];
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!') || !/^[A-Z]+\d+$/.test(address)) continue;
      const pos = XLSX.utils.decode_cell(address), cell = sheet[address];
      if (pos.c >= 5 && text(cell?.v)) extraRows.push(pos.r + 1);
      if (pos.c < 5 && cell?.t === 'e') throw new ImportError(`ชีต “${name}” ช่อง ${address} มีค่าผิดพลาดใน Excel กรุณาแก้เซลล์ก่อนนำเข้า`);
      if (pos.c < 5 && cell?.f && cell.v == null) throw new ImportError(`ชีต “${name}” ช่อง ${address} เป็นสูตรที่ไม่มีค่าบันทึกไว้ กรุณาบันทึกจาก Excel อีกครั้งหรือวางเป็นค่า`);
    }
    return { name, rows, extraRows };
    } catch (error) { return { name, rows: [], extraRows: [], error: error.message || 'อ่านชีตนี้ไม่สำเร็จ' }; }
  });
}

export async function readQuizFile(buffer, extension) {
  if (!buffer?.byteLength || buffer.byteLength > IMPORT_LIMIT) throw new ImportError('เลือกไฟล์ที่มีข้อมูลและมีขนาดไม่เกิน 5 MB');
  if (extension === 'csv') {
    const parsed = parseCSV(decodeCSV(buffer));
    return [{ name: 'CSV', rows: parsed.rows, rowOffset: parsed.rowOffset, extraRows: [] }];
  }
  if (extension !== 'xlsx') throw new ImportError('รองรับเฉพาะไฟล์ .xlsx และ .csv');
  const signature = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (signature[0] !== 0x50 || signature[1] !== 0x4b) throw new ImportError('ไฟล์นี้ไม่ใช่ .xlsx ปกติ หรือมีการตั้งรหัสผ่าน กรุณาบันทึกเป็น .xlsx ที่ไม่ตั้งรหัสผ่าน');
  // Vendored official SheetJS: loaded on demand, with no external CDN at runtime.
  const XLSX = await import('./vendor/sheetjs-0.20.3.mjs');
  let workbook;
  try { workbook = XLSX.read(buffer, { type: 'array', cellFormula: true, cellText: true, cellHTML: false, sheetRows: 1001 }); }
  catch { throw new ImportError('อ่านไฟล์ Excel ไม่สำเร็จ กรุณาตรวจไฟล์หรือบันทึกเป็น .xlsx ใหม่'); }
  return workbookSheets(XLSX, workbook);
}
