import {SCHEDULED_NOTIFICATIONS_ENABLED} from '../scheduled-notifications.js';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {blankState,validateState,todayBangkok,reminders} from '../../../eggcycle/cycle.js';
const COOKIE='eggcycle_session',TTL=30*86400;
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const equal=(a,b)=>timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
export const passwordFor=env=>env.EGGCYCLE_ADMIN_KEY||env.BACKOFFICE_ADMIN_KEY||env.MEDIRAL_ADMIN_KEY||env.MEET_ADMIN_KEY||'';
function sign(value,secret){return createHmac('sha256',secret).update(`eggcycle:${value}`).digest('base64url');}
function cookie(req){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export function authenticated(req,secret,now){
  if(!secret)return false;
  const [expires,nonce,signature,...rest]=cookie(req).split('.');
  return !rest.length&&/^\d+$/.test(expires||'')&&Number(expires)>now&&Number(expires)<=now+TTL*1000&&Boolean(nonce&&signature)&&equal(signature,sign(`${expires}.${nonce}`,secret));
}
function setCookie(res,value,maxAge=TTL,secure=true){res.setHeader('Set-Cookie',`${COOKIE}=${value}; Path=/api/eggcycle; HttpOnly; ${secure?'Secure; ':''}SameSite=Strict; Max-Age=${maxAge}`);}
export function telegramConfig(env){return {token:env.EGGCYCLE_TELEGRAM_BOT_TOKEN||env.TELEGRAM_BOT_TOKEN,chat:env.EGGCYCLE_TELEGRAM_CHAT_ID||env.TELEGRAM_CHAT_ID,url:env.EGGCYCLE_APP_URL||'https://www.myclover.com/eggcycle/'};}
export async function sendTelegram(env,text,fetchImpl=fetch){
  const c=telegramConfig(env);
  if(!c.token||!c.chat)throw Object.assign(new Error('ยังไม่ได้ตั้งค่า Telegram ในระบบ'),{status:503});
  if(!/^https:\/\//.test(c.url))throw Object.assign(new Error('ลิงก์แอพต้องเป็น HTTPS'),{status:503});
  try{
    const r=await fetchImpl(`https://api.telegram.org/bot${c.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c.chat,text,protect_content:true,link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'เปิดปฏิทิน Eggcycle',url:c.url}]]}}),signal:AbortSignal.timeout(12000)});
    if(!r.ok||!(await r.json()).ok)throw new Error('rejected');
  }catch{throw Object.assign(new Error('ส่ง Telegram ไม่สำเร็จ ตรวจบอตและห้องปลายทางแล้วลองใหม่'),{status:502});}
}
export function createHandler({store,env=process.env,clock=()=>new Date(),fetchImpl=fetch,secure=true}){
  return async(req,res)=>{
    const json=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
    for(const [k,v] of Object.entries({'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}))res.setHeader(k,v);
    try{
      const u=new URL(req.url,'https://eggcycle.invalid'),action=u.searchParams.get('action')||'state',now=clock(),ms=now.getTime();
      if(action==='cron'){
        if(req.method!=='GET')return json({error:'METHOD_NOT_ALLOWED'},405);
        if(!env.CRON_SECRET)return json({error:'CRON_NOT_CONFIGURED'},503);
        if(!equal(req.headers.authorization||'',`Bearer ${env.CRON_SECRET}`))return json({error:'UNAUTHORIZED'},401);
        if(!SCHEDULED_NOTIFICATIONS_ENABLED)return json({ok:true,skipped:'scheduled_notifications_disabled',sent:0});
        // Previews must never send health reminders to the production recipient.
        if(env.VERCEL_ENV&&env.VERCEL_ENV!=='production')return json({ok:true,skipped:'preview'});
        const state=await store.load();
        const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',hourCycle:'h23'}).format(now));
        if(!state.notifications.enabled||hour<state.notifications.hour)return json({ok:true,sent:0});
        let sent=0,failed=0;
        for(const item of reminders(state,todayBangkok(now))){
          const lease=await store.claim(item.key,ms);if(!lease)continue;
          let success=false;
          try{await sendTelegram(env,state.notifications.detail?`🌷 Eggcycle\n${item.text}\nวันที่จากปฏิทินอาจคลาดเคลื่อน หากยังไม่พร้อมตั้งครรภ์ควรป้องกันทุกครั้ง`:'🌷 Eggcycle มีเรื่องเตือนวันนี้\nแตะเปิดปฏิทินเพื่อดูรายละเอียดส่วนตัว',fetchImpl);success=true;sent++;}catch{failed++;}
          await store.finish(item.key,lease,success);
        }
        return json({ok:!failed,sent,failed},failed?502:200);
      }
      if(!['GET','POST'].includes(req.method))return json({error:'METHOD_NOT_ALLOWED'},405);
      if(req.method==='POST'){
        const origin=req.headers.origin,host=req.headers['x-forwarded-host']||req.headers.host;
        const proto=req.headers['x-forwarded-proto']||(secure?'https':'http');
        if((origin&&origin!==`${proto}://${host}`)||req.headers['sec-fetch-site']==='cross-site')return json({error:'BAD_ORIGIN'},403);
        if(!String(req.headers['content-type']||'').startsWith('application/json'))return json({error:'JSON_REQUIRED'},415);
      }
      const secret=passwordFor(env);
      if(!secret)return json({error:'ยังไม่ได้ตั้งรหัส admin ใน env'},503);
      const authed=authenticated(req,secret,ms);
      if(action==='session'&&req.method==='GET')return json({authenticated:authed});
      const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
      if(action==='login'&&req.method==='POST'){
        const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
        if(await store.limited('login:'+hash(ip),ms))return json({error:'ลองหลายครั้งเกินไป กรุณารอ 15 นาที'},429);
        if(typeof body.password!=='string'||!equal(body.password,secret))return json({error:'รหัสผ่านไม่ถูกต้อง'},401);
        const value=`${ms+TTL*1000}.${randomBytes(24).toString('base64url')}`;
        setCookie(res,`${value}.${sign(value,secret)}`,TTL,secure);return json({ok:true});
      }
      if(!authed)return json({error:'กรุณาเข้าสู่ระบบ'},401);
      if(action==='logout'&&req.method==='POST'){setCookie(res,'',0,secure);return json({ok:true});}
      if(action==='state'&&req.method==='GET')return json({state:await store.load(),telegramConfigured:Boolean(telegramConfig(env).token&&telegramConfig(env).chat),notificationsScheduled:SCHEDULED_NOTIFICATIONS_ENABLED,delivery:await store.status(),today:todayBangkok(now)});
      if(action==='save'&&req.method==='POST')return json({state:await store.save(validateState(body,todayBangkok(now)))});
      if(action==='test'&&req.method==='POST'){
        if(!SCHEDULED_NOTIFICATIONS_ENABLED)return json({error:'พักการส่งแจ้งเตือนเพื่อประหยัดทรัพยากร'},409);
        if(env.VERCEL_ENV&&env.VERCEL_ENV!=='production')return json({error:'ทดสอบส่งได้เฉพาะระบบจริง เพื่อป้องกันข้อความจาก preview'},409);
        if(await store.limited('test',ms,3,60000))return json({error:'กรุณารอ 1 นาทีก่อนทดสอบอีกครั้ง'},429);
        await sendTelegram(env,'🌷 Eggcycle เชื่อมต่อแล้ว\nแตะปุ่มด้านล่างเพื่อเปิดปฏิทินส่วนตัว',fetchImpl);return json({ok:true});
      }
      return json({error:'NOT_FOUND'},404);
    }catch(e){return json({error:e.status?e.message:'ระบบบันทึกยังไม่พร้อม กรุณาลองใหม่'},e.status||503);}
  };
}
