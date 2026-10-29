import { randomInt } from 'node:crypto';
import { GameError, publicState } from './game.js';
import { SCHEMA } from './schema.js';

export function createPostgresStore(sql) {
  let ready;
  const ensure = () => ready ||= sql.transaction(tx=>SCHEMA.map(s=>tx.query(s))).catch(e=>{ready=null;throw e;});
  const query=async(s,p=[])=>{await ensure();return sql.query(s,p);};
  return {
    async create({title,questions,hostHash,rateKey}) {
      if(rateKey){const [limit]=await query('INSERT INTO mc_quiz_create_limits(bucket) VALUES($1) ON CONFLICT(bucket) DO UPDATE SET hits=mc_quiz_create_limits.hits+1 RETURNING hits',[rateKey]);if(limit.hits>10)throw new GameError('RATE_LIMITED',429);}
      for(let i=0;i<8;i++){
        const code=String(randomInt(100000,1000000));
        const rows=await query(`INSERT INTO mc_quiz_rooms(code,host_hash,title,questions,expires_at)
          VALUES($1,$2,$3,$4::jsonb,floor(extract(epoch FROM clock_timestamp())*1000)+43200000)
          ON CONFLICT(code) DO NOTHING RETURNING code`,[code,hostHash,title,JSON.stringify(questions)]);
        if(rows.length)return rows[0];
      }
      throw new GameError('TRY_AGAIN',503);
    },
    async command({code,hash,action,payload={}}){
      try{const [r]=await query('SELECT mc_quiz_command_v1($1,$2,$3,$4::jsonb) AS result',[code,hash,action,JSON.stringify(payload)]);return r.result;}
      catch(e){const known=['ROOM_NOT_FOUND','ROOM_FINISHED','ROOM_FULL','NAME_TAKEN','UNAUTHORIZED','QUESTION_CHANGED','ANSWER_CLOSED','BAD_CHOICE','STATE_CHANGED','NO_PLAYERS','BAD_TRANSITION'];const code=known.find(c=>e.message?.includes(c));if(code)throw new GameError(code,code==='UNAUTHORIZED'?401:code==='ROOM_NOT_FOUND'?404:409);throw e;}
    },
    async snapshot(code){
      const [data]=await query(`SELECT row_to_json(r) AS room,
       (SELECT coalesce(json_agg(p),'[]'::json) FROM mc_quiz_players p WHERE p.room_code=r.code) AS players,
       (SELECT coalesce(json_agg(a),'[]'::json) FROM mc_quiz_answers a WHERE a.room_code=r.code AND a.question_index=r.question_index) AS answers,
       floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS now
       FROM mc_quiz_rooms r WHERE r.code=$1 AND r.expires_at>floor(extract(epoch FROM clock_timestamp())*1000)`,[code]);
      if(!data)throw new GameError('ROOM_NOT_FOUND',404);
      const r=data.room;
      return publicState({code:r.code,title:r.title,questions:r.questions,phase:r.phase,index:r.question_index,version:r.version,startsAt:Number(r.starts_at)||null,endsAt:Number(r.ends_at)||null,expiresAt:Number(r.expires_at)},
       data.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,correct:p.correct,elapsed:Number(p.elapsed),joinedAt:Number(p.joined_at)})),
       data.answers.map(a=>({index:a.question_index,playerId:a.player_id,choice:a.choice,points:a.points,correct:a.correct,elapsed:a.elapsed})),Number(data.now));
    },
  };
}
let storePromise;
export function productionStore(){
  if(!process.env.DATABASE_URL)throw new GameError('DATABASE_UNAVAILABLE',503);
  return storePromise ||= import('@neondatabase/serverless').then(({neon})=>createPostgresStore(neon(process.env.DATABASE_URL))).catch(e=>{storePromise=null;throw e;});
}
