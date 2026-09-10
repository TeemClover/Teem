import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAME_POOL, APPEARANCES, NPC_HAIR_STYLES, NPC_CLOTHING, advanceSeed,
  createPerson, getPersonAppearance, createPersonAppearance, isReservedNpcName,
  getSafeNpcName, normalizeNpcIdentities
} from '../../xvisor/quest/game-people.js';

test('the NPC pool and generated names reserve both narrator identities', () => {
  assert.equal(NAME_POOL.some(isReservedNpcName), false);
  let seed = 29;
  const usedNames = [];
  for (let index = 1; index <= NAME_POOL.length + 5; index += 1) {
    const created = createPerson({ seed, usedNames, index });
    assert.equal(isReservedNpcName(created.person.name), false);
    usedNames.push(created.person.name);
    seed = created.nextSeed;
  }
  for (const name of ['ทีม', 'เอโกะ', ' Teem ', 'AKO']) {
    const safe = getSafeNpcName(name, 'person-5');
    assert.equal(isReservedNpcName(safe), false);
    assert.notEqual(getSafeNpcName(name, 'person-5', [safe]), safe);
  }
  assert.equal(getSafeNpcName('ทีมมี่', 'person-5'), 'ทีมมี่', 'only reserved names are changed');
});

test('consecutive NPCs have independent visible traits without advancing simulation RNG differently', () => {
  let seed = 29;
  const people = [], usedNames = [];
  for (let index = 1; index <= 160; index += 1) {
    const nextSeed = advanceSeed(advanceSeed(advanceSeed(advanceSeed(seed))));
    const created = createPerson({ seed, usedNames, index });
    assert.equal(created.nextSeed, nextSeed);
    assert.equal(created.person.readiness, 36 + nextSeed % 43);
    assert.equal(created.person.appearance.characterId, undefined);
    people.push(created.person);
    usedNames.push(created.person.name);
    seed = created.nextSeed;
  }
  for (const [field, expected] of [['hairStyle', NPC_HAIR_STYLES], ['clothing', NPC_CLOTHING]]) {
    assert.equal(new Set(people.map(person => person.appearance[field])).size, expected.length);
  }
  assert.ok(new Set(people.map(person => person.appearance.skin)).size >= 12);
  assert.ok(new Set(people.map(person => person.appearance.shirt)).size >= 12);
  assert.ok(new Set(people.map(person => `${person.appearance.hairStyle}:${person.appearance.clothing}`)).size >= 40);
  assert.deepEqual(new Set(people.map(person => person.appearance.glasses)), new Set([false, 'round', 'square']));
  assert.deepEqual(createPersonAppearance('npc:fixed'), createPersonAppearance('npc:fixed'));
});

test('legacy low-entropy palettes gain explicit traits while custom appearances remain recognizable', () => {
  const old = { id: 'person-7', appearance: { ...APPEARANCES[0] } };
  const migrated = getPersonAppearance(old);
  assert.equal(migrated.version, 2);
  assert.ok(NPC_HAIR_STYLES.includes(migrated.hairStyle));
  assert.ok(NPC_CLOTHING.includes(migrated.clothing));
  assert.deepEqual(getPersonAppearance(old), migrated);
  const custom = getPersonAppearance({ id: 'custom', appearance: { skin: '#cc9876', hair: '#342421', shirt: '#778899', hairStyle: 'bun', glasses: false } });
  assert.equal(custom.shirt, '#778899');
  assert.equal(custom.hairStyle, 'bun');
  assert.equal(custom.glasses, false);
  assert.equal(getPersonAppearance({ id: 'custom', appearance: custom }), custom);
});

test('migration renames linked NPC roles and person-specific history without changing narrators, ids or finances', () => {
  const state = {
    rngSeed: 45, month: 8, energy: 19, selectedPersonId: 'customer-1',
    prospects: [{ id: 'person-1', name: 'ทีม', appearance: APPEARANCES[0] }],
    customers: [{ id: 'customer-1', personId: 'person-1', name: 'ทีม', activePlan: true, careOnly: false, appearance: APPEARANCES[0] }],
    team: [{ id: 'member-1', personId: 'person-1', name: 'ทีม', active: true, personalXV: 7000 }],
    narrators: [{ name: 'ทีม', appearance: { characterId: 'teem' } }, { name: 'เอโกะ', appearance: { characterId: 'ako' } }],
    lastMessage: 'ทีมช่วยดูแลทีมต่อ',
    economy: { totalIncome: 12000, lastTransaction: { customerId: 'customer-1', customerName: 'ทีม', price: 7490, xv: 7000, items: [{ id: 'routine', name: 'RoutineX' }] } },
    settlements: { 7: { channel1: 1400, directG1: [{ id: 'member-1', name: 'ทีม', commission: 1400 }], mentoringBreakdown: [{ name: 'ทีม', commission: 1400 }] } },
    monthOpeningReport: { month: 8, automaticCustomerIds: ['customer-1'], transactions: [{ customerId: 'customer-1', customerName: 'ทีม', price: 7490 }] },
    sceneReport: { kind: 'g1', name: 'ทีม', speaker: 'ทีม', message: 'ทีมช่วยกันดูแลลูกค้า' },
    missions: [{ targetId: 'customer-1', targetName: 'ทีม', label: '📁 คุยแฟ้ม X กับ ทีม' }]
  };
  const before = structuredClone(state);
  const after = normalizeNpcIdentities(state);
  const name = after.customers[0].name;
  assert.equal(isReservedNpcName(name), false);
  assert.equal(after.prospects[0].name, name);
  assert.equal(after.team[0].name, name);
  assert.deepEqual(after.team[0].appearance, after.customers[0].appearance);
  assert.equal(after.economy.lastTransaction.customerName, name);
  assert.equal(after.settlements[7].directG1[0].name, name);
  assert.equal(after.settlements[7].mentoringBreakdown[0].name, name);
  assert.equal(after.monthOpeningReport.transactions[0].customerName, name);
  assert.equal(after.sceneReport.name, name);
  assert.equal(after.missions[0].targetName, name);
  assert.equal(after.missions[0].label, `📁 คุยแฟ้ม X กับ ${name}`);
  assert.equal(after.sceneReport.speaker, 'ทีม');
  assert.equal(after.sceneReport.message, state.sceneReport.message);
  assert.equal(after.lastMessage, state.lastMessage);
  assert.equal(after.narrators, state.narrators);
  assert.equal(after.selectedPersonId, state.selectedPersonId);
  assert.equal(after.economy.lastTransaction.customerId, 'customer-1');
  assert.equal(after.economy.lastTransaction.price, 7490);
  assert.equal(after.economy.totalIncome, 12000);
  assert.equal(after.rngSeed, state.rngSeed);
  assert.equal(after.energy, state.energy);
  assert.deepEqual(state, before, 'migration does not mutate its input');
  assert.equal(normalizeNpcIdentities(after), after, 'repeat normalization returns the same state');
});

test('migration is stable across role ordering and does not assign ambiguous name-only history to the wrong person', () => {
  const state = {
    prospects: [{ id: 'p2', name: 'ทีม' }, { id: 'p1', name: 'ทีม' }, { id: 'p3', name: 'เอโกะ' }],
    customers: [], team: [],
    settlements: { 1: { directG1: [{ name: 'ทีม', commission: 200 }] } }
  };
  const after = normalizeNpcIdentities(state);
  const reversed = normalizeNpcIdentities({ ...state, prospects: [...state.prospects].reverse() });
  const byId = value => Object.fromEntries(value.prospects.map(person => [person.id, person.name]));
  assert.deepEqual(byId(after), byId(reversed));
  assert.equal(new Set(after.prospects.map(person => person.name)).size, 3);
  assert.equal(after.settlements[1].directG1[0].name, 'สมาชิกเดิม');
  assert.equal(after.settlements[1].directG1[0].commission, 200);
});

test('appearance-only migration reuses all historical ledgers and cannot give an NPC a narrator portrait', () => {
  const state = {
    prospects: [{ id: 'p1', name: 'มิน', appearance: { characterId: 'teem', hairStyle: 'short' } }],
    customers: [], team: [], economy: { totalIncome: 55 }, settlements: { 1: { totalIncome: 55 } },
    monthSummaries: [{ month: 1, income: 55 }]
  };
  const after = normalizeNpcIdentities(state);
  assert.equal(after.prospects[0].appearance.characterId, undefined);
  assert.equal(after.economy, state.economy);
  assert.equal(after.settlements, state.settlements);
  assert.equal(after.monthSummaries, state.monthSummaries);
  assert.equal(normalizeNpcIdentities(after), after);
  assert.equal(normalizeNpcIdentities(null), null);
});
