import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as XLSX from '../../quiz/vendor/sheetjs-0.20.3.mjs';
import { detectHeader, parseCSV, decodeCSV, analyzeRows, workbookSheets, readQuizFile, IMPORT_COLUMNS, IMPORT_LIMIT } from '../../quiz/question-import.js';
import { prepareQuestions } from '../../api/_lib/quiz/game.js';
import { mountImportPanel } from '../../quiz/import-panel.js';
import { restoreDraft } from '../../quiz/question-set.js';

const rows = count => Array.from({ length: count }, (_, i) => [`คำถามที่ ${i + 1}`, `ถูก ${i + 1}`, 'ผิด A', 'ผิด B', 'ผิด C']);
const bytes = text => new TextEncoder().encode(text).buffer;
const csv = data => data.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\r\n');
function xlsx(data) {
  const book = XLSX.utils.book_new();
  for (const [name, dataRows] of data) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(dataRows), name);
  return XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
}

test('first-row detection recognizes full or partially labeled headers without guessing from question text alone', () => {
  assert.equal(detectHeader(IMPORT_COLUMNS), true);
  assert.equal(detectHeader(['คำถาม', 'คำตอบที่ถูก', '', '', '']), true);
  assert.equal(detectHeader(['Question', 'Correct Answer', 'Wrong Answer 1', 'Wrong Answer 2', 'Wrong Answer 3']), true);
  assert.equal(detectHeader(['คำถาม', 'คำตอบถูกต้อง', 'คำตอบผิด๑', 'คำตอบผิด๒', 'คำตอบผิด๓']), true);
  assert.equal(detectHeader(['โจทย์', 'เฉลย', 'คำตอบผผิด 1', 'คำตอบผผิด 2', 'คำตอบผผิด 3']), true);
  assert.equal(detectHeader(['คำถาม', 'กรุงเทพ', 'หาดใหญ่', 'เชียงใหม่', 'ภูเก็ต']), false);
  assert.equal(detectHeader(['คำถามนี้มีคำตอบที่ถูกกี่ข้อ?', '1', '2', '3', '4']), false);
});

test('header and no-header files keep every question, preserve source row numbers and allow overrides', () => {
  const withHeader = analyzeRows([IMPORT_COLUMNS, ...rows(5)]);
  assert.equal(withHeader.valid, true);assert.equal(withHeader.count, 5);assert.equal(withHeader.data[0].number, 2);assert.equal(withHeader.skipHeader, true);
  const noHeader = analyzeRows(rows(5));assert.equal(noHeader.valid, true);assert.equal(noHeader.count, 5);assert.equal(noHeader.data[0].number, 1);assert.equal(noHeader.questions[0].text, 'คำถามที่ 1');
  assert.equal(analyzeRows([IMPORT_COLUMNS, ...rows(5)], { header: 'question' }).count, 6);
  assert.equal(analyzeRows(rows(6), { header: 'header' }).count, 5);
  const blank = analyzeRows([[], [], IMPORT_COLUMNS, ...rows(5), []]);assert.equal(blank.first.number, 3);assert.equal(blank.data[0].number, 4);assert.equal(blank.count, 5);
});

test('CSV handles BOM, quotes, escaped quotes, embedded commas/newlines, CRLF, semicolons and tabs', () => {
  const sample = rows(5);sample[0] = ['ใครพูดว่า "พร้อม, เล่น"\nในงาน?', 'ทีม', 'ทอม', 'เอโกะ', 'จา'];
  const parsed = parseCSV('\ufeff' + csv([IMPORT_COLUMNS, ...sample]));
  assert.deepEqual(parsed.rows[1], sample[0]);assert.equal(parsed.delimiter, ',');assert.equal(analyzeRows(parsed.rows).valid, true);
  for (const delimiter of [';', '\t']) {
    const text = [IMPORT_COLUMNS, ...rows(5)].map(row => row.join(delimiter)).join('\r\n');
    const result = parseCSV(text);assert.equal(result.delimiter, delimiter);assert.equal(analyzeRows(result.rows).count, 5);
  }
  const excel = parseCSV('sep=;\r\n' + [IMPORT_COLUMNS, ...rows(5)].map(row => row.join(';')).join('\n'));
  assert.equal(excel.rowOffset, 1);assert.equal(analyzeRows(excel.rows, excel).first.number, 2);
  assert.throws(() => parseCSV('"คำถาม,ไม่ปิดเครื่องหมาย'), /ปิดไม่ครบ/);
  assert.throws(() => parseCSV('"คำถาม"oops,ถูก,ก,ข,ค'), /เครื่องหมายคำพูด/);
});

test('CSV decodes UTF-8 and UTF-16 Excel exports, including Thai Windows-874', () => {
  const source = csv([IMPORT_COLUMNS, ...rows(5)]);
  assert.equal(decodeCSV(bytes('\ufeff' + source)), source);
  const le = Buffer.from('\ufeff' + source, 'utf16le');assert.equal(decodeCSV(le), source);
  const be = Buffer.from(le);be.swap16();assert.equal(decodeCSV(be), source);
  // Windows-874/TIS-620 bytes for the Thai word "ไทย".
  assert.equal(decodeCSV(Uint8Array.from([0xe4, 0xb7, 0xc2])), 'ไทย');
});

test('invalid rows report physical row numbers; oversized sets and extra data never truncate silently', () => {
  for (const count of [4, 21]) { const result = analyzeRows(rows(count));assert.equal(result.valid, false);assert.equal(result.count, count);assert.match(result.issues[0].message, /5–20/); }
  const data = [IMPORT_COLUMNS, ...rows(5)];data[2][1] = '';data[4][4] = 'ผิด A';
  const result = analyzeRows(data);assert.equal(result.valid, false);assert.deepEqual(result.issues.map(issue => issue.row), [3, 5]);
  const extra = [IMPORT_COLUMNS, ...rows(5)];extra[1].push('คอลัมน์ที่ไม่ได้กำหนด');assert.match(analyzeRows(extra).issues[0].message, /คอลัมน์ E/);
  const long = rows(5);long[2][0] = 'ก'.repeat(241);assert.equal(analyzeRows(long).issues[0].row, 3);
  const dup = rows(5);dup[1][1] = 'Ａ';dup[1][2] = 'a';assert.match(analyzeRows(dup).issues[0].message, /ไม่ซ้ำ/);
  const emoji = rows(5);emoji[0][0] = 'ก'.repeat(239) + '✦';emoji[0][1] = 'ก'.repeat(99) + '🙂';
  const valid = analyzeRows(emoji);assert.equal(valid.valid, true);
  assert.equal(restoreDraft({ count: 5, questions: valid.questions }).questions[0].options[0], emoji[0][1], 'valid Unicode imports cannot be truncated in the editor draft');
});

test('real XLSX binaries parse locally with multiple worksheets, formatted numbers and no header', async () => {
  assert.equal(XLSX.version, '0.20.3');
  const sample = rows(5), book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['หมายเหตุ']]), 'โน้ต');
  const sheet = XLSX.utils.aoa_to_sheet([[], IMPORT_COLUMNS, ...sample]);
  sheet.B3 = { t: 'n', v: 7, z: '000' };
  XLSX.utils.book_append_sheet(book, sheet, 'คำถามจริง');
  const data = XLSX.write(book, { type: 'array', bookType: 'xlsx', compression: true });
  const sheets = await readQuizFile(data, 'xlsx');assert.equal(sheets.length, 2);
  const result = analyzeRows(sheets[1].rows);assert.equal(result.first.number, 2);assert.equal(result.valid, true);assert.equal(result.questions[0].options[0], '007');
  const plain = await readQuizFile(xlsx([['ไม่มีหัวตาราง', rows(20)]]), 'xlsx');
  assert.equal(analyzeRows(plain[0].rows).valid, true);assert.equal(analyzeRows(plain[0].rows).count, 20);
  const partial = await readQuizFile(xlsx([['เหมือนไฟล์เดิม', [['คำถาม', 'คำตอบที่ถูก', '', '', ''], ...rows(12)]]]), 'xlsx');
  assert.equal(analyzeRows(partial[0].rows).valid, true);assert.equal(analyzeRows(partial[0].rows).count, 12);
});

test('XLSX extra columns and formula-only cells are visible errors, isolated to the affected worksheet', async () => {
  const extra = rows(5);extra[2].push('ไม่ให้หายไป');
  const sheets = await readQuizFile(xlsx([['เกินคอลัมน์', [IMPORT_COLUMNS, ...extra]], ['ปกติ', [IMPORT_COLUMNS, ...rows(5)]]]), 'xlsx');
  assert.equal(analyzeRows(sheets[0].rows, sheets[0]).valid, false);assert.equal(analyzeRows(sheets[0].rows, sheets[0]).issues[0].row, 4);
  assert.equal(analyzeRows(sheets[1].rows).valid, true);
  const model = { SheetNames: ['สูตร', 'ปกติ'], Sheets: { สูตร: { '!ref': 'A1:E6', A2: { t: 'n', f: '1+1' } }, ปกติ: XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS, ...rows(5)]) } };
  const parsed = workbookSheets(XLSX, model);assert.match(parsed[0].error, /สูตร/);assert.equal(analyzeRows(parsed[1].rows).valid, true);
  model.Sheets.สูตร.A2 = { t: 'e', v: 7 };assert.match(workbookSheets(XLSX, model)[0].error, /ค่าผิดพลาด/);
});

test('CSV sample is importable; imported column B remains the correct answer after room shuffling', async () => {
  const sample = await readFile(new URL('../../quiz/templates/quiz-import.csv', import.meta.url));
  const imported = await readQuizFile(sample, 'csv'), result = analyzeRows(imported[0].rows);
  assert.equal(result.valid, true);assert.equal(result.count, 5);
  for (const [index, question] of prepareQuestions(20, result.questions).entries()) assert.equal(question.options[question.correctIndex], result.questions[index].options[0]);
  await assert.rejects(readQuizFile(new ArrayBuffer(0), 'csv'), /5 MB/);
  await assert.rejects(readQuizFile(new ArrayBuffer(IMPORT_LIMIT + 1), 'csv'), /5 MB/);
  await assert.rejects(readQuizFile(bytes('not xlsx'), 'xlsx'), /ไม่ใช่ .xlsx/);
  await assert.rejects(readQuizFile(bytes('data'), 'xls'), /เฉพาะ/);
});

test('import review blocks room creation until apply or cancel; stale file results never replace the latest review', async t => {
  const originalWorker = globalThis.Worker, workers = [], pending = [], imported = [];
  globalThis.Worker = class {
    constructor() { workers.push(this); }
    postMessage(data) { this.data = data; }
    terminate() { this.terminated = true; }
  };
  t.after(() => { globalThis.Worker = originalWorker; });
  const selectors = ['[data-import-file]', '[data-import-status]', '[data-import-review]', '[data-import-sheet]', '[data-import-header]', '[data-import-apply]', '[data-import-choose]', '[data-import-detection]', '[data-import-first]', '[data-import-total]', '[data-import-issues]', '[data-import-rows]', '[data-sheet-label]', '.import-actions'];
  const nodes = new Map(selectors.map(selector => [selector, { hidden: true, value: '', events: {}, addEventListener(type, fn) { this.events[type] = fn; }, click() {}, append(child) { this.child = child; } }]));
  const root = { isConnected: true, ownerDocument: { createElement: () => ({}) }, querySelector: selector => nodes.get(selector) };
  const dispose = mountImportPanel(root, { onPending: value => pending.push(value), onImport: async questions => imported.push(questions) });t.after(dispose);
  async function choose(name) { nodes.get('[data-import-file]').files = [{ name, size: 20, arrayBuffer: async () => bytes('test') }];await nodes.get('[data-import-file]').events.change(); }
  await choose('first.csv');await choose('latest.csv');assert.equal(pending.at(-1), true);assert.equal(workers[0].terminated, true);
  workers[0].onmessage({ data: { ok: true, sheets: [{ name: 'old', rows: rows(5) }] } });
  assert.equal(nodes.get('[data-import-review]').hidden, true);
  const latestRows = rows(5);latestRows[0][0] = '<script>คำถาม</script>';
  workers[1].onmessage({ data: { ok: true, sheets: [{ name: 'new', rows: [IMPORT_COLUMNS, ...latestRows] }] } });
  assert.equal(nodes.get('[data-import-review]').hidden, false);assert.equal(nodes.get('[data-import-apply]').disabled, false);
  assert.ok(nodes.get('[data-import-rows]').innerHTML.includes('&lt;script&gt;'));assert.ok(!nodes.get('[data-import-rows]').innerHTML.includes('<script>'));
  assert.equal(imported.length, 0);await nodes.get('[data-import-apply]').onclick();
  assert.equal(imported.length, 1);assert.equal(imported[0].length, 5);assert.equal(pending.at(-1), false);
  await choose('cancel.csv');nodes.get('.import-actions').child.onclick();assert.equal(pending.at(-1), false);
  workers[2].onmessage({ data: { ok: true, sheets: [{ name: 'cancelled', rows: rows(5) }] } });
  assert.equal(nodes.get('[data-import-review]').hidden, true);assert.equal(imported.length, 1);
});
