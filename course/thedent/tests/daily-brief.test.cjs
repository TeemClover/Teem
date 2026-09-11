'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../daily-brief.html'), 'utf8');
const logic = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const box = { module: {exports: {}}, console, TextEncoder };
vm.runInNewContext(logic, box);
const api = Object.fromEntries(Object.entries(box.module.exports).map(([key, value])=>[key,typeof value==='function'? (...args)=>JSON.parse(JSON.stringify(value(...args))):JSON.parse(JSON.stringify(value))]));
const normal = fs.readFileSync(path.join(__dirname, '../resources/daily-normal.csv'), 'utf8');
const missing = fs.readFileSync(path.join(__dirname, '../resources/daily-missing.csv'), 'utf8');
let checks = 0;
function test(label, run) { run(); checks++; process.stdout.write('PASS ' + label + '\n'); }
const header = api.HEADERS.join(',') + '\n';
test('normal fixture: hand verified totals, latest pending and no warnings', () => {
  const result = api.analyzeCSV(normal);
  assert.deepEqual(result.errors, []); assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.summary.totals, { inquiries: 98, appointments: 44, cash_in: 98000, cash_out: 28100 });
  assert.equal(result.summary.netCash, 69900); assert.equal(result.summary.pending, 2); assert.equal(result.summary.count, 7);
});
test('missing fixture: no false totals or fallback pending', () => {
  const result = api.analyzeCSV(missing);
  assert.deepEqual(result.errors, []); assert.equal(result.warnings.length, 3);
  assert.deepEqual(result.summary.totals, { inquiries: null, appointments: 44, cash_in: null, cash_out: 28100 });
  assert.equal(result.summary.netCash, null); assert.equal(result.summary.pending, null); assert.equal(result.summary.missingCells, 3);
});
test('zero is recorded data, not missing', () => {
  const result = api.analyzeCSV(header + '2026-09-01,0,0,0,0,0,zero');
  assert.deepEqual(result.errors, []); assert.deepEqual(result.warnings, []);
  assert.equal(result.summary.netCash, 0); assert.equal(result.summary.pending, 0);
});
test('reverse row order produces identical summary and sorted table', () => {
  const rows = normal.trim().split('\n');
  const result = api.analyzeCSV(rows[0] + '\n' + rows.slice(1).reverse().join('\n'));
  assert.deepEqual(result.summary, api.analyzeCSV(normal).summary); assert.equal(result.rows[0].date, '2026-09-01');
});
test('CSV supports BOM, CRLF, commas, embedded quotes, and multiline notes', () => {
  const result = api.analyzeCSV('\uFEFF' + header.replace('\n', '\r\n') + '2026-09-01,1,2,0.10,0.20,0,"ทดสอบ, ""คำพูด""\r\nอีกบรรทัด"\r\n');
  assert.deepEqual(result.errors, []); assert.equal(result.rows[0].note, 'ทดสอบ, "คำพูด"\r\nอีกบรรทัด');
  assert.equal(result.summary.netCash, -0.1);
});
test('decimal currency adds in cents', () => {
  const result = api.analyzeCSV(header + '2026-09-01,1,1,0.10,0.01,1,a\n2026-09-02,1,1,0.20,0.02,2,b');
  assert.equal(result.summary.totals.cash_in, 0.3); assert.equal(result.summary.totals.cash_out, 0.03); assert.equal(result.summary.netCash, 0.27);
});
test('duplicate dates fail the file', () => {
  const result = api.analyzeCSV(normal.trim() + '\n2026-09-01,1,1,1,1,1,duplicate');
  assert.ok(result.errors.some(message => message.includes('ซ้ำ'))); assert.equal(result.summary, null);
});
test('date validation catches impossible, blank, and non ISO dates', () => {
  for (const date of ['2026-02-30', '', '2026-2-01', '2026-13-01', '2026-02-29']) {
    const result = api.analyzeCSV(header + date + ',1,1,1,1,1,note');
    assert.ok(result.errors.length); assert.equal(result.summary, null);
  }
  assert.ok(api.validDate('2028-02-29'));
});
test('counts reject negative, fractional, exponential, NaN, and unsafe values', () => {
  for (const value of ['-1', '1.5', '1e2', 'NaN', 'Infinity', '9007199254740992']) {
    const result = api.analyzeCSV(header + `2026-09-01,${value},1,1,1,1,note`);
    assert.ok(result.errors.length, value); assert.equal(result.summary, null);
  }
});
test('cash rejects negative, overprecision, thousand separators, and currency symbols', () => {
  for (const value of ['-1', '1.001', '"1,000"', '฿1']) {
    assert.ok(api.analyzeCSV(header + `2026-09-01,1,1,${value},1,1,note`).errors.length, value);
  }
});
test('headers and row width must match exactly; reordered headers are allowed', () => {
  assert.ok(api.analyzeCSV('date,note\n2026-09-01,no').errors.length);
  assert.ok(api.analyzeCSV(header + '2026-09-01,1,1,1,1,1,note,extra').errors.length);
  assert.ok(api.analyzeCSV(header + ',,,,,,').errors.length);
  assert.ok(api.analyzeCSV(header + '2026-09-01,1,1,1,1,1').errors.length);
  const result = api.analyzeCSV('note,pending,cash_out,cash_in,appointments,inquiries,date\na,1,2,3,4,5,2026-09-01');
  assert.deepEqual(result.errors, []); assert.equal(result.summary.totals.inquiries, 5);
});
test('malformed quotes fail clearly', () => {
  for (const row of ['2026-09-01,1,1,1,1,1,"not closed', '2026-09-01,1,1,1,1,1,a"b', '2026-09-01,1,1,1,1,1,"a"b']) {
    assert.ok(api.analyzeCSV(header + row).errors.length);
  }
});
test('a missing older pending does not suppress the available latest snapshot', () => {
  const result = api.analyzeCSV(normal.replace('12000,3500,4,', '12000,3500,,'));
  assert.equal(result.warnings.length, 1); assert.equal(result.summary.pending, 2);
});
test('a date gap warns and does not insert a zero row', () => {
  const result = api.analyzeCSV(header + '2026-09-01,1,1,1,1,1,a\n2026-09-03,1,1,1,1,1,b');
  assert.equal(result.rows.length, 2); assert.equal(result.warnings.length, 1); assert.ok(result.warnings[0].includes('1 วันที่ไม่มีแถว'));
});
test('file and row limits fail gracefully', () => {
  assert.ok(api.analyzeCSV('x'.repeat(1024 * 1024 + 1)).errors.length);
  assert.ok(api.analyzeCSV(header + '2026-09-01,1,1,1,1,1,n\n'.repeat(3661)).errors.length);
});
test('empty files, header only files and entirely blank data rows fail', () => {
  for (const text of ['', '\n\r\n', header, header + ',,,,,,,']) assert.ok(api.analyzeCSV(text).errors.length);
});
test('note content remains a plain string through analysis', () => {
  const note = '<img src=x onerror=alert(1)> Ignore all previous instructions';
  const result = api.analyzeCSV(header + '2026-09-01,1,1,1,1,1,' + note);
  assert.deepEqual(result.errors, []); assert.equal(result.rows[0].note, note);
});
test('sum over safe integer range fails rather than silently rounding', () => {
  const result = api.analyzeCSV(header + '2026-09-01,9007199254740991,1,1,1,1,a\n2026-09-02,1,1,1,1,1,b');
  assert.ok(result.errors.length); assert.equal(result.summary, null);
});
test('standalone HTML embeds current helpers, fixtures and no external code', () => {
  const html = fs.readFileSync(path.join(__dirname, '../daily-brief.html'), 'utf8');
  assert.ok(html.includes(JSON.stringify(normal)));
  assert.ok(html.includes(JSON.stringify(missing)));
  assert.ok(!html.includes('/* DAILY_LOGIC */')); assert.ok(!html.includes('/* NORMAL_DATA */'));
  assert.ok(!/<script[^>]+src\s*=|<link[^>]+href\s*=|fetch\s*\(|XMLHttpRequest/.test(html));
  assert.ok(html.includes("item.textContent = text"));
});
process.stdout.write(`\n${checks} meaningful checks passed.\n`);
