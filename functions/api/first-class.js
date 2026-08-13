const AI_OPTIONS = new Set(['ChatGPT', 'Claude', 'Gemini', 'NotebookLM', 'อื่น ๆ', 'ยังไม่ค่อยได้ใช้ AI']);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (value, max = 120) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '';

async function schema(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS first_class_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,reference TEXT UNIQUE NOT NULL,course_id TEXT NOT NULL,
    display_name TEXT NOT NULL,email TEXT NOT NULL,discord_username TEXT NOT NULL,ai_tools TEXT NOT NULL,
    transfer_time TEXT NOT NULL,line_id TEXT,payment_status TEXT NOT NULL DEFAULT 'submitted',
    first_class_status TEXT NOT NULL DEFAULT 'pending',attended INTEGER NOT NULL DEFAULT 0,
    payment_note TEXT,paid_at TEXT,first_class_granted_at TEXT,confirmation_email_status TEXT NOT NULL DEFAULT 'pending',
    discord_role_status TEXT NOT NULL DEFAULT 'pending',consent_version TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
  )`).run();
  await db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_first_class_course_email ON first_class_registrations(course_id,email)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_first_class_status_created ON first_class_registrations(payment_status,created_at)').run();
}
function safeEqual(a, b) { const x=String(a||''),y=String(b||''); if(x.length!==y.length)return false;let d=0;for(let i=0;i<x.length;i++)d|=x.charCodeAt(i)^y.charCodeAt(i);return d===0; }
function emailDraft(row) {
  const subject='🏅 First Class Unlocked — AI ใส่ซอส';
  const body=`สวัสดีครับ ${row.display_name}\n\nยืนยันยอด 98 บาทเรียบร้อยแล้ว — คุณได้รับ TITLE “🏅 First Class” สำหรับคอร์ส AI ใส่ซอส 🍀\n\nDiscord: https://discord.gg/A5nmMqvTm\nคอร์สฟรี: https://www.myclover.com/classroom/\n\nวันอังคารที่ 18 สิงหาคม 2026\n19:00 น. ห้องเปิด\n19:30 น. เริ่มเรียนตรงเวลา\n\nคอร์สนี้สอนสดและไม่มีวิดีโอย้อนหลังครับ\n\nTeem`;
  return {subject,body,mailto:`mailto:${encodeURIComponent(row.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`};
}

async function grantDiscordRole(row,env){
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
async function unlockFirstClass(db,id,env){
  const row=await db.prepare('SELECT * FROM first_class_registrations WHERE id=?1').bind(id).first();if(!row)return null;
  const [discord,emailStatus]=await Promise.all([grantDiscordRole(row,env),sendConfirmationEmail(row,env)]),now=new Date().toISOString();
  await db.prepare("UPDATE first_class_registrations SET payment_status='paid',first_class_status='granted',paid_at=COALESCE(paid_at,?1),first_class_granted_at=COALESCE(first_class_granted_at,?1),confirmation_email_status=?2,discord_role_status=?3,updated_at=?1 WHERE id=?4").bind(now,emailStatus,discord.status,id).run();
  return {discord,emailStatus};
}

export async function onRequest({request,env}) {
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
    const name=clean(data.name,80),email=clean(data.email,120).toLowerCase(),discord=clean(data.discordUsername,80),transfer=clean(data.transferTime,5),line=clean(data.lineId,50);
    const ai=Array.isArray(data.aiTools)?[...new Set(data.aiTools.map(x=>clean(x,40)).filter(x=>AI_OPTIONS.has(x)))].slice(0,6):[];
    if(!name)return json({ok:false,field:'name',message:'ยังไม่ได้ใส่ชื่อ'},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return json({ok:false,field:'email',message:'อีเมลไม่ถูกรูปแบบ'},400);
    if(!discord)return json({ok:false,field:'discordUsername',message:'ยังไม่ได้ใส่ Discord Username'},400);
    if(!ai.length)return json({ok:false,field:'aiTools',message:'เลือก AI อย่างน้อย 1 ข้อ'},400);
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(transfer))return json({ok:false,field:'transferTime',message:'เวลาโอนไม่ถูกรูปแบบ'},400);
    if(data.consent!==true)return json({ok:false,field:'consent',message:'ต้องยอมรับเงื่อนไขก่อน'},400);
    const now=new Date().toISOString(),ref=`FC-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    await env.DB.prepare(`INSERT INTO first_class_registrations(reference,course_id,display_name,email,discord_username,ai_tools,transfer_time,line_id,consent_version,created_at,updated_at)
      VALUES(?1,'ai-sauce-pilot-2026-08-18',?2,?3,?4,?5,?6,?7,'2026-08-first-class-v2',?8,?8)
      ON CONFLICT(course_id,email) DO UPDATE SET display_name=?2,discord_username=?4,ai_tools=?5,transfer_time=?6,line_id=?7,updated_at=?8`)
      .bind(ref,name,email,discord,JSON.stringify(ai),transfer,line||null,now).run();
    const saved=await env.DB.prepare("SELECT reference FROM first_class_registrations WHERE course_id='ai-sauce-pilot-2026-08-18' AND email=?1").bind(email).first();
    return json({ok:true,reference:saved.reference},201);
  }
  const key=request.headers.get('x-admin-key');if(!env.FIRST_CLASS_ADMIN_KEY||!safeEqual(key,env.FIRST_CLASS_ADMIN_KEY))return json({ok:false,message:'ไม่มีสิทธิ์เข้าถึง'},401);
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
    else return json({ok:false,message:'คำสั่งไม่ถูกต้อง'},400);
    return json({ok:true,automation});
  }
  return json({ok:false,message:'Method not allowed'},405);
}
