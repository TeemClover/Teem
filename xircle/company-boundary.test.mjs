import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
test('product story and presentation point to real references and do not pretend to be tracking',async()=>{
 const html=await read('index.html');
 for(const id of ['sleep','eat','move','body','devices','routine','knowledge','start'])assert.ok(html.includes(`id="${id}"`));
 assert.match(html,/ห้องความรู้แมวขาว/);assert.match(html,/พฤติกรรม · ไม่มีขาย/);assert.match(html,/ไม่ใช่เส้นตายหรือคำรับประกัน/);
 assert.doesNotMatch(html,/<(?:input|form)\b|data-sleep=|data-move=|data-context=|นัดลอง|ทีมและเอโกะ|ทีม \+ เอโกะ|teambook\.me|\/meet\//);
 for(const href of [...html.matchAll(/href="(https:[^"]+)"/g)].map(m=>m[1]))if(href.includes('buy.xircle.health'))assert.equal(href,'https://buy.xircle.health/login?ref=O5F3LN');
});
test('modern graphics are decorative, optional and self contained',async()=>{
 const html=await read('index.html'),js=await read('company-story.js'),field=await read('orb-field.js');
 assert.match(html,/<canvas[^>]+aria-hidden="true"/);assert.match(js,/prefers-reduced-motion/);assert.match(js,/saveData/);assert.match(js,/import\('\.\/orb-field\.js'\)/);assert.match(field,/webgl2/);
 assert.doesNotMatch(js+'\n'+field,/localStorage|sessionStorage|fetch\(|XMLHttpRequest|setItem\(|teambook\.me|\/meet\//);
 assert.match(html,/<dialog[^>]+aria-labelledby="presentation-title"/);assert.match(html,/data-device-panel="scale"/);
});
