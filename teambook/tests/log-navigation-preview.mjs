/* Local browser fixture for the real /p and /public/p pages. Run from any directory:
 *   node teambook/tests/log-navigation-preview.mjs
 * Open http://127.0.0.1:4187/p/?c=91001 (mixed, long history),
 * /p/?c=91002 (no messages), or /p/?c=91003 (no commits).
 * GET /__fixture/state reports exact counts and API request counts.
 * POST /__fixture/append?code=91001&kind=message appends a synthetic post
 * and changes the pulse version, exercising the original live-sync pipeline.
 * POST /__fixture/reset restores all fixtures. No production API is called,
 * no environment credentials are read, and product mutations are rejected.
 * tests/ is excluded by scripts/build-static.mjs.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 4187);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg' };
const me = 'preview-member-one';
const profile = { id: me, alias: 'นที (ทดสอบ)', avatar: 'orange_cat', avatarId: 'orange_cat', avatarFrame: 'blue', createdAt: new Date().toISOString(), ownedCards: [], cardRewards: [] };
let books;
const requests = new Map();

function createBook(code, excludedKind = '') {
  const base = Date.now() - 4 * 60 * 60 * 1000;
  const at = n => new Date(base + n * 60 * 1000).toISOString();
  const members = [
    { userId: me, alias: profile.alias, avatar: 'orange_cat', avatarColor: 'blue', role: 'lead', joinedAt: at(-10) },
    { userId: 'preview-member-two', alias: 'ใบบัว (ทดสอบ)', avatar: 'turtle', avatarColor: 'green', role: 'member', joinedAt: at(-9) },
    { userId: 'preview-member-three', alias: 'ต้นกล้า (ทดสอบ)', avatar: 'crow', avatarColor: 'red', role: 'member', joinedAt: at(-8) },
  ];
  const log = [];
  function add(kind, body, extra = {}) {
    const member = members[log.length % members.length];
    log.push({ seq: log.length + 1, kind, body, sentAt: at(log.length * 3), userId: member.userId, alias: member.alias, avatar: member.avatar, reactions: {}, ...extra });
  }
  for (let i = 1; i <= 10; i += 1) {
    add('commit', `ลงชื่อทดสอบ ${i}: เรียนบทเรียนและจดสิ่งที่นำไปใช้แล้ว`, i === 2 ? { retracted: true } : {});
    add('message', `ข้อความทดสอบ ${i}ก: วันนี้ลองทำตามบทเรียนแล้ว มีรายละเอียดเล็ก ๆ ที่อยากแบ่งปันให้เพื่อนอ่าน`, i === 3 ? { retracted: true } : {});
    if (i % 2 === 0) add('pet', `เพื่อนร่วมทางทดสอบ ${i}: วันนี้มีหลายคนแวะมาลงชื่อแล้ว`, { userId: 'preview-pet', alias: 'หมา', avatar: 'dog', petId: 'dog' });
    if (i === 5) add('reward', 'ORANGE_CAT_BLUE_RARE_001', { rewardSource: 'first_seen', rewardId: 'preview-opened-card' });
    if (i === 10) add('reward', '', { userId: me, alias: profile.alias, rewardSource: 'first_seen_pending', rewardId: 'preview-pending-card' });
    add('message', i === 10 ? 'ข้อความล่าสุดจากข้อมูลทดสอบ — นัดกันอ่านบทต่อไปพรุ่งนี้' : `ข้อความทดสอบ ${i}ข: ขอบคุณที่แบ่งปัน เดี๋ยวจะลองทำดูด้วย`);
  }
  return {
    code, name: excludedKind ? `สมุดทดสอบ — ไม่มี${excludedKind === 'message' ? 'ข้อความ' : 'ลงชื่อ'}` : 'สมุดทดสอบการอ่าน — ประวัติยาว',
    state: 'ACTIVE', ownerId: me, creatorId: me, activity: 'เรียนรู้', activityId: 'study', activityMode: 'shared', sharedActivityId: 'study', sharedActivityLabel: 'เรียนรู้',
    color: 'green', visibility: 'private', verificationMode: 'trust', commitRule: 'ทำสิ่งที่ตั้งใจไว้แล้ว', durationDays: 7,
    startedAt: at(-20), startAt: at(-20), createdAt: at(-20), updatedAt: at(120), memberLimit: 15, maxMembers: 15,
    coverType: 'avatar', petId: 'dog', budget: 'social', members, memberHistory: members,
    log: log.filter(post => post.kind !== excludedKind),
    rewardClaims: [
      { alias: profile.alias, userId: me, rewardId: 'preview-pending-card', revealedAt: null },
      { alias: members[1].alias, userId: members[1].userId, rewardId: 'preview-opened-card', revealedAt: at(65) },
    ],
    events: [
      { type: 'PARTY_CREATED', actorId: me, at: at(-20), data: { alias: profile.alias } },
      { type: 'MEMBER_JOINED', actorId: members[1].userId, at: at(20), data: { alias: members[1].alias } },
      { type: 'RULE_CHANGED', actorId: me, at: at(60), data: { to: 'ทำสิ่งที่ตั้งใจไว้แล้ว' } },
    ],
    fixtureVersion: 1,
  };
}

function reset() {
  books = new Map([createBook('91001'), createBook('91002', 'message'), createBook('91003', 'commit')].map(book => [book.code, book]));
}
reset();

function summary() {
  return {
    synthetic: true,
    fixtures: [...books.values()].map(book => ({ code: book.code, url: `/p/?c=${book.code}`, version: book.fixtureVersion, posts: book.log.length,
      counts: Object.fromEntries(['commit', 'message', 'pet', 'reward'].map(kind => [kind, book.log.filter(post => post.kind === kind).length])),
      events: book.events.length, rewardStatuses: book.rewardClaims.length, lastPost: book.log.at(-1)?.body })),
    apiRequests: Object.fromEntries(requests),
  };
}

function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    const pathname = decodeURIComponent(url.pathname);
    const method = req.method || 'GET';
    // Only our local files and loopback fake APIs can load in the fixture.
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (pathname === '/__fixture/state' && method === 'GET') return send(res, 200, summary());
    if (pathname === '/__fixture/reset' && method === 'POST') { reset(); return send(res, 200, summary()); }
    if (pathname === '/__fixture/append' && method === 'POST') {
      const book = books.get(url.searchParams.get('code') || '91001');
      const kind = url.searchParams.get('kind') || 'message';
      if (!book || !['commit', 'message', 'pet', 'system'].includes(kind)) return send(res, 400, { error: 'BAD_FIXTURE_INPUT' });
      const sentAt = new Date().toISOString();
      const number = book.fixtureVersion + 1;
      if (kind === 'system') book.events.push({ type: 'RULE_CHANGED', actorId: me, at: sentAt, data: { to: `กติกาทดสอบ ${number}` } });
      else book.log.push({ seq: Math.max(0, ...book.log.map(post => post.seq)) + 1, kind, body: `อัปเดตสดทดสอบ ${number} — ${kind === 'commit' ? 'ลงชื่อ' : kind === 'pet' ? 'เพื่อนร่วมทาง' : 'ข้อความใหม่'}`, sentAt, userId: 'preview-member-two', alias: 'ใบบัว (ทดสอบ)', avatar: 'turtle', reactions: {}, ...(kind === 'pet' ? { petId: 'dog' } : {}) });
      book.fixtureVersion = number;
      book.updatedAt = sentAt;
      return send(res, 200, summary());
    }
    if (pathname.startsWith('/api/')) {
      requests.set(`${method} ${pathname}`, (requests.get(`${method} ${pathname}`) || 0) + 1);
      if (method !== 'GET') return send(res, 403, { ok: false, error: 'FIXTURE_PRODUCT_MUTATIONS_DISABLED' });
      if (pathname === '/api/auth/session') return send(res, 200, { user: null });
      if (pathname === '/api/teambook-mine') return send(res, 200, { ok: true, parties: [] });
      if (pathname === '/api/teambook-party-finish' && url.searchParams.get('op') === 'public-preview-v2') {
        const book = books.get(url.searchParams.get('code'));
        return send(res, book ? 200 : 404, book ? { ok: true, party: { ...book, visibility: 'public', memberCount: book.members.length, joinable: true } } : { error: 'NOT_FOUND' });
      }
      if (pathname === '/api/teambook-pulse') {
        const book = books.get(url.searchParams.get('code'));
        return send(res, book ? 200 : 404, book ? { ok: true, version: `fixture-${book.code}-${book.fixtureVersion}` } : { error: 'NOT_FOUND' });
      }
      const feed = pathname.match(/^\/api\/teambook\/party\/(\d{5})\/feed$/);
      if (feed) {
        const party = books.get(feed[1]);
        return send(res, party ? 200 : 404, party ? { ok: true, party, meUserId: me } : { error: 'NOT_FOUND' });
      }
      return send(res, 200, { ok: true });
    }
    if (method !== 'GET' && method !== 'HEAD') return send(res, 405, 'Method not allowed', 'text/plain');
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep) || /(?:^|\/)\.[^/]/.test(pathname) || pathname.startsWith('/tests/') || pathname.startsWith('/scripts/')) return send(res, 404, 'Not found', 'text/plain');
    let body = await readFile(file);
    if (pathname === '/p/' || pathname === '/p/index.html') {
      const book = books.get(url.searchParams.get('c'));
      if (!book) return send(res, 404, 'Choose fixture code 91001, 91002, or 91003.', 'text/plain');
      const seed = JSON.stringify({ profile, books: [...books.values()], tokens: Object.fromEntries([...books.keys()].map(code => [code, { token: 'synthetic-preview-token', userId: me }])) }).replaceAll('<', '\\u003c');
      body = body.toString().replace('<head>', `<head><script>(function(){const s=${seed};localStorage.setItem('teambook_data_epoch','1');localStorage.setItem('teambook_profile_v1',JSON.stringify(s.profile));localStorage.setItem('teambook_books_v1',JSON.stringify(s.books));localStorage.setItem('teambook_book_tokens_v1',JSON.stringify(s.tokens));})();</script>`);
    }
    return send(res, 200, method === 'HEAD' ? '' : body, mime[extname(file)] || 'application/octet-stream');
  } catch (error) {
    send(res, error.code === 'ENOENT' ? 404 : 500, { error: error.code === 'ENOENT' ? 'NOT_FOUND' : 'FIXTURE_ERROR' });
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Synthetic TeamBook preview: http://127.0.0.1:${port}/p/?c=91001`);
  console.log(JSON.stringify(summary(), null, 2));
});
