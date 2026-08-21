import { existsSync, readFileSync } from 'node:fs';

function must(path, pattern, reason) {
  if (!existsSync(path)) throw new Error(`${path}: missing (${reason})`);
  const source = readFileSync(path, 'utf8');
  if (!pattern.test(source)) throw new Error(`${path}: ${reason}`);
}
function mustNot(path, pattern, reason) {
  const source = readFileSync(path, 'utf8');
  if (pattern.test(source)) throw new Error(`${path}: ${reason}`);
}

must('api/teambook-party-finish.js', /xty-party-finish\.js/, 'exact lifecycle endpoint is not wired');
must('api/teambook-mine.js', /xty-mine\.js/, 'exact account recovery endpoint is not wired');
must('api/teambook-stars.js', /xty-stars\.js/, 'exact stars endpoint is not wired');
must('api/teambook.js', /teambook\/\[\.\.\.path\]\.js/, 'canonical TeamBook API dispatcher missing');
must('_shared/join-party-v2.js', /teambook_pending_join_v1[\s\S]*recoverPendingJoinV2/, 'join recovery contract missing');
must('api/_lib/xty-join-v2.js', /recoveryRequired: true[\s\S]*meUserId/, 'post-commit join recovery missing');
must('api/teambook/[...path].js', /unlock_source='first_seen' AND r\.revealed_at IS NULL/, 'active first-seen reward recovery missing');
must('p/index.html', /openRecoveredFirstSeen/, 'party reward recovery UI missing');
must('_shared/party-enhancements.js', /FIRST_SEEN_REWARD_EARNED/, 'reward event is hidden from Party Log');
must('api/teambook-pet.js', /firstWakeGreeting[\s\S]*first_wake_catchup/, 'guaranteed first PET wake missing');
must('_shared/card-ui.js', /AVATAR_IN_USE: 'การ์ดประจำตัว'/, 'collection identity-card copy drifted');
must('api/health.js', /databaseConnected[\s\S]*schemaReady/, 'health endpoint is config-only');
mustNot('api/_lib/xty-party-finish.js', /from ['"]\.\.\/\[\.\.\.path\]\.js['"]/, 'lifecycle router points at ambiguous top-level catch-all');

const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
if (config.outputDirectory !== 'dist') throw new Error('vercel.json: TeamBook must publish dist at project root');
if (!config.rewrites?.some(item => item.source === '/api/teambook/:path*')) throw new Error('vercel.json: missing canonical TeamBook API rewrite');
if (!config.crons?.some(item => ['/api/teambook-pet', '/api/teambook-pet-compat'].includes(item.path))) throw new Error('vercel.json: PET cron is not wired inside TeamBook project');
console.log('TeamBook runtime wiring OK.');
