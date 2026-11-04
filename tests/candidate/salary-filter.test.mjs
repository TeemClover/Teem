import test from 'node:test';
import assert from 'node:assert/strict';
import {salaryRange,matchesSalary,salaryCounts,salaryFilterLabel} from '../../candidate/salary-filter.js';
import {matchesAddedDay} from '../../candidate/added-date.js';

test('declared monthly expectations support SEEK K notation, source annotations and Thai digits',()=>{
 for(const value of ['฿35K','35,000 บาท/เดือน — คำตอบคัดกรอง JobsDB','เงินเดือนที่คาดหวัง: ๓๕,๐๐๐ บาท ต่อรองได้ (ตาม PDF)','THB 35k/month']){
  assert.deepEqual(salaryRange(value),{min:35000,max:35000});
 }
 assert.deepEqual(salaryRange('25,000 บาท (ตาม PDF หน้า 2)'),{min:25000,max:25000});
});
test('declared ranges overlap the inclusive budget, including the boundary',()=>{
 const candidate={salary_expectation:'25,000–30,000 บาท ต่อรองได้ (ตาม PDF)'};
 assert.deepEqual(salaryRange(candidate.salary_expectation),{min:25000,max:30000});
 assert.deepEqual(salaryRange('25–30K'),{min:25000,max:30000});
 assert.deepEqual(salaryRange('฿25K – ฿30K'),{min:25000,max:30000});
 assert.equal(matchesSalary(candidate,{min:30000,max:35000}),true);
 assert.equal(matchesSalary(candidate,{min:30001,max:35000}),false);
 assert.equal(matchesSalary(candidate,{min:10000,max:24999}),false);
});
test('an open-ended expectation is never treated as a capped or zero expectation',()=>{
 const high={salary_expectation:'฿200K หรือมากกว่า'};
 assert.deepEqual(salaryRange(high.salary_expectation),{min:200000,max:Infinity});
 assert.deepEqual(salaryRange('27,000 บาทขึ้นไป ต่อรองได้ (ตาม PDF)'),{min:27000,max:Infinity});
 assert.equal(matchesSalary(high,{max:70000}),false);
 assert.equal(matchesSalary(high,{min:250000}),true);
 assert.deepEqual(salaryRange('ไม่เกิน 30,000 บาท/เดือน'),{min:0,max:30000});
});
test('blank, negotiable-only and unsupported or ambiguous amounts remain in the confirmation group',()=>{
 const unknown=['','ยังไม่แจ้ง','สามารถเจรจาต่อรองได้ (ตาม PDF)','เงินเดือนปัจจุบัน 25,000 บาท','USD 2,000','600,000 บาท/ปี','1,000 บาท/วัน','0 บาท','30,000–25,000 บาท','25,000 หรือ 40,000 บาท','โทร 0812345678','25,000 บาท + ค่าคอมมิชชั่น 5,000 บาท'];
 for(const value of unknown){
  const card={salary_expectation:value};
  assert.equal(salaryRange(value),null,value);
  assert.equal(matchesSalary(card,{mode:'unknown'}),true,value);
  assert.equal(matchesSalary(card,{mode:'known'}),false,value);
  assert.equal(matchesSalary(card,{max:30000}),false,value);
  assert.equal(matchesSalary(card),true,value);
 }
});
test('salary and application date filters compose without mutating or removing any stored applicant',()=>{
 const cards=[
  {id:'a',applied_at:'2026-10-30T03:00:00Z',salary_expectation:'฿30K'},
  {id:'b',applied_at:'2026-11-01T03:00:00Z',salary_expectation:''},
  {id:'c',applied_at:'2026-11-01T03:00:00Z',profile:{salaryExpectation:'40,000–50,000 บาท (ตาม PDF)'}},
  {id:'d',applied_at:'2026-11-02T03:00:00Z',salary_expectation:'สามารถเจรจาต่อรองได้ (ตาม PDF)'}
 ];
 const before=structuredClone(cards),day=cards.filter(c=>matchesAddedDay(c,'2026-11-01'));
 assert.deepEqual(day.filter(c=>matchesSalary(c,{min:35000,max:40000})).map(c=>c.id),['c']);
 assert.deepEqual(day.filter(c=>matchesSalary(c,{mode:'unknown'})).map(c=>c.id),['b']);
 assert.deepEqual(salaryCounts(cards),{all:4,known:2,unknown:2});
 assert.deepEqual(cards.filter(c=>matchesSalary(c)).map(c=>c.id),['a','b','c','d']);
 assert.deepEqual(cards,before);
 assert.equal(salaryFilterLabel({min:25000,max:40000}),'คาดหวัง 25,000–40,000 บาท/เดือน');
});
