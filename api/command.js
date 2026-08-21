import { randomUUID } from 'node:crypto';
import { clean, database, sendJson } from './_lib/core.js';
import { currentBackofficeSession, ensureBackofficeSchema, recordBackofficeAudit } from './_lib/backoffice-auth.js';

const MODES = new Set(['CREATE', 'EXPAND', 'CONQUER']);
const STATUSES = new Set(['QUEUED', 'IN_PROGRESS', 'REVIEW', 'LIVE', 'BLOCKED', 'ARCHIVED']);
const FLOWS = Object.freeze({ ACTION: 'IN_PROGRESS', PASS: 'REVIEW', GO_AGAIN: 'IN_PROGRESS', CLOSE_CHAIN: 'LIVE', BLOCK: 'BLOCKED' });

async function ensureCommandSchema(sql) {
  await sql.query(`CREATE TABLE IF NOT EXISTS mc_command_operations (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,mode TEXT NOT NULL,project TEXT NOT NULL,goal TEXT NOT NULL,
    next_action TEXT,owner TEXT,source TEXT,output TEXT,success_check TEXT,guardrails TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED',chain_state TEXT NOT NULL DEFAULT 'ACTION',chain_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,updated_at TIMESTAMPTZ NOT NULL
  )`);
  await sql.query("ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS chain_state TEXT NOT NULL DEFAULT 'ACTION'");
  await sql.query('ALTER TABLE mc_command_operations ADD COLUMN IF NOT EXISTS chain_updated_at TIMESTAMPTZ');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_command_operations_updated ON mc_command_operations(updated_at DESC)');
  await sql.query('CREATE INDEX IF NOT EXISTS idx_mc_command_operations_status ON mc_command_operations(status, updated_at DESC)');
}

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return origin === `${proto}://${host}`;
}
function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  return {};
}
function operationPacket(row) {
  return { id:row.id,mode:row.mode,project:row.project,goal:row.goal,nextAction:row.next_action||'',owner:row.owner||'',source:row.source||'',output:row.output||'',successCheck:row.success_check||'',guardrails:row.guardrails||'',status:row.status,chainState:row.chain_state||'ACTION',chainUpdatedAt:row.chain_updated_at||null,createdAt:row.created_at,updatedAt:row.updated_at };
}
async function count(sql, query, params=[]) { try { const rows=await sql.query(query,params); return Number(rows[0]?.n||0); } catch { return 0; } }
async function latest(sql, query, params=[]) { try { const rows=await sql.query(query,params); return rows[0]?.at||null; } catch { return null; } }
function labels7d(){return Array.from({length:7},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-(6-i));return d.toISOString().slice(0,10)})}
async function dailySeries(sql, table, timeColumn, extraWhere='TRUE') {
  try {
    const rows=await sql.query(`WITH days AS (SELECT generate_series(date_trunc('day',NOW())-interval '6 days',date_trunc('day',NOW()),interval '1 day') AS day)
      SELECT day,(SELECT COUNT(*)::int FROM ${table} t WHERE t.${timeColumn}>=day AND t.${timeColumn}<day+interval '1 day' AND ${extraWhere}) AS n FROM days ORDER BY day`);
    return {labels:rows.map(r=>new Date(r.day).toISOString().slice(0,10)),values:rows.map(r=>Number(r.n||0))};
  } catch { const labels=labels7d(); return {labels,values:labels.map(()=>0)}; }
}
async function operationSeries(sql){
  try{
    const rows=await sql.query(`WITH days AS (SELECT generate_series(date_trunc('day',NOW())-interval '6 days',date_trunc('day',NOW()),interval '1 day') AS day)
      SELECT day,
      (SELECT COUNT(*)::int FROM mc_command_operations o WHERE o.created_at>=day AND o.created_at<day+interval '1 day') AS created,
      (SELECT COUNT(*)::int FROM mc_command_operations o WHERE o.updated_at>=day AND o.updated_at<day+interval '1 day' AND o.status='LIVE') AS closed
      FROM days ORDER BY day`);
    return {labels:rows.map(r=>new Date(r.day).toISOString().slice(0,10)),created:rows.map(r=>Number(r.created||0)),closed:rows.map(r=>Number(r.closed||0))};
  }catch{const labels=labels7d();return{labels,created:labels.map(()=>0),closed:labels.map(()=>0)}}
}
async function learningSeries(sql){
  try{
    const rows=await sql.query(`WITH days AS (SELECT generate_series(date_trunc('day',NOW())-interval '6 days',date_trunc('day',NOW()),interval '1 day') AS day)
      SELECT day,
      (SELECT COUNT(*)::int FROM first_class_registrations r WHERE r.created_at>=day AND r.created_at<day+interval '1 day') AS registrations,
      (SELECT COUNT(*)::int FROM first_class_reviews v WHERE v.created_at>=day AND v.created_at<day+interval '1 day') AS reviews
      FROM days ORDER BY day`);
    return {labels:rows.map(r=>new Date(r.day).toISOString().slice(0,10)),registrations:rows.map(r=>Number(r.registrations||0)),reviews:rows.map(r=>Number(r.reviews||0))};
  }catch{const labels=labels7d();return{labels,registrations:labels.map(()=>0),reviews:labels.map(()=>0)}}
}
function attentionItems({blockedOps,staleOps,firstClassRegistrations,firstClassGranted}){
  const items=[];
  if(blockedOps>0)items.push({level:'critical',title:`${blockedOps} Operation ติด BLOCK`,detail:'Chain กลางของ myClover มีงานที่หยุดเพราะ blocker ยังไม่ถูก resolve',advice:'ระบุว่า “รออะไร/ใคร/เมื่อไหร่” แล้ว GO AGAIN หรือ DELETE ถ้าไม่ทำแล้ว'});
  if(staleOps>0)items.push({level:'attention',title:`${staleOps} Operation ค้างเกิน 48 ชั่วโมง`,detail:'Work Queue เริ่มมี debt และ priority ไม่ชัด',advice:'PASS ให้คนถัดไป, GO AGAIN พร้อม Next Action ใหม่ หรือ DELETE'});
  const pending=Math.max(0,firstClassRegistrations-firstClassGranted);
  if(pending>0)items.push({level:'attention',title:`${pending} First Class ยังไม่ granted`,detail:'มี registration ที่ยังไม่ปิด flow ในบ้าน myClover',advice:'เปิด First Class Control Room เพื่อตรวจ payment / Discord / email automation'});
  if(!items.length)items.push({level:'info',title:'บ้าน myClover ไม่มี critical attention ตอนนี้',detail:'TeamBook แยกไปดูที่ House Command ของ TeamBook แล้ว บอร์ดนี้อ่านเฉพาะข้อมูลของบ้าน myClover',advice:'เลือก Current Goal ที่ leverage สูงสุด แล้วเล่น ACTION เพียงก้อนเดียว'});
  return items.slice(0,6);
}

async function getBrief(sql){
  const [accounts,newAccounts7d,firstClassRegistrations,firstClassPaid,firstClassGranted,firstClassReviews,openOps,blockedOps,staleOps,latestOps,liveOps7d,createdOps7d,registrations7d,reviews7d,lastAccountAt,lastRegistrationAt,lastReviewAt,lastOperationAt]=await Promise.all([
    count(sql,'SELECT COUNT(*)::int AS n FROM mc_accounts'),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_accounts WHERE created_at>=NOW()-INTERVAL '7 days'"),
    count(sql,'SELECT COUNT(*)::int AS n FROM first_class_registrations'),
    count(sql,"SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE payment_status='paid'"),
    count(sql,"SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE first_class_status='granted'"),
    count(sql,'SELECT COUNT(*)::int AS n FROM first_class_reviews'),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status NOT IN ('LIVE','ARCHIVED')"),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status='BLOCKED'"),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status NOT IN ('LIVE','ARCHIVED') AND updated_at<NOW()-INTERVAL '48 hours'"),
    sql.query(`SELECT id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at FROM mc_command_operations ORDER BY updated_at DESC LIMIT 40`),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE status='LIVE' AND updated_at>=NOW()-INTERVAL '7 days'"),
    count(sql,"SELECT COUNT(*)::int AS n FROM mc_command_operations WHERE created_at>=NOW()-INTERVAL '7 days'"),
    count(sql,"SELECT COUNT(*)::int AS n FROM first_class_registrations WHERE created_at>=NOW()-INTERVAL '7 days'"),
    count(sql,"SELECT COUNT(*)::int AS n FROM first_class_reviews WHERE created_at>=NOW()-INTERVAL '7 days'"),
    latest(sql,'SELECT MAX(created_at) AS at FROM mc_accounts'),
    latest(sql,'SELECT MAX(created_at) AS at FROM first_class_registrations'),
    latest(sql,'SELECT MAX(created_at) AS at FROM first_class_reviews'),
    latest(sql,'SELECT MAX(updated_at) AS at FROM mc_command_operations')
  ]);
  const [accountsSeries,learning,ops]=await Promise.all([dailySeries(sql,'mc_accounts','created_at'),learningSeries(sql),operationSeries(sql)]);
  const alerts=attentionItems({blockedOps,staleOps,firstClassRegistrations,firstClassGranted});
  const chartKey=blockedOps||staleOps?'operations':(firstClassRegistrations>firstClassGranted?'learning':'operations');
  const now=new Date();
  const infrastructure=[
    {name:'GitHub',state:'connected',role:'source code + history',url:'https://github.com/TeemClover/Teem',lastCheckedAt:now,lastEvent:'TeemClover/Teem is the source repository'},
    {name:'Vercel',state:process.env.VERCEL?'runtime':'linked',role:'myClover production runtime + serverless functions',url:'https://vercel.com/teemclover',lastCheckedAt:now,lastEvent:process.env.VERCEL?'running inside Vercel runtime':'dashboard link available'},
    {name:'Primary Database',state:process.env.DATABASE_URL?'configured':'missing',role:'myClover operational database only',url:'https://vercel.com/teemclover',lastCheckedAt:now,lastEvent:process.env.DATABASE_URL?'DATABASE_URL present':'DATABASE_URL missing'},
    {name:'Cloudflare',state:'linked',role:'DNS / edge / security tooling',url:'https://dash.cloudflare.com/',lastCheckedAt:now,lastEvent:'external console linked · health not probed from runtime'},
    {name:'Discord',state:process.env.DISCORD_CLIENT_ID||process.env.DISCORD_BOT_TOKEN?'configured':'partial',role:'OAuth + community automation',url:'https://discord.com/developers/applications',lastCheckedAt:now,lastEvent:process.env.DISCORD_BOT_TOKEN?'bot automation configured':(process.env.DISCORD_CLIENT_ID?'OAuth configured':'no runtime credential detected')},
    {name:'Resend',state:process.env.RESEND_API_KEY?'configured':'optional',role:'transactional email',url:'https://resend.com/emails',lastCheckedAt:now,lastEvent:process.env.RESEND_API_KEY?'email provider configured':'manual/optional mode'},
    {name:'Meta CAPI',state:process.env.META_CAPI_ACCESS_TOKEN?'configured':'optional',role:'conversion measurement',url:'https://business.facebook.com/events_manager2',lastCheckedAt:now,lastEvent:process.env.META_CAPI_ACCESS_TOKEN?'CAPI token configured':'CAPI token not detected'}
  ];
  const buildings=[
    {icon:'ID',name:'Identity Hall',state:accounts>0?'online':'quiet',role:'บัญชี สมาชิก และ identity ของบ้าน myClover',lastUpdatedAt:lastAccountAt,lastEvent:`${accounts} accounts`,recommendation:'ใช้ identity กลางสำหรับบริการที่ยังอยู่ในบ้าน myClover'},
    {icon:'FC',name:'First Class Academy',state:firstClassRegistrations>firstClassGranted?'attention':'online',role:'registration · payment · grant · student review',lastUpdatedAt:lastReviewAt||lastRegistrationAt,lastEvent:`${firstClassRegistrations} registered · ${firstClassGranted} granted · ${firstClassReviews} reviews`,recommendation:firstClassRegistrations>firstClassGranted?'เคลียร์ registration ที่ยังไม่ granted':'เก็บ review ให้กลายเป็น feedback loop ของหลักสูตร'},
    {icon:'CC',name:'Command Citadel',state:blockedOps>0?'attention':'online',role:'Operation queue + TCG chain + Keen handoff',lastUpdatedAt:lastOperationAt,lastEvent:`${openOps} open · ${blockedOps} blocked`,recommendation:blockedOps?'resolve blocker หรือ DELETE task ที่ไม่ใช้แล้ว':'หนึ่ง Goal → หนึ่ง Next Action → ปิด chain ให้สั้น'},
    {icon:'XI',name:'Xircle Quarter',state:'source',role:'health / care experience + source canon ในบ้าน myClover',lastUpdatedAt:null,lastEvent:'source lives in /xircle/ and /xircle/doc/source/',recommendation:'เพิ่ม heartbeat/usage metric เมื่อ Xircle มี server signal กลาง'},
    {icon:'KN',name:'Keen Workshop',state:openOps>0?'active':'ready',role:'โต๊ะผลิตที่รับ Operation packet ของ myClover',lastUpdatedAt:lastOperationAt,lastEvent:openOps?`${openOps} operations available`:'queue ว่าง',recommendation:'ACTION → PASS → GO AGAIN → CLOSE CHAIN'},
    {icon:'CP',name:'Capture Vault',state:'ready',role:'memory ของ output ที่ผลิตจาก Operation',lastUpdatedAt:lastOperationAt,lastEvent:'Delivery Packet + review memory',recommendation:'ทุก CLOSE CHAIN ควรมี output ที่คนถัดไปหาเจอ'},
    {icon:'TB',name:'TeamBook House',state:'separate',role:'แยก server · แยก database · แยก observability',lastUpdatedAt:null,lastEvent:'monitor ที่ teambook.me/command/ เท่านั้น',recommendation:'ข้ามบ้านผ่าน Command link ไม่ดึง TeamBook database เข้ามาที่ myClover',url:'https://teambook.me/command/'}
  ];
  return {
    population:{accounts,newAccounts7d},
    learning:{firstClassRegistrations,firstClassPaid,firstClassGranted,firstClassReviews},
    attention:{chartKey,items:alerts},
    charts:{
      operations:{short:'Chains',title:'Command Chains · 7 วัน',reason:'วัดจำนวนคำสั่งที่เปิด เทียบกับ chain ที่ปิดได้จริงในบ้าน myClover',labels:ops.labels,primary:ops.created,secondary:ops.closed,primaryLabel:'Created',secondaryLabel:'Closed'},
      learning:{short:'Learning',title:'First Class Flow · 7 วัน',reason:'ดูการไหลของคนเข้าเรียนและ feedback ภายในบ้าน myClover',labels:learning.labels,primary:learning.registrations,secondary:learning.reviews,primaryLabel:'Registrations',secondaryLabel:'Reviews'},
      identity:{short:'Identity',title:'New myClover Accounts · 7 วัน',reason:'ดูการเพิ่มประชากรของบ้าน myClover โดยไม่รวม TeamBook',labels:accountsSeries.labels,primary:accountsSeries.values,secondary:[],primaryLabel:'New accounts',secondaryLabel:''}
    },
    achievements:[
      {icon:'⚔️',title:'Chains Closed',value:liveOps7d,detail:'Operation ที่ปิดเป็น LIVE ใน 7 วัน'},
      {icon:'🗺️',title:'Orders Issued',value:createdOps7d,detail:'Operation ใหม่ใน 7 วัน'},
      {icon:'♣️',title:'New Citizens',value:newAccounts7d,detail:'บัญชี myClover ใหม่ใน 7 วัน'},
      {icon:'🏅',title:'New Learners',value:registrations7d,detail:'First Class registrations ใน 7 วัน'},
      {icon:'💬',title:'Feedback Loot',value:reviews7d,detail:'student reviews ใน 7 วัน'}
    ],
    infrastructure,buildings,
    operations:{open:openOps,blocked:blockedOps,stale:staleOps,closed7d:liveOps7d,created7d:createdOps7d,recent:latestOps.map(operationPacket)},
    houseLinks:[{id:'teambook',name:'TeamBook',url:'https://teambook.me/command/',relationship:'separate-server'}]
  };
}

export default async function handler(req,res){
  if(!sameOrigin(req))return sendJson(res,{ok:false,error:'BAD_ORIGIN'},403);
  if(!['GET','POST'].includes(req.method))return sendJson(res,{ok:false,error:'METHOD_NOT_ALLOWED'},405);
  let sql;
  try{sql=database();await ensureBackofficeSchema(sql);await ensureCommandSchema(sql);}catch(error){console.error('Command database init failed',error);return sendJson(res,{ok:false,error:error?.code||'COMMAND_STORAGE_UNAVAILABLE'},503)}
  const adminSession=await currentBackofficeSession(sql,req);
  if(!adminSession)return sendJson(res,{ok:false,error:'BACKOFFICE_AUTH_REQUIRED'},401);
  if(req.method==='GET'){
    try{return sendJson(res,{ok:true,...(await getBrief(sql))})}catch(error){console.error('Command brief failed',error);return sendJson(res,{ok:false,error:'COMMAND_BRIEF_FAILED'},500)}
  }
  const body=bodyOf(req);const action=clean(body.action,24)||'create';
  if(action==='create'){
    const selectedMode=clean(body.mode,16).toUpperCase(),project=clean(body.project,120),goal=clean(body.goal,1200),nextAction=clean(body.nextAction,600),owner=clean(body.owner,120),source=clean(body.source,500),output=clean(body.output,600),successCheck=clean(body.successCheck,600),guardrails=clean(body.guardrails,1200);
    if(!MODES.has(selectedMode))return sendJson(res,{ok:false,error:'BAD_MODE'},400);if(!project||!goal)return sendJson(res,{ok:false,error:'PROJECT_AND_GOAL_REQUIRED'},400);
    const now=new Date(),id=`OP-${now.toISOString().slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8).toUpperCase()}`;
    try{const rows=await sql.query(`INSERT INTO mc_command_operations (id,user_id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at) VALUES ($1,'BACKOFFICE',$2,$3,$4,$5,$6,$7,$8,$9,$10,'QUEUED','ACTION',$11,$11,$11) RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,[id,selectedMode,project,goal,nextAction,owner,source,output,successCheck,guardrails,now]);await recordBackofficeAudit(sql,req,'OPERATION_CREATE',{id,mode:selectedMode,project});return sendJson(res,{ok:true,operation:operationPacket(rows[0])},201)}catch(error){console.error('Command operation create failed',error);return sendJson(res,{ok:false,error:'COMMAND_CREATE_FAILED'},500)}
  }
  if(action==='flow'){
    const id=clean(body.id,80),flow=clean(body.flow,24).toUpperCase(),status=FLOWS[flow];if(!id||!status)return sendJson(res,{ok:false,error:'BAD_FLOW_UPDATE'},400);
    try{const now=new Date(),rows=await sql.query(`UPDATE mc_command_operations SET status=$1,chain_state=$2,chain_updated_at=$3,updated_at=$3 WHERE id=$4 RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,[status,flow,now,id]);if(!rows[0])return sendJson(res,{ok:false,error:'OPERATION_NOT_FOUND'},404);await recordBackofficeAudit(sql,req,'OPERATION_FLOW',{id,flow,status});return sendJson(res,{ok:true,operation:operationPacket(rows[0])})}catch(error){console.error('Command flow update failed',error);return sendJson(res,{ok:false,error:'COMMAND_FLOW_FAILED'},500)}
  }
  if(action==='delete'){
    const id=clean(body.id,80);if(!id)return sendJson(res,{ok:false,error:'OPERATION_ID_REQUIRED'},400);
    try{const rows=await sql.query(`DELETE FROM mc_command_operations WHERE id=$1 RETURNING id,mode,project,goal,status,chain_state,created_at,updated_at`,[id]);if(!rows[0])return sendJson(res,{ok:false,error:'OPERATION_NOT_FOUND'},404);await recordBackofficeAudit(sql,req,'OPERATION_DELETE',rows[0]);return sendJson(res,{ok:true,deleted:rows[0]})}catch(error){console.error('Command delete failed',error);return sendJson(res,{ok:false,error:'COMMAND_DELETE_FAILED'},500)}
  }
  if(action==='status'){
    const id=clean(body.id,80),status=clean(body.status,24).toUpperCase();if(!id||!STATUSES.has(status))return sendJson(res,{ok:false,error:'BAD_STATUS_UPDATE'},400);const chainState=status==='LIVE'?'CLOSE_CHAIN':status==='REVIEW'?'PASS':status==='BLOCKED'?'BLOCK':'ACTION';
    try{const now=new Date(),rows=await sql.query(`UPDATE mc_command_operations SET status=$1,chain_state=$2,chain_updated_at=$3,updated_at=$3 WHERE id=$4 RETURNING id,mode,project,goal,next_action,owner,source,output,success_check,guardrails,status,chain_state,chain_updated_at,created_at,updated_at`,[status,chainState,now,id]);if(!rows[0])return sendJson(res,{ok:false,error:'OPERATION_NOT_FOUND'},404);return sendJson(res,{ok:true,operation:operationPacket(rows[0])})}catch(error){console.error('Command status failed',error);return sendJson(res,{ok:false,error:'COMMAND_STATUS_FAILED'},500)}
  }
  return sendJson(res,{ok:false,error:'UNKNOWN_ACTION'},400);
}
