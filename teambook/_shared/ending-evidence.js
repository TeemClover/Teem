/* TeamBook V1.2 — evidence-first Ending engine.

   The rule is intentionally asymmetric:
   - a state change is merely something that happened;
   - a turning point needs evidence that the group gave that moment meaning.

   This module is pure data logic so browser, server and tests can share the
   same reading. It never invents an interpretation to repair conflicting
   dates. Instead it names the conflict and carries both facts forward. */

const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function safeDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function endingDayKey(value) {
  const date = safeDate(value);
  if (!date) return '';
  return new Date(date.getTime() + ICT_OFFSET_MS).toISOString().slice(0, 10);
}

function dayNumberFromKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) return null;
  const [year, month, day] = key.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function inclusiveSpanDays(from, to) {
  const a = dayNumberFromKey(endingDayKey(from));
  const b = dayNumberFromKey(endingDayKey(to));
  if (a == null || b == null || b < a) return null;
  return b - a + 1;
}

function reactionCount(post) {
  return Object.values(post?.reactions || {}).reduce((sum, ids) =>
    sum + (Array.isArray(ids) ? ids.length : 0), 0);
}

function compactText(value, max = 160) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function streakForDayKeys(keys) {
  const days = unique(keys).map(dayNumberFromKey).filter(Number.isFinite).sort((a, b) => a - b);
  let best = 0; let run = 0; let prev = null;
  for (const day of days) {
    run = prev != null && day === prev + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

function inferObjects(activity, rule) {
  const hay = `${activity || ''} ${rule || ''}`.toLowerCase();
  const groups = [
    { test: /(กิน|อาหาร|meal|food|lunch|dinner|breakfast|น้ำ|water)/, objects: ['จานอาหาร', 'กล่องข้าว', 'ขวดน้ำ'] },
    { test: /(นอน|sleep|bed|พักผ่อน)/, objects: ['หมอน', 'โคมไฟข้างเตียง', 'สมุดเล็ก'] },
    { test: /(เดิน|วิ่ง|ออกกำลัง|exercise|run|walk|workout)/, objects: ['รองเท้า', 'ผ้าขนหนู', 'ขวดน้ำ'] },
    { test: /(อ่าน|book|read|หนังสือ)/, objects: ['หนังสือ', 'ที่คั่นหนังสือ', 'โคมไฟ'] },
    { test: /(เรียน|study|งาน|work|เขียน|write|focus)/, objects: ['สมุด', 'ดินสอ', 'นาฬิกาจับเวลาเล็ก'] },
    { test: /(ทำอาหาร|cook|ครัว|kitchen)/, objects: ['เขียง', 'ชามเล็ก', 'ผักหรือวัตถุดิบ'] },
  ];
  return groups.find(group => group.test.test(hay))?.objects || ['สมุด', 'ดินสอ', 'ของใช้ชิ้นเล็กจากกิจวัตร'];
}

function groupDayEvidence(posts) {
  const byDay = new Map();
  for (const post of posts) {
    const key = endingDayKey(post.sentAt);
    if (!key) continue;
    const item = byDay.get(key) || {
      dayKey: key, commits: [], messages: [], reactions: 0, confirmations: 0,
      participants: new Set(),
    };
    if (post.kind === 'commit' && !post.retracted) {
      item.commits.push(post);
      item.participants.add(post.userId);
      if (post.confirmedBy) item.confirmations += 1;
    }
    if (post.kind === 'message' && !post.retracted) {
      item.messages.push(post);
      item.participants.add(post.userId);
    }
    item.reactions += reactionCount(post);
    byDay.set(key, item);
  }
  return [...byDay.values()].map(item => {
    const committers = unique(item.commits.map(post => post.userId)).length;
    const messageAuthors = unique(item.messages.map(post => post.userId)).length;
    const simultaneous = committers >= 2;
    const score = committers * 3
      + item.confirmations * 2
      + Math.min(3, item.reactions)
      + (messageAuthors >= 2 ? 2 : (item.messages.length ? 1 : 0))
      + (simultaneous ? 2 : 0);
    return {
      dayKey: item.dayKey,
      commits: item.commits.length,
      committers,
      messages: item.messages.length,
      messageAuthors,
      confirmations: item.confirmations,
      reactions: item.reactions,
      simultaneous,
      score,
    };
  }).sort((a, b) => b.score - a.score || a.dayKey.localeCompare(b.dayKey));
}

function eventMeaning(event, dayEvidence, eventIndex, events) {
  const dayKey = endingDayKey(event.at);
  const day = dayEvidence.find(item => item.dayKey === dayKey) || null;
  const signals = [];
  let score = 0;

  if (day?.confirmations) {
    signals.push(`confirmed:${day.confirmations}`);
    score += Math.min(4, day.confirmations * 2);
  }
  if (day?.reactions) {
    signals.push(`reactions:${day.reactions}`);
    score += Math.min(3, day.reactions);
  }
  if (day?.simultaneous) {
    signals.push(`simultaneous:${day.committers}`);
    score += 2;
  }
  if ((day?.messageAuthors || 0) >= 2) {
    signals.push(`conversation:${day.messageAuthors}`);
    score += 2;
  } else if (day?.messages) {
    signals.push('message-nearby');
    score += 1;
  }

  const firstSameType = events.findIndex(item => item.type === event.type) === eventIndex;
  const lastSameType = events.map(item => item.type).lastIndexOf(event.type) === eventIndex;
  if (firstSameType) score += 0.25;
  if (lastSameType && !firstSameType) score += 0.25;

  /* A state change may enter the candidate list, but it cannot become a
     turning point from change evidence alone. */
  const meaningScore = Math.round(score * 100) / 100;
  return {
    type: event.type,
    at: event.at,
    dayKey,
    actorId: event.actorId || null,
    data: event.data && typeof event.data === 'object' ? event.data : {},
    meaningScore,
    meaningSignals: signals,
    classification: meaningScore >= 3 && signals.length ? 'turning_point' : 'detail',
  };
}

function memberSummary(memberHistory, commits) {
  return memberHistory.map(member => {
    const mine = commits.filter(post => post.userId === member.userId);
    const valid = mine.filter(post => post.valid !== false);
    const confirmed = mine.filter(post => !!post.confirmedBy);
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
      activeDays: unique(valid.map(post => endingDayKey(post.sentAt))).length,
      bestStreak: streakForDayKeys(valid.map(post => endingDayKey(post.sentAt))),
    };
  });
}

export function buildEndingEvidence(party) {
  const log = Array.isArray(party?.log) ? [...party.log].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0)) : [];
  const events = Array.isArray(party?.events) ? [...party.events].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0)) : [];
  const memberHistory = Array.isArray(party?.memberHistory) && party.memberHistory.length
    ? party.memberHistory
    : (Array.isArray(party?.members) ? party.members : []);
  const commits = log.filter(post => post.kind === 'commit' && !post.retracted);
  const validCommits = commits.filter(post => post.valid !== false);
  const messages = log.filter(post => post.kind === 'message' && !post.retracted);
  const dayEvidence = groupDayEvidence(log);
  const activeDayKeys = unique(validCommits.map(post => endingDayKey(post.sentAt))).sort();
  const targetDays = Math.max(1, Number(party?.durationDays || 1));
  const calendarDays = inclusiveSpanDays(party?.startAt || party?.createdAt, party?.endAt || party?.updatedAt);
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
      code: 'ACTIVE_DAYS_EXCEED_TARGET', targetDays, activeDays,
      note: 'จำนวนวันที่มีหลักฐานมากกว่าค่าระยะเวลาที่ตั้งไว้ ต้องรายงานเป็นข้อมูลขัดกัน ไม่เดาเหตุผล',
    });
  }

  const rankedEvents = events
    .map((event, index) => eventMeaning(event, dayEvidence, index, events))
    .sort((a, b) => b.meaningScore - a.meaningScore || new Date(a.at || 0) - new Date(b.at || 0));
  const meaningfulEvent = rankedEvents.find(item => item.classification === 'turning_point') || null;
  const bestDay = dayEvidence[0] || null;

  const reactionTotal = log.reduce((sum, post) => sum + reactionCount(post), 0);
  const confirmations = validCommits.filter(post => !!post.confirmedBy).length;
  const firstValid = validCommits[0] || null;
  const lastValid = validCommits[validCommits.length - 1] || null;
  const messageExcerpts = messages
    .filter(post => compactText(post.body))
    .slice(-3)
    .map(post => ({ alias: post.alias || '', text: compactText(post.body), at: post.sentAt }));

  let companionId = party?.petId || party?.npcCardId || null;
  const npcChange = [...events].reverse().find(event => event.type === 'NPC_CHANGED');
  if (!companionId && npcChange?.data?.to) companionId = npcChange.data.to;

  const members = memberSummary(memberHistory, commits);
  const maxPossible = Math.max(1, targetDays * Math.max(1, members.length));
  const completionRate = Math.min(1, validCommits.length / maxPossible);

  return Object.freeze({
    version: 2,
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
      reactions: reactionTotal,
      messages: messages.length,
      completionRate,
      bestStreak: members.reduce((best, member) => Math.max(best, member.bestStreak), 0),
      firstValidAt: firstValid?.sentAt || null,
      lastValidAt: lastValid?.sentAt || null,
      activeDayKeys,
    },
    members,
    dayEvidence,
    rankedEvents,
    messageExcerpts,
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
    'cute premium animal characters when characters are supported by evidence',
    'physical notebook props, tactile handmade memory',
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
  const aliases = (evidence?.members || []).map(member => member.alias).filter(Boolean);
  const people = aliases.length ? aliases.join(', ') : 'the real group';
  const continuity = book.state === 'COMPLETED'
    ? 'The book itself is complete. Show gentle continuity: this volume is closed, but life can continue. Do not portray failure to finish and do not celebrate with a trophy.'
    : 'This book closed early. Preserve what really happened without pretending it completed its planned journey.';
  const conflictGuard = (evidence?.conflicts || []).length
    ? 'Source dates contain a duration mismatch. Do not visually imply a precise number of days; keep the image about supported actions only.'
    : '';
  const persona = personaPrompt ? `${personaPrompt} ` : '';
  const style = sharedStyle();
  const activity = compactText(book.activity || 'small everyday action', 100);
  const moment = evidence?.moment;
  const objects = (evidence?.visualObjects || []).join(', ');

  const momentLine = moment?.kind === 'event'
    ? `Use the supported moment ${moment.type} on ${moment.dayKey}; it qualified because of ${moment.meaningSignals.join(', ')}. Never invent a reaction that is not listed.`
    : (moment?.kind === 'shared_day'
      ? `Use ${moment.dayKey}, when ${moment.committers} people committed and the group produced ${moment.confirmations} confirmations and ${moment.reactions} reactions.`
      : 'There is no single moment with enough meaning evidence, so do not manufacture a turning point.');

  const base = `${persona}${continuity} ${conflictGuard} Activity: ${activity}. Real members represented: ${people}. Real totals: ${facts.validCommits || 0} valid commits, ${facts.confirmations || 0} confirmations, ${facts.messages || 0} messages. ${style}.`;

  return Object.freeze([
    Object.freeze({
      id: 'A', direction: 'group', titleTh: 'จำคนที่อยู่ในเล่ม',
      prompt: `${base} Direction A — group memory. Show the members near the end of the volume doing the activity side by side in a natural low-pressure way. The feeling is warmth from sharing ordinary effort, not achievement theater. Include the final companion only if it really existed.`,
    }),
    Object.freeze({
      id: 'B', direction: 'moment', titleTh: 'จำช่วงที่มีความหมาย',
      prompt: `${base} Direction B — one supported moment. ${momentLine} Frame one quiet, specific scene around that evidence. A state change alone is not a turning point. If the evidence is weak, portray it as a small detail rather than a dramatic pivot.`,
    }),
    Object.freeze({
      id: 'C', direction: 'objects', titleTh: 'จำของที่เหลืออยู่',
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
