#!/usr/bin/env node
/**
 * R0 repo inventory (BLUEPRINT v3.0 §12 R0). Read-only: it never edits the site.
 *
 *   node tools/repo-inventory.mjs              → writes docs/INVENTORY.md (+ docs/url-baseline.txt if missing)
 *   node tools/repo-inventory.mjs --baseline   → also rewrites the URL baseline (only before a restructure)
 *   node tools/repo-inventory.mjs --check      → exits 1 if INVENTORY.md is out of date
 *
 * INVENTORY.md lists every top-level folder and root file with the facts a script can prove
 * (size, title, robots, sitemap, who links to it, which /api/ it calls) and the group the
 * blueprint proposes for it (§9.3). Brand/owner and live status are owner facts: the table
 * leaves them for the owner instead of guessing.
 *
 * url-baseline.txt is every URL that was public before the restructure: the sitemap, every
 * HTML page in the repo outside private/test folders, and every redirect source in vercel.json
 * and _redirects. Check it after each phase with scripts/check-url-baseline.mjs.
 */
import {readFile, writeFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_WALK = new Set(['.git', 'node_modules', '.tmp', '.forge-src', '.vercel']);

// §9.3 of the blueprint, as written by the owner. "?" = not listed there; owner decides.
const GROUPS = {
  CORE: ['entry', 'tour', 'work', 'hire', 'demo', 'walkthrough', 'classroom', 'learn', 'ai-source', 'courses', 'resume', 'meet', 'privacy', 'forge', 'core7', 'showcase', 'homechew', 'ako', 'book', 'assets', 'img', 'icons', 'api', 'tools', 'scripts', 'tests', 'docs'],
  'SPIN-OFF': ['short', 'teambook', 'xty', 'profile', 'asksydscience'],
  'BRAND/CLIENT': ['xircle', 'routinex', 'xvisor', 'guild', 'fitness', 'clover20', 'mediral', 'hamburg'],
  'AFFILIATE/LEGACY': ['airova', 'hf', 'ai-career', 'kickstarter', 'eggcycle', 'first-class', 'class', 'club', 'collection', 'compendium', 'paths', 'compass', 'frontdoor', 'hall.html', 'hall-full.html', 'home', 'card', 'register', 'invite'],
  PRIVATE: ['calling', 'command', 'captures', 'members', 'keen', 'stat', 'boss'],
  DEAD: ['_redirects', '_headers', 'functions', '.tmp', '.forge-src', 'SHA256SUMS.txt', 'blueprint', 'routing'],
  'ROOT DOCS': ['IMAGES.md', 'IMAGES-REQUEST.md', 'IMAGE-SLOTS.md', 'JOURNEY-FUNNEL-MASTER.md', 'SOCIAL-SEO-GUIDE-TH.md', 'UPLOAD-GUIDE-TH.md', 'README-TH.md'],
};
// Things the blueprint's draft would break if taken literally; flagged for the owner.
const NOTES = {
  routing: 'NOT dead: middleware.js imports routing/public-assets.js and routing/public-classroom.js. Keep.',
  shelf: 'Source shelf (AGENTS.md). shelf/source/clover-x/ and shelf/source/thedent/ are listed PRIVATE in §9.3.',
  course: 'Paid classroom (thedent) behind middleware auth. Not listed in §9.3.',
  en: 'English pages; §0 says /en/ comes later.',
  home: 'Original /home/ (video opening). tools/sync-frontdoor-root.mjs refuses to run if it changes.',
  compass: 'Generated from frontdoor/index.html by tools/sync-frontdoor-root.mjs.',
  'index.html': 'Generated: / is rendered from a source folder by tools/sync-frontdoor-root.mjs. Never hand-edit.',
  _redirects: 'Cloudflare/Netlify format. Vercel ignores it (E3). tools/build.py still rewrites its Forge aliases.',
  _headers: 'Cloudflare/Netlify format. Vercel ignores it.',
  functions: 'Cloudflare Pages Functions; .vercelignore already excludes it (E4).',
  'middleware.js': 'Vercel edge middleware: classroom/course auth, shelf guard, trailing-slash canonicalisation.',
  'vercel.json': 'The only redirect/header/rewrite config Vercel reads.',
  'llms.txt': 'AI navigation file (§10).',
  'sitemap.xml': 'Search sitemap (§10).',
  'robots.txt': 'Already open to AI crawlers (E11).',
};

const groupOf = name => Object.entries(GROUPS).find(([, list]) => list.includes(name))?.[0] || '?';
const rel = p => path.relative(ROOT, p).split(path.sep).join('/');

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    if (SKIP_WALK.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const human = n => n > 1e9 ? (n / 1e9).toFixed(1) + 'GB' : n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : n > 1e3 ? (n / 1e3).toFixed(0) + 'KB' : n + 'B';
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

export async function buildInventory() {
  const files = await walk(ROOT);
  const sizes = new Map(await Promise.all(files.map(async f => [f, (await stat(f)).size])));
  const sitemap = (await readFile(path.join(ROOT, 'sitemap.xml'), 'utf8').catch(() => ''))
    .match(/<loc>[^<]+<\/loc>/g)?.map(s => new URL(s.slice(5, -6)).pathname) || [];
  const vercel = JSON.parse(await readFile(path.join(ROOT, 'vercel.json'), 'utf8'));
  const headerNoindex = vercel.headers.filter(h => h.headers.some(x => /x-robots-tag/i.test(x.key) && /noindex/i.test(x.value))).map(h => h.source);
  const htmlFiles = files.filter(f => /\.html?$/i.test(f));
  const htmlText = new Map(await Promise.all(htmlFiles.map(async f => [f, await readFile(f, 'utf8')])));
  const textFiles = files.filter(f => /\.(m?js|html?)$/i.test(f) && sizes.get(f) < 3e6);
  const apiUse = new Map();
  for (const f of textFiles) {
    const top = rel(f).split('/')[0];
    const text = htmlText.get(f) ?? await readFile(f, 'utf8');
    for (const m of text.matchAll(/['"`]\/api\/([a-z0-9-]+)/gi)) {
      if (!apiUse.has(top)) apiUse.set(top, new Set());
      apiUse.get(top).add(m[1]);
    }
  }

  const top = (await readdir(ROOT, {withFileTypes: true})).filter(e => !SKIP_WALK.has(e.name) || e.name === '.tmp' || e.name === '.forge-src')
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = [];
  for (const entry of top) {
    if (entry.name === '.git') continue;
    const name = entry.name, isDir = entry.isDirectory();
    const mine = files.filter(f => isDir ? rel(f).startsWith(name + '/') : rel(f) === name);
    const bytes = mine.reduce((n, f) => n + sizes.get(f), 0);
    const indexFile = isDir ? path.join(ROOT, name, 'index.html') : /\.html$/.test(name) ? path.join(ROOT, name) : null;
    const index = indexFile && htmlText.get(indexFile);
    const title = index?.match(/<title>([^<]*)<\/title>/i)?.[1] || '';
    const robots = index?.match(/<meta name="robots" content="([^"]+)"/i)?.[1] || (index ? '(none = index)' : '');
    const prefix = isDir ? `/${name}/` : `/${name}`;
    const viaHeader = headerNoindex.some(s => s === prefix || s.startsWith(prefix) || s.startsWith(`/${name}/:`) || s === `/${name}`);
    const inSitemap = sitemap.filter(p => p === prefix || p.startsWith(prefix)).length;
    let inbound = 0; const from = new Set();
    for (const [f, t] of htmlText) {
      const owner = rel(f).split('/')[0];
      if (owner === name) continue;
      if (t.includes(`href="${prefix}`) || (!isDir && t.includes(`href="/${name}"`))) { inbound++; from.add(owner === 'index.html' ? '/' : owner); }
    }
    rows.push({name: isDir ? name + '/' : name, files: mine.length, bytes, title, robots: robots + (viaHeader ? ' + header noindex' : ''),
      inSitemap, inbound, from: [...from].slice(0, 6).join(', ') + (from.size > 6 ? ` +${from.size - 6}` : ''),
      api: [...(apiUse.get(name) || [])].sort().join(', '), group: groupOf(name), note: NOTES[name] || ''});
  }
  return {rows, sitemap, files, htmlFiles, vercel};
}

export async function buildBaseline({sitemap, htmlFiles, vercel}) {
  const urls = new Set(sitemap);
  const privateTop = new Set([...GROUPS.PRIVATE, 'tests', 'docs', 'tools', 'scripts', 'functions', 'blueprint', 'shelf', 'api', 'node_modules', '.tmp', '.forge-src']);
  for (const f of htmlFiles) {
    const r = rel(f);
    const top = r.split('/')[0];
    if (privateTop.has(top) || /(^|\/)(tests?|fixtures?|backups?|_source|vendor)\//.test(r)) continue;
    urls.add('/' + r.replace(/(^|\/)index\.html$/, '$1'));
  }
  for (const r of vercel.redirects || []) if (!r.has && !r.source.includes(':')) urls.add(r.source);
  const legacy = await readFile(path.join(ROOT, '_redirects'), 'utf8').catch(() => '');
  for (const line of legacy.split('\n')) {
    const src = line.trim().split(/\s+/)[0];
    if (src && src.startsWith('/') && !src.includes('*') && !src.includes(':')) urls.add(src);
  }
  return [...urls].sort();
}

function renderInventory(rows) {
  const total = rows.reduce((n, r) => n + r.bytes, 0);
  const byGroup = {};
  for (const r of rows) (byGroup[r.group] ||= []).push(r.name);
  return `# myClover repo inventory (R0)

> Generated by \`node tools/repo-inventory.mjs\` from the working tree. Do not edit by hand; rerun it.
> Proves only what a script can read. **Owner columns** (brand/owner, live status, keep/move) stay with the owner — see "ต้องให้เจ้าของตัดสิน" at the end.

- Top-level entries: ${rows.length} · files: ${rows.reduce((n, r) => n + r.files, 0)} · working-tree size (no .git): ${human(total)}
- Group = proposal from BLUEPRINT v3.0 §9.3. \`?\` = not listed there.
- robots = \`<meta name="robots">\` of the folder's index.html; "header noindex" = an X-Robots-Tag rule in vercel.json.
- inbound = how many other top-level folders link to it with \`href="/name/…"\`.

## Groups at a glance
${Object.entries(byGroup).map(([g, list]) => `- **${g}** (${list.length}): ${list.map(n => '`' + n + '`').join(' ')}`).join('\n')}

## Table
| entry | group | files | size | title | robots | sitemap URLs | inbound (from) | /api/ used | note |
|---|---|---:|---:|---|---|---:|---|---|---|
${rows.map(r => `| \`${cell(r.name)}\` | ${r.group} | ${r.files} | ${human(r.bytes)} | ${cell(r.title)} | ${cell(r.robots)} | ${r.inSitemap} | ${r.inbound}${r.from ? ` (${cell(r.from)})` : ''} | ${cell(r.api)} | ${cell(r.note)} |`).join('\n')}

## ต้องให้เจ้าของตัดสิน (owner decisions found by R0)
1. **D6 — PRIVATE pages that still need the website:** ${GROUPS.PRIVATE.map(n => '`/' + n + '/`').join(' ')} are public URLs today (noindex is not access control). Which ones must stay online (then they need real auth) and which can 404?
2. **\`routing/\` is not dead** (§9.3 lists it as DEAD). middleware.js imports it. It stays.
3. **\`course/\`, \`shelf/\`, \`en/\`, \`en\` pages, \`media/\`, \`hall\`/\`home\`** are not in §9.3 or need a per-URL call (§2). Proposed: \`course/\` CORE (paid students), \`shelf/\` CORE minus the two PRIVATE sources, \`en/\` CORE (later), \`media/\` check usage.
4. **D5 — repo split (R1):** not started. Needs the owner's approval, a new Vercel project and DNS.
5. **E9 — /ai-source/ still sells by bank transfer** (\`sales_enabled: true\`, \`checkout_verified: false\`). Closing new-buyer payments touches the checkout, the 790 recovery offer and existing students, so it ships as its own reviewed change.
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = await buildInventory();
  const inventory = renderInventory(data.rows);
  const baseline = (await buildBaseline(data)).join('\n') + '\n';
  // The baseline is the "before" picture: write it once (or with --baseline), never silently.
  const baselineExists = await stat(path.join(ROOT, 'docs/url-baseline.txt')).then(() => true, () => false);
  const targets = [['docs/INVENTORY.md', inventory]];
  if (!baselineExists || process.argv.includes('--baseline')) targets.push(['docs/url-baseline.txt', baseline]);
  if (process.argv.includes('--check')) {
    let stale = false;
    for (const [p, body] of targets) if ((await readFile(path.join(ROOT, p), 'utf8').catch(() => '')) !== body) { console.error('stale: ' + p); stale = true; }
    process.exit(stale ? 1 : 0);
  }
  for (const [p, body] of targets) await writeFile(path.join(ROOT, p), body);
  console.log(`docs/INVENTORY.md: ${data.rows.length} entries` + (targets.length > 1 ? ` · docs/url-baseline.txt: ${baseline.split('\n').length - 1} URLs` : ' · baseline kept'));
}
