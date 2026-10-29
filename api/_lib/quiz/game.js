import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto';
import { QUESTIONS } from './questions.js';
import { AVATARS } from '../../../quiz/avatars.js';

export const CAPACITY = 100;
export const AVATAR_IDS = new Set(AVATARS.map(a => a.id));
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export class GameError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export function scoreAnswer(elapsed, duration) {
  return Math.round(1000 - 500 * Math.min(1, Math.max(0, elapsed / duration)));
}
export function prepareQuestions(seconds = 20) {
  if (![10, 20, 30, 60].includes(seconds)) throw new GameError('BAD_DURATION');
  return QUESTIONS.map(q => {
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return { ...q, options: order.map(i => q.options[i]), correctIndex: order.indexOf(q.correctIndex), seconds };
  });
}
export function validateJoin(payload) {
  const name = String(payload.name || '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (!name || [...name].length > 24 || /[\p{Cc}\p{Cf}<>]/u.test(name)) throw new GameError('BAD_NAME');
  if (!AVATAR_IDS.has(payload.avatar)) throw new GameError('BAD_AVATAR');
  return { name, nameKey: name.toLocaleLowerCase('th'), avatar: payload.avatar, playerId: randomUUID() };
}
export function effectivePhase(room, now) {
  return room.phase === 'question' && now >= room.endsAt ? 'reveal' : room.phase;
}
export function publicState(room, players, answers, now) {
  const phase = effectivePhase(room, now);
  const showResult = ['reveal', 'leaderboard', 'finished'].includes(phase);
  const q = room.questions[room.index];
  const ranked = players.map(p => {
    const pending = !showResult && answers.find(a => a.index === room.index && a.playerId === p.id);
    return { ...p, score:p.score-(pending?.points||0), correct:p.correct-(pending?.correct?1:0), elapsed:p.elapsed-(pending?.correct?pending.elapsed:0) };
  }).sort((a,b) => b.score-a.score || b.correct-a.correct || a.elapsed-b.elapsed || a.joinedAt-b.joinedAt || a.id.localeCompare(b.id));
  return {
    code: room.code, title: room.title, phase, version: room.version, index: room.index,
    total: room.questions.length, capacity: CAPACITY, playerCount: players.length,
    startsAt: room.startsAt, endsAt: room.endsAt, expiresAt: room.expiresAt,
    question: q ? { id: q.id, text: q.text, options: q.options, seconds: q.seconds, ...(showResult ? { correctIndex: q.correctIndex } : {}) } : null,
    answered: answers.filter(a => a.index === room.index).length,
    distribution: showResult ? [0,1,2,3].map(c => answers.filter(a => a.index === room.index && a.choice === c).length) : null,
    players: ranked.map((p, i) => ({ id: p.id, name: p.name, avatar: p.avatar, rank: i+1,
      // Scores remain at the previous round until this round is revealed.
      score: p.score, correct:p.correct })),
  };
}

// Explicitly injected local/test repository; production never falls back to this.
export function createMemoryStore({ clock = Date.now } = {}) {
  const rooms = new Map();
  const get = code => { const r = rooms.get(code); if (!r || clock() >= r.room.expiresAt) throw new GameError('ROOM_NOT_FOUND',404); return r; };
  return {
    async create({ title, questions, hostHash }) {
      let code; do { code = String(randomInt(100000, 1000000)); } while (rooms.has(code));
      const room = { code, title, questions, hostHash, phase:'lobby', index:-1, version:0, startsAt:null, endsAt:null, expiresAt:clock()+12*3600000 };
      rooms.set(code, { room, players:[], answers:[] }); return { code };
    },
    async command({ code, hash, action, payload = {} }) {
      const data=get(code), { room, players, answers }=data, now=clock();
      if (action === 'join') {
        const existing=players.find(p=>p.hash===hash); if(existing)return { playerId:existing.id };
        if(room.phase==='finished')throw new GameError('ROOM_FINISHED',409);
        if(players.length>=CAPACITY)throw new GameError('ROOM_FULL',409);
        if(players.some(p=>p.nameKey===payload.nameKey))throw new GameError('NAME_TAKEN',409);
        players.push({ id:payload.playerId, hash, name:payload.name, nameKey:payload.nameKey, avatar:payload.avatar, score:0,correct:0,elapsed:0,joinedAt:now });
        return { playerId:payload.playerId };
      }
      const player=players.find(p=>p.hash===hash);
      if(action==='me') {
        if(!player)throw new GameError('UNAUTHORIZED',401);
        const a=answers.find(a=>a.playerId===player.id&&a.index===room.index);
        return { playerId:player.id, answer:a ? { choice:a.choice, ...(effectivePhase(room,now)!=='question'?{points:a.points,correct:a.correct}: {}) } : null };
      }
      if(action==='answer') {
        if(!player)throw new GameError('UNAUTHORIZED',401);
        if(payload.index!==room.index)throw new GameError('QUESTION_CHANGED',409);
        const prior=answers.find(a=>a.playerId===player.id&&a.index===room.index);
        if(prior)return { accepted:true,choice:prior.choice };
        if(room.phase!=='question'||now<room.startsAt||now>=room.endsAt)throw new GameError('ANSWER_CLOSED',409);
        if(!Number.isInteger(payload.choice)||payload.choice<0||payload.choice>3)throw new GameError('BAD_CHOICE');
        const elapsed=now-room.startsAt,correct=payload.choice===room.questions[room.index].correctIndex;
        const points=correct?scoreAnswer(elapsed,room.endsAt-room.startsAt):0;
        answers.push({index:room.index,playerId:player.id,choice:payload.choice,points,correct,elapsed});
        player.score+=points;if(correct){player.correct++;player.elapsed+=elapsed;}
        return {accepted:true,choice:payload.choice};
      }
      if(hash!==room.hostHash)throw new GameError('UNAUTHORIZED',401);
      if(payload.version!==room.version)throw new GameError('STATE_CHANGED',409);
      if(action==='start'&&room.phase==='lobby') {
        if(!players.length)throw new GameError('NO_PLAYERS',409);room.index=0;
      } else if(action==='next'&&room.phase==='leaderboard') {
        room.index++;
        if(room.index>=room.questions.length){room.index--;room.phase='finished';room.version++;return {ok:true};}
      } else if(action==='reveal'&&room.phase==='question'&&now>=room.startsAt) {room.phase='reveal';room.version++;return {ok:true};
      } else if(action==='leaderboard'&&effectivePhase(room,now)==='reveal') {room.phase='leaderboard';room.version++;return {ok:true};
      } else if(action==='finish'&&room.phase!=='finished') {room.phase='finished';room.version++;return {ok:true};
      } else throw new GameError('BAD_TRANSITION',409);
      room.phase='question';room.startsAt=now+4000;room.endsAt=room.startsAt+room.questions[room.index].seconds*1000;room.version++;
      return {ok:true};
    },
    async snapshot(code) {const d=get(code);return publicState(d.room,d.players,d.answers,clock());},
    inspect(code) { return get(code); },
  };
}
