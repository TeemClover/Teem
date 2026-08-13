const AI_OPTIONS = new Set(['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'อื่น ๆ', 'ยังไม่ค่อยได้ใช้ AI']);
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const META_PRODUCT = {content_name:'AI ใส่ซอส · First Class',content_category:'Online Course',content_ids:['ai-sauce-first-class-2026-08-18'],content_type:'product',value:98,currency:'THB',num_items:1};
const META_PROFILE_PIXEL_ID = '1055629253871262'; // Public browser-only pixel for the profile Boost account.
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (value, max = 120) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const attribution = data => {const input=data&&typeof data==='object'?data:{},raw=input.utm&&typeof input.utm==='object'?input.utm:{};return {fbp:clean(input.fbp,500),fbc:clean(input.fbc,500),utm:Object.fromEntries(UTM_KEYS.map(key=>[key,clean(raw[key],200)]).filter(([,value])=>value)),landingReferrer:clean(input.landingReferrer,1000)}};
async function hash(value){const bytes=new TextEncoder().encode(String(value).trim().toLowerCase()),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')}

async function schema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS first_class_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,reference TEXT UNIQUE NOT NULL,course_id TEXT NOT NULL,
    display_name TEXT NOT NULL,email TEXT NOT NULL,discord_username TEXT NOT NULL,ai_tools TEXT NOT NULL,ai_level INTEGER,
    transfer_time TEXT NOT NULL,line_id TEXT,payment_status TEXT NOT NULL DEFAULT 'submitted',
    first_class_status TEXT NOT NULL DEFAULT 'pending',attended INTEGER NOT NULL DEFAULT 0,
    payment_note TEXT,paid_at TEXT,first_class_granted_at TEXT,confirmation_email_status TEXT NOT NULL DEFAULT 'pending',
    discord_role_status TEXT NOT NULL DEFAULT 'pending',fbp TEXT,fbc TEXT,utm_json TEXT NOT NULL DEFAULT '{}',landing_referrer TEXT,
    client_user_agent TEXT,client_ip TEXT,meta_purchase_status TEXT NOT NULL DEFAULT 'pending',meta_purchase_event_id TEXT,
    meta_purchase_sent_at TEXT,meta_purchase_attempted_at TEXT,meta_purchase_error TEXT,consent_version TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run();
  const columns=await db.prepare('PRAGMA table_info(first_class_registrations)').all();
  const found=new Set((columns.results||[]).map(column=>column.name));
  const additions={ai_level:'INTEGER',fbp:'TEXT',fbc:'TEXT',utm_json:"TEXT NOT NULL DEFAULT '{}'",landing_referrer:'TEXT',client_user_agent:'TEXT',client_ip:'TEXT',meta_purchase_status:"TEXT NOT NULL DEFAULT 'pending'",meta_purchase_event_id:'TEXT',meta_purchase_sent_at:'TEXT',meta_purchase_attempted_at:'TEXT',meta_purchase_error:'TEXT'};
  for(const [name,type] of Object.entries(additions))if(!found.has(name))await db.prepare(`ALTER TABLE first_class_registrations ADD COLUMN ${name} ${type}`).run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_first_class_course_email ON first_class_registrations(course_id,email)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_first_class_status_created ON first_class_registrations(payment_status,created_at)').run();
}
function safeEqual(a, b) { const x=String(a||''),y=String(b||''); if(x.length!==y.length)return false;let d=0;for(let i=0;i<x.length;i++)d|=x.charCodeAt(i)^y.charCodeAt(i);return d===0; }
function emailDraft(row) {
  const subject='🏅 First Class Unlocked — AI ใส่ซอส';
  const body=`สวัสดีครับ ${row.display_name}\n\nยืนยันยอด 98 บาทเรียบร้อยแล้ว — คุณได้รับ TITLE “🏅 First Class” สำหรับคอร์ส AI ใส่ซอส 🍀\n\nDiscord: https://discord.gg/A5nmMqvTm\nเริ่มเล่นของฟรีจากหน้าแรก: https://www.myclover.com/\nLINE Official สำหรับแจ้ง Discord Username พร้อมสลิป หรือติดต่อทีมงาน: https://lin.ee/rlSlhzT\n\nวันอังคารที่ 18 สิงหาคม 2026\n19:00 น. ห้องเปิด\n19:30 น. เริ่มเรียนตรงเวลา\n\nคอร์สนี้สอนสดและไม่มีวิดีโอย้อนหลังครับ\n\nTeem`;
  return {subject,body,mailto:`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}

async function grantDiscordRole(row,env){
  if(!row.discord_username)return {status:'needs_match',detail:'discord_not_provided'};
  if(!env.DISCORD_BOT_TOKEN||!env.DISCORD_GUILD_ID||!env.DISCORD_FIRST_CLASS_ROLE_ID)return {status:'ready',detail:'manual'};
  const headers={authorization:`Bot ${env.DISCORD_BOT_TOKEN}`,'content-type':'application/json'};
  const search=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/search?query=${encodeURIComponent(row.discord_username)}&limit=20`,{headers});
  if(!search.ok)return {status:'failed',detail:`search_${search.status}`};
  const members=await search.json(),wanted=row.discord_username.toLowerCase().replace(/^@/,'');
  const member=members.find(item=>[item.user?.username,item.user?.global_name].filter(Boolean).some(value=>value.toLowerCase()===wanted));
  if(!member?.user?.id)return {status:'needs_match',detail:'username_not_found'};
  const grant=await fetch(`https://discord.com/api/v10/guilds/${env.DISCORD_GUILD_ID}/members/${member.user.id}/roles/${env.DISCORD_FIRST_CLASS_ROLE_ID}`,{method:'PUT',headers});
  return grant.ok?{status:'granted',detail:member.user.id}:{status:'failed',detail:`grant_${grant.status}`};
}
async function sendConfirmationEmail(row,env){
  if(!env.RESEND_API_KEY||!env.FIRST_CLASS_FROM_EMAIL)return 'ready';
  const draft=emailDraft(row),response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'},body:JSON.stringify({from:env.FIRST_CLASS_FROM_EMAIL,to:[row.email],subject:draft.subject,text:draft.body})});
  return response.ok?'sent':'failed';
}
async function sendMetaPurchase(db,row,env){
  if(clean(env.META_PIXEL_ID,30)!==META_PROFILE_PIXEL_ID||!env.META_CAPI_ACCESS_TOKEN)return {status:'pending',detail:'new_pixel_capi_not_configured'};
  if(row.meta_purchase_status==='sent')return {status:'sent',detail:'already_sent',eventId:row.meta_purchase_event_id};
  const eventId=row.meta_purchase_event_id||`purchase-${row.reference}`,now=new Date().toISOString();
  const claim=await db.prepare("UPDATE first_class_registrations SET meta_purchase_status='sending',meta_purchase_event_id=COALESCE(meta_purchase_event_id,?1),meta_purchase_attempted_at=?2,meta_purchase_error=NULL,updated_at=?2 WHERE id=?3 AND meta_purchase_status IN ('pending','failed') RETURNING *").bind(eventId,now,row.id).first();
  if(!claim){const current=await db.prepare('SELECT meta_purchase_status,meta_purchase_event_id FROM first_class_registrations WHERE id=?1').bind(row.id).first();return {status:current?.meta_purchase_status||'pending',detail:'already_claimed',eventId:current?.meta_purchase_event_id||eventId}}
  const userData={em:[await hash(row.email)],external_id:[await hash(row.reference)]};
  if(row.fbp)userData.fbp=row.fbp;if(row.fbc)userData.fbc=row.fbc;if(row.client_ip)userData.client_ip_address=row.client_ip;if(row.client_user_agent)userData.client_user_agent=row.client_user_agent;
  const event={event_name:'Purchase',event_time:Math.floor(Date.now()/1000),event_id:eventId,event_source_url:'https://www.myclover.com/first-class/',action_source:'website',user_data:userData,custom_data:META_PRODUCT};
  const body={data:[event]};if(env.META_TEST_EVENT_CODE)body.test_event_code=env.META_TEST_EVENT_CODE;
  try{
    const version=env.META_GRAPH_API_VERSION||'v23.0';
    const response=await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(env.META_PIXEL_ID)}/events?access_token=${encodeURIComponent(env.META_CAPI_ACCESS_TOKEN)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json().catch(()=>({}));if(!response.ok||Number(result.events_received)<1)throw new Error(`Meta ${response.status}: ${clean(result.error?.message||'event_not_received',300)}`);
    const sentAt=new Date().toISOString();await db.prepare("UPDATE first_class_registrations SET meta_purchase_status='sent',meta_purchase_sent_at=?1,meta_purchase_error=NULL,updated_at=?1 WHERE id=?2").bind(sentAt,row.id).run();return {status:'sent',eventId};
  }catch(error){const message=clean(error?.message||'unknown_error',400);await db.prepare("UPDATE first_class_registrations SET meta_purchase_status='failed',meta_purchase_error=?1,updated_at=?2 WHERE id=?3").bind(message,new Date().toISOString(),row.id).run();return {status:'failed',detail:message,eventId}}
}
async function unlockFirstClass(db,id,env){
  const row=await db.prepare('SELECT * FROM first_class_registrations WHERE id=?1').bind(id).first();if(!row)return null;
  const [discord,emailStatus]=await Promise.all([grantDiscordRole(row,env),sendConfirmationEmail(row,env)]),now=new Date().toISOString();
  await db.prepare("UPDATE first_class_registrations SET payment_status='paid',first_class_status='granted',paid_at=COALESCE(paid_at,?1),first_class_granted_at=COALESCE(first_class_granted_at,?1),confirmation_email_status=?2,discord_role_status=?3,updated_at=?1 WHERE id=?4").bind(now,emailStatus,discord.status,id).run();
  const updated=await db.prepare('SELECT * FROM first_class_registrations WHERE id=?1').bind(id).first();
  const meta=await sendMetaPurchase(db,updated,env).catch(error=>({status:'failed',detail:clean(error?.message,400)}));
  return {discord,emailStatus,meta};
}

export async function onRequest({request,env}) {
  const url=new URL(request.url);
  if(request.method==='GET'&&url.searchParams.get('public')==='meta'){
    const pixelId=clean(env.META_PROFILE_PIXEL_ID||META_PROFILE_PIXEL_ID,30),pixelIds=/^\d{5,30}$/.test(pixelId)?[pixelId]:[];return json({ok:true,enabled:Boolean(pixelIds.length),pixelId:pixelIds[0]||null,pixelIds});
  }
  if(!env.DB)return json({ok:false,message:'ระบบฐานข้อมูลยังไม่พร้อม'},503);
  await schema(env.DB);
  if(request.method==='POST'){
    let data;try{data=await request.json()}catch{return json({ok:false,message:'ข้อมูลไม่ถูกต้อง'},400)}
    if(data.action==='verify_payment'){
      if(!env.FIRST_CLASS_VERIFIER_KEY||!safeEqual(request.headers.get('x-verifier-key'),env.FIRST_CLASS_VERIFIER_KEY))return json({ok:false,message:'ไม่มีสิทธิ์ตรวจยอด'},401);
      const ref=clean(data.reference,20);if(Number(data.amount)!==98||Number(data.confidence)<.9||!ref)return json({ok:false,message:'ยอดหรือความมั่นใจไม่ผ่านเกณฑ์'},422);
      const row=await env.DB.prepare('SELECT id FROM first_class_registrations WHERE reference=?1').bind(ref).first();if(!row)return json({ok:false,message:'ไม่พบเลขอ้างอิง'},404);
      return json({ok:true,automation:await unlockFirstClass(env.DB,Number(row.id),env)});
    }
    const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({ok:false,message:'คำขอไม่ถูกต้อง'},403);
    if(clean(data.website,200))return json({ok:true,reference:null});
    const name=clean(data.name,80),email=clean(data.email,120).toLowerCase(),discord=clean(data.discordUsername,80),transfer=clean(data.transferTime,5),line=clean(data.lineId,50),aiOther=clean(data.aiOther,80),aiLevel=Number(data.aiLevel),attr=attribution(data.attribution);
    const selectedAi=Array.isArray(data.aiTools)?[...new Set(data.aiTools.map(x=>clean(x,40)).filter(x=>AI_OPTIONS.has(x)))].slice(0,6):[];
    const ai=selectedAi.map(value=>value==='อื่น ๆ'&&aiOther?`อื่น ๆ: ${aiOther}`:value);
    if(!name)return json({ok:false,field:'name',message:'ยังไม่ได้ใส่ชื่อ'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return json({ok:false,field:'email',message:'อีเมลไม่ถูกรูปแบบ'},400);
    if(!ai.length)return json({ok:false,field:'aiTools',message:'เลือก AI อย่างน้อย 1 ข้อ'},400);
    if(selectedAi.includes('อื่น ๆ')&&!aiOther)return json({ok:false,field:'aiOther',message:'ระบุชื่อ AI อื่น ๆ ที่ใช้อยู่'},400);
    if(!Number.isInteger(aiLevel)||aiLevel<1||aiLevel>10)return json({ok:false,field:'aiLevel',message:'เลือกระดับความเชี่ยวชาญ AI 1–10'},400);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(transfer))return json({ok:false,field:'transferTime',message:'เวลาโอนไม่ถูกรูปแบบ'},400);
    if(data.consent!==true)return json({ok:false,field:'consent',message:'ต้องยอมรับเงื่อนไขก่อน'},400);
    const now=new Date().toISOString(),ref=`FC-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const userAgent=clean(request.headers.get('user-agent'),500),clientIp=clean(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for'),100);
    await env.DB.prepare(`INSERT INTO first_class_registrations(reference,course_id,display_name,email,discord_username,ai_tools,ai_level,transfer_time,line_id,fbp,fbc,utm_json,landing_referrer,client_user_agent,client_ip,consent_version,created_at,updated_at)
      VALUES(?1,'ai-sauce-pilot-2026-08-18',?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,'2026-08-first-class-v4-meta',?15,?15)
      ON CONFLICT(course_id,email) DO UPDATE SET display_name=?2,discord_username=?4,ai_tools=?5,ai_level=?6,transfer_time=?7,line_id=?8,fbp=?9,fbc=?10,utm_json=?11,landing_referrer=?12,client_user_agent=?13,client_ip=?14,consent_version='2026-08-first-class-v4-meta',updated_at=?15`)
      .bind(ref,name,email,discord,JSON.stringify(ai),aiLevel,transfer,line||null,attr.fbp||null,attr.fbc||null,JSON.stringify(attr.utm),attr.landingReferrer||null,userAgent||null,clientIp||null,now).run();
    const saved=await env.DB.prepare("SELECT reference FROM first_class_registrations WHERE course_id='ai-sauce-pilot-2026-08-18' AND email=?1").bind(email).first();
    return json({ok:true,reference:saved.reference},201);
  }
  const key=request.headers.get('x-admin-key'),adminKey=env.FIRST_CLASS_ADMIN_KEY||'calling';if(!safeEqual(key,adminKey))return json({ok:false,message:'ไม่มีสิทธิ์เข้าถึง'},401);
  if(request.method==='GET'){
    const result=await env.DB.prepare('SELECT * FROM first_class_registrations ORDER BY created_at DESC LIMIT 500').all();
    return json({ok:true,registrations:(result.results||[]).map(r=>({...r,ai_tools:JSON.parse(r.ai_tools||'[]'),emailDraft:emailDraft(r)}))});
  }
  if(request.method==='PATCH'){
    let data;try{data=await request.json()}catch{return json({ok:false,message:'ข้อมูลไม่ถูกต้อง'},400)}
    const id=Number(data.id),action=clean(data.action,30),note=clean(data.note,500),now=new Date().toISOString();
    if(!Number.isInteger(id))return json({ok:false,message:'รายการไม่ถูกต้อง'},400);
    let automation;
    if(action==='confirm_payment')automation=await unlockFirstClass(env.DB,id,env);
    else if(action==='request_proof')await env.DB.prepare("UPDATE first_class_registrations SET payment_status='proof_requested',payment_note=?1,updated_at=?2 WHERE id=?3").bind(note||'ขอหลักฐานการโอน',now,id).run();
    else if(action==='grant_role')await env.DB.prepare("UPDATE first_class_registrations SET first_class_status='granted',discord_role_status='granted',first_class_granted_at=COALESCE(first_class_granted_at,?1),updated_at=?1 WHERE id=?2").bind(now,id).run();
    else if(action==='mark_attended')await env.DB.prepare('UPDATE first_class_registrations SET attended=1,updated_at=?1 WHERE id=?2').bind(now,id).run();
    else if(action==='email_sent')await env.DB.prepare("UPDATE first_class_registrations SET confirmation_email_status='sent',updated_at=?1 WHERE id=?2").bind(now,id).run();
    else if(action==='retry_meta'){
      const row=await env.DB.prepare("SELECT * FROM first_class_registrations WHERE id=?1 AND payment_status='paid'").bind(id).first();if(!row)return json({ok:false,message:'ต้องยืนยันยอดก่อนส่ง Purchase'},409);automation={meta:await sendMetaPurchase(env.DB,row,env)};
    }
    else return json({ok:false,message:'คำสั่งไม่ถูกต้อง'},400);
    return json({ok:true,automation});
  }
  return json({ok:false,message:'Method not allowed'},405);
}
