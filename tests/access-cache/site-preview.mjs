// Local HTTP adapter for real middleware + handlers. All accounts, OTPs and
// course grants are in memory; never connects to production services.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import middleware from '../../middleware.js';
import { createLearnFoundationHandler } from '../../api/learn-foundation.js';
import { createCourseContentHandler } from '../../api/course-content.js';
import { verifiedLearnUser } from '../../api/_lib/learn-authorization.js';
import { publicAssetPath } from '../../routing/public-assets.js';
import { createAuthFixture } from './auth-fixture.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const types = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.gif':'image/gif', '.woff2':'font/woff2', '.woff':'font/woff', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.html':'text/html; charset=utf-8' };
const shells = new Set(['/index.html','/learn/index.html','/course/index.html','/ako/index.html','/xircle/index.html','/shelf/index.html','/shelf/admin/index.html','/course/admin/index.html']);

export async function startSitePreview(port = 0) {
  const fixture = createAuthFixture(), requests = [];
  const foundation = createLearnFoundationHandler({getSql:()=>fixture.sql,ensureCoreSchema:async()=>{},filesystemRoot:path.join(root,'classroom'),verifyUser:(sql,req)=>verifiedLearnUser(sql,req,{store:fixture.store})});
  const course = createCourseContentHandler({root});
  const server = createServer(async (req,res) => {
    try {
      const incoming = new URL(req.url,`http://${req.headers.host}`);
      requests.push({url:incoming.pathname,ifNoneMatch:req.headers['if-none-match']});
      req.headers['x-forwarded-proto']='http';
      if (!['GET','HEAD'].includes(req.method)) { let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('Body too large');}req.body=body?JSON.parse(body):{}; }
      const routed = await middleware(new Request(incoming,{method:req.method,headers:req.headers}));
      for(const [key,value] of routed.headers)if(!key.startsWith('x-middleware-'))res.setHeader(key,value);
      if(routed.headers.has('location') || (!routed.headers.has('x-middleware-next')&&!routed.headers.has('x-middleware-rewrite'))) {res.statusCode=routed.status;return res.end(req.method==='HEAD'?undefined:Buffer.from(await routed.arrayBuffer()));}
      const target = new URL(routed.headers.get('x-middleware-rewrite') || incoming);
      req.url=target.pathname+target.search;req.query=Object.fromEntries(target.searchParams);
      if(target.pathname==='/api/learn-foundation')return foundation(req,res);
      if(target.pathname==='/api/course-content')return course(req,res);
      if(target.pathname.startsWith('/api/auth/'))return fixture.authHandler(req,res);
      if(target.pathname==='/api/learn')return fixture.learnHandler(req,res);
      if(target.pathname==='/api/progress')return fixture.progressHandler(req,res);
      let file=target.pathname.endsWith('/')?target.pathname+'index.html':target.pathname;
      if(!publicAssetPath(file)&&!shells.has(file)){res.statusCode=404;return res.end('Not found');}
      const location=path.join(root,file),info=await stat(location),body=await readFile(location);
      const etag='"'+createHash('sha256').update(body).digest('hex')+'"';
      res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
      if(!res.hasHeader('Cache-Control'))res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
      res.setHeader('ETag',etag);res.setHeader('Last-Modified',info.mtime.toUTCString());
      if(req.headers['if-none-match']===etag){res.statusCode=304;return res.end();}
      res.setHeader('Content-Length',body.length);res.statusCode=200;res.end(req.method==='HEAD'?undefined:body);
    }catch(error){console.error(error);if(!res.headersSent){res.statusCode=500;res.setHeader('Cache-Control','no-store');}res.end('Local fixture error');}
  });
  await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
  return {server,fixture,requests,base:`http://localhost:${server.address().port}`};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log((await startSitePreview(Number(process.env.SITE_FIXTURE_PORT||4179))).base);
