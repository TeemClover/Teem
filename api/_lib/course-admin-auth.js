import { createHash, timingSafeEqual } from 'node:crypto';

export function configuredAdminKeyMatches(candidate, configured) {
  if (typeof configured !== 'string' || !configured || configured.length > 4096
    || typeof candidate !== 'string' || !candidate || candidate.length > 4096) return false;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(candidate), digest(configured));
}

// null means the shared migration has not been configured. A configured key
// always returns a final boolean, so a mismatch cannot fall through to legacy auth.
export function sharedCourseAdminDecision(candidate, env = process.env) {
  const configured = env.COURSE_REVIEW_ADMIN_KEY || env.FIRST_CLASS_ADMIN_KEY;
  if (!configured) return null;
  return configuredAdminKeyMatches(candidate, configured);
}
