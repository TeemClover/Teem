import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

function filesBelow(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'core7') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesBelow(path));
    else out.push(path);
  }
  return out;
}

const textFiles = filesBelow(ROOT).filter(path => /\.(?:html|js|mjs|css|json)$/.test(path));

test('public TeamBook source never links back to the legacy /xty app', () => {
  for (const path of textFiles) {
    if (path.includes('/tests/') || path.endsWith('.test.mjs')) continue;
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /https?:\/\/(?:www\.)?myclover\.com\/xty(?:\/|\b)/,
      `${relative(ROOT, path)} contains a legacy canonical URL`);
    assert.doesNotMatch(source, /["'`](?:https?:\/\/[^"'`]+)?\/xty\//,
      `${relative(ROOT, path)} contains a public /xty route`);
    assert.doesNotMatch(source, /\\\/xty\\\//,
      `${relative(ROOT, path)} contains a legacy /xty route guard`);
  }
});

test('first visit opens one shared welcome dialog without redirecting to /start', () => {
  const root = readFileSync(join(ROOT, 'index.html'), 'utf8');
  assert.doesNotMatch(root.slice(0, root.indexOf('</head>')), /location\.replace\('\/start\/'\)/);
  assert.match(root, /id="firstWelcome"[\s\S]*assets\/entry\/notebook-open\.webp/);
  assert.match(root, /teambook_welcome_seen_v1/);
  const joinPage = readFileSync(join(ROOT, 'join/index.html'), 'utf8');
  assert.match(root, /await showFirstWelcome\(\)[\s\S]*hadLocalProfile && inviteCode/);
  assert.match(joinPage, /teambook_welcome_seen_v1[\s\S]*if \(!hasSeenWelcome\)[\s\S]*\/\?c=/);
  assert.match(root, /id="enterRoom"[\s\S]*เปิด TeamBook/);
  assert.match(root, /มีคนชวนคุณมาเขียน[\s\S]*เปิดดูสมุดเล่มนี้/);
  assert.match(root, /welcomeRead[\s\S]*\/read\/\?c=/);
  assert.match(root, /openIntentFromUrl[\s\S]*location\.replace\('\/new\/'\)/);
});

test('account flows return to a TeamBook page', () => {
  const core = readFileSync(join(ROOT, 'api/_lib/core.js'), 'utf8');
  const auth = readFileSync(join(ROOT, 'api/auth/[...path].js'), 'utf8');
  assert.doesNotMatch(core, /\/card\//);
  assert.doesNotMatch(auth, /\/card\//);
  assert.match(core, /'\/profile\/'/);
  assert.match(auth, /'\/profile\/'/);
});

test('server data and PET AI are environment-bound inside the new project', () => {
  const core = readFileSync(join(ROOT, 'api/_lib/core.js'), 'utf8');
  const pet = readFileSync(join(ROOT, 'api/_lib/pet-brain.js'), 'utf8');
  const cron = readFileSync(join(ROOT, 'api/teambook-pet.js'), 'utf8');
  const env = readFileSync(join(ROOT, '.env.example'), 'utf8');
  assert.match(core, /process\.env\.TEAMBOOK_DATABASE_URL/);
  assert.match(pet, /process\.env\.GROQ_API_KEY/);
  assert.match(pet, /process\.env\.TEAMBOOK_PET_AI/);
  assert.match(pet, /openai\/gpt-oss-20b/);
  assert.match(pet, /qwen\/qwen3\.6-27b/);
  assert.doesNotMatch(pet, /meta-llama\/llama-4-scout-17b-16e-instruct/);
  assert.match(cron, /process\.env\.CRON_SECRET/);
  for (const key of ['TEAMBOOK_DATABASE_URL', 'GROQ_API_KEY', 'TEAMBOOK_PET_AI', 'CRON_SECRET']) {
    assert.match(env, new RegExp(`^${key}=`, 'm'));
  }
});

test('deployment root exposes TeamBook routes without a folder prefix', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const projectConfig = JSON.parse(readFileSync(join(ROOT, '../vercel.json'), 'utf8'));
  assert.ok(config.redirects.some(item => item.source === '/teambook/:path*' && item.destination === '/:path*'));
  assert.ok(config.rewrites.some(item => item.source === '/api/teambook/:path*'));
  assert.ok(config.crons.some(item => item.path === '/api/teambook-pet'));
});

test('runtime source has no CORE7 or legacy data boundary', () => {
  for (const path of textFiles.filter(file => !file.includes('/core7/'))) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /(?:from|import\()[^\n]*\/core7\//,
      `${relative(ROOT, path)} imports CORE7`);
    assert.doesNotMatch(source, /process\.env\.DATABASE_URL\b/,
      `${relative(ROOT, path)} can fall back to a shared database`);
    assert.doesNotMatch(source, /process\.env\.FIRST_CLASS_FROM_EMAIL\b/,
      `${relative(ROOT, path)} can fall back to a legacy sender`);
    assert.doesNotMatch(source, /localStorage\.(?:getItem|setItem|removeItem)\(['"]mc_/,
      `${relative(ROOT, path)} reads a legacy browser namespace`);
  }
});

test('published card catalog references only shipped binary art', async () => {
  const { TEAMBOOK_CARDS } = await import('../_shared/cards.js');
  for (const card of TEAMBOOK_CARDS) {
    for (const key of ['art', 'image', 'imageThumb', 'imageFull']) {
      if (!card[key]?.startsWith('/assets/')) continue;
      const path = join(ROOT, card[key].slice(1));
      assert.ok(statSync(path).size > 0, `${card.cardId}.${key} points to an empty asset`);
    }
  }
  assert.equal(TEAMBOOK_CARDS.some(card => /epic\/(?:orange-cat|white-cat)-/.test(card.art || '')), false);
});

test('native clients can use a TeamBook bearer session', () => {
  const core = readFileSync(join(ROOT, 'api/_lib/core.js'), 'utf8');
  const auth = readFileSync(join(ROOT, 'api/auth/[...path].js'), 'utf8');
  assert.match(core, /authorization\.startsWith\('Bearer '\)/);
  assert.match(core, /cookieValue\(req, SESSION_COOKIE\) \|\| bearerValue\(req\)/);
  assert.match(auth, /x-teambook-client/);
  assert.match(auth, /sessionToken: token/);
});

test('preview readiness reports database, Groq, Blob and cron configuration', () => {
  const health = readFileSync(join(ROOT, 'api/health.js'), 'utf8');
  for (const key of ['TEAMBOOK_DATABASE_URL', 'GROQ_API_KEY', 'BLOB_READ_WRITE_TOKEN', 'CRON_SECRET']) {
    assert.match(health, new RegExp(`process\\.env\\.${key}`));
  }
});

test('runtime copy and PET prompts contain no myClover identity', () => {
  for (const path of textFiles.filter(file => {
    const label = relative(ROOT, file);
    return !label.startsWith('tests/') && !label.startsWith('scripts/')
      && !label.startsWith('docs/') && !file.endsWith('.test.mjs');
  })) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /TeemClover|myClover|CloverX/,
      `${relative(ROOT, path)} contains a legacy identity`);
  }
  for (const path of filesBelow(join(ROOT, 'pets/personas')).filter(file => file.endsWith('.md'))) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /TeemClover|myClover|CloverX|xty\/_shared/,
      `${relative(ROOT, path)} contains a legacy PET identity`);
  }
});


test('first เห็นแล้ว reward belongs to the confirmer once across the whole account', () => {
  const core = readFileSync(join(ROOT, 'api/_lib/core.js'), 'utf8');
  const partyApi = readFileSync(join(ROOT, 'api/teambook/[...path].js'), 'utf8');
  const binder = readFileSync(join(ROOT, 'api/_lib/xty-bind.js'), 'utf8');
  const partyPage = readFileSync(join(ROOT, 'p/index.html'), 'utf8');
  const revealPage = readFileSync(join(ROOT, 'reveal/index.html'), 'utf8');

  assert.match(core, /UNIQUE INDEX IF NOT EXISTS idx_teambook_first_seen_reward_once[\s\S]*WHERE unlock_source = 'first_seen'/);
  assert.match(partyApi, /firstSeenRewardFor\(sql, row, member, at\)/);
  assert.match(partyApi, /unlock_source='first_seen'[\s\S]*member\.user_id/);
  assert.match(partyApi, /myReward: firstSeenReward \|\| state\.myReward/);
  assert.match(partyApi, /unlock_source IN \('ending','first_seen'\)/);
  assert.match(binder, /firstSeenRows[\s\S]*SET user_id=\$1/);
  assert.match(partyPage, /firstSeenReward\?\.rewardId[\s\S]*\/reveal\/\?r=/);
  assert.match(revealPage, /เห็นคนอื่นเป็นครั้งแรก ✓/);
});


test('first เห็นแล้ว card opening is a shared notebook event with its own label', () => {
  const core = readFileSync(join(ROOT, 'api/_lib/core.js'), 'utf8');
  const partyApi = readFileSync(join(ROOT, 'api/teambook/[...path].js'), 'utf8');
  const starApi = readFileSync(join(ROOT, 'api/_lib/xty-stars.js'), 'utf8');
  const partyPage = readFileSync(join(ROOT, 'p/index.html'), 'utf8');
  const weekly = readFileSync(join(ROOT, '_shared/reward-loop.js'), 'utf8');
  const exporter = readFileSync(join(ROOT, '_shared/party-log-export.js'), 'utf8');

  assert.match(core, /teambook_book_entries ADD COLUMN IF NOT EXISTS reward_source TEXT/);
  assert.match(partyApi, /p\.reward_source/);
  assert.match(partyApi, /claimed\.card_id,claimed\.unlock_source/);
  assert.match(starApi, /claimed\.card_id,'party_stars'/);
  assert.match(partyPage, /post\.rewardSource === 'first_seen'[\s\S]*รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก/);
  assert.match(weekly, /รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก/);
  assert.match(exporter, /rewardLabel: รางวัลเห็นสิ่งที่คนอื่นทำเป็นครั้งแรก/);
});


test('canonical TeamBook domain redirects root to /teambook and serves the app there', () => {
  const config = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const rootRedirect = config.redirects.find(route => route.source === '/');
  assert.deepEqual(rootRedirect, {
    source: '/',
    destination: '/teambook',
    permanent: false,
  });
  assert.equal(
    config.redirects.some(route => route.source === '/teambook' || route.source === '/teambook/:path*'),
    false,
  );
  assert.equal(
    config.rewrites.some(route => route.source === '/teambook' && route.destination === '/index.html'),
    true,
  );
  for (const host of ['teambook.me', 'www.teambook.me']) {
    assert.equal(
      projectConfig.redirects.some(route => route.source === '/'
        && route.destination === '/teambook/'
        && route.has?.some(match => match.type === 'host' && match.value === host)),
      true,
    );
  }
});


test('www.teambook.me keeps TeamBook pages, assets, and APIs inside the /teambook app', () => {
  const projectConfig = JSON.parse(readFileSync(join(ROOT, '../vercel.json'), 'utf8'));
  const hostRoute = source => projectConfig.rewrites.find(route => route.source === source
    && route.has?.some(match => match.type === 'host' && match.value === 'www.teambook.me'));

  for (const prefix of ['_shared', 'assets', 'join', 'new', 'p', 'profile', 'read', 'reveal']) {
    assert.equal(hostRoute(`/${prefix}/:path*`)?.destination, `/teambook/${prefix}/:path*`);
  }
  assert.equal(hostRoute('/api/profile')?.destination, '/api/teambook-profile');
  assert.equal(
    projectConfig.rewrites.some(route => route.source === '/api/teambook/:path*'
      && route.destination === '/api/teambook?path=:path*'),
    true,
  );

  for (const wrapper of ['teambook.js', 'teambook-media.js', 'teambook-pet.js', 'teambook-profile.js']) {
    assert.match(
      readFileSync(join(ROOT, '../api', wrapper), 'utf8'),
      /export \{ default \} from '\.\.\/teambook\/api\//,
    );
  }
});
