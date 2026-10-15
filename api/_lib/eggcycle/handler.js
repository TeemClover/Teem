import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {validateState,todayBangkok} from '../../../eggcycle/cycle.js';
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
export function createHandler({store,env=process.env,clock=()=>new Date(),secure=true}){
  return async(req,res)=>{
    const json=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));};
    for(const [k,v] of Object.entries({'Cache-Control':'private, no-store','CDN-Cache-Control':'no-store','Vercel-CDN-Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}))res.setHeader(k,v);
    try{
      const u=new URL(req.url,'https://eggcycle.invalid'),action=u.searchParams.get('action')||'state',now=clock(),ms=now.getTime();
      if(action==='cron'||action==='test')return json({error:'NOT_FOUND'},404);
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
      if(action==='state'&&req.method==='GET')return json({state:await store.load(),today:todayBangkok(now)});
      if(action==='save'&&req.method==='POST')return json({state:await store.save(validateState(body,todayBangkok(now)))});
      return json({error:'NOT_FOUND'},404);
    }catch(e){return json({error:e.status?e.message:'ระบบบันทึกยังไม่พร้อม กรุณาลองใหม่'},e.status||503);}
  };
}
