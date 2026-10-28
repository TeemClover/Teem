import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPrompt,makeBackup,parseBackup,makeCSV,cleanAnswers,sourceLabels,MAX_ANSWER_LENGTH} from '../../start/start-domain.mjs';
const catalog=JSON.parse(readFileSync(new URL('../../start/catalog.json',import.meta.url),'utf8'));
const ep=catalog.episodes.find(e=>e.id==='MC11');

test('all 30 topic prompts carry the matching task, fields and next action',()=>{
  for(const item of catalog.episodes){
    const prompt=buildPrompt(item,['ข้อมูลจริง ก','ข้อมูลจริง ข','ข้อมูลจริง ค']);
    assert.ok(prompt.includes(item.id));assert.ok(prompt.includes(item.prompt));
    assert.ok(prompt.includes(item.action));assert.ok(item.fields.every(f=>prompt.includes(f)));
    assert.ok(prompt.includes('ข้อมูลจริง ข'));assert.ok(!prompt.includes('undefined'));
  }
});
test('blank and partial answers explicitly ask for missing information',()=>{
  const prompt=buildPrompt(ep,['ยอดขายจริง 200','','']);
  assert.equal((prompt.match(/ยังไม่มีข้อมูล — ช่วยถามฉันก่อน/g)||[]).length,2);
  assert.ok(prompt.includes('ยอดขายจริง 200'));assert.ok(prompt.includes('ห้ามแต่งลูกค้า'));
});
test('backup round trip retains Thai and multiline answers without another topic',()=>{
  const answers=['ต้นทุนจริง\n300','แรงงาน 2 ชั่วโมง','ยังไม่รู้ค่าส่ง'];
  const backup=JSON.stringify(makeBackup(ep,answers));
  assert.deepEqual(parseBackup(backup,ep),answers);
  assert.throws(()=>parseBackup(backup,catalog.episodes[0]),/กรุณาเปิดหน้าตอนนั้น/);
});
test('malformed, oversized and mismatched backups cannot silently replace answers',()=>{
  const base=makeBackup(ep,['ก','ข','ค']);
  for(const text of ['x','null',JSON.stringify({...base,schema_version:99}),JSON.stringify({...base,answers:['ก']}),JSON.stringify({...base,answers:[{},'ข','ค']}),JSON.stringify({...base,answers:['a'.repeat(MAX_ANSWER_LENGTH+1),'ข','ค']})]) assert.throws(()=>parseBackup(text,ep));
  assert.throws(()=>parseBackup(' '.repeat(100001),ep));
});
test('answer normalization bounds input and does not turn objects into prompt instructions',()=>{
  const result=cleanAnswers([{},'x'.repeat(5000)]);
  assert.equal(result[0],'');assert.equal(result[1].length,4000);assert.equal(result[2],'');
});
test('CSV preserves Thai, quotes and newlines, and neutralizes spreadsheet formulas',()=>{
  const csv=makeCSV(ep,['=HYPERLINK("https://invalid")','ข้อความ,"สอง"\nบรรทัด','@SUM(1)']);
  assert.equal(csv.charCodeAt(0),0xFEFF);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'@SUM"));
  assert.ok(csv.includes('ข้อความ,""สอง""\nบรรทัด'));assert.ok(csv.includes(ep.fields[0]));
});
test('source labels do not carry raw queries or contact IDs',()=>{
  assert.deepEqual(sourceLabels('?utm_source=instagram&utm_medium=dm&email=private'),{source:'instagram',medium:'dm'});
  assert.deepEqual(sourceLabels('?utm_source=person@example.com&utm_medium=contact-123'),{source:'direct',medium:'link'});
});
