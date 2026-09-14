export class LearnError extends Error {
  constructor(code, status = 400, message = code) { super(message); this.code = code; this.status = status; }
}

export function learnId(value, field = 'ID') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value)) throw new LearnError(`INVALID_${field}`);
  return value;
}

export function iso(value) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

// One calendar year from access being granted, including a leap-day clamp.
export function oneYearAfter(value) {
  const date = new Date(value); if (!Number.isFinite(date.getTime())) throw new LearnError('INVALID_GRANT_TIME');
  const month = date.getUTCMonth(); date.setUTCFullYear(date.getUTCFullYear() + 1);
  if (date.getUTCMonth() !== month) date.setUTCDate(0);
  return date.toISOString();
}

export function courseAccess(enrollment, grants = [], registrations = [], now = Date.now(), instructors = []) {
  if (!enrollment) return { status: 'not_enrolled', active: false, canPreview: false, startsAt: null, expiresAt: null, paymentStatus: null };
  const time = new Date(now).getTime();
  const active = grants.filter(g => !g.revoked_at && iso(g.starts_at) && iso(g.expires_at)
    && new Date(g.starts_at).getTime() <= time && new Date(g.expires_at).getTime() > time)
    .sort((a,b) => new Date(b.expires_at) - new Date(a.expires_at));
  const latest = [...registrations].sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const instructor = instructors.find(row => row.user_id===enrollment.user_id && row.course_id===enrollment.course_id
    && !row.revoked_at && iso(row.granted_at) && new Date(row.granted_at).getTime()<=time);
  if (instructor) return {status:'active',role:'instructor',active:true,canPreview:true,
    registeredAt:iso(enrollment.registered_at),startsAt:iso(instructor.granted_at),expiresAt:null,paymentStatus:latest?.status || null};
  let status = 'registered';
  if (active.length) status = 'active';
  else if (registrations.some(r => ['pending_verification','payment_verified','admitted'].includes(r.status)
    && !grants.some(g => g.reference === r.reference))) status = 'pending';
  else if (grants.length && grants.every(g => g.revoked_at)) status = 'revoked';
  else if (grants.some(g => !g.revoked_at && iso(g.expires_at) && new Date(g.expires_at).getTime() <= time)) status = 'expired';
  else if (latest?.status === 'rejected') status = 'rejected';
  const relevant = active[0] || [...grants].sort((a,b) => new Date(b.expires_at) - new Date(a.expires_at))[0];
  return { status, active: status === 'active', canPreview: true, registeredAt: iso(enrollment.registered_at),
    startsAt: iso(relevant?.starts_at), expiresAt: iso(relevant?.expires_at), paymentStatus: latest?.status || null };
}

export function validateProgress(body, lesson) {
  if (typeof body.positionSeconds !== 'number' || !Number.isFinite(body.positionSeconds)
    || body.positionSeconds < 0 || body.positionSeconds > 86400) throw new LearnError('INVALID_POSITION');
  if (body.completed !== undefined && typeof body.completed !== 'boolean') throw new LearnError('INVALID_COMPLETED');
  if (['userId','accountId','entitlement','status','expiresAt','role','instructor'].some(key => Object.hasOwn(body,key))) throw new LearnError('INVALID_PROGRESS_FIELDS');
  const duration = Number(lesson.durationSeconds);
  return { positionSeconds: Math.round(Math.min(body.positionSeconds, duration > 0 ? duration : 86400) * 1000) / 1000,
    completed: body.completed === true };
}

export function progressSummary(rows, course) {
  const known = new Set(course.lessons.map(l => l.id)); const lessons = {};
  for (const row of rows) if (known.has(row.lesson_id)) lessons[row.lesson_id] = {
    positionSeconds: Number(row.position_seconds), maxPositionSeconds: Number(row.max_position_seconds),
    completed: row.completed === true, updatedAt: iso(row.updated_at), version: Number(row.version),
  };
  const completedLessons = Object.values(lessons).filter(p => p.completed).length;
  return { lessons, completedLessons, totalLessons: course.lessons.length,
    percent: course.lessons.length ? Math.round(100 * completedLessons / course.lessons.length) : 0 };
}
