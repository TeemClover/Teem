import {randomUUID} from 'node:crypto';
import {Fault} from './domain.js';
export const SCHEMA = [
`CREATE TABLE IF NOT EXISTS mc_mediral_customers (id TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until BIGINT NOT NULL DEFAULT 0, last_write TEXT, updated_at BIGINT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS mc_mediral_orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
`CREATE INDEX IF NOT EXISTS mc_mediral_orders_updated ON mc_mediral_orders(updated_at)`,
`CREATE TABLE IF NOT EXISTS mc_mediral_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at BIGINT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS mc_mediral_transfers (reference TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, created_at BIGINT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS mc_mediral_outbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, order_id TEXT, order_status TEXT, token TEXT, messages TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, lease TEXT, lease_until BIGINT NOT NULL DEFAULT 0, created_at BIGINT NOT NULL, sent_at BIGINT, error_code TEXT)`,
`CREATE TABLE IF NOT EXISTS mc_mediral_limits (id TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at BIGINT NOT NULL)`
];
export function createStore(sql){
 const q=(s,p=[])=>sql.query(s,p);let ready;
 const tx=parts=>sql.transaction(t=>parts.map(([s,p=[]])=>t.query(s,p)));
 return {
  ensure(){return ready||=(tx(SCHEMA.map(s=>[s])).catch(e=>{ready=null;throw e;}));},
  async limited(id,max,window,now){const [r]=await q(`INSERT INTO mc_mediral_limits (id,hits,expires_at) VALUES ($1,1,$2) ON CONFLICT(id) DO UPDATE SET hits=CASE WHEN mc_mediral_limits.expires_at<$3 THEN 1 ELSE mc_mediral_limits.hits+1 END,expires_at=CASE WHEN mc_mediral_limits.expires_at<$3 THEN $2 ELSE mc_mediral_limits.expires_at END RETURNING hits`,[id,now+window,now]);return Number(r.hits)>max;},
  async claim(user,now){await q(`INSERT INTO mc_mediral_customers (id,updated_at) VALUES ($1,$2) ON CONFLICT(id) DO NOTHING`,[user,now]);const token=randomUUID();const [row]=await q(`UPDATE mc_mediral_customers SET lease=$2,lease_until=$3 WHERE id=$1 AND lease_until<$4 RETURNING *`,[user,token,now+90000,now]);return row?{...row,state:JSON.parse(row.state),token}:null;},
  async release(c){await q('UPDATE mc_mediral_customers SET lease=NULL,lease_until=0 WHERE id=$1 AND lease=$2',[c.id,c.token]);},
  async event(id){return (await q('SELECT id FROM mc_mediral_events WHERE id=$1',[id]))[0]||null;},
  async order(id){const [r]=await q('SELECT data FROM mc_mediral_orders WHERE id=$1',[id]);return r?JSON.parse(r.data):null;},
  async list(){const rows=await q('SELECT data FROM mc_mediral_orders ORDER BY updated_at DESC LIMIT 100');const people=await q('SELECT id,state,updated_at FROM mc_mediral_customers ORDER BY updated_at DESC LIMIT 100');return {contacts:people.map(x=>({id:x.id,house:JSON.parse(x.state).house||null})).filter(x=>x.house),orders:rows.map(x=>{const o=JSON.parse(x.data);o.hasReceipt=Boolean(o.receipt);delete o.receipt;return o;}),handoffs:people.map(x=>({id:x.id,...JSON.parse(x.state),updatedAt:Number(x.updated_at)})).filter(x=>x.paused)};},
  async crossCourseReference(ref){const [r]=await q('SELECT reference FROM mc_ai_source_registrations WHERE UPPER(TRIM(bank_transaction_id))=$1 LIMIT 1',[ref]);return Boolean(r);},
  async commit(c,{state,order,eventId,messages=[],kind='reply',replyToken=null,transfer},now){
   const writeId=randomUUID();
   const guard='EXISTS (SELECT 1 FROM mc_mediral_customers WHERE id=$1 AND last_write=$2)';
   const parts=[['UPDATE mc_mediral_customers SET state=$3,version=version+1,last_write=$6,lease=NULL,lease_until=0,updated_at=$4 WHERE id=$1 AND lease=$2 AND lease_until>$4 AND version=$5 RETURNING id',[c.id,c.token,JSON.stringify(state),now,c.version,writeId]]];
   if(transfer)parts.push([`INSERT INTO mc_mediral_transfers (reference,order_id,created_at) SELECT $3,$4,$5 WHERE ${guard}`,[c.id,writeId,transfer,order.id,now]]);
   if(order){order.userId=c.id;parts.push([`INSERT INTO mc_mediral_orders (id,user_id,status,data,created_at,updated_at) SELECT $3,$1,$4,$5,$6,$7 WHERE ${guard} ON CONFLICT(id) DO UPDATE SET status=excluded.status,data=excluded.data,updated_at=excluded.updated_at WHERE mc_mediral_orders.user_id=excluded.user_id`,[c.id,writeId,order.id,order.status,JSON.stringify(order),order.createdAt,now]]);}
   if(eventId)parts.push([`INSERT INTO mc_mediral_events (id,user_id,created_at) SELECT $3,$1,$4 WHERE ${guard}`,[c.id,writeId,eventId,now]]);
   parts.push([`UPDATE mc_mediral_outbox SET status='superseded',token=NULL,messages='[]' WHERE user_id=$1 AND status='pending' AND kind='reply' AND ${guard}`,[c.id,writeId]]);
   const outboxId=randomUUID();if(messages.length)parts.push([`INSERT INTO mc_mediral_outbox (id,user_id,kind,token,messages,created_at,order_id,order_status) SELECT $3,$1,$4,$5,$6,$7,$8,$9 WHERE ${guard}`,[c.id,writeId,outboxId,kind,replyToken,JSON.stringify(messages),now,order?.id||null,order?.status||null]]);
   const result=await tx(parts);if(!result[0].length)throw new Fault('CUSTOMER_BUSY',409);return messages.length?outboxId:null;
  },
  async drainRows(now){return q(`SELECT id FROM mc_mediral_outbox WHERE status='pending' AND lease_until<$1 ORDER BY created_at LIMIT 20`,[now]);},
  async claimMessage(id,now){const lease=randomUUID();const [r]=await q(`UPDATE mc_mediral_outbox SET lease=$2,lease_until=$3,attempts=attempts+1 WHERE id=$1 AND status='pending' AND lease_until<$4 RETURNING *`,[id,lease,now+20000,now]);return r?{...r,messages:JSON.parse(r.messages)}:null;},
  async finishMessage(row,status,code,now){await q(`UPDATE mc_mediral_outbox SET status=$3,error_code=$4,sent_at=$5,lease=NULL,lease_until=0,token=CASE WHEN $3='pending' THEN token ELSE NULL END,messages=CASE WHEN $3='pending' THEN messages ELSE '[]' END WHERE id=$1 AND lease=$2 AND status='pending'`,[row.id,row.lease,status,code,status==='sent'?now:null]);},
  async queueStatus(){return q(`SELECT id,kind,status,attempts,created_at,error_code FROM mc_mediral_outbox WHERE status IN ('pending','failed') ORDER BY created_at DESC LIMIT 50`);},
  async cleanup(now){ // Operational retention, documented on the privacy page.
   await q('DELETE FROM mc_mediral_events WHERE created_at<$1',[now-30*86400000]);
   await q('DELETE FROM mc_mediral_limits WHERE expires_at<$1',[now]);
   await q("DELETE FROM mc_mediral_outbox WHERE status<>'pending' AND created_at<$1",[now-30*86400000]);
   const rows=await q('SELECT id,data FROM mc_mediral_orders WHERE created_at<$1',[now-90*86400000]);
   for(const r of rows){const o=JSON.parse(r.data);if(!o.receipt)continue;delete o.receipt;await q('UPDATE mc_mediral_orders SET data=$2 WHERE id=$1 AND data=$3',[r.id,JSON.stringify(o),r.data]);}
  }
 };
}
