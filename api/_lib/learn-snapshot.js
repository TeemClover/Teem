import { cookieValue, sha256, publicUser } from './core.js';
import { courseAccess, iso, LearnError } from './learn-domain.js';

// A fresh statement snapshot replaces the session/account/access/read waterfall.
// These tables are provisioned by account/course setup. Never run migrations or
// keep identity/entitlement results in memory on the learner read path.
export async function loadLearnSnapshot(sql,req,{courseId,lessonId=null,includeReading=false,includeProgress=false,now=Date.now()}) {
  let token;
  try { token=cookieValue(req,'mc_session'); }
  catch(error) { if(error instanceof URIError)throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');throw error; }
  if(!token)throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');
  const row=(await sql.query(`SELECT a.id,a.email,a.display_name,a.member_no,
      s.email_verified_at AS session_verified_at,s.expires_at AS session_expires_at,
      a.email_verified_at AS account_verified_at,
      CASE WHEN e.user_id IS NOT NULL THEN jsonb_build_object('user_id',e.user_id,'course_id',e.course_id,'registered_at',e.registered_at) END AS enrollment,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('reference',g.reference,'course_id',g.course_id,
        'starts_at',g.starts_at,'expires_at',g.expires_at,'revoked_at',g.revoked_at))
        FROM mc_learn_grants g WHERE g.user_id=a.id AND g.course_id=$2::text),'[]'::jsonb) AS grants,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('reference',r.reference,'course_id',l.course_id,'status',r.status,'created_at',r.created_at))
        FROM mc_learn_registration_links l JOIN mc_ai_source_registrations r ON r.reference=l.reference AND r.account_id=l.user_id
        WHERE l.user_id=a.id AND l.course_id=$2::text),'[]'::jsonb) AS registrations,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',i.user_id,'course_id',i.course_id,'granted_at',i.granted_at,'revoked_at',i.revoked_at))
        FROM mc_learn_instructors i WHERE i.user_id=a.id AND i.course_id=$2::text),'[]'::jsonb) AS instructors,
      CASE WHEN $4::boolean AND s.expires_at>$6 AND s.email_verified_at IS NOT NULL AND a.email_verified_at IS NOT NULL AND e.user_id=a.id
        AND (EXISTS(SELECT 1 FROM mc_learn_grants g WHERE g.user_id=a.id AND g.course_id=$2::text
          AND g.revoked_at IS NULL AND g.starts_at<=$6 AND g.expires_at>$6)
          OR EXISTS(SELECT 1 FROM mc_learn_instructors i WHERE i.user_id=a.id AND i.course_id=$2::text
          AND i.revoked_at IS NULL AND i.granted_at<=$6))
        THEN COALESCE((SELECT body_markdown FROM mc_learn_readings WHERE course_id=$2::text AND lesson_id=$3::text),'') ELSE '' END AS reading,
      CASE WHEN $5::boolean AND s.expires_at>$6 AND s.email_verified_at IS NOT NULL AND a.email_verified_at IS NOT NULL AND e.user_id=a.id
        THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('lesson_id',p.lesson_id,'position_seconds',p.position_seconds,
          'max_position_seconds',p.max_position_seconds,'completed',p.completed,'version',p.version,'updated_at',p.updated_at))
          FROM mc_learn_progress p WHERE p.user_id=a.id AND p.course_id=$2::text),'[]'::jsonb) ELSE '[]'::jsonb END AS progress
    FROM mc_sessions s JOIN mc_accounts a ON a.id=s.user_id
    LEFT JOIN mc_learn_enrollments e ON e.user_id=a.id AND e.course_id=$2::text
    WHERE s.token_hash=$1`,[await sha256(token),courseId ?? null,lessonId,includeReading===true,includeProgress===true,new Date(now)]))[0];
  if(!row?.id || !iso(row.session_expires_at) || new Date(row.session_expires_at).getTime()<=new Date(now).getTime()) {
    throw new LearnError('AUTH_REQUIRED',401,'เข้าสู่ระบบก่อนเข้าเรียน');
  }
  if(!iso(row.session_verified_at)||!iso(row.account_verified_at))throw new LearnError('EMAIL_VERIFICATION_REQUIRED',403,'ยืนยันอีเมลในบัญชีนี้ก่อนเข้าเรียน');
  const enrollment=row.enrollment?.user_id===row.id && row.enrollment?.course_id===courseId ? row.enrollment : null;
  const array=value=>Array.isArray(value)?value:[];
  const access=courseAccess(enrollment,array(row.grants),array(row.registrations),now,array(row.instructors));
  return {user:publicUser({...row,email_verified_at:row.session_verified_at}),access,
    reading:includeReading && access.active && typeof row.reading==='string' ? row.reading : '',
    progress:includeProgress && enrollment ? array(row.progress) : []};
}
