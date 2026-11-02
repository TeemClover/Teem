export const VERSION = 'cloverx-evidence-v1';
export const COMPANY = 'CloverX เป็นธุรกิจ Health-tech และ Business Builder เชื่อมสินค้า เทคโนโลยี และคอมมูนิตี้ แบรนด์ Habix ด้านโภชนาการและอาหารเสริม และ Xircle แอปสุขภาพที่เชื่อมสายรัดข้อมือ/เครื่องชั่ง คุณทอม ธเนศ ดูแลวิสัยทัศน์และกลยุทธ์ คุณนพ พงศธร ดูแลการดำเนินงานและพัฒนาธุรกิจ ทั้งสองเป็นส่วนหนึ่งของทีมผู้ร่วมก่อตั้ง';
export const STATUSES = ['new','reviewing','prescreen','interview','hold'];
export const STATUS_LABELS = {new:'รอตรวจ',reviewing:'กำลังตรวจ',prescreen:'พรีสกรีน',interview:'นัดสัมภาษณ์',hold:'พักการพิจารณา'};
export const DEFAULT_JOBS = [
 {id:'95545991',title:'E-commerce Specialist (Mid–Senior)',enabled:false,sourceUrl:'https://th.employer.seek.com/candidates?jobid=95545991',jd:'ดูแล TikTok Shop, Shopee, Lazada, LINE OA และเว็บไซต์ครบวงจร; วางแผน LIVE, ยิง Meta/TikTok/Google/Shop Ads, Affiliate/KOL, วิเคราะห์ funnel/ROAS, dashboard, stock/fulfillment และคอนเทนต์ขาย; ประสบการณ์ 3–5 ปี; พิเศษ: สุขภาพ/อาหารเสริม, QA/QC, อย./GMP/HACCP, อบรมทีม/Affiliate, AI, CEO Branding',rubric:[['commerce','Marketplace / End-to-end',25],['results','ผลงานและตัวเลขที่ระบุ',20],['ads','โฆษณาและการวิเคราะห์',20],['live','Live Commerce',10],['affiliate','Affiliate / KOL',10],['operations','ระบบหลังบ้านและประสานงาน',10],['domain','ประสบการณ์สุขภาพ / Wellness',5]].map(([id,label,weight])=>({id,label,weight})),jdSource:'https://th.jobsdb.com/job/95545991',rubricNote:'น้ำหนักเสนอโดยระบบจากประกาศงาน โปรดตรวจและปรับก่อนใช้'},
 {id:'95468249',title:'Creative Content & Personal Assistant to CEO',enabled:false,sourceUrl:'https://th.employer.seek.com/candidates?jobid=95468249',jd:'',rubric:[],rubricNote:'รออ่าน JD และกำหนดเกณฑ์'},
 {id:'95290044',title:'กราฟิกดีไซเนอร์ (Graphic Designer)',enabled:false,sourceUrl:'https://th.employer.seek.com/candidates?jobid=95290044',jd:'',rubric:[],rubricNote:'รออ่าน JD และกำหนดเกณฑ์'},
];
export function problem(code,status=400){return Object.assign(new Error(code),{code,status});}
export function text(value,max=2000){return typeof value==='string'?value.trim().slice(0,max):'';}
export function sourceUrl(value){if(!value)return '';try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw 0;return u.href.slice(0,2000);}catch{throw problem('BAD_URL');}}
export function normalizeJob(input){
 const id=text(input.id,80);if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||!text(input.title,200))throw problem('BAD_JOB');
 const rubric=(Array.isArray(input.rubric)?input.rubric:[]).map(r=>({id:text(r.id,40),label:text(r.label,200),weight:Number(r.weight)}));
 if(rubric.length>12||new Set(rubric.map(r=>r.id)).size!==rubric.length||rubric.some(r=>!r.id||!r.label||!Number.isFinite(r.weight)||r.weight<=0)||rubric.length&&Math.abs(rubric.reduce((a,r)=>a+r.weight,0)-100)>0.01)throw problem('RUBRIC_MUST_TOTAL_100');
 const job={id,title:text(input.title,200),enabled:input.enabled===true,jd:text(input.jd,20000),sourceUrl:sourceUrl(input.sourceUrl),jdSource:sourceUrl(input.jdSource),rubric,rubricNote:text(input.rubricNote,1000)};
 if(job.enabled&&(!job.jd||!rubric.length||!job.sourceUrl))throw problem('JOB_NOT_READY');
 return job;
}
function array(v,max=30){return (Array.isArray(v)?v:[]).slice(0,max);}
export function normalizeProfile(input,job){
 const evidence=array(input.evidence,60).map((e,i)=>({id:text(e.id,60)||`e${i+1}`,quote:text(e.quote,3000),source:text(e.source,300)})).filter(e=>e.quote&&e.source);
 if(new Set(evidence.map(e=>e.id)).size!==evidence.length)throw problem('DUPLICATE_EVIDENCE');
 const ids=new Set(evidence.map(e=>e.id));
 const assessments=job.rubric.map(r=>{
  const item=array(input.assessments,12).find(a=>a.id===r.id)||{};
  const refs=array(item.evidenceIds,10).map(x=>text(x,60));
  const rating=item.rating==null?null:Number(item.rating);
  if(rating!==null&&(!Number.isInteger(rating)||rating<0||rating>4||!refs.length||!text(item.reason,1600)||refs.some(id=>!ids.has(id))))throw problem('SCORE_REQUIRES_EVIDENCE');
  return {id:r.id,rating,evidenceIds:refs.filter(id=>ids.has(id)),reason:text(item.reason,1600)};
 });
 const profile={name:text(input.name,200),summary:text(input.summary,3000),currentRole:text(input.currentRole,300),salaryExpectation:text(input.salaryExpectation,200),availability:text(input.availability,300),education:array(input.education,8).map(x=>text(x,400)),skills:array(input.skills,40).map(x=>text(x,100)),history:array(input.history,20).map(x=>({role:text(x.role,250),company:text(x.company,250),period:text(x.period,160),details:text(x.details,2000),evidenceIds:array(x.evidenceIds,8).filter(id=>ids.has(id))})),evidence,assessments,relevance:array(input.relevance,12).map(x=>({area:text(x.area,200),application:text(x.application,1500),evidenceIds:array(x.evidenceIds,10).filter(id=>ids.has(id)),caveat:text(x.caveat,1000)})),questions:array(input.questions,10).map(x=>text(x,700)),unknowns:array(input.unknowns,20).map(x=>text(x,600))};
 if(!profile.name)throw problem('MISSING_NAME');
 if(input.quickSummary){
  const item=x=>{const value={text:text(x?.text,500),evidenceIds:array(x?.evidenceIds,8).map(id=>text(id,60))};if(value.text&&(!value.evidenceIds.length||value.evidenceIds.some(id=>!ids.has(id))))throw problem('SUMMARY_REQUIRES_EVIDENCE');return value;};
  const q=input.quickSummary;
  if(!Array.isArray(q.strengths)||q.strengths.length!==2||!Array.isArray(q.skills)||q.skills.length!==3)throw problem('SUMMARY_REQUIRES_2_STRENGTHS_3_SKILLS');
  profile.quickSummary={sentence:item(q.sentence),strengths:q.strengths.map(item),skills:q.skills.map(item)};
 }
 // Deliberate allowlist: protected traits, photos, age, address and personality are not scored or extracted.
 return profile;
}
export function score(profile,rubric){let points=0,coverage=0;const sections=rubric.map(r=>{const a=(profile.assessments||[]).find(a=>a.id===r.id);const known=a?.rating!=null;const earned=known?r.weight*a.rating/4:null;if(known){points+=earned;coverage+=r.weight;}return {...r,...a,points:earned};});return {points:Math.round(points*10)/10,coverage:Math.round(coverage),complete:coverage===100&&rubric.length>0,sections,version:VERSION};}
export function validatePdf(input){
 if(typeof input!=='string'||input.length>4300000)throw problem('PDF_TOO_LARGE',413);
 const data=input.trim();if(!data||!(/^[A-Za-z0-9+/]*={0,2}$/.test(data)))throw problem('BAD_PDF');
 const bytes=Buffer.from(data,'base64');if(bytes.length>3200000)throw problem('PDF_TOO_LARGE',413);if(bytes.subarray(0,5).toString()!=='%PDF-')throw problem('BAD_PDF');return bytes;
}
export function bangkokDay(at=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(at);}
