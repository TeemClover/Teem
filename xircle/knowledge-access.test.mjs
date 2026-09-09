/** Current reference content opens directly; retired experience state is never loaded. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {entryContext,notebookHref} from './route-contract.js';

const source=readFileSync(new URL('./reference.js',import.meta.url),'utf8');
const importLine="import {entryContext,notebookHref} from './route-contract.js';";
assert.ok(source.startsWith(importLine),'Exercise the current reference module and its actual contract');

function visit(path,progress={},blockedStorage=false){
  const redirects=[],writes=[],listeners=[];
  const url=new URL(path,'https://www.myclover.com');
  const location={origin:url.origin,pathname:url.pathname,search:url.search,hash:url.hash,
    replace:href=>redirects.push(href),assign:href=>redirects.push(href)};
  Object.defineProperty(location,'href',{get:()=>url.href,set:value=>redirects.push(value)});
  const nav={dataset:{},hidden:true,children:[],setAttribute(){},replaceChildren(...children){this.children=children;}};
  const unlocked={hidden:true},join={href:''},code={textContent:''},invitation={hidden:true};
  const document={
    querySelector:selector=>selector==='.xp-nav'?nav:null,
    querySelectorAll:selector=>({
      '[data-after-unlock]':[unlocked],
      '[data-whitecat-link],[data-whitecat-bridge],[data-room-join]':[join],
      '[data-room-code]':[code],'[data-invite-room]':[invitation],
      'img[data-art-src]':[],
    }[selector]||[]),
    createElement:()=>({setAttribute(){}}),
    addEventListener:type=>listeners.push(type),
  };
  const raw=JSON.stringify(progress),storage={
    getItem:key=>key==='xircle.local.v1'?raw:null,
    setItem:(...args)=>writes.push(['set',...args]),removeItem:(...args)=>writes.push(['remove',...args]),
    clear:()=>writes.push(['clear']),
  };
  const scope={document,location,entryContext,notebookHref,URL};
  Object.defineProperty(scope,'localStorage',{get(){if(blockedStorage)throw Error('Storage blocked');return storage;}});
  runInNewContext(source.slice(importLine.length),scope);
  return {redirects,writes,listeners,nav,unlocked,join,code,invitation};
}

for(const path of ['/xircle/learn/','/xircle/learn/topic/?t=xircle-habit-tracker','/xircle/doc/','/xircle/hardware/','/xircle/products/']){
  test(`current reference module opens directly for a new visitor: ${path}`,()=>{
    const page=visit(path);
    assert.deepEqual(page.redirects,[]);assert.deepEqual(page.writes,[]);
    assert.deepEqual(page.listeners,[],'Reference links must not acquire a progress click gate');
    assert.equal(page.nav.hidden,false);assert.equal(page.unlocked.hidden,false);
    assert.equal(page.nav.dataset.currentReference,'true');
    assert.deepEqual(Array.from(page.nav.children,link=>[link.href,link.textContent]),[
      ['/xircle/learn/','ห้องความรู้'],['/meet/?intent=health&from=xircle&open=booking','นัดคุย'],
    ]);
    assert.equal(page.join.href,'https://teambook.me/new/?template=xircle_xvisor');
  });
}

test('blocked storage cannot gate knowledge or the direct appointment link',()=>{
  const page=visit('/xircle/learn/',{},true);
  assert.deepEqual(page.redirects,[]);assert.deepEqual(page.writes,[]);
  assert.equal(page.unlocked.hidden,false);assert.equal(page.nav.children[1].textContent,'นัดคุย');
});

test('partial legacy progress and saved invitation remain read-only and usable',()=>{
  for(const journeyCompleted of [false,true]){
    const page=visit('/xircle/learn/',{firstDayCompletedV10:false,journeyCompleted,achievements:['keep'],xtyHandoff:{partyCode:'12345',receivedAt:Date.now()}});
    assert.deepEqual(page.redirects,[]);assert.deepEqual(page.writes,[]);
    assert.equal(page.join.href,'https://teambook.me/join/?c=12345');
    assert.equal(page.code.textContent,'12345');assert.equal(page.invitation.hidden,false);
    assert.equal(page.unlocked.hidden,false);
  }
});

test('explicit notebook creation overrides invitation without rewriting legacy history',()=>{
  const page=visit('/xircle/learn/?notebook=create',{xtyHandoff:{partyCode:'12345',receivedAt:Date.now()}});
  assert.equal(page.join.href,'https://teambook.me/new/?template=xircle_xvisor');
  assert.deepEqual(page.writes,[]);assert.deepEqual(page.redirects,[]);
});

function htmlFiles(directory){
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const url=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
    return entry.isDirectory()?htmlFiles(url):entry.name.endsWith('.html')?[url]:[];
  });
}
const root=new URL('../',import.meta.url);
const files=['doc/','learn/','hardware/','products/'].flatMap(directory=>htmlFiles(new URL(directory,import.meta.url)));
const retired=/\/xircle\/(?:_shared\/(?:state|story-v6|v3|v4|v5|playable|analytics|routinex-fit)|legacy-entry)\.js(?:[?#]|$)/;
const gate=/\b(?:XState|firstDayCompletedV10|journeyCompleted)\b|(?:window\.)?location\.(?:replace|assign)\s*\(|(?:window\.)?location\s*(?:\.href)?\s*=(?!=)/;

test('all 49 reference HTML pages retain content and only ungated script dependencies',()=>{
  assert.equal(files.length,49,'Review new reference pages here when expanding this content set');
  const inspected=new Set();
  function inspectScript(url){
    if(inspected.has(url.href))return;inspected.add(url.href);
    const js=readFileSync(url,'utf8');
    assert.doesNotMatch(js,gate,`Unexpected navigation/progress gate in ${url.pathname}`);
    for(const match of js.matchAll(/\bimport\s+(?:[^;\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)){
      const dependency=new URL(match[1],url);
      if(dependency.protocol==='file:')inspectScript(dependency);
    }
  }
  for(const file of files){
    const html=readFileSync(file,'utf8'),publicURL=new URL(file.href.slice(root.href.length),'https://www.myclover.com/');
    assert.match(html,/<main\b/i,`${publicURL.pathname}: readable content must remain`);
    assert.match(html,/<h1\b[^>]*>[^<\s]/i,`${publicURL.pathname}: direct entry needs a title`);
    assert.doesNotMatch(html,/<meta\b[^>]*http-equiv\s*=\s*['"]?refresh/i,`${publicURL.pathname}: no redirect`);
    for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
      const src=script[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1];
      if(!src){assert.doesNotMatch(script[2],gate,publicURL.pathname);continue;}
      const resolved=new URL(src,publicURL);
      if(resolved.origin!==publicURL.origin)continue;
      assert.doesNotMatch(resolved.pathname,retired,`${publicURL.pathname}: retired gate loaded`);
      inspectScript(new URL('.'+resolved.pathname,root));
    }
  }
  assert.ok(inspected.size>=4,'Inspect actual reference runtime, contract and content dependencies');
});
