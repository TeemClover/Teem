// Read only the declared expectation; never substitute current pay or infer missing pay.
const thaiDigits='๐๑๒๓๔๕๖๗๘๙';
const number='((?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)';
const amount=number+'\\s*(k|พัน|หมื่น)?';
const declaration=new RegExp('^฿?\\s*'+amount+'(?:\\s*(?:-|–|—|ถึง|to)\\s*฿?\\s*'+amount+')?(.*)$','i');

export function salaryRange(value){
 let text=String(value??'').normalize('NFKC').replace(/[๐-๙]/g,d=>thaiDigits.indexOf(d)).trim().toLowerCase();
 // Source annotations can contain page numbers, dates or unrelated amounts.
 text=text.split(/[—·]\s*(?=[a-zก-๙])/)[0].replace(/\([^)]*\)/g,'').trim();
 if(/usd|eur|gbp|[$€£]|ต่อปี|\/ปี|ต่อวัน|\/วัน|ชั่วโมง|annual|year|daily|hour/.test(text))return null;
 text=text.replace(/^(?:(?:เงินเดือนที่คาดหวัง|เงินเดือนคาดหวัง|เงินเดือน|คาดหวัง|expected salary|salary expectation|thb|บาท)\s*[:=]?\s*)+/,'');
 const lower=/^(?:อย่างน้อย|ตั้งแต่|from|at least)\s*/.test(text),upper=/^(?:ไม่เกิน|สูงสุด|up to)\s*/.test(text);
 text=text.replace(/^(?:อย่างน้อย|ตั้งแต่|from|at least|ไม่เกิน|สูงสุด|up to)\s*/,'');
 const match=text.match(declaration);if(!match)return null;
 const [,first,unit1,second,unit2,tail]=match;
 const above=/ขึ้นไป|หรือมากกว่า|or more|and above|\+/.test(tail),below=/หรือน้อยกว่า|หรือต่ำกว่า|or less/.test(tail);
 const remaining=tail.replace(/ขึ้นไป|หรือมากกว่า|or more|and above|\+|หรือน้อยกว่า|หรือต่ำกว่า|or less|ต่อรองได้|negotiable|ตามตกลง|บาท|thb|\/เดือน|ต่อเดือน|per month|\/month|monthly|เดือน/g,'').trim();
 if(remaining||((lower||above)&&(upper||below))||(second&&(lower||upper||above||below)))return null;
 const scale=(raw,unit,shared)=>Number(raw.replace(/,/g,''))*(unit==='หมื่น'?10000:unit==='พัน'||unit==='k'?1000:shared&&Number(raw.replace(/,/g,''))<1000?(shared==='หมื่น'?10000:1000):1);
 const firstAmount=scale(first,unit1,unit2),secondAmount=second?scale(second,unit2,unit1):firstAmount;
 if(!Number.isFinite(firstAmount)||!Number.isFinite(secondAmount)||firstAmount<=0||secondAmount<firstAmount)return null;
 return {min:upper||below?0:firstAmount,max:lower||above?Infinity:secondAmount};
}
export function declaredSalary(card){return card.salary_expectation??card.profile?.salaryExpectation??'';}
export function matchesSalary(card,{mode='all',min=null,max=null}={}){
 if(mode==='all'&&min==null&&max==null)return true;
 const range=salaryRange(declaredSalary(card));
 if(mode==='unknown')return !range;
 return !!range&&range.max>=(min??0)&&range.min<=(max??Infinity);
}
export function salaryCounts(cards){
 const known=cards.filter(c=>salaryRange(declaredSalary(c))).length;
 return {all:cards.length,known,unknown:cards.length-known};
}
export function salaryFilterLabel({mode='all',min=null,max=null}){
 if(mode==='unknown')return 'ยังไม่แจ้งตัวเลข / ต้องยืนยัน';
 const format=n=>n.toLocaleString('th-TH');
 if(min!=null&&max!=null)return `คาดหวัง ${format(min)}–${format(max)} บาท/เดือน`;
 if(min!=null)return `คาดหวังตั้งแต่ ${format(min)} บาท/เดือน`;
 if(max!=null)return `คาดหวังไม่เกิน ${format(max)} บาท/เดือน`;
 return mode==='known'?'แจ้งเงินเดือนเป็นตัวเลขแล้ว':'';
}
