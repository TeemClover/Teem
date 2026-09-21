import { safeRecordDownload } from './_lib/learn-downloads.js';
import { createHash } from 'node:crypto';
import { database, ensureSchema } from './_lib/core.js';
import { authorizeLearnLesson } from './_lib/learn-authorization.js';
import { LearnError } from './_lib/learn-domain.js';
import { TOOLKIT_FILES, TOOLKIT_VERSION } from './_lib/learn-toolkit-catalog.js';

export function createToolkitHandler({getSql=database,ensure=ensureSchema,authorize=authorizeLearnLesson}={}) {
  return async (req,res)=>{
    for(const key of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control'])res.setHeader(key,'private, no-store');
    res.setHeader('Vary','Cookie');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    try {
      if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');throw new LearnError('METHOD_NOT_ALLOWED',405);}
      const url=new URL(req.url,'https://learn.invalid');
      const ids=url.searchParams.getAll('file');
      if(ids.length!==1)throw new LearnError('INVALID_QUERY',400);
      const sql=getSql();await ensure(sql);
      const permitted=await authorize(sql,req,{courseId:'ai-sauce',lessonId:'FOUNDATION'});
      const file=TOOLKIT_FILES.find(f=>f.id===ids[0]);
      if(!file)throw new LearnError('NOT_FOUND',404);
      const rows=await sql.query("SELECT encode(body,'base64') AS body FROM mc_learn_toolkit_files WHERE course_id=$1 AND version=$2 AND file_id=$3",['ai-sauce',TOOLKIT_VERSION,file.id]);
      const body=Buffer.from(rows[0]?.body||'','base64');
      if(body.length!==file.bytes||createHash('sha256').update(body).digest('hex')!==file.sha256)throw new LearnError('FILE_NOT_READY',503);
      const inline=file.id==='workbook'&&!url.searchParams.has('download');
      res.setHeader('Content-Type',file.contentType);
      res.setHeader('Content-Disposition',`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
      // Only this fixed instructor-authored workbook runs scripts, in an opaque
      // sandbox: it cannot read account cookies or contact any service.
      const hashes=inline?[...body.toString().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>`'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`).join(' '):'';
      res.setHeader('Content-Security-Policy',inline?`default-src 'none'; script-src ${hashes}; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; sandbox allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox` : "default-src 'none'; sandbox");
      if(req.method==='GET'&&!inline)await safeRecordDownload(sql,{userId:permitted?.user?.id,courseId:'ai-sauce',fileId:'toolkit:'+file.id,filename:file.filename});
      res.statusCode=200;res.setHeader('Content-Length',body.length);res.end(req.method==='HEAD'?undefined:body);
    }catch(error){
      res.statusCode=error instanceof LearnError?error.status:503;
      res.setHeader('Content-Type','text/plain; charset=utf-8');
      res.end(req.method==='HEAD'?undefined:'ยังเปิดไฟล์ไม่ได้ กรุณากลับไปบทนำ เข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์เรียน แล้วลองเปิดอีกครั้ง');
    }
  };
}
export default createToolkitHandler();
