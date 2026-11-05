import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedOversizeResume,verifiedSeekResumeUrl,resumeSizeNotice} from '../../candidate/resume-notice.js';

const make=note=>({has_pdf:false,job_id:'12345678',source_id:'synthetic-application',source_url:'https://th.employer.seek.com/th/candidates?jobid=12345678&selected=synthetic-application&tab=resume',profile:{unknowns:[note]}});
const note='อ่าน PDF ครบ 23 หน้า แต่ไฟล์ 4,062,674 ไบต์เกินขนาดรับของระบบ 3,200,000 ไบต์ ยังไม่ได้แนบต้นฉบับ';

test('confirmed byte counts above the documented cap show the notice for comma, integer and MB formats',()=>{
 for(const value of [note,'ต้นฉบับ PDF 4866405 ไบต์เกินเพดานแนบ 3,200,000 ไบต์','PDF ต้นฉบับ 3,269,208 ไบต์ เกินเพดานแนบ 3.2 MB','ไฟล์ต้นฉบับ 3,299,626 ไบต์ เกินข้อจำกัด 3,200,000 ไบต์','PDF ขนาด ๔,๐๖๒,๖๗๔ ไบต์เกินเพดาน ๓,๒๐๐,๐๐๐ ไบต์'])assert.equal(confirmedOversizeResume(make(value)),true);
});
test('missing, Word, quarantine, failed downloads, hypothetical limits and recovered PDFs never inherit an oversize label',()=>{
 for(const value of ['', 'ยังไม่มี PDF แนบ','อ่าน Word ต้นฉบับครบแล้ว ไม่มี PDF','เอกสารผิดคนจึงกักไฟล์ไว้', 'ดาวน์โหลดต้นฉบับหมดเวลา','ถ้าไฟล์ PDF 4,000,000 ไบต์เกิน 3,200,000 ไบต์ให้เปิดต้นทาง','ไฟล์ PDF 3,200,000 ไบต์ ไม่เกินเพดาน 3,200,000 ไบต์'])assert.equal(resumeSizeNotice(make(value)),'');
 for(const extra of ['ต้นฉบับเป็น Word','กักไฟล์ไว้เพราะข้อมูลติดต่อคนละชุด','ดาวน์โหลด PDF ไม่ได้']){const c=make(note);c.profile.unknowns.push(extra);assert.equal(resumeSizeNotice(c),'');}
 assert.equal(resumeSizeNotice({...make(note),has_pdf:true}),'');assert.equal(resumeSizeNotice({...make(note),has_pdf:undefined}),'');
});
test('SEEK links must match both source identities and exclude credentials, duplicate selectors and other origins',()=>{
 const c=make(note);assert.match(verifiedSeekResumeUrl(c),/jobid=12345678&selected=synthetic-application&tab=resume$/);
 for(const source_url of ['javascript:alert(1)','https://example.com/th/candidates?jobid=12345678&selected=synthetic-application','https://th.employer.seek.com/th/dashboard','https://user:password@th.employer.seek.com/th/candidates?jobid=12345678&selected=synthetic-application',c.source_url.replace('synthetic-application','another-person'),c.source_url.replace('12345678','87654321'),c.source_url+'&selected=another-person'])assert.equal(verifiedSeekResumeUrl({...c,source_url}),'');
 assert.equal(verifiedSeekResumeUrl({...c,source_id:''}),'');
});
test('the notice keeps evidence and source data unchanged and omits unverified links',()=>{
 const c=make(note),before=structuredClone(c),html=resumeSizeNotice(c);assert.match(html,/หมายเหตุ: ไฟล์ Resume มีขนาดเกินกำหนดของระบบ/);assert.match(html,/&amp;selected=/);assert.match(html,/rel="noopener noreferrer"/);assert.deepEqual(c,before);
 const missing=resumeSizeNotice({...c,source_url:'https://example.com/'});assert.match(missing,/หมายเหตุ/);assert.doesNotMatch(missing,/<a /);
});
