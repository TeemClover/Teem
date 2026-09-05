import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { EVENTS, makeInitialState, reduceGame, getBestNextActions, serializeState, parseSavedState } from './game-data.js';
import { getStageContent } from './game-copy.js';
import { getEconomyView, getOrganizationScene, signedBaht } from './game-presentation.js';
import { getSkillLevel } from './game-progression.js';

const root = new URL('./', import.meta.url);
const source = (name) => readFile(new URL(name, root), 'utf8');
const canonicalModules = [
  'game-actions.js',
  'game-art.js',
  'game-audio.js',
  'game-engine.js',
  'game-panels.js',
  'game-presentation.js',
  'game-world.js',
  'game-commercial-config.js',
  'game-copy.js',
  'game-data.js',
  'game-exam.js',
  'game-people.js',
  'game-progression.js',
  'game-save.js',
  'game-ui.js',
];

test('public shell boots 1.0b from one canonical stylesheet and one canonical module', async () => {
  const html = await source('index.html');
  assert.match(html, /data-game-version="1\.0b"/);
  assert.match(html, /game\.css\?v=1\.0b-quality1/);
  assert.match(html, /game-ui\.js\?v=1\.0b-quality1/);
  assert.doesNotMatch(html, /type="importmap"/);
  assert.doesNotMatch(html, /game-(?:1b|v8|v9|v1|v1a|v1b-core)/);
  assert.equal((html.match(/rel="stylesheet"/g) || []).length, 1);
  assert.equal((html.match(/<script/g) || []).length, 1);
});

test('runtime module graph contains canonical imports only', async () => {
  const files = await readdir(root);
  const oldRuntimeFiles = files.filter((name) => /^(?:game-(?:1b|v8|v9|v1|v1a|v1b-core)|game-(?:data|copy|progression|commercial-config)-v)/.test(name));
  assert.deepEqual(oldRuntimeFiles, []);

  const allowed = new Set(canonicalModules.map((name) => `./${name}`));
  for (const name of canonicalModules) {
    const code = await source(name);
    const imports = [...code.matchAll(/\b(?:from\s+|import\s*)["']([^"']+)["']/g)].map((match) => match[1]);
    for (const specifier of imports) {
      assert.equal(allowed.has(specifier), true, `${name} imports non-canonical ${specifier}`);
      assert.doesNotMatch(specifier, /v8|v9|v1a|1\.0a/i);
    }
  }
});

test('player-facing X-VISOR surfaces use Organization Finale and never Legacy', async () => {
  const [html, copy, ui] = await Promise.all([source('index.html'), source('game-copy.js'), source('game-ui.js')]);
  const playerFacing = `${html}\n${copy}\n${ui}`;
  assert.match(await source("game-world.js"), /MONTH 24 · ORGANIZATION FINALE/);
  assert.doesNotMatch(playerFacing, /ORGANIZATION LEGACY/i);
  assert.doesNotMatch(playerFacing, /["'`]([^"'`]*\bLegacy\b[^"'`]*)["'`]/);
});

test('mobile finale stays viewport-bounded after release CSS is merged', async () => {
  const css = await source('game.css');
  assert.match(css, /max-width:min\(920px,calc\(100vw - 16px\)\)/);
  assert.match(css, /max-height:calc\(100svh - 12px\)/);
  assert.match(css, /\.v1-finale-grid,.v1-org-grid\{grid-template-columns:1fr!important\}/);
});

test('canonical copy keeps the 1.0b XGEN goal and The Xircle scene', async () => {
  const copy = await source('game-copy.js');
  assert.match(copy, /XGEN_GOAL_VISIBLE_AT = 15e5/);
  assert.match(copy, /ตอนนี้ยังไม่ Qualified/);
  assert.doesNotMatch(copy, /Rolling 3 เดือน|ไม่นับเป็นเกณฑ์ XGEN/);
  assert.match(copy, /แตะ 3,000,000 XV ในเดือนเดียวแล้ว/);
  assert.match(copy, /scene: "the-xircle"/);
  assert.match(copy, /XGEN EXAM READY/);
});

test('campaign END_MONTH click is handled once by the canonical action bar', async () => {
  const ui = await source('game-ui.js');
  assert.match(ui, /gameEvent === EVENTS\.END_MONTH/);
  assert.match(ui, /event\.stopImmediatePropagation\(\)/);
});

test('gameplay state is saved and rendered before optional audio effects', async () => {
  const ui = await source('game-ui.js');
  const dispatchBody = ui.slice(ui.indexOf('function dispatch(event, payload = {})'), ui.indexOf('function clearAutomation()'));
  const stateCommit = dispatchBody.indexOf('state = next;');
  const saveCommit = dispatchBody.indexOf('save();', stateCommit);
  const renderCommit = dispatchBody.indexOf('render();', stateCommit);
  const soundEffect = dispatchBody.indexOf('playForEvent(event, payload);', stateCommit);
  assert.ok(stateCommit >= 0 && saveCommit > stateCommit);
  assert.ok(renderCommit > saveCommit);
  assert.ok(soundEffect > renderCommit);
  assert.match(dispatchBody, /try \{\s*audio\.unlock\(\);\s*\} catch/);
});

test('canonical UI retains the Month 12 score gate and Month 24 NEW GAME+ finale', async () => {
  const ui = await source('game-panels.js');
  assert.match(ui, /ยังไปต่อไม่ได้จนกว่าจะบันทึกชื่อ High Score/);
  assert.match(ui, /data-v1b-submit-score/);
  assert.match(ui, /data-v1b-enter-org/);
  assert.match(ui, /ดูสิ่งที่คุณสร้างโตเอง 1 เดือน/);
  assert.match(ui, /data-v1b-new-game-plus/);
  assert.match(ui, /MONTH 24 · TRUE ENDING · 1\.0b/);
});

function managementFixture() {
  const state = makeInitialState({ seed: 17 });
  return { ...state, stage: 'management', phase: 'management', month: 2, rank: 'xvisor', energy: 28 };
}

test('the displayed skill recommendation carries a working payload and levels up', () => {
  const initial = managementFixture();
  const state = { ...initial, skills: { ...initial.skills, knowledge: { xp: 1 } } };
  const action = getStageContent(state).actions.find(item => item.event === EVENTS.TRAIN_SKILL);
  assert.ok(action, 'skill near its next level should be recommended');
  assert.equal(action.skill, 'knowledge');
  const next = reduceGame(state, action.event, action);
  assert.equal(next.energy, state.energy - 1);
  assert.ok(getSkillLevel(next.skills, 'knowledge') > getSkillLevel(state.skills, 'knowledge'));
});

test('displayed prospect actions can create and contact a real simulated person', () => {
  const initial = managementFixture();
  const create = getStageContent(initial).actions.find(item => item.event === EVENTS.CREATE_LEAD);
  assert.equal(create.source, 'known');
  const introduced = reduceGame(initial, create.event, create);
  assert.ok(introduced.prospects.length > initial.prospects.length);
  const contact = getStageContent(introduced).actions.find(item => item.event === EVENTS.CONTACT_PROSPECT);
  assert.ok(contact.id);
  const contacted = reduceGame(introduced, contact.event, contact);
  assert.notEqual(contacted.prospects.find(person => person.id === contact.id).journey, 'new');
});

test('stale offer, referral and invitation missions cannot occupy Quick 3', () => {
  const initial = managementFixture();
  const state = {
    ...initial,
    prospects: [{ id: 'waiting', name: 'รอ', journey: 'waiting', routinePlan: { products: ['gus'] }, nextOfferMonth: 4, decisionAttempts: 1 }],
    customers: [{ id: 'done', name: 'พร้อมแล้ว', referralReady: true, referralAsked: true, xvisorInterest: true, xvisorStage: 'certified', day: 0 }],
    missions: [
      { type: 'offer', targetId: 'waiting', label: 'เสนอแผน' },
      { type: 'referral', targetId: 'done', label: 'ขอ Referral' },
      { type: 'invite', targetId: 'done', label: 'ชวนเป็น X-VISOR' },
    ]
  };
  const actions = getBestNextActions(state, 12);
  for (const event of [EVENTS.OFFER_PROSPECT, EVENTS.ASK_REFERRAL, EVENTS.INVITE_XVISOR, EVENTS.FOLLOW_UP_DECISION]) {
    assert.equal(actions.some(item => item.event === event), false, event);
  }
});

test('month-end UI reads posted totals even if a recalculated projection differs', () => {
  const initial = managementFixture();
  const state = { ...initial, month: 8, stage: 'month_closed', settlements: {
    '7': { month: 7, totalIncome: 64327 },
    '8': { month: 8, totalIncome: 26189, currentTGV: 123456, channel1: 11000, channel2: 15189, channel3: 0 },
  }};
  const before = JSON.stringify(state);
  const view = getEconomyView(state);
  assert.equal(view.projectedIncome, 26189);
  assert.equal(view.lifetimeIncome, 90516);
  assert.equal(view.tgv, 123456);
  assert.equal(JSON.stringify(state), before, 'presentation must not alter settlement rules');
  assert.equal(signedBaht(-499), '−฿499');
});

test('travel stays visible for the active reward month, then yields to the next month and finale', () => {
  const trip = { month: 16, destination: 'Tokyo', number: 1 };
  const state = { month: 16, activeTravel: trip, lastOrganizationReport: { month: 15 } };
  assert.equal(getOrganizationScene(state, 60000).report.trip.destination, 'Tokyo');
  assert.equal(getOrganizationScene({ ...state, month: 17, activeTravel: null }, 60000).kind, 'organization');
  assert.equal(getOrganizationScene({ ...state, runComplete: true }, 0).kind, 'finale');
});

test('old NEW GAME+ Month 1 saves migrate without losing management or the routine builder', () => {
  const state = { ...managementFixture(), month: 1, runMode: 'NEW_GAME_PLUS_FREE', selectedPersonId: 'routine', stage: 'management_routine', prospects: [{ id: 'routine', name: 'เมย์', journey: 'baseline', needs: ['energy'], consent: true }] };
  const recovered = parseSavedState(serializeState(state));
  assert.equal(recovered.runMode, 'NEW_GAME_PLUS');
  assert.equal(recovered.stage, 'management_routine');
  assert.ok(getStageContent(recovered).routineBuilder);
  assert.equal(recovered.energy, state.energy);
});
