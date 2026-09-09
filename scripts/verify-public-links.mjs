#!/usr/bin/env node
/** Read-only release link audit. No HTTP requests; no API/private source traversal.
 * Walks actual static links/imports from the public entry points below. Dynamic
 * templates and external hosts are reported as unverified, never counted passed.
 * Usage: node scripts/verify-public-links.mjs [--json /tmp/public-links.json]
 */
import {readFile,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const origin='https://www.myclover.com';
const seeds=['/','/frontdoor/','/home/','/hall.html','/ako/','/ako/story/','/ako/kitchen/','/xircle/','/meet/','/forge/','/classroom/','/classroom/dungeon/','/xvisor/','/collection/','/guild/'];
const pages=/^\/(?:frontdoor|home|ako|xircle|meet|forge|classroom|xvisor|collection|guild)(?:\/|$)|^\/(?:index\.html|hall\.html)?$/;
const privatePath=/^\/(?:api|stat|admin|backoffice|docs|tests|functions)(?:\/|$)|\/(?:admin|backoffice)(?:\/|$)/;
const textTypes=/\.(?:html|css|m?js|json|webmanifest)$/i;
const assetTypes=/\.(?:html|css|m?js|json|webmanifest|webp|avif|png|jpe?g|gif|svg|ico|mp4|webm|mov|mp3|m4a|ogg|wav|woff2?|ttf|pdf)(?:[?#]|$)/i;
const config=JSON.parse(await readFile(path.join(root,'vercel.json'),'utf8'));
const routes=[];
for(const rule of [...(config.redirects||[]),...(config.rewrites||[])])if(!rule.has)routes.push({from:rule.source,to:rule.destination,provider:'vercel'});
for(const line of (await readFile(path.join(root,'_redirects'),'utf8')).split('\n')){
  if(!line.trim()||line.trim().startsWith('#'))continue;
  const [from,to]=line.trim().split(/\s+/);if(from&&to)routes.push({from,to,provider:'pages'});
}
const report={seeds,checked:0,scanned:[],missing:[],redirects:[],barriers:[],external:[],dynamic:[],knownNonLinks:[],unresolvedLiterals:[],untraversedPages:[]};
const seen=new Set(),checked=new Set(),queue=seeds.map(url=>({url,from:'release-entry',kind:'href'}));
const unique=(list,item)=>{if(!list.some(row=>JSON.stringify(row)===JSON.stringify(item)))list.push(item);};
function routeMatch(pattern,value){
  const names=[];let expression='';
  for(let i=0;i<pattern.length;){
    if(pattern[i]===':'){
      const token=pattern.slice(i).match(/^:([\w]+)(\*)?/);if(!token)return null;
      names.push(token[1]);expression+=token[2]?'(.*)':'([^/]+)';i+=token[0].length;
    }else if(pattern[i]==='*'){names.push('splat');expression+='(.*)';i++;}
    else{expression+=pattern[i].replace(/[.*+?^${}()|[\]\\]/g,'\\$&');i++;}
  }
  const match=value.match(new RegExp(`^${expression}$`));
  return match?Object.fromEntries(names.map((name,i)=>[name,match[i+1]])):null;
}
function applyRoute(url){
  for(const route of routes){const params=routeMatch(route.from,url.pathname);if(!params)continue;
    let target=route.to;for(const [name,value]of Object.entries(params))target=target.replaceAll(`:${name}*`,value).replaceAll(`:${name}`,value);
    return {url:new URL(target,url),route};
  }return null;
}
function refs(text,file){
  const found=[];const add=(value,kind,index=0)=>{if(value)found.push({value,kind,line:text.slice(0,index).split('\n').length});};
  const clean=text.replace(/<!--[\s\S]*?-->/g,match=>match.replace(/[^\n]/g,' '));
  if(file.endsWith('.html')){
    for(const m of clean.matchAll(/\b((?:data-)?(?:href|src|poster|srcset))\s*=\s*(["'])(.*?)\2/gs)){
      if(m[1].endsWith('srcset'))for(const part of m[3].split(','))add(part.trim().split(/\s+/)[0],'asset',m.index);
      else add(m[3],m[1].endsWith('href')?'href':'asset',m.index);
    }
  }
  for(const m of clean.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/g))add(m[2].trim(),'asset',m.index);
  for(const m of clean.matchAll(/(?:\bfrom\s+|\bimport\s*(?:\(\s*)?)(["'])([^"']+)\1/g))add(m[2],'import',m.index);
  for(const m of clean.matchAll(/(["'`])(https?:\/\/[^"'`<>\s]+)\1/g))add(m[2],'href',m.index);
  for(const m of clean.matchAll(/(["'`])(\/(?:[a-zA-Z0-9_.?][^"'`<>\s]*|))\1/g)){
    if(m[2].startsWith('//'))continue;
    const before=clean.slice(Math.max(0,m.index-80),m.index),after=clean.slice(m.index+m[0].length);
    // Comparison keys and validation prefixes are not navigation targets.
    if(/^\s*:/.test(after)||/(?:[!=]==?|startsWith\(|includes\(|indexOf\()\s*$/.test(before))continue;
    const navigation=/(?:\b(?:href|url)\s*[:=]|\b(?:link|open|assign|replace)\()\s*$/.test(before);
    add(m[2],assetTypes.test(m[2])?'asset':navigation?'href':'literal',m.index);
  }
  return found;
}
async function existing(url){
  let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return null;}
  if(pathname.includes('\0'))return null;
  const base=path.resolve(root,'.'+pathname);if(base!==root.replace(/\/$/,'')&&!base.startsWith(root))return null;
  for(const filename of [base,...(pathname.endsWith('/')?[path.join(base,'index.html')]:[base+'.html',path.join(base,'index.html')])]){
    try{if((await stat(filename)).isFile())return filename;}catch{}
  }return null;
}
while(queue.length){
  const item=queue.shift();let raw=item.url.replaceAll('&amp;','&').trim();
  if(!raw||raw.startsWith('#')||/^(?:data|blob|mailto|tel|javascript):/i.test(raw))continue;
  if(item.kind==='literal'&&item.from==='classroom/dungeon/index.html'&&/^\/[35]$/.test(raw)){
    unique(report.knownNonLinks,{from:item.from,url:raw,reason:'Fraction suffix in button textContent, not a URL'});continue;
  }
  if(item.kind==='literal'&&item.from==='core7/js/analytics.js'&&/^\/analytics\/(?:event|bot\/(?:start|complete))$/.test(raw)){
    unique(report.knownNonLinks,{from:item.from,url:raw,reason:'post() appends this suffix to CORE7_ANALYTICS_BASE; API execution is outside static link audit'});continue;
  }
  const isDynamic=value=>value.includes('${')||value.includes('{{')||value.includes('<%')||/['"]\s*\+|\+\s*['"]/.test(value);
  if(isDynamic(raw)){
    unique(report.dynamic,{from:item.from,url:raw});
    const pathname=raw.split(/[?#]/)[0];if(isDynamic(pathname))continue;
    raw=pathname; // A dynamic query must not hide a broken static destination.
  }
  let url;try{url=new URL(raw,item.base||origin);}catch{continue;}
  if(!['http:','https:'].includes(url.protocol))continue;
  if(!['www.myclover.com','myclover.com'].includes(url.hostname)){unique(report.external,url.origin);continue;}
  if(privatePath.test(url.pathname)){unique(report.barriers,url.pathname);continue;}
  const chain=[];
  for(let hop=0;hop<8;hop++){
    const routed=applyRoute(url);if(!routed||routed.url.href===url.href)break;
    if(chain.includes(routed.url.href)){unique(report.missing,{from:item.from,url:raw,reason:'redirect-loop'});break;}
    chain.push(url.href);unique(report.redirects,{from:url.pathname,to:routed.url.pathname,provider:routed.route.provider});url=routed.url;
  }
  if(!['www.myclover.com','myclover.com'].includes(url.hostname)){unique(report.external,url.origin);continue;}
  if(privatePath.test(url.pathname)){unique(report.barriers,url.pathname);continue;}
  const filename=await existing(url);
  if(!filename){unique(item.kind==='literal'?report.unresolvedLiterals:report.missing,{from:item.from,line:item.line,url:raw,resolved:url.pathname});continue;}
  if(!checked.has(url.pathname)){report.checked++;checked.add(url.pathname);}
  if(!textTypes.test(filename))continue;
  if(filename.endsWith('.html')&&!pages.test(url.pathname)){unique(report.untraversedPages,url.pathname);continue;}
  const key=filename;if(seen.has(key))continue;seen.add(key);
  const relative=path.relative(root,filename);report.scanned.push(relative);
  const source=await readFile(filename,'utf8');
  // Hosts normalize a real directory to a trailing slash before relative links
  // resolve. Rewrites to index.html retain the public directory URL.
  if(path.basename(filename)==='index.html'&&!url.pathname.endsWith('/')&&!url.pathname.endsWith('index.html'))url.pathname+='/';
  const documentBase=url.href;
  for(const ref of refs(source,filename))queue.push({url:ref.value,from:relative,line:ref.line,kind:ref.kind,base:documentBase});
}
const jsonIndex=process.argv.indexOf('--json');
if(jsonIndex>=0&&process.argv[jsonIndex+1])await writeFile(process.argv[jsonIndex+1],JSON.stringify(report,null,2));
console.log(`Public link audit: ${report.checked} local targets checked; ${report.scanned.length} linked source files scanned; ${report.missing.length} unresolved references.`);
for(const row of report.missing)console.log(`MISSING ${row.from}${row.line?':'+row.line:''} -> ${row.url} (${row.resolved||row.reason})`);
console.log(`Explicit boundaries: ${report.barriers.length} API/private paths; ${report.external.length} external origins; ${report.dynamic.length} dynamic templates; ${report.knownNonLinks.length} documented non-link literals; ${report.unresolvedLiterals.length} ambiguous JS literals; ${report.untraversedPages.length} public pages outside selected release journeys.`);
process.exitCode=report.missing.length?1:0;
