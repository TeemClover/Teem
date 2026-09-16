import { database,ensureSchema,authRateLimited } from './core.js';
import { adminAccess,sameOrigin,UUID } from './ai-source-domain.js';
export const EVENTS=['page_view','section_offer','section_package','section_bonus','section_reviews','scroll_25','scroll_50','scroll_75','scroll_100','engaged_30','engaged_60','engaged_120','purchase_click','payment_ready','qr_view','copy_bank','identity_start','receipt_start','receipt_submitted','receipt_error','payment_error','line_click','checkout_started'];
const CAMPAIGN=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','referrer_host'];
const ready=new WeakMap();
export async function ensureSalesBehavior(sql){
  if(!ready.has(sql))ready.set(sql,(async()=>{
    await sql.query(`CREATE TABLE IF NOT EXISTS mc_sales_events(id UUID PRIMARY KEY,visitor_id UUID NOT NULL,session_id UUID,event TEXT NOT NULL,occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),campaign JSONB NOT NULL DEFAULT '{}'::jsonb,device TEXT NOT NULL DEFAULT '',checkout_id UUID)`);
    await sql.query('CREATE INDEX IF NOT EXISTS mc_sales_events_time ON mc_sales_events(occurred_at,event)');
    await sql.query('CREATE INDEX IF NOT EXISTS mc_sales_events_visitor ON mc_sales_events(visitor_id,occurred_at)');
  })().catch(e=>{ready.delete(sql);throw e;}));return ready.get(sql);
}
export function validateBehavior(data){
  if(!data||!UUID.test(data.visitor)||!UUID.test(data.session)||!Array.isArray(data.events)||data.events.length<1||data.events.length>20)throw Error('invalid');
  const campaign={};for(const k of CAMPAIGN){const v=data.campaign?.[k];if(typeof v==='string')campaign[k]=v.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,160);}
  const events=data.events.map(e=>{if(!UUID.test(e.id)||!EVENTS.includes(e.name)||e.name==='checkout_started')throw Error('invalid');return {id:e.id,name:e.name};});
  return {visitor:data.visitor,session:data.session,events,campaign,device:['mobile','tablet','desktop'].includes(data.device)?data.device:''};
}
export async function recordSalesCheckout(sql,req,checkout){
  const visitor=String(req.headers?.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('mc_sauce_visitor='))?.split('=')[1];
  if(!UUID.test(visitor||''))return;
  await ensureSalesBehavior(sql);
  await sql.query(`INSERT INTO mc_sales_events(id,visitor_id,event,checkout_id) VALUES($1,$2,'checkout_started',$3) ON CONFLICT(id) DO NOTHING`,[checkout,visitor,checkout]);
}
export function createSalesBehaviorHandler({getSql=database,config=process.env}={}){return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  const reply=(body,status=200)=>{res.statusCode=status;res.end(JSON.stringify(body));};
  try{
    if(req.method==='GET'){
      if(!adminAccess(req,config))return reply({ok:false},401);
      const sql=getSql();await ensureSalesBehavior(sql);
      await sql.query("DELETE FROM mc_sales_events WHERE occurred_at<NOW()-INTERVAL '90 days'");
      const events=await sql.query(`SELECT event,COUNT(*)::int AS events,COUNT(DISTINCT visitor_id)::int AS visitors FROM mc_sales_events WHERE occurred_at>=NOW()-INTERVAL '30 days' GROUP BY event`);
      const campaigns=await sql.query(`WITH visits AS (SELECT DISTINCT ON(visitor_id) visitor_id,campaign FROM mc_sales_events WHERE event='page_view' AND occurred_at>=NOW()-INTERVAL '30 days' ORDER BY visitor_id,occurred_at), steps AS(SELECT visitor_id,BOOL_OR(event='qr_view') qr,BOOL_OR(event='purchase_click') clicked FROM mc_sales_events WHERE occurred_at>=NOW()-INTERVAL '30 days' GROUP BY visitor_id), paid AS(SELECT e.visitor_id,BOOL_OR(r.status IN('pending_verification','payment_verified','admitted')) submitted,BOOL_OR(r.status IN('payment_verified','admitted')) paid FROM mc_sales_events e JOIN mc_ai_source_registrations r ON r.checkout_id=e.checkout_id WHERE e.event='checkout_started' GROUP BY e.visitor_id) SELECT v.campaign,COUNT(*)::int AS visitors,COUNT(*) FILTER(WHERE s.clicked)::int AS clicked,COUNT(*) FILTER(WHERE s.qr)::int AS qr,COUNT(*) FILTER(WHERE p.submitted)::int AS submitted,COUNT(*) FILTER(WHERE p.paid)::int AS paid FROM visits v LEFT JOIN steps s USING(visitor_id) LEFT JOIN paid p USING(visitor_id) GROUP BY v.campaign ORDER BY COUNT(*) DESC LIMIT 200`);
      return reply({ok:true,days:30,events,campaigns,note:'ผู้เข้าชมประมาณจากเบราว์เซอร์ ไม่ใช่จำนวนคนแน่นอน · แหล่งที่มาครั้งแรกใน 30 วัน · ยอดชำระนับเฉพาะที่ผู้ดูแลตรวจแล้ว · ไม่รวมผู้ปิดการติดตาม'});
    }
    if(req.method!=='POST')return reply({ok:false},405);
    if(!req.headers?.origin||!sameOrigin(req))return reply({ok:false},403);
    if(!/^application\/json/i.test(req.headers['content-type']||''))return reply({ok:false},415);
    let raw=req.body;
    if(raw==null){let size=0;const chunks=[];for await(const c of req){size+=Buffer.byteLength(c);if(size>12000)return reply({ok:false},413);chunks.push(Buffer.from(c));}raw=Buffer.concat(chunks).toString();}
    if(Buffer.isBuffer(raw))raw=raw.toString();
    if(typeof raw==='string'){if(Buffer.byteLength(raw)>12000)return reply({ok:false},413);raw=JSON.parse(raw);}
    if(Buffer.byteLength(JSON.stringify(raw))>12000)return reply({ok:false},413);
    let data;try{data=validateBehavior(raw);}catch{return reply({ok:false},400);}
    const sql=getSql();await ensureSchema(sql);if(await authRateLimited(sql,req,'sales-behavior','',240,60))return reply({ok:false},429);
    await ensureSalesBehavior(sql);
    await sql.query(`WITH expired AS (DELETE FROM mc_sales_events WHERE occurred_at<NOW()-INTERVAL '90 days') INSERT INTO mc_sales_events(id,visitor_id,session_id,event,campaign,device) SELECT x.id,$1,$2,x.name,$3::jsonb,$4 FROM jsonb_to_recordset($5::jsonb) AS x(id UUID,name TEXT) ON CONFLICT(id) DO NOTHING`,[data.visitor,data.session,JSON.stringify(data.campaign),data.device,JSON.stringify(data.events)]);
    return reply({ok:true});
  }catch{return reply({ok:false},503);}
};}
