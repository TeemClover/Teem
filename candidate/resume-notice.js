const PDF_LIMIT=3200000;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const digits=value=>value.replace(/[๐-๙]/g,c=>String(c.charCodeAt(0)-0x0e50));

// Legacy processing notes are the available evidence for missing originals.
// Require an explicit document size above the stated limit, never absence alone.
export function confirmedOversizeResume(candidate){
 if(candidate?.has_pdf!==false)return false;
 const notes=Array.isArray(candidate.profile?.unknowns)?candidate.profile.unknowns.filter(n=>typeof n==='string'):[];
 const combined=notes.join('\n');
 if(/\b(?:docx?|word)\b|กัก(?:ไฟล์|เอกสาร)|ผิดคน|คนละ(?:คน|ชุด)|identity[\s_-]*mismatch|ชื่อ[^\n]{0,30}ไม่ตรง/iu.test(combined))return false;
 if(/(?:ดาวน์โหลด|download)[^\n]{0,60}(?:ไม่ได้|ล้มเหลว|หมดเวลา|ถูกยกเลิก|fail|timeout)/iu.test(combined))return false;
 return notes.some(raw=>{
  const note=digits(raw);
  if(!/PDF|Resume|เรซูเม่|ต้นฉบับ|ไฟล์/iu.test(note)||!note.includes('เกิน')||/ถ้า|หาก|อาจ|\bif\b|\bmight\b/iu.test(note))return false;
  const sizes=[...note.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(ไบต์|bytes?(?![a-z])|mb(?![a-z]))/giu)].map(m=>Number(m[1].replaceAll(',',''))*(m[2].toLowerCase()==='mb'?1000000:1));
  return sizes.includes(PDF_LIMIT)&&sizes.some(size=>size>PDF_LIMIT);
 });
}

export function verifiedSeekResumeUrl(candidate){
 try{
  const url=new URL(candidate.source_url),job=String(candidate.job_id||''),source=String(candidate.source_id||'');
  if(url.origin!=='https://th.employer.seek.com'||url.pathname!=='/th/candidates'||url.username||url.password||!job||!source)return '';
  if(url.searchParams.getAll('jobid').length!==1||url.searchParams.getAll('selected').length!==1||url.searchParams.get('jobid')!==job||url.searchParams.get('selected')!==source)return '';
  const clean=new URL('/th/candidates',url.origin);clean.searchParams.set('jobid',job);clean.searchParams.set('selected',source);clean.searchParams.set('tab','resume');return clean.href;
 }catch{return '';}
}

export function resumeSizeNotice(candidate){
 if(!confirmedOversizeResume(candidate))return '';
 const href=verifiedSeekResumeUrl(candidate);
 return `<aside class="resume-size-notice" aria-label="หมายเหตุเอกสารต้นฉบับ"><p>หมายเหตุ: ไฟล์ Resume มีขนาดเกินกำหนดของระบบ กรุณาเปิดดูเอกสารต้นฉบับบนเว็บไซต์ SEEK</p>${href?`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">เปิด Resume บน SEEK <span aria-hidden="true">↗</span></a>`:''}</aside>`;
}
