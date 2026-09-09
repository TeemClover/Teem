import test from 'node:test';
import assert from 'node:assert/strict';
import { ANALYTICS_VERSION, EVENTS } from '../../assets/front-door/contract.js';
import { AKO_STOPS, akoProgress, responseFailure, validResponse } from '../../stat/frontdoor/data.js';

const canonicalEvents = [
  'FRONTDOOR_OPEN', 'FRONTDOOR_CHOICE', 'FRONTDOOR_REACTION_COMPLETE',
  'LUCKY_RETURN', 'REWARD_HORIZON', 'DOOR_FOUND', 'SAVE', 'DOOR_OPEN',
  'RETURN', 'RESUME', 'REBUILD', 'FRONTDOOR_FREE_ROAM', 'ANOMALY_START',
  'LEGACY_WARNING', 'DUNGEON_HANDOFF',
];
const counts = () => ({ installations: 2, journeys: 3, events: 4 });
const completeResponse = () => ({
  ok: true,
  status: 'ready',
  analyticsVersion: ANALYTICS_VERSION,
  env: 'preview',
  metrics: Object.fromEntries(Object.keys(EVENTS).map(name => [name, counts()])),
  timings: { activeMsToFirstChoice: 120, activeMsToLuckyReturn: 640, activeMsToDoorFound: null },
  breakdowns: Object.fromEntries(
    ['source', 'visitorClass', 'viewport', 'intentPrimary', 'doorId', 'seedColor']
      .map(name => [name, [{ value: name, ...counts() }]]),
  ),
  transitions: [{ from: 'frontdoor', to: 'ako', ...counts() }],
  rates: [{ name: 'arrival', numerator: 1, denominator: 2, rate: 0.5 }],
  outcomes: {
    rows: [{ door: 'ako', opened: 2, arrived: 1, requested: 1 }],
    paths: [{ door: 'ako', path: '/ako/kitchen/', ...counts() }],
  },
});

test('accepts a complete response using all 15 original canonical events', () => {
  const before = structuredClone(EVENTS);
  assert.deepEqual(Object.keys(EVENTS), canonicalEvents);
  assert.equal(validResponse(completeResponse(), 'preview'), true);
  assert.deepEqual(EVENTS, before);
  assert.equal(Object.isFrozen(EVENTS), true);
});

test('accepts an explicit no-data response with complete zero counts', () => {
  const data = completeResponse();
  data.status = 'no-data';
  data.metrics = Object.fromEntries(canonicalEvents.map(name => [name, { installations: 0, journeys: 0, events: 0 }]));
  data.timings = Object.fromEntries(Object.keys(data.timings).map(name => [name, null]));
  data.breakdowns = Object.fromEntries(Object.keys(data.breakdowns).map(name => [name, []]));
  data.transitions = [];
  data.rates = [{ numerator: 0, denominator: 0, rate: null }];
  data.outcomes = { rows: [], paths: [] };
  assert.equal(validResponse(data, 'preview'), true);
});

test('rejects missing canonical metrics and required response sections', () => {
  for (const name of canonicalEvents) {
    const data = completeResponse();
    delete data.metrics[name];
    assert.equal(validResponse(data), false, name);
  }
  for (const key of ['ok', 'status', 'analyticsVersion', 'env', 'metrics', 'timings', 'breakdowns', 'transitions', 'rates']) {
    const data = completeResponse();
    delete data[key];
    assert.equal(validResponse(data), false, key);
  }
  for (const data of [null, undefined, [], 'ready', { ...completeResponse(), ok: false }, { ...completeResponse(), status: 'loading' }, { ...completeResponse(), analyticsVersion: '1.0.0' }]) {
    assert.equal(validResponse(data), false);
  }
});

test('rejects missing, negative, non-numeric, fractional, and unsafe counts everywhere', () => {
  const locations = {
    metric: data => data.metrics.FRONTDOOR_OPEN,
    breakdown: data => data.breakdowns.source[0],
    seedColor: data => data.breakdowns.seedColor[0],
    transition: data => data.transitions[0],
    path: data => data.outcomes.paths[0],
  };
  for (const [label, row] of Object.entries(locations)) {
    for (const key of ['installations', 'journeys', 'events']) {
      for (const value of [undefined, null, -1, '2', true, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        const data = completeResponse();
        if (value === undefined) delete row(data)[key];
        else row(data)[key] = value;
        assert.equal(validResponse(data), false, `${label}.${key}: ${String(value)}`);
      }
    }
  }
});

test('rejects incomplete breakdowns, timing values, and malformed rows', () => {
  for (const key of ['source', 'visitorClass', 'viewport', 'intentPrimary', 'doorId']) {
    const data = completeResponse();
    delete data.breakdowns[key];
    assert.equal(validResponse(data), false, key);
  }
  for (const key of ['activeMsToFirstChoice', 'activeMsToLuckyReturn', 'activeMsToDoorFound']) {
    for (const value of [undefined, -1, '120', NaN, Infinity]) {
      const data = completeResponse();
      data.timings[key] = value;
      assert.equal(validResponse(data), false, `${key}: ${String(value)}`);
    }
  }
  for (const mutate of [
    data => { data.metrics.FRONTDOOR_OPEN = []; },
    data => { data.breakdowns.source = {}; },
    data => { data.breakdowns.seedColor = [null]; },
    data => { data.transitions = [null]; },
    data => { data.rates = [null]; },
  ]) {
    const data = completeResponse();
    mutate(data);
    assert.equal(validResponse(data), false);
  }
});

test('rates reject invalid counts and conversions above their denominator', () => {
  for (const patch of [
    { numerator: -1 }, { numerator: '1' }, { numerator: undefined },
    { denominator: -1 }, { denominator: '2' }, { denominator: undefined },
    { numerator: 3, denominator: 2 }, { rate: -0.1 }, { rate: 1.1 },
    { rate: '0.5' }, { rate: NaN }, { rate: Infinity },
  ]) {
    const data = completeResponse();
    Object.assign(data.rates[0], patch);
    assert.equal(validResponse(data), false, JSON.stringify(patch));
  }
});

test('outcome conversions cannot exceed accepted departures', () => {
  for (const key of ['opened', 'arrived', 'requested']) {
    for (const value of [undefined, null, -1, '1', 0.5, Infinity]) {
      const data = completeResponse();
      data.outcomes.rows[0][key] = value;
      assert.equal(validResponse(data), false, `${key}: ${String(value)}`);
    }
  }
  for (const patch of [{ arrived: 3 }, { requested: 3 }, { opened: 0, arrived: 1 }]) {
    const data = completeResponse();
    Object.assign(data.outcomes.rows[0], patch);
    assert.equal(validResponse(data), false);
  }
  const data = completeResponse();
  data.outcomes.rows[0] = { door: 'ako', opened: 2, arrived: 2, requested: 2 };
  assert.equal(validResponse(data), true, 'arrival and request are separate conversions, not additive people');
});

test('older responses may omit outcomes or paths so the UI can show them as unwired', () => {
  for (const outcomes of [undefined, null, { rows: [] }, { rows: [], paths: null }]) {
    const data = completeResponse();
    if (outcomes === undefined) delete data.outcomes;
    else data.outcomes = outcomes;
    assert.equal(validResponse(data), true);
    assert.equal(akoProgress(data.outcomes), null);
  }
  const data = completeResponse();
  delete data.breakdowns.seedColor;
  assert.equal(validResponse(data), true);
});

test('provided outcomes must contain valid rows, known doors, and safe absolute paths', () => {
  for (const outcomes of [[], {}, { rows: null }, { rows: [null] }, { rows: [{ door: 'unknown', opened: 1, arrived: 0, requested: 0 }] }, { rows: [], paths: {} }]) {
    assert.equal(validResponse({ ...completeResponse(), outcomes }), false);
  }
  for (const patch of [{ door: 'unknown' }, { path: 'ako/kitchen/' }, { path: '/ako/?secret=1' }, { path: '/ako/#story' }, { path: '/' + 'a'.repeat(160) }, { path: null }]) {
    const data = completeResponse();
    Object.assign(data.outcomes.paths[0], patch);
    assert.equal(validResponse(data), false, JSON.stringify(patch));
  }
});

test('environment validation requires exact known values and matches the requested environment', () => {
  for (const env of ['local', 'preview', 'prod']) {
    const data = { ...completeResponse(), env };
    assert.equal(validResponse(data), true);
    for (const expected of ['local', 'preview', 'prod']) {
      assert.equal(validResponse(data, expected), env === expected, `${env} / ${expected}`);
    }
  }
  for (const env of [undefined, null, '', 'production', 'Prod', 'preview ', 'LOCAL']) {
    assert.equal(validResponse({ ...completeResponse(), env }), false, String(env));
  }
  assert.equal(validResponse(completeResponse(), 'Preview'), false);
});

test('Ako progress reports each path independently without summing repeat visitors', () => {
  const outcomes = {
    rows: [{ door: 'ako', opened: 1, arrived: 1, requested: 0 }],
    paths: [
      ...['/ako/', '/ako/kitchen/', '/ako/story/', '/xircle/'].map(path => ({ door: 'ako', path, installations: 1, journeys: 1, events: 1 })),
      { door: 'xircle', path: '/xircle/', installations: 99, journeys: 99, events: 99 },
      { door: 'ako', path: '/unlisted/', installations: 50, journeys: 50, events: 50 },
    ],
  };
  const before = structuredClone(outcomes);
  const progress = akoProgress(outcomes);
  assert.deepEqual(progress.map(row => row.path), AKO_STOPS.map(stop => stop.path));
  assert.deepEqual(progress.map(({ installations, journeys, events }) => ({ installations, journeys, events })), [
    ...Array.from({ length: 4 }, () => ({ installations: 1, journeys: 1, events: 1 })),
    { installations: 0, journeys: 0, events: 0 },
  ]);
  assert.deepEqual(outcomes, before, 'drilldown must not alter the distinct-person outcome total');
  assert.equal(outcomes.rows[0].arrived, 1);
  assert.notEqual(progress[0], outcomes.paths[0]);
});

test('an available but empty Ako path report is zero data rather than unwired', () => {
  const progress = akoProgress({ rows: [], paths: [] });
  assert.equal(progress.length, 5);
  for (const row of progress) {
    assert.deepEqual([row.installations, row.journeys, row.events], [0, 0, 0]);
  }
});

test('setup errors distinguish missing password, database binding, and environment', () => {
  const cases = [
    ['STAT_ACCESS_NOT_CONFIGURED', /SETUP REQUIRED/, /STAT_PASSWORD/],
    ['FRONTDOOR_DB_NOT_CONFIGURED', /PIPELINE UNWIRED/, /D1 binding.*DB/],
    ['FRONTDOOR_ENV_NOT_CONFIGURED', /PIPELINE UNWIRED/, /FRONTDOOR_ENV/],
  ];
  const messages = new Set();
  for (const [error, title, message] of cases) {
    const failure = responseFailure(503, { error }, true);
    assert.equal(failure.state, 'unwired');
    assert.match(failure.title, title);
    assert.match(failure.message, message);
    messages.add(failure.message);
  }
  assert.equal(messages.size, 3);
});

test('403 environment mismatch remains distinct from access denial', () => {
  for (const error of ['ENV_MISMATCH', 'ORIGIN_ENV_MISMATCH']) {
    const failure = responseFailure(403, { error }, true);
    assert.equal(failure.state, 'failed');
    assert.match(failure.title, /ENVIRONMENT MISMATCH/);
    assert.equal(failure.protectedLink, true);
  }
  for (const status of [401, 403]) {
    const failure = responseFailure(status, { error: 'FORBIDDEN' }, true);
    assert.equal(failure.state, 'failed');
    assert.match(failure.title, /REQUEST FAILED/);
    assert.doesNotMatch(failure.title, /ENVIRONMENT MISMATCH/);
    assert.equal(failure.protectedLink, true);
  }
});

test('400 failures identify invalid filters', () => {
  const failure = responseFailure(400, { error: 'INVALID_RANGE' }, true);
  assert.equal(failure.state, 'failed');
  assert.equal(failure.filters, true);
  assert.match(failure.message, /93/);
});

test('500 HTML remains a failed request and cannot masquerade as an unwired pipeline', () => {
  for (const isJSON of [false, true]) {
    const failure = responseFailure(500, isJSON ? { error: 'INTERNAL_ERROR' } : '<html>Server error</html>', isJSON);
    assert.equal(failure.state, 'failed');
    assert.match(failure.message, /HTTP 500/);
  }
});

test('404, unavailable service, and successful HTML fallbacks identify an unwired pipeline', () => {
  for (const [status, data, isJSON] of [
    [404, { error: 'NOT_FOUND' }, true],
    [404, '<html>Not found</html>', false],
    [503, { error: 'UNAVAILABLE' }, true],
    [200, '<html>Static fallback</html>', false],
  ]) {
    const failure = responseFailure(status, data, isJSON);
    assert.equal(failure.state, 'unwired', `HTTP ${status}, JSON ${isJSON}`);
    assert.match(failure.title, /PIPELINE UNWIRED/);
  }
});

test('a successful JSON response has no transport failure', () => {
  assert.equal(responseFailure(200, completeResponse(), true), null);
});
