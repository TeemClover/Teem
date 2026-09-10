import test from 'node:test';
import assert from 'node:assert/strict';
import { careTopic, onwardHref } from './xvisor-path.js';

const id = 'h-b73e880c-6b24-431a-b164-2268bfae9a04';
const origin = 'https://www.myclover.com';
const location = {origin, search:`?fdh=${id}&focus=food&sleep=private&note=private`};

test('knowledge continuation carries only the existing handoff, preserving the destination topic and return anchor', () => {
  const next = new URL(onwardHref('/xircle/learn/topic/?t=xvisor-context', location), origin);
  assert.deepEqual([...next.searchParams], [['t','xvisor-context'],['fdh',id]]);
  const back = new URL(onwardHref('/xircle/#appointment', location), origin);
  assert.equal(back.hash, '#appointment');
  assert.equal(back.search, `?fdh=${id}`);
  assert.equal(onwardHref('/xvisor/?from=xircle', location), `/xvisor/?from=xircle&fdh=${id}`);
});

test('direct visitors, malformed and duplicate references never acquire a handoff identity', () => {
  for (const search of ['', '?fdh=', '?fdh=not-a-handoff', `?fdh=${id}&fdh=${id}`, '?fdh=h-<script>', '?fdh=h-'+ 'a'.repeat(100)]) {
    assert.equal(onwardHref('/xvisor/?from=xircle', {origin,search}), '/xvisor/?from=xircle');
  }
  // Telemetry's safe in-memory ID fallback remains usable when crypto.randomUUID is absent.
  assert.equal(new URL(onwardHref('/xvisor/', {origin,search:'?fdh=h-mex8-example123'}),origin).searchParams.get('fdh'), 'h-mex8-example123');
});

test('no reference reaches external sites, arbitrary subroutes or game runtime', () => {
  for (const href of ['https://elsewhere.example/xvisor/', '//elsewhere.example/xircle/', '/xvisor/quest/', '/xircle/private/', 'mailto:someone@example.com', '/api/meet']) {
    assert.equal(onwardHref(href,location),href);
  }
});

test('only relevant, unambiguous care articles offer the game continuation', () => {
  for (const topic of ['xvisor-context','care-framework','certification','privacy-boundary']) assert.equal(careTopic(`?t=${topic}`),true);
  for (const search of ['', '?t=habit-tracker', '?t=sleep', '?t=unknown', '?t=__proto__', '?t=xvisor-context&t=sleep', '?t=xvisor-context&t=xvisor-context']) assert.equal(careTopic(search),false);
});
