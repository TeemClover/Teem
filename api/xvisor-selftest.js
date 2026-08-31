import {
  EVENTS,
  ORGANIZATION_END_MONTH,
  getBestNextActions,
  makeInitialState,
  reduceGame,
  serializeState,
  parseSavedState,
} from '../xvisor/quest/game-data-v1.js';
import { makeTeamMember } from '../xvisor/quest/game-progression-v8.js';
import { createPerson } from '../xvisor/quest/game-people.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function management(state, month = 12) {
  return { ...state, month, stage: 'management', phase: 'management', energy: 28, rank: 'xvisor', milestones: { ...state.milestones, certified: true } };
}

function withCoreTeam(seed = 11) {
  let state = management(makeInitialState({ seed }), 12);
  const member = makeTeamMember({ id: 'person-jen', personId: 'person-jen', name: 'เจน', source: 'known', appearance: {} }, state, { id: 'member-jen', parentId: 'player', generation: 1 });
  return {
    ...state,
    team: [{ ...member, active: true, certifiedMonth: 3, customers: 8, confidence: 72, autonomy: 68, teamSkill: 5, candidatePipeline: 3, leaderReadiness: 55 }],
    customers: [{ id: 'customer-mei', personId: 'person-mei', name: 'เมย์', activePlan: true, satisfaction: 86, selfDirected: true, day: 28, followups: 3, adherence: 88 }],
    career: { ...state.career, xleadCertified: true, xgenCertified: true },
    rank: 'xgen',
    campaignComplete: true,
    campaignScore: { locked: true, completedMonth: 12, bestTgv: 1_500_000, totalIncome: 500_000, bestMonthlyIncome: 90_000, organizationSize: 1, scoreVersion: '1.0', runId: state.runId, completedAt: Date.now() },
  };
}

export default async function handler(req, res) {
  try {
    const initial = makeInitialState({ seed: 1 });
    assert(parseSavedState(serializeState(initial)), '1.0 save roundtrip failed');

    const campaign = withCoreTeam(2);
    campaign.organization = { ...campaign.organization, lastMonthTGV: 999_999_999, bestTGV: 999_999_999 };
    const month13 = reduceGame(campaign, EVENTS.ENTER_ORGANIZATION);
    assert(month13.organizationMode && month13.month === 13, 'organization entry failed');
    const month14 = reduceGame(month13, EVENTS.END_MONTH);
    assert(month14.month === 14, 'one-click month advance failed');
    assert(month14.lastOrganizationReport?.activities?.xcademy === 4, 'Xcademy ×4 missing');
    assert(month14.lastOrganizationReport?.activities?.openHouse === 1, 'Open House missing');
    assert(month14.lastOrganizationReport?.tgv > 0 && month14.lastOrganizationReport?.tgv < 100_000_000, 'transaction TGV sanity failed');

    let m15 = { ...month14, month: 15, settlements: { ...month14.settlements } };
    delete m15.settlements['15'];
    m15 = reduceGame(m15, EVENTS.END_MONTH);
    assert(m15.lastOrganizationReport?.activities?.xircle === 1, 'Month 15 The Xircle missing');

    let m24 = reduceGame(withCoreTeam(4), EVENTS.ENTER_ORGANIZATION);
    m24 = { ...m24, month: ORGANIZATION_END_MONTH };
    const done = reduceGame(m24, EVENTS.END_MONTH);
    assert(done.runComplete && done.month === 24, 'Month 24 hard stop failed');
    assert(getBestNextActions(done, 3)[0]?.event === EVENTS.NEW_GAME_PLUS, 'NEW GAME+ action missing');
    const ng = reduceGame(done, EVENTS.NEW_GAME_PLUS);
    assert(ng.runMode === 'NEW_GAME_PLUS' && ng.month === 1 && ng.stage === 'management' && ng.energy === 28, 'NEW GAME+ start failed');
    assert(ng.team.length === 0 && ng.customers.length === 0, 'NEW GAME+ inherited business assets');

    let fast = management(makeInitialState({ seed: 5 }), 5);
    fast = { ...fast, skills: { ...fast.skills, people: { xp: 42 }, knowledge: { xp: 33 } }, prospects: [{ id: 'person-ing', personId: 'person-ing', name: 'อิง', journey: 'recommendation', routinePlan: { quality: 'fit', id: 'fit' }, trust: 70, readiness: 78, decisionAttempts: 2, adherence: 40, followups: 0, satisfaction: 50, activePlan: false }] };
    assert(getBestNextActions(fast, 8).some((item) => item.event === EVENTS.FAST_TRACK_FULL_START), 'fast track action missing');
    fast = reduceGame(fast, EVENTS.FAST_TRACK_FULL_START, { id: 'person-ing' });
    assert(fast.customers?.[0]?.xvisorStage === 'ready' && fast.economy.personalXV === 9_495, 'fast track success failed');

    let seed = 7;
    let usedNames = [];
    const names = [];
    for (let index = 1; index <= 200; index += 1) {
      const created = createPerson({ seed, usedNames, source: 'known', index });
      seed = created.nextSeed;
      names.push(created.person.name);
      usedNames = [...usedNames, created.person.name];
    }
    assert(new Set(names).size === 200, 'name pool duplicated before 200');

    return res.status(200).json({ ok: true, release: '1.0', checks: ['save', 'organization-one-click', 'transaction-tgv', 'xircle-schedule', 'month24-stop', 'new-game-plus', 'fast-track', 'name-pool'], sample: { month13Tgv: month14.lastOrganizationReport.tgv, month13Xvisors: month14.lastOrganizationReport.xvisorCount } });
  } catch (error) {
    console.error('xvisor selftest failed', error);
    return res.status(500).json({ ok: false, error: error?.message || String(error) });
  }
}
