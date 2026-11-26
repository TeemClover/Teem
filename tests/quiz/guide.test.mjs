import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('the Excel guide points at a video, poster, captions and template that ship with the site', async () => {
  const source = await readFile(new URL('../../quiz/excel-guide.js', import.meta.url), 'utf8');
  const paths = [...source.matchAll(/'(\/quiz\/[^']+\.(?:mp4|jpg|vtt|csv))'/g)].map(m => m[1]);
  assert.deepEqual(paths.map(p => p.split('.').pop()).sort(), ['csv', 'jpg', 'mp4', 'vtt']);
  for (const p of paths) assert.ok((await stat(new URL('../..' + p, import.meta.url))).size > 0, p);
  const video = await stat(new URL('../../quiz/guide/excel-guide.mp4', import.meta.url));
  assert.ok(video.size < 8 * 1024 * 1024, 'keep the guide video small enough for phones');
  const quiz = await readFile(new URL('../../quiz/quiz.js', import.meta.url), 'utf8');
  assert.match(quiz, /mountExcelGuide\(document\.querySelector\('#question-import \.import-heading'\)\)/);
});
