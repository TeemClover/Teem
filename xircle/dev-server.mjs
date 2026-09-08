/* Development-only static preview. No API forwarding or production writes.
   npm run dev -- --host 0.0.0.0 --port 4173
   /__qa__/ provides real iframe viewports for browser QA without device spoofing. */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const flag = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const host = flag('--host', '127.0.0.1');
const port = Number(flag('--port', '4173'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const qaPage = `<!doctype html><html lang="en"><meta charset="utf-8"><title>XIRCLE local QA</title>
<style>body{margin:0;background:#ddd;font:14px system-ui}header{padding:14px;display:flex;gap:16px;flex-wrap:wrap;align-items:center}select,button{font:inherit;padding:8px}iframe{display:block;background:white;border:0;margin:0 auto;width:390px;height:844px}#checks{padding:12px;white-space:pre-wrap;overflow-wrap:anywhere}label{display:flex;align-items:center;gap:6px}</style>
<header><strong>XIRCLE · local QA</strong>
<label>Viewport <select id="width"><option>320</option><option>360</option><option selected>390</option><option>430</option><option>1366</option></select></label>
<label>Page <select id="page"><option value="/xircle/">XIRCLE demo</option><option value="/xircle/#start">Start sequence</option><option value="/meet/?intent=health&from=xircle&open=booking">XIRCLE Meet handoff</option><option value="/meet/">Plain Meet</option><option value="/meet/?intent=health&from=other&open=booking">Unknown source</option><option value="/meet/?intent=health&intent=curious&from=xircle&open=booking">Duplicate intent</option></select></label>
<label>Fixture <select id="fixture"><option value="none">Normal</option><option value="legacy">Legacy completed day</option><option value="draft">Existing curious booking draft</option><option value="storage">Storage unavailable</option><option value="reduced">Reduced motion simulation</option><option value="noscript">JavaScript unavailable</option></select></label>
<button id="load">Load selected case</button><button id="inspect">Inspect layout</button><span>Static preview · all API POSTs rejected</span></header>
<iframe id="preview" title="XIRCLE preview" src="/xircle/"></iframe><pre id="checks"></pre>
<script>
const frame=document.getElementById('preview');
document.getElementById('width').onchange=()=>{frame.style.width=document.getElementById('width').value+'px';};
document.getElementById('load').onclick=()=>{const url=new URL(document.getElementById('page').value,location.origin);const fixture=document.getElementById('fixture').value;if(fixture!=='none')url.searchParams.set('__qa_fixture',fixture);frame.src=url.pathname+url.search+url.hash;document.getElementById('checks').textContent='';};
document.getElementById('inspect').onclick=()=>{const doc=frame.contentDocument,win=frame.contentWindow;const visible=el=>el.getClientRects().length&&win.getComputedStyle(el).visibility!=='hidden';const readStorage=key=>{try{return win.localStorage.getItem(key)}catch{return 'unavailable'}};const overflow=[...doc.querySelectorAll('body *')].filter(el=>visible(el)&&el.getBoundingClientRect().right>win.innerWidth+1&&!el.closest('svg')&&!el.matches('#camera img')).map(el=>el.id||el.className||el.tagName);const images=[...doc.images].filter(img=>img.hasAttribute('src')).map(img=>({src:new URL(img.src).pathname,loaded:img.complete&&img.naturalWidth>0}));document.getElementById('checks').textContent=JSON.stringify({viewport:win.innerWidth,documentWidth:doc.documentElement.scrollWidth,step:doc.querySelector('#demo')?.dataset.step,overflow,images,loadedResources:win.performance.getEntriesByType('resource').map(r=>new URL(r.name).pathname),legacy:readStorage('xircle.local.v1'),draft:readStorage('myclover.meet.draft.v1')},null,2);};
</script></html>`;

function fixtureScript(fixture) {
  if (fixture === 'legacy') return `<script>localStorage.setItem('xircle.local.v1',JSON.stringify({firstDayCompletedV10:true,journeyCompleted:true,careIntroSeen:true,xtyHandoff:{partyCode:'12345',source:'qa'}}));<\/script>`;
  if (fixture === 'draft') return `<script>localStorage.setItem('myclover.meet.draft.v1',JSON.stringify({savedAt:Date.now(),step:3,schedulePart:'time',intent:'curious',mode:'ออนไลน์',day:'flexible',time:'เวลาไหนก็ได้',name:'QA Example',contact:'qa@example.invalid',note:'Synthetic draft fixture'}));<\/script>`;
  if (fixture === 'storage') return `<script>for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{get(){throw new Error('QA: storage unavailable')}});<\/script>`;
  if (fixture === 'reduced') return `<script>const originalMatchMedia=window.matchMedia.bind(window);window.matchMedia=query=>{const result=originalMatchMedia(query);if(query==='(prefers-reduced-motion: reduce)')Object.defineProperty(result,'matches',{value:true});return result;};<\/script><style>*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}html{scroll-behavior:auto!important}</style>`;
  return '';
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { 'Content-Type': 'application/json' });
    return response.end(JSON.stringify({ ok: false, message: 'Local preview only: no booking was sent' }));
  }
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/__qa__/') {
      response.writeHead(200, { 'Content-Type': types['.html'] }); return response.end(qaPage);
    }
    if (url.pathname === '/') { response.writeHead(302, { Location: '/xircle/' }); return response.end(); }
    if (!/^\/(xircle|meet|invite)(\/|$)/.test(url.pathname)) { response.writeHead(404); return response.end('Preview route not included'); }
    let path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Invalid path');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    let body = await readFile(path);
    const extension = extname(path);
    if (extension === '.html') {
      const fixture = url.searchParams.get('__qa_fixture');
      let html = body.toString();
      if (fixture === 'noscript') html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      else html = html.replace('<head>', '<head>' + fixtureScript(fixture));
      body = Buffer.from(html);
    }
    response.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, host, () => console.log(`XIRCLE static preview listening on ${host}:${port}; no backend forwarding`));
