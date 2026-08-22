/* TeamBook V1.2 — evidence-first Ending engine.

   Canonical rule:
     Event สำคัญต้องมี Evidence of Meaning มากกว่า Evidence of Change

   A state change is evidence that something changed, not evidence that the
   change mattered. Companion swaps, renames, avatar swaps, rule changes and
   cover changes therefore stay details unless the event itself carries a
   direct meaning signal (pin/reflection/meaningEvidence). Group interaction
   on the same day may make that DAY meaningful, but never retroactively turns
   an unrelated settings change into the story's turning point.

   This module is pure and shared by browser/server tests. It also keeps target
   duration, lived calendar span and active signing days as separate facts;
   conflicts are surfaced instead of silently repaired. */

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const CHANGE_ONLY_TYPES = new Set([
  'NPC_CHANGED', 'LEAD_CARD_CHANGED', 'MEMBER_AVATAR_CHANGED',
  'MEMBER_ALIAS_CHANGED', 'PARTY_RENAMED', 'RULE_CHANGED',
]);

function safeDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function endingDayKey(value) {
  const date = safeDate(value);
  if (!date) return '';
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function dayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return null;
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function inclusiveSpanDays(from, to) {
  const a = dayNumber(endingDayKey(from));
  const b = dayNumber(endingDayKey(to));
  if (a == null || b == null || b < a) return null;
  return b - a + 1;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compactText(value, max = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function reactionCount(post) {
  return Object.values(post?.reactions || {}).reduce((sum, users) =>
    sum + (Array.isArray(users) ? users.length : 0), 0);
}

function bestStreak(keys) {
  const days = unique(keys).map(dayNumber).filter(Number.isFinite).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  let previous = null;
  for (const day of days) {
    run = previous != null && day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

function inferObjects(activity, rule) {
  const text = `${activity || ''} ${rule || ''}`.toLowerCase();
  const groups = [
    { test: /(กิน|อาหาร|meal|food|lunch|dinner|breakfast|น้ำ|water)/, objects: ['จานอาหาร', 'กล่องข้าว', 'ขวดน้ำ'] },
    { test: /(นอน|sleep|bed|พักผ่อน)/, objects: ['หมอน', 'โคมไฟข้างเตียง', 'สมุดเล็ก'] },
    { test: /(เดิน|วิ่ง|ออกกำลัง|exercise|run|walk|workout)/, objects: ['รองเท้า', 'ผ้าขนหนู', 'ขวดน้ำ'] },
    { test: /(อ่าน|book|read|หนังสือ)/, objects: ['หนังสือ', 'ที่คั่นหนังสือ', 'โคมไฟ'] },
    { test: /(เรียน|study|งาน|work|เขียน|write|focus)/, objects: ['สมุด', 'ดินสอ', 'นาฬิกาจับเวลาเล็ก'] },
    { test: /(ทำอาหาร|cook|ครัว|kitchen)/, objects: ['เขียง', 'ชามเล็ก', 'ผักหรือวัตถุดิบ'] },
  ];
  return groups.find(group => group.test.test(text))?.objects
    || ['สมุด', 'ดินสอ', 'ของใช้ชิ้นเล็กจากกิจวัตร'];
}

function dayEvidenceOf(log) {
  const map = new Map();
  for (const post of log) {
    if (post?.retracted) continue;
    const key = endingDayKey(post?.sentAt);
    if (!key) continue;
    const day = map.get(key) || {
      dayKey: key,
      commits: 0,
      committers: new Set(),
      confirmations: 0,
      messages: 0,
      messageAuthors: new Set(),
      reactions: 0,
    };
    if (post.kind === 'commit') {
      day.commits += 1;
      if (post.userId) day.committers.add(post.userId);
      if (post.confirmedBy) day.confirmations += 1;
    }
    if (post.kind === 'message') {
      day.messages += 1;
      if (post.userId) day.messageAuthors.add(post.userId);
    }
    day.reactions += reactionCount(post);
    map.set(key, day);
  }

  return [...map.values()].map(day => {
    const committers = day.committers.size;
    const messageAuthors = day.messageAuthors.size;
    const simultaneous = committers >= 2;
    const score = committers * 3
      + day.confirmations * 2
      + Math.min(3, day.reactions)
      + (messageAuthors >= 2 ? 2 : (day.messages ? 1 : 0))
      + (simultaneous ? 2 : 0);
    return {
      dayKey: day.dayKey,
      commits: day.commits,
      committers,
      confirmations: day.confirmations,
      messages: day.messages,
      messageAuthors,
      reactions: day.reactions,
      simultaneous,
      score,
    };
  }).sort((a, b) => b.score - a.score || a.dayKey.localeCompare(b.dayKey));
}

function directMeaningSignals(event) {
  const data = event?.data && typeof event.data === 'object' ? event.data : {};
  const signals = [];
  if (data.meaningEvidence === true) signals.push('meaning-evidence');
  if (data.userPinned === true || data.pinned === true) signals.push('user-pinned');
  if (compactText(data.reflection || data.meaning || data.note, 120)) signals.push('reflection');
  return signals;
}

function eventEvidence(event, days) {
  const dayKey = endingDayKey(event?.at);
  const day = days.find(item => item.dayKey === dayKey) || null;
  const direct = directMeaningSignals(event);
  const ambient = [];
  let score = direct.length * 5;

  if (day?.confirmations) {
    ambient.push(`confirmed:${day.confirmations}`);
    score += Math.min(4, day.confirmations * 2);
  }
  if (day?.reactions) {
    ambient.push(`reactions:${day.reactions}`);
    score += Math.min(3, day.reactions);
  }
  if (day?.simultaneous) {
    ambient.push(`simultaneous:${day.committers}`);
    score += 2;
  }
  if ((day?.messageAuthors || 0) >= 2) {
    ambient.push(`conversation:${day.messageAuthors}`);
    score += 2;
  } else if (day?.messages) {
    ambient.push('message-nearby');
    score += 1;
  }

  const type = String(event?.type || '');
  const isChangeOnly = CHANGE_ONLY_TYPES.has(type);
  const mayBeTurningPoint = isChangeOnly ? direct.length > 0 : (direct.length > 0 || ambient.length > 0);
  const meaningScore = Math.round(score * 100) / 100;

  return {
    type,
    at: event?.at || null,
    dayKey,
    actorId: event?.actorId || null,
    data: event?.data && typeof event.data === 'object' ? event.data : {},
    meaningScore,
    directMeaningSignals: direct,
    ambientMeaningSignals: ambient,
    meaningSignals: [...direct, ...ambient],
    changeOnly: isChangeOnly,
    classification: mayBeTurningPoint && meaningScore >= 3 ? 'turning_point' : 'detail',
  };
}

function memberSummaries(history, commits) {
  return history.map(member => {
    const mine = commits.filter(post => post.userId === member.userId);
    const valid = mine.filter(post => post.valid !== false);
    const confirmed = mine.filter(post => !!post.confirmedBy);
    const keys = valid.map(post => endingDayKey(post.sentAt));
    return {
      userId: member.userId,
      alias: member.alias || '',
      role: member.role || 'member',
      avatar: member.avatar || '',
      avatarColor: member.avatarColor || '',
      joinedAt: member.joinedAt || null,
      leftAt: member.leftAt || null,
      commits: mine.length,
      validCommits: valid.length,
      confirmedCommits: confirmed.length,
      activeDays: unique(keys).length,
      bestStreak: bestStreak(keys),
    };
  });
}

export function buildEndingEvidence(party) {
  const log = Array.isArray(party?.log)
    ? [...party.log].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0))
    : [];
  const events = Array.isArray(party?.events)
    ? [...party.events].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
    : [];
  const history = Array.isArray(party?.memberHistory) && party.memberHistory.length
    ? party.memberHistory
    : (Array.isArray(party?.members) ? party.members : []);
  const commits = log.filter(post => post.kind === 'commit' && !post.retracted);
  const validCommits = commits.filter(post => post.valid !== false);
  const messages = log.filter(post => post.kind === 'message' && !post.retracted);
  const activeDayKeys = unique(validCommits.map(post => endingDayKey(post.sentAt))).sort();
  const dayEvidence = dayEvidenceOf(log);
  const targetDays = Math.max(1, Math.floor(Number(party?.durationDays || 1)));
  const calendarDays = inclusiveSpanDays(
    party?.startAt || party?.createdAt,
    party?.endAt || party?.updatedAt,
  );
  const activeDays = activeDayKeys.length;
  const conflicts = [];

  if (calendarDays != null && calendarDays !== targetDays) {
    conflicts.push({
      code: 'TARGET_SPAN_MISMATCH',
      targetDays,
      calendarDays,
      note: 'เก็บทั้ง 2 ค่าไว้ตามจริง ห้ามแก้เรื่องย้อนหลังให้ตัวเลขตรงกันเอง',
    });
  }
  if (activeDays > targetDays) {
    conflicts.push({
      code: 'ACTIVE_DAYS_EXCEED_TARGET',
      targetDays,
      activeDays,
      note: 'จำนวนวันที่มีหลักฐานมากกว่าระยะเวลาที่ตั้งไว้ ต้องรายงานเป็นข้อมูลขัดกัน ไม่เดาเหตุผล',
    });
  }

  const rankedEvents = events
    .map(event => eventEvidence(event, dayEvidence))
    .sort((a, b) => b.meaningScore - a.meaningScore || new Date(a.at || 0) - new Date(b.at || 0));
  const meaningfulEvent = rankedEvents.find(event => event.classification === 'turning_point') || null;
  const bestDay = dayEvidence[0] || null;
  const members = memberSummaries(history, commits);
  const confirmations = validCommits.filter(post => !!post.confirmedBy).length;
  const reactions = log.reduce((sum, post) => sum + reactionCount(post), 0);
  const maxPossible = Math.max(1, targetDays * Math.max(1, members.length));

  const npcChange = [...events].reverse().find(event => event.type === 'NPC_CHANGED');
  const companionId = party?.petId || party?.npcCardId || npcChange?.data?.to || null;

  return Object.freeze({
    version: 3,
    book: {
      id: party?.id || null,
      code: party?.code || '',
      name: party?.name || '',
      state: String(party?.state || '').toUpperCase(),
      activity: party?.activity || '',
      commitRule: party?.commitRule || '',
      verificationMode: party?.verificationMode || 'trust',
      targetDays,
      calendarDays,
      activeDays,
      startAt: party?.startAt || null,
      endAt: party?.endAt || null,
      color: party?.color || 'green',
      companionId,
    },
    facts: {
      members: members.length,
      commits: commits.length,
      validCommits: validCommits.length,
      confirmations,
      reactions,
      messages: messages.length,
      completionRate: Math.min(1, validCommits.length / maxPossible),
      bestStreak: members.reduce((best, member) => Math.max(best, member.bestStreak), 0),
      firstValidAt: validCommits[0]?.sentAt || null,
      lastValidAt: validCommits[validCommits.length - 1]?.sentAt || null,
      activeDayKeys,
    },
    members,
    dayEvidence,
    rankedEvents,
    messageExcerpts: messages
      .filter(post => compactText(post.body))
      .slice(-3)
      .map(post => ({ alias: post.alias || '', text: compactText(post.body), at: post.sentAt })),
    conflicts,
    visualObjects: inferObjects(party?.activity, party?.commitRule),
    moment: meaningfulEvent
      ? { kind: 'event', ...meaningfulEvent }
      : (bestDay ? { kind: 'shared_day', ...bestDay } : null),
    rule: 'Event สำคัญต้องมี Evidence of Meaning มากกว่า Evidence of Change',
  });
}

function sharedStyle() {
  return [
    'warm school-notebook page illustration',
    'colored pencil and crayon on warm cream paper',
    'subtle leafy-green accents',
    'cute premium animal characters only when supported by the real book',
    'physical notebook props and tactile handmade memory',
    'portrait composition 63:88',
    'quiet generous space at the top for a title added later outside the image',
    'no text, no letters, no logo, no watermark',
    'no app UI, no dashboard, no loot box, no rarity glow, no confetti',
    'not photorealistic, not dark, not a victory podium',
  ].join(', ');
}

export function buildEndingArtBriefs(evidence, { personaPrompt = '' } = {}) {
  const book = evidence?.book || {};
  const facts = evidence?.facts || {};
  const members = (evidence?.members || []).map(member => member.alias).filter(Boolean);
  const people = members.length ? members.join(', ') : 'the real group';
  const continuity = book.state === 'COMPLETED'
    ? 'The book itself is complete. Show gentle continuity: this volume is closed, but life can continue. Do not portray failure to finish and do not celebrate with a trophy.'
    : 'This book closed early. Preserve what really happened without pretending it completed its planned journey.';
  const conflictGuard = (evidence?.conflicts || []).length
    ? 'Source dates contain a duration mismatch. Do not visually imply a precise number of days; keep the image about supported actions only.'
    : '';
  const persona = personaPrompt ? `${personaPrompt} ` : '';
  const activity = compactText(book.activity || 'small everyday action', 100);
  const moment = evidence?.moment;
  const objects = (evidence?.visualObjects || []).join(', ');
  const style = sharedStyle();

  let momentLine = 'There is no single event with enough meaning evidence. Do not manufacture a turning point.';
  if (moment?.kind === 'event') {
    momentLine = `Use the supported event ${moment.type} on ${moment.dayKey}. Its direct/ambient meaning signals are: ${moment.meaningSignals.join(', ')}. Never invent a reaction that is not listed.`;
  } else if (moment?.kind === 'shared_day') {
    momentLine = `Use ${moment.dayKey} as a meaningful shared day: ${moment.committers} people committed, with ${moment.confirmations} confirmations and ${moment.reactions} reactions. Do not attach that meaning to an unrelated settings change.`;
  }

  const base = `${persona}${continuity} ${conflictGuard} Activity: ${activity}. Real members represented: ${people}. Real totals: ${facts.validCommits || 0} valid commits, ${facts.confirmations || 0} confirmations, ${facts.messages || 0} messages. ${style}.`;

  return Object.freeze([
    Object.freeze({
      id: 'A',
      direction: 'group',
      titleTh: 'จำคนที่อยู่ในเล่ม',
      prompt: `${base} Direction A — group memory. Show the members near the end of the volume doing the activity side by side in a natural low-pressure way. The feeling is warmth from sharing ordinary effort, not achievement theater. Include the final companion only if it really existed.`,
    }),
    Object.freeze({
      id: 'B',
      direction: 'moment',
      titleTh: 'จำช่วงที่มีความหมาย',
      prompt: `${base} Direction B — one supported moment. ${momentLine} Frame one quiet, specific scene around the evidence. A state change alone is never a turning point.`,
    }),
    Object.freeze({
      id: 'C',
      direction: 'objects',
      titleTh: 'จำของที่เหลืออยู่',
      prompt: `${base} Direction C — objects left behind. No people or animal characters. Create a calm still life using only plausible everyday objects for this activity: ${objects}. The still life should communicate intentional, doable care and leave the page feeling open to another volume.`,
    }),
  ]);
}

export function endingVoteWinner(votes = [], candidateIds = ['A', 'B', 'C']) {
  const counts = Object.fromEntries(candidateIds.map(id => [id, 0]));
  for (const vote of votes || []) {
    if (Object.prototype.hasOwnProperty.call(counts, vote?.candidateId)) counts[vote.candidateId] += 1;
  }
  const max = Math.max(0, ...Object.values(counts));
  if (max <= 0) return { winner: null, counts, tied: [] };
  const tied = candidateIds.filter(id => counts[id] === max);
  return { winner: tied[0] || null, counts, tied };
}
