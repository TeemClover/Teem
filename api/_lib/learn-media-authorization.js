import { sha256, cookieValue } from './core.js';
import { LEARN_COURSES, LEARN_ASSETS } from './learn-catalog.js';
import { LearnError, learnId, iso } from './learn-domain.js';

function sessionToken(req) {
  return cookieValue(req, 'mc_session');
}

// Media requests are frequent and may hit a cold function while seeking. Read
// existing access and registry together; migrations belong to account/course
// setup, never to the stream. No authorization result is cached between ranges.
export async function authorizeLearnMedia(sql, req, {courseId,lessonId,assetId}, {now=Date.now(),courses=LEARN_COURSES,assets=LEARN_ASSETS}={}) {
  let token;
  try { token=sessionToken(req); }
  catch(error) { if(error instanceof URIError)throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');throw error; }
  if(!token)throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');
  learnId(courseId,'COURSE_ID');learnId(lessonId,'LESSON_ID');learnId(assetId,'ASSET_ID');
  const time=new Date(now),hash=await sha256(token);
  const row=(await sql.query(`SELECT a.id AS account_id,
      s.email_verified_at AS session_verified_at,s.expires_at AS session_expires_at,
      a.email_verified_at AS account_verified_at,e.user_id AS enrolled_user_id,
      EXISTS(SELECT 1 FROM mc_learn_grants g WHERE g.user_id=a.id AND g.course_id=$2
        AND g.revoked_at IS NULL AND g.starts_at<=$4 AND g.expires_at>$4) AS active_grant,
      EXISTS(SELECT 1 FROM mc_learn_instructors i WHERE i.user_id=a.id AND i.course_id=$2
        AND i.revoked_at IS NULL AND i.granted_at<=$4) AS active_instructor,
      m.pathname,m.content_type,m.bytes,m.sha256
    FROM mc_sessions s JOIN mc_accounts a ON a.id=s.user_id
    LEFT JOIN mc_learn_enrollments e ON e.user_id=a.id AND e.course_id=$2
    LEFT JOIN mc_learn_media m ON m.asset_id=$3
    WHERE s.token_hash=$1`,[hash,courseId,assetId,time]))[0];
  if(!row?.account_id || !iso(row.session_expires_at) || new Date(row.session_expires_at).getTime()<=time.getTime()) {
    throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');
  }
  if(!iso(row.session_verified_at)||!iso(row.account_verified_at))throw new LearnError('EMAIL_VERIFICATION_REQUIRED',403,'ยืนยันอีเมลในบัญชีนี้ก่อนเข้าเรียน');
  const course=courses.find(c=>c.id===courseId),lesson=course?.lessons.find(l=>l.id===lessonId);
  if(!course||!lesson)throw new LearnError('LESSON_NOT_FOUND',404);
  if(row.enrolled_user_id!==row.account_id)throw new LearnError('COURSE_ENROLLMENT_REQUIRED',403,'ลงทะเบียนคอร์สนี้ก่อนเข้าเรียน');
  if(row.active_grant!==true&&row.active_instructor!==true)throw new LearnError('COURSE_ACCESS_REQUIRED',403,'บทนี้อยู่ในคอร์สเต็ม กรุณาตรวจสอบสิทธิ์เรียนของบัญชีนี้');
  const asset=assets.find(a=>a.id===assetId);
  const video=assetId===lesson.mediaId&&asset?.kind==='video',caption=assetId===lesson.captionId&&asset?.kind==='captions';
  const resource=[...(lesson.resourceIds||[]),...(lesson.additionalResourceIds||[])].includes(assetId)&&asset?.kind==='resource';
  if(!asset||asset.courseId!==course.id||!asset.lessonIds?.includes(lesson.id)||(!video&&!caption&&!resource))throw new LearnError('ASSET_NOT_FOUND',404);
  return {asset,mediaRow:row.pathname?{pathname:row.pathname,content_type:row.content_type,bytes:row.bytes,sha256:row.sha256}:null};
}
