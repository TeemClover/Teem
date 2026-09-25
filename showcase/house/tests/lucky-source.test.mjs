import test from 'node:test';
import {house as starterHouse} from '../../../tools/lucky-house/starter/house-data.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildLuckyArchive,writeLuckyArchive} from '../tools/build-lucky-source.mjs';
import {ZIP_NAME,FILES,readZip,makeZip,validateLuckyArchive} from '../tools/lucky-source-archive.mjs';
const zip=await buildLuckyArchive();

test('Lucky Source contains only authorized generic files, with verified member hashes',()=>{
 const report=validateLuckyArchive(zip),entries=readZip(zip);
 assert.equal(report.files,32);
 assert.deepEqual(starterHouse.photos,[]);
 assert.equal(entries.get('starter/app.js').length>300000,true);
 assert.doesNotMatch(entries.get('starter/app.js').toString(),/\/api\/|house-stats|https:\/\/.*cdn/);
 assert.deepEqual([...readZip(makeZip(entries)).keys()].sort(),[...FILES].sort());
});
test('archive rejects altered content, unexpected private documents and traversal',()=>{
 const changed=readZip(zip);changed.set('starter/house-data.js',Buffer.from('tampered'));assert.throws(()=>validateLuckyArchive(makeZip(changed)),/Checksum/);
 const extra=readZip(zip);extra.set('private-plan.pdf',Buffer.from('private'));assert.throws(()=>validateLuckyArchive(makeZip(extra)),/allowlist/);
 assert.throws(()=>readZip(makeZip(new Map([['../escape.txt','bad']]))),/Unsafe/);
});
test('all packaged sauce sections exactly match the canonical source',async()=>{
 const master=await readFile(new URL('../../../shelf/source/method/lucky-house-studio.md',import.meta.url),'utf8');
 const entries=readZip(zip);let count=0;
 for(const m of master.matchAll(/<!-- PACK:([^>]+) -->\n([\s\S]*?)(?=<!-- PACK:|<!-- PACK-END -->)/g)){
  assert.equal(entries.get(m[1]).toString(),m[2].trim()+'\n');count++;
 }
 assert.equal(count,12);
});
test('packaged editable starter sources equal authoring sources',async()=>{
 const entries=readZip(zip);
 for(const file of ['index.html','style.css','house-data.js','src/main.js','serve.mjs','build.mjs','package.json','package-lock.json']){
  const source=await readFile(new URL(`../../../tools/lucky-house/starter/${file}`,import.meta.url));
  assert.deepEqual(entries.get('starter/'+file),source,file);
 }
});

test('inbox exporter refuses public repository output and missing destination',async()=>{
 await assert.rejects(()=>writeLuckyArchive(),/Use --output/);
 await assert.rejects(()=>writeLuckyArchive(new URL('../downloads/'+ZIP_NAME,import.meta.url).pathname),/outside the public repository/);
});
