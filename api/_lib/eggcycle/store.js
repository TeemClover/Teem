import {blankState,validDate} from '../../../eggcycle/cycle.js';
const ready=new WeakMap();
export const SCHEMA=[
  `CREATE TABLE IF NOT EXISTS mc_eggcycle_state (id INT PRIMARY KEY CHECK(id=1), data JSONB NOT NULL, revision INT NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS mc_eggcycle_auth (bucket TEXT PRIMARY KEY, hits INT NOT NULL, expires_at BIGINT NOT NULL)`,
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
};}
