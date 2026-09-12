// Synthetic fixtures only. This module never imports the production database helper.
export const SYNTHETIC_COURSE_REVIEWS = Object.freeze([
  { review_reference: 'CR-fixture-private', cohort_id: 'thedent-2026-09-12', display_name: 'ผู้ทดสอบสมมติ A', role: 'บทบาททดสอบ A', before_score: 2, after_score: 4, score: 7, consent_mode: 'private', testimonial: 'ข้อความสมมติ A สำหรับทดสอบสิทธิ์เท่านั้น' },
  { review_reference: 'CR-fixture-named', cohort_id: 'thedent-2026-09-12', display_name: 'ผู้ทดสอบสมมติ B', role: 'บทบาททดสอบ B', before_score: 4, after_score: 2, score: 1, consent_mode: 'named', testimonial: 'ข้อความสมมติ B สำหรับทดสอบคะแนนต่ำเท่านั้น' },
  { review_reference: 'CR-fixture-anonymous', cohort_id: 'fixture-other-cohort', display_name: 'ผู้ทดสอบสมมติ C', role: 'บทบาททดสอบ C', before_score: 1, after_score: 3, score: 8, consent_mode: 'anonymous', testimonial: '' },
].map((row, index) => Object.freeze({
  id: index + 1, form_version: 1, participant_id: `fixture-participant-${index}`,
  takeaways: ['source'], first_task: 'งานสมมติสำหรับทดสอบ', feedback: 'ข้อเสนอแนะสมมติที่ไม่เผยแพร่',
  receipt_token: `private-fixture-receipt-${index}`, reward_id: `private-fixture-reward-${index}`,
  claimed_profile_id: `private-fixture-profile-${index}`,
  created_at: new Date(Date.UTC(2026, 8, 12, 8, index)), updated_at: new Date(Date.UTC(2026, 8, 12, 8, index)),
  claimed_at: null, ...row,
})));

export function createReviewFixtureDatabase({ reviews = SYNTHETIC_COURSE_REVIEWS } = {}) {
  const records = new Map(reviews.map(row => [row.review_reference, structuredClone(row)]));
  const curation = new Map(), queries = [];
  const joined = row => ({ ...structuredClone(row), shortlisted: false, published: false, consent_override: null, ...structuredClone(curation.get(row.review_reference) || {}) });
  const effective = row => row.consent_override ?? row.consent_mode;
  const shareable = row => ['named', 'anonymous'].includes(effective(row)) && Boolean(row.testimonial?.trim());
  function ensure(id, time) {
    if (!curation.has(id)) curation.set(id, { review_reference: id, shortlisted: false, published: false, consent_override: null,
      consent_updated_at: null, consent_token_hash: null, consent_token_expires_at: null, created_at: time, updated_at: time });
    return curation.get(id);
  }
  return {
    records, curation, queries,
    async query(query, params = []) {
      queries.push({ query, params });
      if (query.startsWith('CREATE TABLE IF NOT EXISTS course_review_curation')) return [];
      if (query.startsWith('SELECT DISTINCT cohort_id')) return [...new Set([...records.values()].map(row => row.cohort_id))].sort().reverse().map(cohort_id => ({ cohort_id }));
      if (query.startsWith('SELECT r.review_reference')) {
        let rows = [...records.values()];
        if (query.includes(' WHERE r.review_reference=$1')) rows = rows.filter(row => row.review_reference === params[0]);
        if (query.includes(' WHERE r.cohort_id=$1')) rows = rows.filter(row => row.cohort_id === params[0]);
        return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(joined);
      }
      if (query.startsWith('SELECT r.testimonial')) return [...records.values()].map(joined).filter(row => row.published && shareable(row));
      if (query.startsWith('SELECT c.review_reference,c.consent_token_expires_at')) {
        const row = [...curation.values()].find(row => row.consent_token_hash === params[0] && records.has(row.review_reference));
        return row ? [{ review_reference: row.review_reference, consent_token_expires_at: row.consent_token_expires_at }] : [];
      }
      if (query.startsWith('INSERT INTO course_review_curation')) {
        const id = params[0]; if (!records.has(id)) return [];
        if (query.includes('consent_token_hash')) {
          const row = ensure(id, params[3]);
          Object.assign(row, { consent_token_hash: params[1], consent_token_expires_at: params[2], updated_at: params[3] });
          return [{ review_reference: id }];
        }
        if (curation.has(id)) return [];
        ensure(id, params[1]); return [{ review_reference: id }];
      }
      if (query.startsWith('UPDATE course_review_curation SET consent_override')) {
        const row = [...curation.values()].find(row => row.consent_token_hash === params[0] && row.consent_token_expires_at > params[2]);
        if (!row) return [];
        Object.assign(row, { consent_override: params[1], consent_updated_at: params[2], published: false, updated_at: params[2] });
        return [{ review_reference: row.review_reference }];
      }
      if (query.startsWith('UPDATE course_review_curation SET shortlisted')) {
        const row = curation.get(params[0]); if (row) Object.assign(row, { shortlisted: params[1], updated_at: params[2] });
        return [];
      }
      if (query.startsWith('UPDATE course_review_curation c SET published')) {
        const original = records.get(params[0]), row = curation.get(params[0]);
        if (!original || !row || (params[1] && !shareable(joined(original)))) return [];
        Object.assign(row, { published: params[1], updated_at: params[2] }); return [{ review_reference: row.review_reference }];
      }
      throw new Error(`Unsupported synthetic-fixture query: ${query.split('\n')[0]}`);
    },
  };
}
