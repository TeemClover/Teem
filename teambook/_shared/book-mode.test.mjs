import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARED, INDIVIDUAL, ACTIVITY_MODES, MODE_COPY, COLORS, COLOR_IDS,
  SUCCESS_RULE_PROMPT, SUCCESS_RULE_MAX_CHARS,
  choicesFor, allChoices, colorOf, customIdFor, isCustomId, normalizeMode,
  resolveActivity, isActivityComplete, activityForMember, bookActivity,
  signatureSnapshot, activityOfSignature, joinSteps, successRuleRequired, successRuleOf,
} from './book-mode.js';
import { readFileSync } from 'node:fs';

/* A book is a shared page whose activity belongs either to everyone or to
   each person. These hold the parts of that split which, if they slip,
   print something untrue on a screen someone is about to screenshot. */

test('a book is one of exactly two modes, and an unreadable one is shared', () => {
  assert.deepEqual([...ACTIVITY_MODES], ['shared', 'individual']);
  assert.equal(normalizeMode('individual'), INDIVIDUAL);
  assert.equal(normalizeMode('SHARED'), SHARED);
  /* An old book, a truncated field, a typo — none of those may become a
     third mode, and shared is the safe read because it shows the book's
     own activity rather than guessing at a member's. */
  for (const junk of [undefined, null, '', 'solo', 'Individual ', 0]) {
    assert.ok(ACTIVITY_MODES.includes(normalizeMode(junk)), `${junk} escaped the two modes`);
  }
  assert.equal(normalizeMode('Individual '), INDIVIDUAL, 'stray case and space still read');
});

test('four tabs, five choices each, and the fifth is always your own words', () => {
  assert.equal(COLORS.length, 4);
  assert.deepEqual([...COLOR_IDS], ['red', 'green', 'blue', 'silver']);
  for (const color of COLOR_IDS) {
    const five = choicesFor(color);
    assert.equal(five.length, 5, `${color} must offer five`);
    assert.equal(five.filter(c => c.custom).length, 1, `${color} needs exactly one เขียนเอง`);
    assert.equal(five.at(-1).id, customIdFor(color), 'and it comes last');
    for (const choice of five) {
      assert.equal(choice.color, color, `${choice.id} must carry its tab's colour`);
      assert.ok(choice.labelTh && choice.art, `${choice.id} needs a name and a picture`);
    }
  }
  assert.equal(allChoices().length, 20);
});

test('writing your own keeps the colour it was written under', () => {
  /* This is the whole point of moving custom out of its own pile: a
     hand-written activity is a red activity or a blue one, not colourless. */
  for (const color of COLOR_IDS) {
    const id = customIdFor(color);
    assert.ok(isCustomId(id));
    assert.equal(colorOf(id), color, `${id} lost its colour`);
    const resolved = resolveActivity({ activityId: id, label: 'ซ้อมกีตาร์' });
    assert.equal(resolved.color, color);
    assert.equal(resolved.label, 'ซ้อมกีตาร์');
    assert.ok(resolved.custom);
  }
});

test('a hand-written activity with no words is not finished', () => {
  assert.equal(isActivityComplete({ activityId: 'custom-blue', label: '   ' }), false);
  assert.equal(isActivityComplete({ activityId: 'custom-blue', label: 'อ่านงานวิจัย' }), true);
  assert.equal(isActivityComplete({ activityId: 'read' }), true, 'a listed choice names itself');
});

test('shared mode reads the book, individual mode reads the person', () => {
  const member = { activityId: 'run', activityLabel: 'วิ่ง', activityColor: 'red' };

  const shared = { activityMode: SHARED, sharedActivityId: 'read', sharedActivityLabel: 'อ่าน' };
  assert.equal(activityForMember(shared, member).activityId, 'read',
    'in shared mode a member does not get their own activity');

  const individual = { activityMode: INDIVIDUAL, sharedActivityId: 'read' };
  assert.equal(activityForMember(individual, member).activityId, 'run',
    'in individual mode the member is the source of truth');
});

test('an individual book has no book-level activity to show', () => {
  /* A screen that prints one is about to tell four people they are all
     doing the same thing when they are not. */
  assert.equal(bookActivity({ activityMode: INDIVIDUAL, sharedActivityId: 'read' }), null);
  assert.equal(bookActivity({ activityMode: SHARED, sharedActivityId: 'read' }).activityId, 'read');
});

test('changing your activity today does not rewrite yesterday', () => {
  const book = { activityMode: INDIVIDUAL };
  const before = { activityId: 'run', activityLabel: 'วิ่ง', activityColor: 'red', successRule: 'วิ่งอย่างน้อย 2 กม.' };
  const signed = signatureSnapshot(book, before);

  const after = { activityId: 'read', activityLabel: 'อ่าน', activityColor: 'blue', successRule: 'อ่าน 10 หน้า' };
  const stillRun = activityOfSignature(signed, book);

  assert.equal(stillRun.activityId, 'run', 'the signed day kept the activity it was signed under');
  assert.equal(stillRun.color, 'red');
  assert.equal(stillRun.successRule, 'วิ่งอย่างน้อย 2 กม.', 'and the rule it was judged by');
  assert.equal(activityForMember(book, after).activityId, 'read', 'while today is the new one');
  assert.ok(stillRun.fromSnapshot);
});

test('a day signed before snapshots existed falls back to the book, not to today', () => {
  const book = { activityMode: SHARED, sharedActivityId: 'read', sharedActivityLabel: 'อ่าน' };
  const old = activityOfSignature({}, book);
  assert.equal(old.activityId, 'read');
  assert.equal(old.fromSnapshot, false, 'and it says so, so nothing presents a guess as a record');

  /* In individual mode there is nothing honest to fall back to at all. */
  const orphan = activityOfSignature({}, { activityMode: INDIVIDUAL });
  assert.equal(orphan.activityId, null);
  assert.equal(orphan.fromSnapshot, false);
});

test('joining a shared book is shorter than joining an individual one', () => {
  assert.deepEqual([...joinSteps({ activityMode: SHARED })], ['character', 'successRule']);
  assert.deepEqual([...joinSteps({ activityMode: INDIVIDUAL })],
    ['character', 'color', 'activity', 'successRule']);
  assert.equal(successRuleRequired({ activityMode: SHARED }), false,
    'inheriting the book activity is enough to be in it');
  assert.equal(successRuleRequired({ activityMode: INDIVIDUAL }), true);
});

test('a rule is one line of plain words, kept to a length a card can hold', () => {
  const long = 'ก'.repeat(SUCCESS_RULE_MAX_CHARS + 40);
  assert.equal(successRuleOf({ successRule: long }).length, SUCCESS_RULE_MAX_CHARS);
  assert.equal(successRuleOf({ successRule: '  อ่าน\n\n 10   หน้า  ' }), 'อ่าน 10 หน้า',
    'line breaks and runs of space collapse, so a rule cannot break a card open');
  assert.equal(successRuleOf({}), '');
});

test('the words shown to a person are the plain ones, not ours', () => {
  const source = readFileSync('_shared/book-mode.js', 'utf8');
  const shown = [SUCCESS_RULE_PROMPT, MODE_COPY[SHARED].title, MODE_COPY[SHARED].blurb,
                 MODE_COPY[INDIVIDUAL].title, MODE_COPY[INDIVIDUAL].blurb,
                 MODE_COPY[SHARED].pickerTitle, MODE_COPY[INDIVIDUAL].pickerTitle].join(' ');
  for (const jargon of [/commit rule/i, /verification/i, /success criteria/i, /metadata/i, /\bparty\b/i]) {
    assert.doesNotMatch(shown, jargon, `${jargon} is our word, not a word for a reader`);
  }
  assert.equal(SUCCESS_RULE_PROMPT, 'วันนี้นับว่าได้ทำเมื่อ…');
  /* The two modes have to be told apart at a glance or the choice is noise. */
  assert.notEqual(MODE_COPY[SHARED].title, MODE_COPY[INDIVIDUAL].title);
  assert.doesNotMatch(source, /export const MODE_COPY[\s\S]{0,400}undefined/);
});

test('every listed choice points at a picture that exists', () => {
  for (const choice of allChoices()) {
    assert.ok(choice.art.startsWith('/assets/'), `${choice.id} has an off-site picture`);
  }
});
