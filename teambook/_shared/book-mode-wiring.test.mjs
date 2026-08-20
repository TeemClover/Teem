import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* The mode split is only real if it survives the whole trip: picked on the
   create page, stored, handed back, asked about before joining, and copied
   onto a signature. These hold the links in that chain that are easy to
   break from one end without noticing at the other. */

const core = readFileSync('api/_lib/core.js', 'utf8');
const create = readFileSync('api/_lib/xty-create-v2.js', 'utf8');
const join = readFileSync('api/_lib/xty-join-v2.js', 'utf8');
const route = readFileSync('api/teambook/[...path].js', 'utf8');
const newPage = readFileSync('new/index.html', 'utf8');
const joinPage = readFileSync('join/index.html', 'utf8');

test('the columns the feature needs all exist', () => {
  for (const column of ['activity_mode', 'shared_activity_description', 'shared_activity_color']) {
    assert.match(core, new RegExp(`teambook_books ADD COLUMN IF NOT EXISTS ${column}`), `parties.${column}`);
  }
  for (const column of ['activity_id', 'activity_label', 'activity_description', 'activity_color', 'success_rule']) {
    assert.match(core, new RegExp(`teambook_book_members ADD COLUMN IF NOT EXISTS ${column}`), `members.${column}`);
  }
  for (const column of ['activity_id', 'activity_label', 'activity_color', 'success_rule_snapshot']) {
    assert.match(core, new RegExp(`teambook_book_entries ADD COLUMN IF NOT EXISTS ${column}`), `posts.${column}`);
  }
});

test('an existing book keeps working and reads as shared', () => {
  /* Books opened before the question existed have no answer stored. The
     default has to make them shared, because that is the read that shows
     their own activity instead of looking for one on each member. */
  assert.match(core, /activity_mode TEXT NOT NULL DEFAULT 'shared'/);
  for (const [name, source] of [['create', create], ['join', join], ['route', route]]) {
    assert.match(source, /=== 'individual' \? 'individual' : 'shared'|activity_mode === 'individual'/,
      `${name} must treat anything that is not 'individual' as shared`);
  }
});

test('a signature copies the activity rather than pointing at it', () => {
  /* There are several inserts into this table; the one that matters is the
     one writing a signature, so pick it by that rather than by position. */
  const sql = route.match(/INSERT INTO teambook_book_entries \([\s\S]*?'commit'[\s\S]*?RETURNING seq/)?.[0];
  assert.ok(sql, 'the signature insert should be findable');
  assert.match(sql, /activity_id,activity_label,activity_color,success_rule_snapshot/,
    'the snapshot columns must be written');
  /* Written from the live rows at insert time, in one statement — a second
     round trip could see a different answer than the one being signed. */
  assert.match(sql, /JOIN teambook_book_members m ON m\.book_id=\$1 AND m\.user_id=\$2/);
  assert.match(sql, /CASE WHEN p\.activity_mode='individual' THEN m\.activity_id ELSE p\.activity_id END/);
  assert.match(sql, /m\.success_rule/);
});

test('an individual book never reports an activity of its own', () => {
  /* Four people doing four things must not be described by one of them. */
  for (const [name, source] of [['create', create], ['route', route]]) {
    assert.match(source, /sharedActivityLabel: [^\n]*'individual'[^\n]*null/,
      `${name} must null the book-wide label in individual mode`);
  }
  assert.match(route, /sharedActivityId: row\.activity_mode === 'individual' \? null/);
});

test('a stranger is told which kind of book this is before they join', () => {
  assert.match(route, /joined: false, party: \{[\s\S]*?activityMode: mode/,
    'the pre-join look-up must carry the mode');
  assert.match(joinPage, /fetch\(`\/api\/teambook\/party\/\$\{encodeURIComponent\(code\)\}`/,
    'and the join page must actually ask');
});

test('joining an individual book without choosing is refused, not guessed at', () => {
  assert.match(join, /ACTIVITY_REQUIRED/, 'the server must refuse it');
  assert.match(joinPage, /ACTIVITY_REQUIRED/, 'and the page must say so in words');
  /* Refusing on the server is what makes it true; the button being disabled
     is a courtesy that a direct request would walk straight past. */
  assert.match(join, /mode === 'individual' && \(!memberActivityId \|\| !memberActivityLabel\)/);
});

test('joining a shared book does not ask for an activity at all', () => {
  assert.match(join, /: \(row\.activity_id \|\| null\)/,
    'a shared book fills the member activity in from its own');
  assert.match(joinPage, /sharedActivityField/, 'and the page shows it rather than asking');
});

test('the create page asks the mode question before the activity question', () => {
  const modeAt = newPage.indexOf('id="modePick"');
  const activityAt = newPage.indexOf('id="activityPick"');
  assert.ok(modeAt > -1 && activityAt > -1, 'both steps should exist');
  assert.ok(modeAt < activityAt, 'which kind of book comes first — it changes what the next question means');
  assert.match(newPage, /MODE_COPY\[id\]\.pickerTitle/, 'and the heading follows the answer');
});

test('the book colour is no longer a question of its own', () => {
  /* A book is the colour of what it is about. Asking separately let the two
     drift, and in individual mode there is nothing for it to be the colour of. */
  assert.doesNotMatch(newPage, /id="colorPick"/, 'the separate colour step should be gone');
  assert.match(newPage, /function bookColor\(\)/, 'the colour is derived instead');
});

test('nothing left behind still refers to the old flat picker', () => {
  for (const dead of ['customActivity', 'activity-choice', 'TEAMBOOK_ACTIVITIES']) {
    assert.ok(!newPage.includes(dead), `the create page still mentions ${dead}`);
  }
});
