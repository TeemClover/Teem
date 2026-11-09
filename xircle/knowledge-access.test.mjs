import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
function htmlFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const url=new URL(e.name+(e.isDirectory()?'/':''),dir);return e.isDirectory()?htmlFiles(url):e.name.endsWith('.html')?[url]:[];});}
const files=['doc/','learn/','hardware/','products/'].flatMap(dir=>htmlFiles(new URL(dir,import.meta.url)));

test('all 49 references retain readable content, static navigation and official company destination',()=>{
 assert.equal(files.length,49);
 for(const file of files){const html=readFileSync(file,'utf8');
  assert.match(html,/<main\b/);assert.match(html,/<h1\b/);assert.match(html,/class="journey-header"/);assert.match(html,/href="https:\/\/www\.xircle\.health\/download"/);
  assert.doesNotMatch(html,/<meta[^>]*http-equiv\s*=\s*["']?refresh/i);
  assert.doesNotMatch(html,/<a\b[^>]+href=["'][^"']*(?:teambook\.me|\/xty\/|\/meet\/|\/xvisor\/\?from=xircle)/);
  assert.doesNotMatch(html,/xvisor-path\.js|data-xvisor-topic-bridge|data-whitecat-(?:link|bridge)/);
 }
});
test('reference artwork helper works with no browser storage or progress service',()=>{
 const source=readFileSync(new URL('reference.js',import.meta.url),'utf8');let requested=false;
 const image={getAttribute:()=>'/xircle/assets/v5/xircle-hardware-hero.webp',closest:()=>null,nextElementSibling:null,hidden:true,complete:true,naturalWidth:1200,addEventListener(){},set src(v){requested=v;}};
 const document={querySelectorAll:selector=>selector==='img[data-art-src]'?[image]:[]};
 runInNewContext(source,{document});assert.equal(requested,'/xircle/assets/v5/xircle-hardware-hero.webp');assert.equal(image.hidden,false);
 assert.doesNotMatch(source,/localStorage|sessionStorage|location\.|notebookHref|setItem/);
});
test('all actual reference scripts remain independent of retired progress gates',()=>{
 const visited=new Set();const gate=/\b(?:XState|firstDayCompletedV10|journeyCompleted)\b|(?:window\.)?location\.(?:replace|assign)\s*\(|(?:window\.)?location\s*(?:\.href)?\s*=(?!=)/;
 function inspect(url){if(visited.has(url.href))return;visited.add(url.href);const js=readFileSync(url,'utf8');assert.doesNotMatch(js,gate,url.pathname);for(const m of js.matchAll(/\bimport\s+(?:[^;\n]*?\s+from\s*)?['"]([^'"]+)['"]/g)){const dependency=new URL(m[1],url);if(dependency.protocol==='file:')inspect(dependency);}}
 for(const file of files){const html=readFileSync(file,'utf8'),publicURL=new URL(file.href.slice(root.href.length),'https://www.myclover.com/');for(const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){const src=script[1].match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i)?.[1];if(!src){assert.doesNotMatch(script[2],gate);continue;}const resolved=new URL(src,publicURL);if(resolved.origin===publicURL.origin)inspect(new URL('.'+resolved.pathname,root));}}
 assert.ok(visited.size>=4);
});
