import { ensureDownloadSchema } from './learn-downloads.js';
import { database, ensureSchema } from './core.js';
import { adminAccess } from './ai-source-domain.js';
import { ensureAiSourceSchema } from './ai-source-store.js';
import { ensureCommerceSchema } from './learn-commerce.js';
import { getLearnCourse, LEARN_ASSETS } from './learn-catalog.js';
import { TOOLKIT_FILES } from './learn-toolkit-catalog.js';

export const PROGRESS_NOTE = 'ความคืบหน้าเป็นตำแหน่งเล่นล่าสุด/ไกลสุดและเครื่องหมายเรียนจบที่ผู้เรียนส่งมา ไม่ยืนยันว่าดูครบทุกวินาทีหรือทำแบบฝึกสำเร็จ';
export const CAMPAIGN_NOTE = 'อ้างจาก UTM ของการเปิดรายการชำระครั้งแรกที่ระบบบันทึกต่อบัญชี ไม่ใช่ยอดคนเห็นโฆษณา; ผู้ที่ยังไม่เปิดรายการชำระหรือไม่มี UTM อยู่ในกลุ่มไม่ระบุ';

const STATE_CTE = `WITH base AS (
 SELECT e.user_id,e.registered_at,a.display_name,a.email,
   COALESCE(g.active,FALSE) AS active,COALESCE(g.expired,FALSE) AS expired,
   COALESCE(g.revoked,FALSE) AS revoked,COALESCE(g.scheduled,FALSE) AS scheduled,
   COALESCE(g.has_grant,FALSE) AS has_grant,g.expires_at,
   COALESCE(r.pending,FALSE) AS pending,COALESCE(r.verified,FALSE) AS verified,
   COALESCE(r.verified_awaiting_grant,FALSE) AS verified_awaiting_grant
 FROM mc_learn_enrollments e JOIN mc_accounts a ON a.id=e.user_id
 LEFT JOIN LATERAL (
   SELECT BOOL_OR(revoked_at IS NULL AND starts_at<=$2 AND expires_at>$2) AS active,
     BOOL_OR(revoked_at IS NULL AND expires_at<=$2) AS expired,
     BOOL_OR(revoked_at IS NOT NULL) AS revoked,
     BOOL_OR(revoked_at IS NULL AND starts_at>$2) AS scheduled,COUNT(*)>0 AS has_grant,
     COALESCE(MAX(expires_at) FILTER(WHERE revoked_at IS NULL),MAX(expires_at)) AS expires_at
   FROM mc_learn_grants WHERE user_id=e.user_id AND course_id=e.course_id
 ) g ON TRUE
 LEFT JOIN LATERAL (
   SELECT BOOL_OR(status='pending_verification') AS pending,
     BOOL_OR(status IN('payment_verified','admitted')) AS verified,
     BOOL_OR(status IN('payment_verified','admitted') AND NOT EXISTS(
       SELECT 1 FROM mc_learn_grants paid WHERE paid.reference=r.reference)) AS verified_awaiting_grant
   FROM mc_ai_source_registrations r WHERE r.account_id=e.user_id AND (
     EXISTS(SELECT 1 FROM mc_learn_registration_links l WHERE l.reference=r.reference AND l.user_id=e.user_id AND l.course_id=e.course_id)
     OR EXISTS(SELECT 1 FROM mc_learn_checkouts c WHERE c.id=r.checkout_id AND c.user_id=e.user_id AND c.course_id=e.course_id))
 ) r ON TRUE WHERE e.course_id=$1
), states AS (
 SELECT *,CASE WHEN active THEN 'active' WHEN scheduled THEN 'scheduled'
   WHEN verified_awaiting_grant THEN 'verifiedAwaitingGrant'
   WHEN pending THEN 'pending' WHEN expired THEN 'expired' WHEN revoked THEN 'revoked'
   ELSE 'registered' END AS access_status FROM base
)`;

const iso = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null;
const count = value => Math.max(0,Math.trunc(Number(value)||0));
const text = value => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160) : '';
const accountId = value => typeof value==='string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);

function lessonGroup(course,lessonId) {
  return course.sections?.find(section=>section.lessonIds?.includes(lessonId));
}

export function downloadForLearner(course,row,assets=LEARN_ASSETS) {
  const toolkit=course.id==='ai-sauce'&&row.file_id.startsWith('toolkit:')
    ? TOOLKIT_FILES.find(file=>'toolkit:'+file.id===row.file_id) : null;
  const asset=assets.find(file=>file.courseId===course.id&&file.id===row.file_id&&file.kind==='resource');
  const lessons=course.lessons.filter(lesson=>asset?.lessonIds?.includes(lesson.id));
  const contexts=lessons.map(lesson=>[lessonGroup(course,lesson.id)?.label,lesson.title].filter(Boolean).join(' · '));
  return {fileId:row.file_id,filename:row.filename,title:toolkit?.title||asset?.title||row.filename,
    group:toolkit?.group||(asset?.entitlement?'คู่มือและ AI ผู้ช่วยงาน':asset?'ไฟล์ฝึกตามบท':'ไฟล์ที่บันทึกไว้'),
    context:toolkit?'ชุดสมุดงาน ซอส และตัวอย่าง':contexts.join(' / '),lessonIds:lessons.map(lesson=>lesson.id),
    firstRequestedAt:iso(row.first_requested_at),lastRequestedAt:iso(row.last_requested_at),requests:count(row.requests)};
}

export function progressForLearner(course,rows) {
  const byId=new Map(rows.map(r=>[r.lesson_id,r]));
  const lessons=course.lessons.map(lesson=>{
    const row=byId.get(lesson.id),group=lessonGroup(course,lesson.id);
    const hasVideo=Boolean(lesson.mediaId)&&lesson.type!=='toolkit',duration=Number(lesson.durationSeconds);
    const cap=Number.isFinite(duration)&&duration>0?duration:lesson.type==='toolkit'?0:86400;
    const bounded=value=>Math.min(cap,Math.max(0,Number(value)||0));
    return {id:lesson.id,title:lesson.title,hasVideo,durationSeconds:hasVideo&&Number.isFinite(duration)&&duration>0?duration:null,
      groupId:group?.id||null,groupLabel:group?.label||'',groupTitle:group?.title||'',positionSeconds:bounded(row?.position_seconds),
      maxPositionSeconds:bounded(row?.max_position_seconds),completed:row?.completed===true,updatedAt:iso(row?.updated_at)};
  });
  const dates=lessons.map(l=>l.updatedAt).filter(Boolean).sort();
  return {lessons,completedLessons:lessons.filter(l=>l.completed).length,totalLessons:lessons.length,
    positionSeconds:lessons.reduce((n,l)=>n+l.positionSeconds,0),lastActivityAt:dates.at(-1)||null};
}

export function createLearnAdminStore(sql) {
  return {
    async ensure(){await ensureSchema(sql);await ensureAiSourceSchema(sql);await ensureCommerceSchema(sql);await ensureDownloadSchema(sql);},
    async counts(courseId,now){return (await sql.query(`${STATE_CTE}
      SELECT COUNT(*) AS enrolled,COUNT(*) FILTER(WHERE access_status='pending') AS pending,
      COUNT(*) FILTER(WHERE access_status='active') AS active,COUNT(*) FILTER(WHERE access_status='expired') AS expired,
      COUNT(*) FILTER(WHERE access_status='revoked') AS revoked,COUNT(*) FILTER(WHERE access_status='scheduled') AS scheduled,
      COUNT(*) FILTER(WHERE access_status='verifiedAwaitingGrant') AS verified_awaiting_grant FROM states`,[courseId,now]))[0]||{};},
    async learners(courseId,now,limit,before){return sql.query(`${STATE_CTE}
      SELECT user_id,display_name,email,access_status,expires_at FROM states
      WHERE (has_grant OR verified) AND ($3::text IS NULL OR user_id<$3)
      ORDER BY user_id DESC LIMIT $4`,[courseId,now,before,limit]);},
    async learner(courseId,now,userId){return sql.query(`${STATE_CTE}
      SELECT user_id,display_name,email,access_status,expires_at FROM states
      WHERE (has_grant OR verified) AND user_id=$3 LIMIT 1`,[courseId,now,userId]);},
    async progress(courseId,userIds){if(!userIds.length)return [];return sql.query(`SELECT user_id,lesson_id,position_seconds,max_position_seconds,completed,updated_at
      FROM mc_learn_progress WHERE course_id=$1 AND user_id=ANY($2::text[])`,[courseId,userIds]);},
    async downloads(courseId,userIds){if(!userIds.length)return [];return sql.query(`SELECT user_id,file_id,filename,first_requested_at,last_requested_at,requests FROM mc_learn_downloads WHERE course_id=$1 AND user_id=ANY($2::text[]) ORDER BY last_requested_at DESC`,[courseId,userIds]);},
    async campaigns(courseId,now){return sql.query(`${STATE_CTE}, attributed AS (
      SELECT s.user_id,s.access_status,f.utm_source,f.utm_medium,f.utm_campaign FROM states s
      LEFT JOIN LATERAL (SELECT utm_source,utm_medium,utm_campaign FROM mc_learn_funnel_events
        WHERE user_id=s.user_id AND course_id=$1 AND event='checkout_started' ORDER BY occurred_at,id LIMIT 1) f ON TRUE
    ) SELECT COALESCE(NULLIF(utm_source,''),'ไม่ระบุ') AS source,COALESCE(utm_medium,'') AS medium,
      COALESCE(utm_campaign,'') AS campaign,COUNT(*) AS enrolled,
      COUNT(*) FILTER(WHERE access_status='pending') AS pending,COUNT(*) FILTER(WHERE access_status='active') AS active
      FROM attributed GROUP BY 1,2,3 ORDER BY COUNT(*) DESC,1,2,3 LIMIT 200`,[courseId,now]);},
  };
}

export function createLearnAdminHandler({getSql=database,config=process.env,storeFactory=createLearnAdminStore,now=()=>new Date(),courseLookup=getLearnCourse}={}) {
  return async(req,res)=>{
    const reply=(body,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(body));};
    for(const k of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control'])res.setHeader(k,'private, no-store');
    res.setHeader('Vary','x-admin-key');res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if(!adminAccess(req,config))return reply({ok:false,code:config.MEET_ADMIN_KEY?'UNAUTHORIZED':'SERVICE_UNCONFIGURED',message:'ไม่มีสิทธิ์เข้าถึง'},config.MEET_ADMIN_KEY?401:503);
      if(req.method!=='GET'){res.setHeader('Allow','GET');return reply({ok:false,code:'METHOD_NOT_ALLOWED'},405);}
      const query=new URL(req.url,'https://learn.invalid').searchParams;
      for(const k of ['courseId','limit','before','userId'])if(query.getAll(k).length>1)return reply({ok:false,code:'INVALID_QUERY'},400);
      const course=courseLookup(query.get('courseId')||'ai-sauce');if(!course)return reply({ok:false,code:'COURSE_NOT_FOUND'},404);
      const rawLimit=query.get('limit')||'50',before=query.get('before')||null,userId=query.get('userId');
      if(!/^\d{1,3}$/.test(rawLimit)||Number(rawLimit)<1||Number(rawLimit)>100||(before&&!accountId(before))
        ||(userId!==null&&(!accountId(userId)||query.has('before')||query.has('limit'))))return reply({ok:false,code:'INVALID_QUERY'},400);
      const limit=Number(rawLimit),time=new Date(now()),store=storeFactory(getSql());await store.ensure();
      const [rawCounts,rawLearners,rawCampaigns]=userId!==null
        ? [null,await store.learner(course.id,time,userId),[]]
        : await Promise.all([store.counts(course.id,time),store.learners(course.id,time,limit+1,before),store.campaigns(course.id,time)]);
      const page=userId!==null?rawLearners.filter(row=>row.user_id===userId).slice(0,1):rawLearners.slice(0,limit);
      const userIds=page.map(row=>row.user_id);
      const [progress,downloads]=await Promise.all([store.progress(course.id,userIds),store.downloads?store.downloads(course.id,userIds):[]]);
      const learners=page.map(row=>{
        const files=downloads.filter(d=>d.user_id===row.user_id).map(d=>downloadForLearner(course,d));
        return {userId:row.user_id,name:row.display_name||'Clover',email:row.email||'',accessStatus:row.access_status,expiresAt:iso(row.expires_at),
          downloads:files,lastDownloadAt:files.map(file=>file.lastRequestedAt).filter(Boolean).sort().at(-1)||null,
          ...progressForLearner(course,progress.filter(p=>p.user_id===row.user_id))};
      });
      const common={ok:true,course:{id:course.id,title:course.title,totalLessons:course.lessons.length},generatedAt:time.toISOString(),
        learners,nextCursor:userId===null&&rawLearners.length>limit?page.at(-1).user_id:null,progressNote:PROGRESS_NOTE};
      if(userId!==null)return reply(common);
      return reply({...common,
        counts:{enrolled:count(rawCounts.enrolled),pending:count(rawCounts.pending),active:count(rawCounts.active),expired:count(rawCounts.expired),revoked:count(rawCounts.revoked),scheduled:count(rawCounts.scheduled),verifiedAwaitingGrant:count(rawCounts.verified_awaiting_grant)},
        campaigns:rawCampaigns.map(r=>({source:text(r.source),medium:text(r.medium),campaign:text(r.campaign),enrolled:count(r.enrolled),pending:count(r.pending),active:count(r.active)})),
        campaignLimit:200,progressNote:PROGRESS_NOTE,campaignNote:CAMPAIGN_NOTE});
    }catch{return reply({ok:false,code:'STATS_UNAVAILABLE',message:'ยังโหลดสถิติไม่ได้ กรุณาลองใหม่'},503);}
  };
}
