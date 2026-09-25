import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ZIP_NAME,readZip,validateLuckyArchive} from '../tools/lucky-source-archive.mjs';
import {buildLuckyArchive} from '../tools/build-lucky-source.mjs';
const html=await readFile(new URL('../receive/index.html',import.meta.url),'utf8');
const zip=await readFile(new URL(`../receive/${ZIP_NAME}`,import.meta.url));
test('handoff download is the exact audited current package and its prompt is complete',async()=>{
 validateLuckyArchive(zip);assert.deepEqual(zip,await buildLuckyArchive());
 const encoded=html.match(/<textarea[^>]*id="start-prompt"[^>]*>([\s\S]*?)<\/textarea>/)?.[1];assert.ok(encoded);
 const decoded=encoded.replace(/&(?:amp|lt|gt|quot|#39);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c]));
 assert.equal(decoded,readZip(zip).get('01-START-PROMPT.txt').toString().trimEnd());
 assert.ok(html.includes(`href="./${ZIP_NAME}" download="${ZIP_NAME}"`));assert.doesNotMatch(html,/\{\{\w+\}\}/);
});
test('inbox handoff is noindex and not promoted from the public house page',async()=>{
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 const config=JSON.parse(await readFile(new URL('../../../vercel.json',import.meta.url),'utf8'));
 for(const source of ['/showcase/house/receive/','/showcase/house/receive/:path*'])assert.ok(config.headers.some(rule=>rule.source===source&&rule.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))));
 for(const file of ['index.html','assets/home.js'])assert.doesNotMatch(await readFile(new URL('../'+file,import.meta.url),'utf8'),/house\/receive|["']\.\/receive\//);
});
