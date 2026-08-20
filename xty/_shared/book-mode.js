/* ═══════════════════════════════════════════════════════════════
   How a book decides what its people are doing.

   A book is a shared page. The activity on that page may belong to
   everyone or to each person — those are the two modes, and almost
   every screen that shows an activity has to ask which one it is
   looking at before it can answer.

   The rule that shapes the rest of this file: what a day meant when
   it was signed is fixed. Changing your activity today must not
   rewrite what yesterday looked like, so a signature carries its own
   copy of the activity rather than a pointer to the live one.
   ═══════════════════════════════════════════════════════════════ */

import { activityById, canonicalActivityId } from './activities.js';

export const SHARED = 'shared';
export const INDIVIDUAL = 'individual';
export const ACTIVITY_MODES = Object.freeze([SHARED, INDIVIDUAL]);

/* The words the product uses out loud. "success rule" and "commit" are
   how we talk about this among ourselves; nobody signing a book should
   have to learn either. */
export const SUCCESS_RULE_PROMPT = 'วันนี้นับว่าได้ทำเมื่อ…';
export const SUCCESS_RULE_MAX_CHARS = 60;
export const CUSTOM_LABEL_MAX_CHARS = 40;

export const MODE_COPY = Object.freeze({
  [SHARED]: Object.freeze({
    id: SHARED,
    title: 'ทำเรื่องเดียวกัน',
    blurb: 'ทุกคนทำกิจกรรมเดียวกัน แต่ตั้งเป้าของตัวเองได้',
    pickerTitle: 'เลือกกิจกรรมของสมุด',
  }),
  [INDIVIDUAL]: Object.freeze({
    id: INDIVIDUAL,
    title: 'ต่างคนต่างทำ',
    blurb: 'แต่ละคนเลือกเรื่องของตัวเอง แล้วกลับมาลงชื่อในสมุดเดียวกัน',
    pickerTitle: 'เลือกกิจกรรมของคุณ',
  }),
});

/* Four bookmark tabs, five choices behind each. The fifth is always
   "เขียนเอง" — writing your own is not a sixteenth category off to one
   side, it is one of the five things you can pick in any colour, and it
   keeps the colour you picked it from. */
export const COLORS = Object.freeze([
  Object.freeze({ id: 'red',    labelTh: 'ร่างกาย', tabTh: 'ตัว',  ids: ['walk', 'run', 'workout', 'enjoy-food'] }),
  Object.freeze({ id: 'green',  labelTh: 'ชีวิต',   tabTh: 'ชีวิต', ids: ['eat', 'sleep', 'housework', 'wellness'] }),
  Object.freeze({ id: 'blue',   labelTh: 'ใจ',      tabTh: 'ใจ',   ids: ['read', 'study', 'mindfulness', 'game'] }),
  Object.freeze({ id: 'silver', labelTh: 'สร้าง',   tabTh: 'สร้าง', ids: ['work', 'create', 'trade', 'project'] }),
]);

export const COLOR_IDS = Object.freeze(COLORS.map(c => c.id));
const COLOR_BY_ID = Object.freeze(Object.fromEntries(COLORS.map(c => [c.id, c])));

export const CUSTOM_PREFIX = 'custom-';

export function customIdFor(color) {
  return COLOR_BY_ID[color] ? `${CUSTOM_PREFIX}${color}` : null;
}

export function isCustomId(activityId) {
  const id = String(activityId || '');
  return id === 'custom' || (id.startsWith(CUSTOM_PREFIX) && !!COLOR_BY_ID[id.slice(CUSTOM_PREFIX.length)]);
}

export function colorOfCustomId(activityId) {
  const id = String(activityId || '');
  if (!id.startsWith(CUSTOM_PREFIX)) return null;
  const color = id.slice(CUSTOM_PREFIX.length);
  return COLOR_BY_ID[color] ? color : null;
}

/* The five cards behind one tab. The picker renders exactly this — it
   does not filter, reorder, or append, so what the tab shows and what the
   model accepts cannot drift apart. */
export function choicesFor(color) {
  const group = COLOR_BY_ID[color];
  if (!group) return [];
  const picked = group.ids.map(id => {
    const item = activityById(id);
    return Object.freeze({
      id: item.id,
      labelTh: item.labelTh,
      hintTh: item.hintTh,
      art: item.art,
      color,
      custom: false,
    });
  });
  return Object.freeze([...picked, Object.freeze({
    id: customIdFor(color),
    labelTh: 'เขียนเอง',
    hintTh: 'เขียนกิจกรรมของตัวเอง',
    art: activityById('custom').art,
    color,
    custom: true,
  })]);
}

export function allChoices() {
  return Object.freeze(COLOR_IDS.flatMap(color => choicesFor(color)));
}

export function colorOf(activityId) {
  const custom = colorOfCustomId(activityId);
  if (custom) return custom;
  const group = COLORS.find(c => c.ids.includes(canonicalActivityId(activityId)));
  return group ? group.id : null;
}

export function normalizeMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return ACTIVITY_MODES.includes(mode) ? mode : SHARED;
}

function clean(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/* One activity, resolved to the shape every screen wants: an id, words a
   person wrote or picked, and a colour. A custom choice has no label of
   its own, so it has to be given one. */
export function resolveActivity({ activityId, label, description, color } = {}) {
  const id = isCustomId(activityId) ? String(activityId) : canonicalActivityId(activityId);
  const custom = isCustomId(id);
  const known = custom ? null : activityById(id);
  const resolvedColor = colorOf(id) || (COLOR_BY_ID[color] ? color : null);
  return Object.freeze({
    activityId: id,
    label: clean(custom ? label : (label || known.labelTh), CUSTOM_LABEL_MAX_CHARS) || (known ? known.labelTh : ''),
    description: clean(description || (known ? known.hintTh : ''), 120),
    color: resolvedColor,
    custom,
  });
}

export function isActivityComplete(activity) {
  const resolved = resolveActivity(activity);
  return !!resolved.color && resolved.label.length > 0;
}

/* Which activity applies to one person in one book. This is the question
   the whole mode split exists to answer, and it has exactly one answer
   per mode — anything that reads an activity off a member in shared mode,
   or off the book in individual mode, is reading the wrong field. */
export function activityForMember(book = {}, member = {}) {
  const mode = normalizeMode(book.activityMode ?? book.activity_mode);
  if (mode === SHARED) {
    return resolveActivity({
      activityId: book.sharedActivityId ?? book.shared_activity_id ?? book.activityId ?? book.activity_id,
      label: book.sharedActivityLabel ?? book.shared_activity_label ?? book.activity,
      description: book.sharedActivityDescription ?? book.shared_activity_description,
      color: book.sharedActivityColor ?? book.shared_activity_color,
    });
  }
  return resolveActivity({
    activityId: member.activityId ?? member.activity_id,
    label: member.activityLabel ?? member.activity_label,
    description: member.activityDescription ?? member.activity_description,
    color: member.activityColor ?? member.activity_color,
  });
}

/* In individual mode there is no such thing as "the book's activity", and
   a screen that asks for one is about to print something untrue. */
export function bookActivity(book = {}) {
  if (normalizeMode(book.activityMode ?? book.activity_mode) === INDIVIDUAL) return null;
  return activityForMember(book, {});
}

/* The one line that describes what a book is about, wherever a book is
   listed. In individual mode there is no single answer, and inventing one
   tells four people they are all doing the same thing — so the honest line
   says that instead of naming somebody's activity. */
export const INDIVIDUAL_BOOK_LINE = 'ต่างคนต่างทำ · แต่ละคนมีเรื่องของตัวเอง';

export function bookActivityLine(book = {}, fallback = 'ยังไม่ระบุกิจกรรม') {
  if (normalizeMode(book.activityMode ?? book.activity_mode) === INDIVIDUAL) return INDIVIDUAL_BOOK_LINE;
  const activity = bookActivity(book);
  const label = activity ? activity.label : '';
  return label || String(book.activity || '').trim() || fallback;
}

export function successRuleOf(member = {}) {
  return clean(member.successRule ?? member.success_rule, SUCCESS_RULE_MAX_CHARS);
}

/* What gets written onto a signature, once, at the moment of signing.
   Everything here is a copy: later edits to the member or the book leave
   already-signed days exactly as they were. */
export function signatureSnapshot(book, member) {
  const activity = activityForMember(book, member);
  return Object.freeze({
    activityId: activity.activityId,
    activityLabel: activity.label,
    activityColor: activity.color,
    successRuleSnapshot: successRuleOf(member),
  });
}

/* Reading a signature back. A day signed before snapshots existed has
   nothing of its own to show, and the honest answer there is the book's
   own activity — never today's version of the member's. */
export function activityOfSignature(signature = {}, book = {}) {
  const id = signature.activityId ?? signature.activity_id;
  if (id) {
    return Object.freeze({
      activityId: String(id),
      label: String(signature.activityLabel ?? signature.activity_label ?? ''),
      color: signature.activityColor ?? signature.activity_color ?? colorOf(id),
      successRule: String(signature.successRuleSnapshot ?? signature.success_rule_snapshot ?? ''),
      fromSnapshot: true,
    });
  }
  const fallback = bookActivity(book);
  return Object.freeze({
    activityId: fallback ? fallback.activityId : null,
    label: fallback ? fallback.label : '',
    color: fallback ? fallback.color : null,
    successRule: '',
    fromSnapshot: false,
  });
}

/* What a person still has to answer before they can be in this book.
   Shared mode inherits the activity, so joining is one short step; in
   individual mode the same person has a choice to make first. */
export function joinSteps(book = {}) {
  const mode = normalizeMode(book.activityMode ?? book.activity_mode);
  const steps = ['character'];
  if (mode === INDIVIDUAL) steps.push('color', 'activity');
  steps.push('successRule');
  return Object.freeze(steps);
}

export function successRuleRequired(book = {}) {
  return normalizeMode(book.activityMode ?? book.activity_mode) === INDIVIDUAL;
}
