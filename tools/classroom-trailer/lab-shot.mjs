// Render trailer frames in headless Chrome and save one contact-sheet screenshot.
// Needs the local static server on :4177 serving this worktree, and tools/classroom-trailer/lab.html (the lab page).
// Usage: node tools/classroom-trailer/lab-shot.mjs <out.jpg> "times=12,13,14&w=640&h=360" [pageWidth]
// Also prints console errors and the average draw time per frame (ms) for a perf sanity check.
// Add &audio=1 to the query to render the whole score offline and print per-second peak / RMS (dB) and clipping.
import {spawn} from 'node:child_process';
import {writeFile, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const [out, query = '', pageWidth = '1320'] = process.argv.slice(2);
if (!out) { console.error('usage: lab-shot.mjs <out.jpg> "<query>" [pageWidth]'); process.exit(2); }
const port = 9100 + Math.floor(Math.random() * 800);
const profile = await mkdtemp(path.join(tmpdir(), 'lab-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], {stdio: 'ignore'});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 60; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(t => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(150); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); const logs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } else if (m.method === 'Runtime.exceptionThrown') logs.push('EXCEPTION ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); else if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' ')); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({id: i, method, params})); });
const ev = async expr => (await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true})).result?.result?.value;
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {width: Number(pageWidth), height: 900, deviceScaleFactor: 1, mobile: false});
await send('Page.navigate', {url: `http://localhost:4177/tools/classroom-trailer/lab.html?${query}`});
for (let i = 0; i < 80 && !(await ev('window.__labReady===true')); i++) await sleep(150);
const perf = await ev(`(()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;const x=c.getContext('2d');const ts=new URLSearchParams(location.search).get('times').split(',').map(Number);const t0=performance.now();let n=0;for(const T of ts){for(let k=0;k<6;k++){MC_TRAILER.render(x,1280,720,T+k/60);n++;}}return ((performance.now()-t0)/n).toFixed(2);})()`);
const m = await send('Page.getLayoutMetrics');
const h = Math.ceil(Math.min(m.result.cssContentSize.height, 12000));
await send('Emulation.setDeviceMetricsOverride', {width: Number(pageWidth), height: h, deviceScaleFactor: 1, mobile: false});
await sleep(300);
const shot = await send('Page.captureScreenshot', {format: 'jpeg', quality: 78});
await writeFile(out, Buffer.from(shot.result.data, 'base64'));
console.log('saved', out, '| avg render ms @1280x720:', perf);
const audio = await ev('window.__audio||null'); if (audio) console.log('AUDIO', JSON.stringify(audio));
console.log(logs.length ? logs.slice(0, 20).join('\n') : 'no console errors');
ws.close(); chrome.kill(); process.exit(0);
