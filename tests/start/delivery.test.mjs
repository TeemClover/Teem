import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const dir=path.join(root,'start');
const catalog=JSON.parse(readFileSync(path.join(dir,'catalog.json')));
const manifest=JSON.parse(readFileSync(path.join(dir,'file-manifest.json')));

test('exactly 30 stable topic paths have distinct matching covers, PDFs and kits',()=>{
  assert.equal(catalog.episodes.length,30);assert.equal(new Set(catalog.episodes.map(e=>e.slug)).size,30);
  for(const ep of catalog.episodes){
    assert.match(ep.id,/^MC(0[1-9]|[12][0-9]|30)$/);assert.equal(ep.slug,ep.id.toLowerCase());
    const page=readFileSync(path.join(dir,ep.slug,'index.html'),'utf8');
    assert.ok(page.includes(`คู่คลิป ${ep.id}`));assert.ok(page.includes(`${ep.id}-starter-kit.zip`));
    const embedded=JSON.parse(page.match(/<script id="episode-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(embedded.id,ep.id);assert.deepEqual(embedded.fields,ep.fields);
    assert.ok(existsSync(path.join(dir,'assets/covers',ep.id+'.jpg')));
    assert.equal(readFileSync(path.join(dir,'files',ep.slug,ep.id+'-worksheet.pdf')).subarray(0,5).toString(),'%PDF-');
  }
});
test('every published format has a checked path, length and SHA-256',()=>{
  assert.equal(manifest.files.length,240);
  for(const entry of manifest.files){
    const file=readFileSync(path.join(dir,entry.path));
    assert.equal(file.length,entry.bytes);assert.equal(createHash('sha256').update(file).digest('hex'),entry.sha256);
  }
});
test('the direct gift and upload instructions precede optional LINE, with full-text fallback',()=>{
  for(const ep of catalog.episodes){
    const page=readFileSync(path.join(dir,ep.slug,'index.html'),'utf8');
    const gift=`/start/files/${ep.slug}/${ep.id}-ai-starter.pdf`;
    assert.ok(page.indexOf(gift)<page.indexOf('id="work"'));
    assert.ok(page.indexOf('id="work"')<page.indexOf('href="https://lin.ee/rlSlhzT"'));
    assert.ok(page.includes('id="copy-upload-message"'));
    assert.ok(page.includes('ถ้า AI แนบหรืออ่าน PDF ไม่ได้'));
    const text=readFileSync(path.join(dir,'files',ep.slug,ep.id+'-prompt.txt'),'utf8');
    for(const content of [ep.id,ep.title,ep.outcome,ep.prompt,ep.action,...ep.fields,...ep.clip_points])assert.ok(text.includes(content));
  }
});
test('HTML links point to existing /start files and the hub works without JS',()=>{
  const pages=['index.html',...catalog.episodes.map(e=>e.slug+'/index.html')];
  for(const name of pages){
    const page=readFileSync(path.join(dir,name),'utf8');
    assert.ok(!page.includes('/Users/'));assert.ok(!page.includes('chatgpt.site'));
    for(const [,ref] of page.matchAll(/(?:href|src)="(\/start\/[^"#?]*)/g)){
      const target=path.join(root,ref.endsWith('/')?ref+'index.html':ref);
      assert.ok(existsSync(target),`${name}: ${ref}`);
    }
  }
  const hub=readFileSync(path.join(dir,'index.html'),'utf8');
  assert.equal((hub.match(/data-topic="MC/g)||[]).length,30);
});
test('blank downloads are topic-specific and have no invented user answers',()=>{
  for(const ep of catalog.episodes){
    const folder=path.join(dir,'files',ep.slug);
    const backup=JSON.parse(readFileSync(path.join(folder,ep.id+'-answers.json')));
    assert.equal(backup.episode_id,ep.id);assert.deepEqual(backup.answers,['','','']);
    assert.ok(readFileSync(path.join(folder,ep.id+'-prompt.txt'),'utf8').includes(ep.prompt));
    assert.ok(readFileSync(path.join(folder,ep.id+'-ai-starter.md'),'utf8').includes(ep.action));
  }
});
test('static app has no collector or automatic AI requests and fonts carry their license',()=>{
  const app=readFileSync(path.join(dir,'app.mjs'),'utf8');
  assert.ok(!/fetch\(|sendBeacon\(|XMLHttpRequest/.test(app));
  assert.ok(app.includes('prompt_copied'));assert.ok(app.includes('started_self_reported'));
  const ofl=readFileSync(path.join(dir,'assets/fonts/OFL.txt'),'utf8');
  assert.ok(ofl.includes('SIL OPEN FONT LICENSE'));
  const ignore=readFileSync(path.join(root,'.vercelignore'),'utf8');assert.ok(ignore.includes('tests/start/'));assert.ok(ignore.includes('start/build.py'));
});
