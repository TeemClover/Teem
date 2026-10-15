const stampSql=`to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const filterSql=`($1='' OR strpos(lower(name),lower($1))>0 OR strpos(lower(message),lower($1))>0)
  AND (NOT $2::boolean OR btrim(message)<>'')`;
const empty=()=>({summary:{total:0,withMessages:0},matching:0,guests:[],nextCursor:null});
const publicGuest=row=>({name:String(row.name),message:String(row.message||''),createdAt:new Date(row.createdAt||row.created_at).toISOString()});
export const encodeCursor=row=>Buffer.from(JSON.stringify({time:row.createdAt||row.created_at,reference:row.reference})).toString('base64url');

function readOptions(url){
  const search=(url.searchParams.get('search')||'').trim();
  const stories=url.searchParams.get('stories')||'0';
  const limit=Number(url.searchParams.get('limit')||30);
  const raw=url.searchParams.get('before');
  if(search.length>100||!['0','1'].includes(stories)||!Number.isInteger(limit)||limit<1||limit>60)throw Error('invalid');
  let before=null;
  if(raw){
    if(raw.length>256||!/^[\w-]+$/.test(raw))throw Error('invalid');
    const cursor=JSON.parse(Buffer.from(raw,'base64url').toString('utf8'));
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(cursor.time)||!Number.isFinite(Date.parse(cursor.time))||!/^CL20-[A-F0-9]{8}$/.test(cursor.reference))throw Error('invalid');
    before={time:cursor.time,reference:cursor.reference};
  }
  return {search,storiesOnly:stories==='1',limit,before};
}

export function guestPage(records,{search='',storiesOnly=false,limit=30,before=null}={}){
  // Used only by the local preview adapter, with the same public response contract.
  const ordered=[...records].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.reference.localeCompare(a.reference));
  const matches=ordered.filter(r=>(!storiesOnly||r.message.trim())&&(!search||[r.name,r.message].some(s=>s.toLocaleLowerCase().includes(search.toLocaleLowerCase()))));
  const remaining=matches.filter(r=>!before||r.createdAt<before.time||(r.createdAt===before.time&&r.reference<before.reference));
  const page=remaining.slice(0,limit);
  return {summary:{total:records.length,withMessages:records.filter(r=>r.message.trim()).length},matching:matches.length,guests:page.map(publicGuest),nextCursor:remaining.length>limit?encodeCursor(page.at(-1)):null};
}

export function createGuestSqlStore(sql){
  return {
    async read({search='',storiesOnly=false,limit=30,before=null}={}){
      try{
        const results=await sql.transaction(tx=>[
          tx.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE btrim(message)<>'')::int AS with_messages FROM mc_clover20_replies`),
          tx.query(`SELECT COUNT(*)::int AS matching FROM mc_clover20_replies WHERE ${filterSql}`,[search,storiesOnly]),
          tx.query(`SELECT name,message,reference,${stampSql} AS created_at FROM mc_clover20_replies
            WHERE ${filterSql} AND ($3::timestamptz IS NULL OR (created_at,reference)<($3::timestamptz,$4::text))
            ORDER BY created_at DESC,reference DESC LIMIT $5`,[search,storiesOnly,before?.time||null,before?.reference||null,limit+1])
        ],{isolationLevel:'RepeatableRead',readOnly:true});
        const rows=results[2],page=rows.slice(0,limit),summary=results[0][0];
        return {summary:{total:Number(summary.total),withMessages:Number(summary.with_messages)},matching:Number(results[1][0].matching),guests:page.map(publicGuest),nextCursor:rows.length>limit?encodeCursor(page.at(-1)):null};
      }catch(error){if(error.code==='42P01')return empty();throw error;}
    },
    async export(){
      try{return await sql.query(`SELECT name,message,${stampSql} AS created_at FROM mc_clover20_replies ORDER BY created_at DESC,reference DESC`);}
      catch(error){if(error.code==='42P01')return [];throw error;}
    }
  };
}

const bangkokTime=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function csvCell(value){
  let text=String(value??'');
  // Keep a guest's text from becoming a spreadsheet formula when the CSV opens.
  if(/^[\s\uFEFF]*[=+\-@]/u.test(text)||/^[\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
}
export function guestsCsv(rows){
  const lines=[['ชื่อ','ข้อความที่ฝากไว้','เวลาตอบรับ (กรุงเทพฯ)'],...rows.map(row=>[row.name,row.message,bangkokTime.format(new Date(row.createdAt||row.created_at))])];
  return '\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

export function createGuestsHandler({getStore}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0');
    res.setHeader('CDN-Cache-Control','no-store');
    res.setHeader('Vercel-CDN-Cache-Control','no-store');
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if(req.method!=='GET'){
      res.setHeader('Allow','GET');
      return res.status(405).json({ok:false,message:'หน้านี้สำหรับเปิดดูคำตอบรับเท่านั้น'});
    }
    let options,format;
    try{
      const url=new URL(req.url,'https://www.myclover.com');
      format=url.searchParams.get('format')||'json';
      if(!['json','csv'].includes(format))throw Error('invalid');
      options=readOptions(url);
    }catch{return res.status(400).json({ok:false,message:'คำค้นหาหรือหน้ารายชื่อไม่ถูกต้อง ลองรีเฟรชอีกครั้งนะ'});}
    try{
      const store=await getStore();
      if(format==='csv'){
        const rows=await store.export();
        const csv=guestsCsv(rows);
        res.setHeader('Content-Type','text/csv; charset=utf-8');
        res.setHeader('Content-Disposition',`attachment; filename="clover20-guests-${bangkokTime.format(new Date()).slice(0,10)}.csv"`);
        return res.status(200).send(csv);
      }
      const page=await store.read(options);
      // Allow only the requested fields, even if an adapter returns extra data.
      return res.status(200).json({ok:true,summary:{total:page.summary.total,withMessages:page.summary.withMessages},matching:page.matching,guests:page.guests.map(publicGuest),nextCursor:page.nextCursor,updatedAt:new Date().toISOString()});
    }catch{return res.status(503).json({ok:false,message:'ยังโหลดคำตอบรับไม่ได้ ลองใหม่อีกครั้งนะ'});}
  };
}
