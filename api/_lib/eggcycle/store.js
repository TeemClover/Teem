import {randomUUID} from 'node:crypto';
import {blankState,validDate} from '../../../eggcycle/cycle.js';
const ready=new WeakMap();
export const SCHEMA=[
  `CREATE TABLE IF NOT EXISTS mc_eggcycle_state (id INT PRIMARY KEY CHECK(id=1), data JSONB NOT NULL, revision INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS mc_eggcycle_auth (bucket TEXT PRIMARY KEY, hits INT NOT NULL, expires_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mc_eggcycle_notices (id TEXT PRIMARY KEY,status TEXT NOT NULL,lease TEXT,lease_until BIGINT NOT NULL DEFAULT 0,attempts INT NOT NULL DEFAULT 0,attempted_at BIGINT NOT NULL DEFAULT 0,sent_at TIMESTAMPTZ,error_code TEXT)`,
];
export async function ensureSchema(sql){
  if(!ready.has(sql))ready.set(sql,(async()=>{for(const q of SCHEMA)await sql.query(q);})().catch(e=>{ready.delete(sql);throw e;}));
  return ready.get(sql);
}
export function lazyStore(getDatabase,env=process.env){
  let pending;
  return new Proxy({}, {get:(_,key)=>(...args)=>{
    pending ||= (async()=>{const sql=getDatabase();await ensureSchema(sql);return sqlStore(sql,env);})().catch(e=>{pending=null;throw e;});
    return pending.then(store=>store[key](...args));
  }});
}
export function sqlStore(sql,env=process.env){return {
  async load(){
    const initial=validDate(env.EGGCYCLE_INITIAL_PERIOD_START)?env.EGGCYCLE_INITIAL_PERIOD_START:'';
    await sql.query('INSERT INTO mc_eggcycle_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING',[JSON.stringify(blankState(initial))]);
    const [r]=await sql.query('SELECT data,revision FROM mc_eggcycle_state WHERE id=1');
    return {...r.data,revision:r.revision};
  },
  async save(state){
    const [r]=await sql.query('UPDATE mc_eggcycle_state SET data=$1::jsonb,revision=revision+1 WHERE id=1 AND revision=$2 RETURNING revision',[JSON.stringify(state),state.revision]);
    if(!r)throw Object.assign(new Error('มีการแก้ไขจากอีกเครื่อง กรุณาโหลดใหม่แล้วบันทึกอีกครั้ง'),{status:409});
    return {...state,revision:r.revision};
  },
  async limited(bucket,now,limit=8,window=900000){
    const key=`${bucket}:${Math.floor(now/window)}`;
    const [r]=await sql.query('INSERT INTO mc_eggcycle_auth(bucket,hits,expires_at) VALUES($1,1,$2) ON CONFLICT(bucket) DO UPDATE SET hits=mc_eggcycle_auth.hits+1 RETURNING hits',[key,now+window]);
    await sql.query('DELETE FROM mc_eggcycle_auth WHERE expires_at<$1',[now]);return r.hits>limit;
  },
  async claim(id,now){
    const lease=randomUUID();
    const rows=await sql.query(`INSERT INTO mc_eggcycle_notices(id,status,lease,lease_until,attempts,attempted_at) VALUES($1,'pending',$2,$3,1,$4)
      ON CONFLICT(id) DO UPDATE SET lease=$2,lease_until=$3,attempted_at=$4,attempts=mc_eggcycle_notices.attempts+1
      WHERE mc_eggcycle_notices.status<>'sent' AND mc_eggcycle_notices.lease_until<$4 RETURNING id`,[id,lease,now+120000,now]);
    return rows.length?lease:null;
  },
  async finish(id,lease,success){await sql.query(`UPDATE mc_eggcycle_notices SET status=$3,lease_until=0,sent_at=CASE WHEN $3='sent' THEN NOW() ELSE NULL END,error_code=$4 WHERE id=$1 AND lease=$2`,[id,lease,success?'sent':'pending',success?null:'DELIVERY_FAILED']);},
  async status(){const [r]=await sql.query('SELECT status,sent_at,error_code FROM mc_eggcycle_notices ORDER BY attempted_at DESC LIMIT 1');return r||null;},
};}
