/** Floating controls in the house never cover each other on a phone. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test("a student's classroom pill and the music button share the top-right corner without overlapping", async () => {
  const css = await readFile(root + 'tour/tour.css', 'utf8'), entry = await readFile(root + 'assets/my-learning-entry.js', 'utf8');
  // the pill (assets/my-learning-entry.js) is pinned at 76px + safe area on phones, at least 38px tall
  const pill = entry.match(/@media\(max-width:600px\)\{\.my-learning-entry\{[^}]*top:calc\((\d+)px \+ env\(safe-area-inset-top,0px\)\)/);
  const pillHeight = Number(entry.match(/\.my-learning-entry\{[^}]*min-height:(\d+)px/)?.[1]);
  assert.ok(pill && pillHeight, 'pill position and height are still where this test reads them');
  // the music button steps below it whenever the pill is on the page
  const music = css.match(/@media \(max-width:600px\)\{\s*body:has\(\.my-learning-entry\) \.music\{top:calc\(env\(safe-area-inset-top,0px\) \+ (\d+)px\)\}/);
  assert.ok(music, 'tour.css moves the music button when the classroom pill is shown');
  assert.ok(Number(music[1]) >= Number(pill[1]) + pillHeight + 8, `music top ${music[1]}px clears the pill ending at ${Number(pill[1]) + pillHeight}px`);
});
