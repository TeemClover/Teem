import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,validateState,estimate,calendarDay,addDays,todayBangkok,validDate} from '../../eggcycle/cycle.js';
const start='2025-02-03';
test('28-day arithmetic: day 14, days 8–19, next period and ±2 estimate',()=>{
  const s=blankState(start),e=estimate(s,start);
  assert.equal(e.next,'2025-03-03');assert.equal(e.ovulation,'2025-02-16');assert.equal(e.ovulationFrom,'2025-02-14');assert.equal(e.ovulationTo,'2025-02-18');
  assert.equal(estimate(s,'2025-02-10').kind,'fertile');assert.equal(estimate(s,'2025-02-21').kind,'fertile');assert.equal(estimate(s,'2025-02-22').kind,'lower');
  assert.equal(estimate(s,'2025-03-03').kind,'unknown');assert.equal(estimate(s,'2025-04-03').kind,'unknown');
});
test('calendar never calls elapsed unconfirmed cycles lower risk; future period is clearly predicted',()=>{
  const s=blankState(start);assert.equal(calendarDay(s,'2025-03-03','2025-02-20').kind,'predicted');assert.equal(calendarDay(s,'2025-03-10','2025-02-20').kind,'unknown');
  s.periods.push({start:'2025-03-04',end:'2025-03-08'});assert.equal(estimate(s,'2025-03-04').day,1);assert.equal(estimate(s,'2025-03-07').estimated,false);
});
test('irregular intervals and unsupported cycle lengths suppress lower-risk interpretation',()=>{
  const s=blankState(start);s.cycleLength=35;assert.equal(estimate(s,'2025-02-22').kind,'unknown');assert.equal(estimate(s,'2025-02-22').regular,false);
  s.cycleLength=28;s.periods.push({start:'2025-03-13',end:null});assert.equal(estimate(s,'2025-03-20').kind,'unknown');
});
test('Bangkok midnight, leap years and invalid dates',()=>{
  assert.equal(todayBangkok(new Date('2025-02-03T17:00:00Z')),'2025-02-04');assert.equal(addDays('2024-02-28',1),'2024-02-29');assert.equal(validDate('2025-02-29'),false);
});
test('rejects future, duplicate and overlapping records; strips unknown fields',()=>{
  const s=blankState(start);assert.deepEqual(validateState({...s,secret:'ignored'},'2025-02-28'),s);
  for(const changed of [{...s,periods:[{start:'2025-03-01',end:null}]},{...s,cycleLength:0},{...s,periods:[...s.periods,...s.periods]},{...s,periods:[{start,end:'2025-02-10'},{start:'2025-02-09',end:null}]}])assert.throws(()=>validateState(changed,'2025-02-28'));
});
test('legacy notification settings are ignored when validating existing records',()=>{
  const s=blankState(start);assert.deepEqual(validateState({...s,notifications:{enabled:true,hour:8,detail:true}},'2025-02-28'),s);
});
