import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAction, createRoomState, joinRoom, publicLobbyItem,
  readyNextMatch, setHand, viewFor,
} from '../backend/room-service.js';

const HAND_A = ['gen-red', 'gen-red', 'gen-red', 'gen-green', 'gen-green', 'gen-blue', 'gen-gray'];
const HAND_B = ['gen-green', 'gen-green', 'gen-green', 'gen-blue', 'gen-blue', 'gen-red', 'gen-gray'];

function room(mode = 'quick') {
  const r = createRoomState({ roomId: 'room-1', code: '0042', displayName: 'Host', authHash: 'h', mode, now: 1 });
  assert.equal(joinRoom(r, { displayName: 'Guest', authHash: 'g', now: 2 }).ok, true);
  return r;
}

function playWin(r, winner = 'a') {
  const aCard = r.match.players.a.hand.find(c => c.status === 'IN_HAND' && c.color === (winner === 'a' ? 'RED' : 'GREEN'));
  const bCard = r.match.players.b.hand.find(c => c.status === 'IN_HAND' && c.color === (winner === 'a' ? 'GREEN' : 'RED'));
  assert.ok(aCard && bCard);
  assert.equal(applyAction(r, 'a', { type: 'select_card', cardInstanceId: aCard.iid, action_id: crypto.randomUUID() }).ok, true);
  assert.equal(applyAction(r, 'b', { type: 'select_card', cardInstanceId: bCard.iid, action_id: crypto.randomUUID() }).ok, true);
  assert.equal(applyAction(r, 'a', { type: 'lock_choice', action_id: crypto.randomUUID() }).ok, true);
  assert.equal(applyAction(r, 'b', { type: 'lock_choice', action_id: crypto.randomUUID() }).ok, true);
  if (r.status === 'PLAYING' && r.match.phase === 'DISCARD_REQUIRED') {
    const loser = winner === 'a' ? 'b' : 'a';
    const neededColor = winner === 'a' ? 'GREEN' : 'RED';
    const dc = r.match.players[loser].hand.find(c => c.status === 'IN_HAND' && c.color !== neededColor)
      || r.match.players[loser].hand.find(c => c.status === 'IN_HAND');
    assert.equal(applyAction(r, loser, { type: 'discard_card', cardInstanceId: dc.iid, action_id: crypto.randomUUID() }).ok, true);
  }
}

test('room codes preserve four digits and public lobby exposes no auth state', () => {
  const r = createRoomState({ roomId: 'r', code: '0042', displayName: '<Host>', authHash: 'secret', now: 10 });
  const item = publicLobbyItem(r, 11);
  assert.equal(item.code, '0042');
  assert.equal(item.hostName, 'Host');
  assert.equal(JSON.stringify(item).includes('secret'), false);
});

test('opponent hand stays server-private until series ends', () => {
  const r = room('bo3');
  setHand(r, 'a', HAND_A); setHand(r, 'b', HAND_B);
  const v = viewFor(r, 'a');
  assert.equal(v.startingHands, null);
  assert.equal('hand' in v.matchView.opponent, false);
  assert.equal(JSON.stringify(v).includes('"iid":"b1"'), false);
});

test('BO3 retains starting hands and starts next match only when both ready', () => {
  const r = room('bo3');
  setHand(r, 'a', HAND_A); setHand(r, 'b', HAND_B);
  while (r.status === 'PLAYING') playWin(r, 'a');
  assert.equal(r.status, 'BETWEEN_MATCHES');
  assert.equal(viewFor(r, 'a').matchView.startingHands, null);
  assert.equal(readyNextMatch(r, 'a').ok, true);
  assert.equal(r.status, 'BETWEEN_MATCHES');
  assert.equal(readyNextMatch(r, 'b').ok, true);
  assert.equal(r.status, 'PLAYING');
  assert.deepEqual(r.match.players.a.hand.map(c => c.cardId), HAND_A);
});
