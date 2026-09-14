import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { mkdtemp, mkdir, writeFile, readFile, realpath, stat, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createLearnMediaHandler, learnMediaPathname, mediaRange, privateBlobCredentials } from './learn-media-handler.js';
import { createLearnFoundationHandler, foundationFile } from '../learn-foundation.js';
import { LEARN_ASSETS } from './learn-catalog.js';
import { LearnError } from './learn-domain.js';
const middleware = async request => (await import('../../middleware.js')).default(request);

const ASSET = {id:'m_'+'a'.repeat(32),kind:'video',filename:'lesson.mp4',contentType:'video/mp4',bytes:12};
class Reply extends Writable {
  constructor(){super();this.headers={};this.chunks=[];this.statusCode=0;}
  setHeader(k,v){this.headers[k.toLowerCase()]=String(v);}
  removeHeader(k){delete this.headers[k.toLowerCase()];}
  _write(chunk,encoding,done){this.chunks.push(Buffer.from(chunk));done();}
  get headersSent(){return this.chunks.length>0;}
  get body(){return Buffer.concat(this.chunks).toString();}
}
function mediaHarness(options={}) {
  const asset={...ASSET,...options.asset},calls=[],data=Buffer.from('Hello World!');
  const row={pathname:'learn/000.'+asset.filename.split('.').pop().toLowerCase(),content_type:asset.contentType,bytes:asset.bytes,sha256:'1'.repeat(64),...options.row};
  const sql={async query(text,args){calls.push(['sql',text,args]);return text.startsWith('SELECT')?[row]:[];}};
  const handler=createLearnMediaHandler({getSql:()=>sql,ensureCoreSchema:async()=>{},registryAssets:[asset],
    authorize:async(...args)=>{calls.push(['authorize',args[2]]);if(options.denied)throw new LearnError(options.denied,403);return {asset};},
    config:options.config||{LEARN_BLOB_STORE_ID:'store_private123',BLOB_READ_WRITE_TOKEN:'unrelated-public-token'},
    getOidcToken:options.getOidcToken || (async () => 'test-oidc'),
    getBlob:async(name,opts)=>{
      calls.push(['get',name,opts]);if(options.throwBlob)throw new Error('internal-secret-url');
      let payload=data;const headers=new Headers();
      if(opts.headers.Range&&!options.ignoreRange){const [,a,b]=/bytes=(\d+)-(\d+)/.exec(opts.headers.Range);payload=data.subarray(Number(a),Number(b)+1);headers.set('content-range',`bytes ${a}-${b}/${data.length}`);}
      headers.set('content-length',options.badLength?'999':String(payload.length));
      return {statusCode:200,headers,stream:new ReadableStream({start(c){c.enqueue(payload);c.close();},cancel(){calls.push(['cancel']);}})};
    },
  });
  async function call({method='GET',range,url}={}){
    const req={method,url:url||'/api/learn-media?courseId=ai-sauce&lessonId=FOUNDATION&assetId='+asset.id,headers:range===undefined?{}:{range}};
    const res=new Reply();await handler(req,res);return res;
  }
  return {call,calls,asset};
}

test('range handles bounded, open, suffix and capped requests without unsafe numbers',()=>{
  assert.deepEqual(mediaRange('bytes=2-5',12),{start:2,end:5,value:'bytes=2-5'});
  assert.equal(mediaRange('bytes=2-',12).value,'bytes=2-11');
  assert.equal(mediaRange('bytes=-3',12).value,'bytes=9-11');
  assert.equal(mediaRange('bytes=0-999',12).value,'bytes=0-11');
  assert.equal(mediaRange('bytes=-9000',10000,1000).value,'bytes=9000-9999');
  assert.equal(mediaRange('bytes=0-',10000,1000).value,'bytes=0-999');
  for(const invalid of ['bytes=-0','bytes=12-','bytes=8-2','bytes=','bytes=1-2,4-5','items=0-1','bytes=1.5-3','bytes=9007199254740993-', ['bytes=0-1']])assert.throws(()=>mediaRange(invalid,12),e=>e.status===416);
});
test('only the staged asset path and its original extension are accepted',()=>{
  assert.equal(learnMediaPathname(ASSET,[ASSET]),'learn/000.mp4');
  assert.equal(learnMediaPathname({...ASSET,id:'../../file'},[ASSET]),null);
  assert.equal(learnMediaPathname({...ASSET,id:'m_'+'b'.repeat(32)},[ASSET]),null);
  assert.equal(learnMediaPathname({...ASSET,filename:'no-extension'},[ASSET]),null);
  assert.equal(learnMediaPathname(LEARN_ASSETS[0]),'learn/000.mp4');
  assert.equal(learnMediaPathname(LEARN_ASSETS[1]),'learn/001.srt');
});
test('private OIDC credentials are explicit and never inherit a global public token',async()=>{
  const cfg={LEARN_BLOB_STORE_ID:'store_Ka6qwhaxPVWo4XDy',BLOB_READ_WRITE_TOKEN:'public-token',BLOB_STORE_ID:'store_public'};
  assert.deepEqual(await privateBlobCredentials(cfg,async()=> ' oidc '),{storeId:cfg.LEARN_BLOB_STORE_ID,oidcToken:'oidc'});
  for(const lookup of [async()=>'',async()=>undefined,async()=>{throw new Error('missing');}])await assert.rejects(privateBlobCredentials(cfg,lookup),e=>e.code==='MEDIA_STORAGE_UNCONFIGURED');
  await assert.rejects(privateBlobCredentials({BLOB_READ_WRITE_TOKEN:'public-token'},async()=> 'oidc'),e=>e.code==='MEDIA_STORAGE_UNCONFIGURED');
  assert.deepEqual(await privateBlobCredentials({...cfg,LEARN_BLOB_READ_WRITE_TOKEN:'private-token'},async()=>{throw new Error('not used');}),{token:'private-token'});
});
test('GET and HEAD authorize before any media registry lookup or blob access',async()=>{
  for(const method of ['GET','HEAD'])for(const denied of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','COURSE_ACCESS_REQUIRED','ASSET_NOT_FOUND']){
    const h=mediaHarness({denied}),r=await h.call({method});assert.equal(r.statusCode,403);
    assert.equal(h.calls.filter(c=>c[0]==='get'||c[0]==='sql').length,0);
    if(method==='HEAD')assert.equal(r.body,'');
    assert.equal(r.headers['cache-control'],'private, no-store');
  }
});
test('queries with missing/duplicate identifiers never reach authorization',async()=>{
  for(const url of ['/api/learn-media','/api/learn-media?courseId=a&courseId=b&lessonId=x&assetId=x','/api/learn-media?courseId=&lessonId=x&assetId=x']){
    const h=mediaHarness(),r=await h.call({url});assert.equal(r.statusCode,400);assert.equal(h.calls.length,0);
  }
});
test('invalid registry paths, wrong asset, size, MIME and digest fail closed',async()=>{
  for(const row of [{pathname:'learn/../secret.mp4'},{pathname:'https://public.blob.vercel-storage.com/file.mp4'},{pathname:'learn/001.mp4'},{pathname:'learn/000%2emp4'},{pathname:'learn/000.html'},{bytes:13},{bytes:'NaN'},{content_type:'text/html'},{sha256:'invalid'}]){
    const h=mediaHarness({row}),r=await h.call();assert.equal(r.statusCode,503);assert.equal(h.calls.filter(c=>c[0]==='get').length,0);
  }
});
test('full stream uses private OIDC and only the registered pathname',async()=>{
  const h=mediaHarness(),r=await h.call();assert.equal(r.statusCode,200);assert.equal(r.body,'Hello World!');
  const get=h.calls.find(c=>c[0]==='get');assert.equal(get[1],'learn/000.mp4');assert.equal(get[2].access,'private');
  assert.equal(get[2].oidcToken,'test-oidc');assert.equal(get[2].token,undefined);assert.equal(get[2].storeId,'store_private123');
  assert.equal(r.headers['content-length'],'12');assert.equal(r.headers['vary'],'Cookie');assert.equal(r.headers['cross-origin-resource-policy'],'same-origin');
});
test('OIDC failure does not call Blob despite the public global-token setting',async()=>{
  const h=mediaHarness({getOidcToken:async()=>{throw new Error('missing');}}),r=await h.call();
  assert.equal(r.statusCode,503);assert.equal(h.calls.filter(c=>c[0]==='get').length,0);assert.doesNotMatch(r.body,/public-token|missing/);
});
test('HEAD has identical auth, no body or Blob fetch, and ignores Range',async()=>{
  const h=mediaHarness(),r=await h.call({method:'HEAD',range:'bad'});assert.equal(r.statusCode,200);assert.equal(r.body,'');
  assert.equal(r.headers['content-length'],'12');assert.equal(r.headers['content-range'],undefined);assert.equal(h.calls.filter(c=>c[0]==='get').length,0);
});
test('partial response reports the exact byte range and streamed content',async()=>{
  const h=mediaHarness(),r=await h.call({range:'bytes=2-5'});assert.equal(r.statusCode,206);assert.equal(r.body,'llo ');
  assert.equal(r.headers['content-range'],'bytes 2-5/12');assert.equal(r.headers['content-length'],'4');
});
test('invalid ranges return 416 and size without fetching data',async()=>{
  const h=mediaHarness(),r=await h.call({range:'bytes=12-'});assert.equal(r.statusCode,416);
  assert.equal(r.headers['content-range'],'bytes */12');assert.equal(h.calls.filter(c=>c[0]==='get').length,0);
});
test('ignored ranges and inconsistent lengths are never sent as valid media',async()=>{
  for(const options of [{ignoreRange:true},{badLength:true}]){
    const h=mediaHarness(options),r=await h.call({range:'bytes=2-5'});assert.equal(r.statusCode,502);
    assert.doesNotMatch(r.body,/Hello World/);assert.equal(r.headers['content-length'],undefined);
  }
});
test('resource HTML and captions download as attachments with a sandbox CSP',async()=>{
  for(const asset of [{kind:'resource',filename:'example.html',contentType:'text/html; charset=utf-8'},{kind:'captions',filename:'captions.srt',contentType:'application/x-subrip'}]){
    const h=mediaHarness({asset}),r=await h.call();assert.equal(r.statusCode,200);assert.match(r.headers['content-disposition'],/^attachment;/);
    assert.equal(r.headers['content-security-policy'],"default-src 'none'; sandbox");
  }
});
test('unexpected upstream errors are sanitized',async()=>{
  const r=await mediaHarness({throwBlob:true}).call();assert.equal(r.statusCode,503);assert.doesNotMatch(r.body,/secret-url|blob\.vercel/);
});

test('foundation rejects traversal, hidden files, encoded escapes and duplicate file keys',()=>{
  assert.equal(foundationFile('/api/learn-foundation?file=lv5/'),'lv5/index.html');
  assert.equal(foundationFile('/api/learn-foundation?file=MY_SOURCE.md'),'MY_SOURCE.md');
  for(const value of ['../secret.md','/etc/passwd','a/./x.md','.git/config','a//x.md','a\\x.md','a%2fx.md','a\u0000.md','a\u007f.md','https:x.md'])assert.throws(()=>foundationFile('/api/learn-foundation?file='+encodeURIComponent(value)),e=>e.status===400);
  assert.throws(()=>foundationFile('/api/learn-foundation?file=a&file=b'));
});
async function foundationHarness(t,{denied,enrolled=true}={}) {
  const base=await mkdtemp(path.join(tmpdir(),'learn-foundation-'));t.after(()=>rm(base,{recursive:true,force:true}));
  const root=path.join(base,'classroom');await mkdir(root);await writeFile(path.join(root,'index.html'),'<body><a href="/classroom/lesson1.html">Start</a></body>');
  await writeFile(path.join(root,'DATA.md'),'foundation-data');await writeFile(path.join(base,'outside.md'),'must-not-leak');await symlink(path.join(base,'outside.md'),path.join(root,'escape.md'));
  await writeFile(path.join(root,'sample.mp4'),'sample-video-data');
  const events=[];
  const handler=createLearnFoundationHandler({getSql:()=>({}),ensureCoreSchema:async()=>{},filesystemRoot:root,
    verifyUser:async()=>{events.push('auth');if(denied)throw new LearnError(denied,403);return {id:'student'};},
    storeFactory:()=>({ensure:async()=>{},enrollment:async()=>{events.push('enroll');return enrolled?{}:null;}}),
    fs:{realpath:async p=>{events.push('path');return realpath(p);},stat,readFile:async p=>{events.push('read');return readFile(p);}},
  });
  const call=async(file='index.html',method='GET',headers={})=>{const res=new Reply();await handler({method,headers,url:'/api/learn-foundation?file='+encodeURIComponent(file)},res);return res;};
  return {call,events};
}
test('free classroom authenticates each direct API HTML/asset/HEAD request before filesystem access',async t=>{
  for(const denied of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED']){
    const h=await foundationHarness(t,{denied});for(const method of ['GET','HEAD']){const r=await h.call('DATA.md',method);assert.equal(r.statusCode,303);assert.equal(r.headers.location,'/learn/?trial=classroom&return=%2Fclassroom%2FDATA.md');}
    assert.equal(h.events.includes('path'),false);
  }
  const h=await foundationHarness(t,{enrolled:false});assert.equal((await h.call()).statusCode,200);assert.equal(h.events.includes('enroll'),false);
});
test('free classroom keeps canonical links and blocks symlink escapes',async t=>{
  const h=await foundationHarness(t),r=await h.call();assert.equal(r.statusCode,200);assert.match(r.body,/\/classroom\/lesson1\.html/);assert.match(r.body,/\/ai-source\//);
  assert.equal(r.headers['cache-control'],'private, no-store');assert.equal((await h.call('DATA.md')).body,'foundation-data');
  assert.equal((await h.call('escape.md')).statusCode,404);assert.equal((await h.call('missing.html')).statusCode,404);
});
test('foundation HEAD returns bytes without reading binary/text assets',async t=>{
  const h=await foundationHarness(t),r=await h.call('DATA.md','HEAD');assert.equal(r.statusCode,200);assert.equal(r.body,'');assert.equal(r.headers['content-length'],'15');assert.equal(h.events.includes('read'),false);
});
test('old sample aliases go to the free classroom before static asset exemptions',async()=>{
  for(const route of ['/ai-source/assets/EP01_SAMPLE.mp4','/ai-source/assets/EP01_CAPTIONS.srt','/AI-SOURCE/assets/ep01_sample.MP4','/ai-source/assets/%2545P01_SAMPLE.mp4','/ai-source/assets/EP01_SAMPLE.mp4/','/ai-source/assets/EP01_SAMPLE.mp4%2f']){
    const r=await middleware(new Request('https://www.myclover.com'+route));assert.equal(r.status,307,route);assert.match(r.headers.get('location'),/\/classroom\/$/);
  }
});
test('canonical classroom routes always rewrite to the guarded API, including JS and uppercase filenames',async()=>{
  for(const file of ['index.html','lv5/vault-data.js','MY_SOURCE.md']){
    const r=await middleware(new Request('https://www.myclover.com/classroom/'+file));
    const url=new URL(r.headers.get('x-middleware-rewrite'));assert.equal(url.pathname,'/api/learn-foundation');assert.equal(url.searchParams.get('file'),file);assert.match(r.headers.get('cache-control'),/no-store/);
  }
  const root=await middleware(new Request('https://www.myclover.com/classroom'));assert.equal(root.status,307);assert.match(root.headers.get('location'),/\/classroom\/$/);
});
test('encoded classroom and compatibility aliases fail closed instead of exposing public static files',async()=>{
  for(const route of ['/CLASSROOM/lesson1.html','/%63lassroom/lesson1.html','//classroom/lesson1.html','/classroom/%2544ATA.md','/learn/%63lassroom/index.html','/LEARN/classroom/index.html','/learn/classroom/%2544ATA.md','/learn//classroom/index.html']){
    const r=await middleware(new Request('https://www.myclover.com'+route));assert.equal(r.status,404,route);assert.equal(r.headers.get('x-middleware-next'),null);
  }
});
test('compatibility classroom alias redirects to canonical free course preserving activity query',async()=>{
  for(const suffix of ['/','/dungeon/','/lv5/vault-data.js']) {
    const r=await middleware(new Request('https://www.myclover.com/learn/classroom'+suffix+'?entry=learn&work=my-source'));
    assert.equal(r.status,307);const target=new URL(r.headers.get('location'));
    assert.equal(target.pathname,'/classroom'+suffix);assert.equal(target.searchParams.get('entry'),'learn');assert.equal(target.searchParams.get('work'),'my-source');
  }
});


test('free classroom screen recordings stream and seek only after verified-email checks',async t=>{
  const h=await foundationHarness(t),r=await h.call('sample.mp4','GET',{range:'bytes=7-11'});
  assert.equal(r.statusCode,206);assert.equal(r.body,'video');assert.equal(r.headers['content-range'],'bytes 7-11/17');assert.equal(h.events.includes('read'),false);
  const full=await h.call('sample.mp4');assert.equal(full.statusCode,200);assert.equal(full.body,'sample-video-data');
  const invalid=await h.call('sample.mp4','GET',{range:'bytes=999-'});assert.equal(invalid.statusCode,416);assert.equal(invalid.headers['content-range'],'bytes */17');
  const denied=await foundationHarness(t,{denied:'AUTH_REQUIRED'});assert.equal((await denied.call('sample.mp4','GET',{range:'bytes=0-3'})).statusCode,303);assert.equal(denied.events.includes('path'),false);
});
