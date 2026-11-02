export function summarySlots(profile) {
 const ids=new Set((profile.evidence||[]).map(e=>e.id));
 const supported=item=>item&&typeof item.text==='string'&&item.text.trim()&&Array.isArray(item.evidenceIds)&&item.evidenceIds.length&&item.evidenceIds.every(id=>ids.has(id));
 const q=profile.quickSummary||{};
 const slots=(items,count)=>Array.from({length:count},(_,i)=>supported(items?.[i])?items[i]:{text:'ยังมีหลักฐานไม่เพียงพอ',evidenceIds:[],missing:true});
 return {sentence:supported(q.sentence)?q.sentence:{text:profile.analysisState==='ready'?'อ่านเรซูเม่แล้ว กำลังจัดสรุปจากหลักฐานต้นฉบับ':'รออ่านเรซูเม่ฉบับเต็มเพื่อสรุปประสบการณ์ของผู้สมัคร',evidenceIds:[],missing:true},strengths:slots(q.strengths,2),skills:slots(q.skills,3)};
}
