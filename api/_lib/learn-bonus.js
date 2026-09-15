// Bonus files have a narrower entitlement than the lessons. A submitted amount,
// browser price, or an unrelated/expired payment never upgrades a course grant.
export const COMPANION_BONUS_ID = 'ai-sauce-companion-v1';
const timestamp = value => value ? new Date(value).getTime() : NaN;
export function paymentIncludesCompanion(row, now=Date.now()) {
  const time=timestamp(now), start=timestamp(row?.starts_at), end=timestamp(row?.expires_at);
  if (!row || row.revoked_at || !Number.isFinite(time) || !(start<=time && end>time)
    || !['payment_verified','admitted'].includes(row.status) || !(timestamp(row.verified_at)<=time)) return null;
  const paid=Number(row.verified_amount_satang), transferred=timestamp(row.verified_transferred_at);
  if (!Number.isSafeInteger(paid) || paid<=0 || !Number.isFinite(transferred) || transferred>time) return null;
  if (row.checkout_id) {
    const price=Number(row.checkout_price), issued=timestamp(row.checkout_issued_at), expires=timestamp(row.checkout_expires_at);
    if (row.checkout_bound!==true || ![790,990,1690].includes(price) || !(issued<=transferred && transferred<expires) || paid<price*100) return null;
    return price===790 ? false : true;
  }
  if (row.legacy_quote_eligible!==true || row.legacy_bound_by!=='ai-source-admin'
    || !Number.isFinite(timestamp(row.legacy_bound_at)) || ![990,1690].includes(Number(row.quoted_amount_thb))) return null;
  const first=timestamp(row.offer_first_seen_at), expires=timestamp(row.offer_expires_at);
  if (!(first<=transferred && expires>first)) return null;
  return paid>=(transferred<expires ? 99000 : 169000) ? true : null;
}

export async function companionEntitlement(sql,userId,courseId,now=Date.now()) {
  if (courseId!=='ai-sauce') return 'unverified';
  try {
    const rows=await sql.query(`SELECT g.starts_at,g.expires_at,g.revoked_at,
      r.status,r.verified_at,r.verified_amount_satang,r.verified_transferred_at,r.checkout_id,
      r.quoted_amount_thb,r.legacy_quote_eligible,r.legacy_bound_at,r.legacy_bound_by,r.offer_first_seen_at,r.offer_expires_at,
      c.quoted_amount_thb AS checkout_price,c.issued_at AS checkout_issued_at,c.expires_at AS checkout_expires_at,
      (c.id IS NOT NULL AND c.user_id=r.account_id AND c.course_id=g.course_id
        AND (c.reference IS NULL OR c.reference=r.reference)) AS checkout_bound
      FROM mc_learn_grants g
      JOIN mc_learn_registration_links l ON l.reference=g.reference AND l.user_id=g.user_id AND l.course_id=g.course_id
      JOIN mc_ai_source_registrations r ON r.reference=g.reference AND r.account_id=g.user_id
      LEFT JOIN mc_learn_checkouts c ON c.id=r.checkout_id
      WHERE g.user_id=$1 AND g.course_id=$2 AND g.revoked_at IS NULL AND g.starts_at<=$3 AND g.expires_at>$3`,[userId,courseId,new Date(now)]);
    const results=rows.map(row=>paymentIncludesCompanion(row,now));
    return results.includes(true) ? 'included' : results.includes(false) && !results.includes(null) ? 'not_included' : 'unverified';
  } catch {
    // A missing historical payment record must never take the lessons offline.
    return 'unverified';
  }
}

export function isCourseBonusAsset(course,lesson,asset) {
  return course.bonus?.id===COMPANION_BONUS_ID && course.bonus.lessonId===lesson.id
    && course.bonus.resourceIds?.includes(asset?.id) && asset?.kind==='resource'
    && asset.entitlement===COMPANION_BONUS_ID;
}

export async function courseBonusStatus(store,userId,course,access,now) {
  if (!access.active) return 'access_required';
  if (access.role==='instructor') return 'included';
  return store.bonusEntitlement ? store.bonusEntitlement(userId,course.id,now) : 'unverified';
}
