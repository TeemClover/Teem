// Local test adapter only. Real auth/session/authorization code runs against
// this in-memory SQL/store fixture; no deployed data or email provider is used.
import { createAuthHandler } from '../../api/auth/[...path].js';
import { createLearnHandler } from '../../api/_lib/learn-handler.js';
import { currentUser, sendJson } from '../../api/_lib/core.js';

export function createAuthFixture() {
  const sessions = new Map(), otps = new Map(), deliveries = new Map(), hits = new Map();
  const verifiedAt = new Date(Date.now() - 86400000);
  const accounts = new Map([
    ['member@fixture.test', { id: 'fixture-member', email: 'member@fixture.test', display_name: 'Fixture Member', member_no: 'TEST-MEMBER', email_verified_at: verifiedAt }],
    ['unentitled@fixture.test', { id: 'fixture-unentitled', email: 'unentitled@fixture.test', display_name: 'Fixture Without Course Access', member_no: 'TEST-NO-ACCESS', email_verified_at: verifiedAt }],
  ]);
  const queries = [];
  const sql = { async query(query, args = []) {
    queries.push(query);
    if (query.startsWith('INSERT INTO mc_auth_hits')) { const count = (hits.get(args[0]) || 0) + 1; hits.set(args[0], count); return [{ hits: count }]; }
    if (query.startsWith('DELETE FROM mc_auth_hits')) return [];
    if (query.startsWith('INSERT INTO mc_email_otps')) { otps.set(args[0], { id: args[0], normalized_email: args[1], otp_hash: args[2], otp_salt: args[3], attempt_count: 0, expires_at: args[5], used_at: null }); return []; }
    if (query.startsWith('UPDATE mc_email_otps SET attempt_count')) {
      const row = otps.get(args[0]);
      if (!row || row.used_at || row.expires_at <= args[1] || row.attempt_count >= args[2]) return [];
      row.attempt_count += 1; return [{ ...row }];
    }
    if (query.startsWith('UPDATE mc_email_otps SET used_at')) {
      if (query.includes('RETURNING normalized_email')) {
        const row = otps.get(args[1]); if (!row || row.used_at || row.expires_at <= args[0]) return [];
        row.used_at = args[0]; return [{ normalized_email: row.normalized_email }];
      }
      for (const row of otps.values()) if (row.normalized_email === args[1]) row.used_at = args[0];
      return [];
    }
    if (query.startsWith('SELECT id,email,display_name,member_no FROM mc_accounts')) { const row = accounts.get(args[0]); return row ? [{ ...row }] : []; }
    if (query.startsWith('UPDATE mc_accounts SET email_verified_at')) { const row = [...accounts.values()].find(account => account.id === args[0]); if (row) row.email_verified_at = args[1]; return []; }
    if (query.startsWith('INSERT INTO mc_auth_identities')) return [];
    if (query.startsWith('INSERT INTO mc_sessions')) { sessions.set(args[0], { user_id: args[1], created_at: args[2], expires_at: args[3], email_verified_at: args[4] }); return []; }
    if (query.startsWith('SELECT a.id,a.email,a.display_name,a.member_no,s.email_verified_at,s.expires_at')) {
      const session = sessions.get(args[0]), account = session && [...accounts.values()].find(row => row.id === session.user_id);
      return account ? [{ ...account, email_verified_at: session.email_verified_at, expires_at: session.expires_at }] : [];
    }
    if (query.startsWith('DELETE FROM mc_sessions WHERE token_hash=')) { sessions.delete(args[0]); return []; }
    if (query.startsWith('DELETE FROM mc_sessions WHERE expires_at')) { for (const [hash, row] of sessions) if (row.expires_at <= args[0]) sessions.delete(hash); return []; }
    if (query.startsWith('DELETE FROM mc_oauth_states')) return [];
    if (query.startsWith('DELETE FROM mc_email_otps')) { otps.delete(args[0]); return []; }
    throw new Error('Unsupported test SQL: ' + query);
  } };
  const courses = [{ id: 'ai-sauce', title: 'Authorization fixture course', description: 'Local session verification', startLessonId: 'FOUNDATION', lessons: [
    { id: 'FOUNDATION', title: 'Fixture lesson one', type: 'foundation', order: 1, nextLessonId: 'ADV01' },
    { id: 'ADV01', title: 'Fixture lesson two', type: 'main', order: 2 },
  ] }];
  const enrolled = [...accounts.values()].map(account => ({ user_id: account.id, course_id: 'ai-sauce', registered_at: verifiedAt }));
  const grants = [{ user_id: 'fixture-member', course_id: 'ai-sauce', reference: 'FIXTURE-GRANT', starts_at: verifiedAt, expires_at: new Date(Date.now() + 86400000), revoked_at: null }];
  const store = {
    async ensure() {},
    async account(id) { return [...accounts.values()].find(account => account.id === id); },
    async enrollments(id) { return enrolled.filter(row => row.user_id === id); },
    async enrollment(id, course) { return enrolled.find(row => row.user_id === id && row.course_id === course); },
    async grants(id, course) { return grants.filter(row => row.user_id === id && (!course || row.course_id === course)); },
    async registrations() { return []; }, async instructors() { return []; }, async progress() { return []; },
    async reading(course, lesson) { return `# PRIVATE COURSE FIXTURE\n\nAuthorized content for ${course}/${lesson}.`; },
    async saveProgress() {},
  };
  const authHandler = createAuthHandler({ getSql: () => sql, ensureCoreSchema: async () => {}, deliverOtp: async (email, otp) => { deliveries.set(email, otp); return { ok: true }; } });
  const learnHandler = createLearnHandler({ getSql: () => sql, storeFactory: () => store, courses, assets: [] });
  const progressHandler = async (req, res) => {
    const user = await currentUser(req, sql);
    return sendJson(res, user ? { ok: true, progress: {} } : { ok: false, error: 'AUTH_REQUIRED' }, user ? 200 : 401);
  };
  return { sql, sessions, accounts, deliveries, grants, queries, store, courses, authHandler, learnHandler, progressHandler };
}
