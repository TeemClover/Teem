#!/usr/bin/env node
/**
 * Renders the static X-VISOR pages from xvisor/_src/*.html and xvisor/pack/manifest.json.
 * The manifest (vendored from TeemClover/xvisor) is the only place the start message,
 * the entry buttons, the lesson list and the version are written.
 *
 *   node scripts/build-xvisor-pages.mjs          write the pages
 *   node scripts/build-xvisor-pages.mjs --check  exit 1 if a page is out of date
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const X = join(ROOT, 'xvisor');
const manifest = JSON.parse(await readFile(join(X, 'pack', 'manifest.json'), 'utf8'));
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const entries = manifest.entries.map(entry => `        <div class="entry">
          <b>${esc(entry.label)}</b>
          <span>${esc(entry.hint)}</span>
          <button class="btn btn--small" type="button" data-copy="start" data-context="${esc(entry.context)}">คัดลอกเพื่อ${esc(entry.label)}</button>
        </div>`).join('\n');

const lessons = manifest.lessons.map(lesson => `        <li><a href="/xvisor/learn/${esc(lesson.id)}/" data-lesson-done="${esc(lesson.id)}" data-total="3">
          <span class="no" aria-hidden="true">${lesson.no}</span>
          <span><b>บทที่ ${lesson.no} · ${esc(lesson.title)}</b><small>ประมาณ ${lesson.minutes} นาที <span data-lesson-count></span></small></span>
        </a></li>`).join('\n');

function render(source, tokens) {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (match, name) => {
    if (!(name in tokens)) throw new Error(`unknown token ${match}`);
    return tokens[name];
  });
}
const base = {
  START: esc(manifest.prompts.start),
  VERSION: esc(manifest.version),
  UPDATED: esc(manifest.updated),
  ENTRIES: entries,
  LESSONS: lessons,
};

const jobs = [
  ['index.html', 'index.html', base],
  ['how.html', 'how/index.html', base],
  ['learn.html', 'learn/index.html', base],
  ...manifest.lessons.map((lesson, index) => {
    const next = manifest.lessons[index + 1];
    return [`lesson-${lesson.id}.html`, `learn/${lesson.id}/index.html`, {
      ...base,
      NO: String(lesson.no),
      TITLE: esc(lesson.title),
      MINUTES: String(lesson.minutes),
      CONTEXT: esc(lesson.context),
      LESSON_ID: esc(lesson.id),
      NEXT: next
        ? `<a class="btn" href="/xvisor/learn/${esc(next.id)}/">ไปบทที่ ${next.no} · ${esc(next.title)}</a>`
        : '<a class="btn" href="/xvisor/">กลับไปทำคลิปจริงที่หน้าแรก</a>',
    }];
  }),
];

const check = process.argv.includes('--check');
let stale = 0;
for (const [src, out, tokens] of jobs) {
  let source = await readFile(join(X, '_src', src), 'utf8');
  if (src.startsWith('lesson-')) {
    const shell = await readFile(join(X, '_src', 'lesson-shell.html'), 'utf8');
    source = shell.replace('{{BODY}}', () => source.replace(/\n$/, ''));
  }
  const html = render(source, tokens);
  const target = join(X, out);
  if (check) {
    const current = await readFile(target, 'utf8').catch(() => null);
    if (current !== html) { console.log(`OUT OF DATE xvisor/${out}`); stale++; }
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`wrote xvisor/${out}`);
}
if (stale) process.exit(1);
if (check) console.log('xvisor pages are up to date');
