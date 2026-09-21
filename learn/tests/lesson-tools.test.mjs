import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeLessonTools, filterToolPrompts, fillToolPrompt, assistedToolPrompt, renderLessonTools } from '../assets/lesson-tools.js';

class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.hidden=false;this.disabled=false;this.value='';this.text='';this.className='';}
  set textContent(value){this.text=String(value);this.children=[];}get textContent(){return this.text+this.children.map(child=>child.textContent||'').join('');}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}replaceChildren(...nodes){this.children=[];this.text='';this.append(...nodes);}
  setAttribute(key,value){this.attributes[key]=String(value);}getAttribute(key){return this.attributes[key]??null;}
  addEventListener(name,callback){(this.listeners[name]??=[]).push(callback);}async fire(name){for(const callback of this.listeners[name]||[])await callback({target:this,currentTarget:this});}
  all(){return this.children.flatMap(child=>[child,...child.all()]);}focus(){this.focused=true;}select(){this.selected=true;}
}
const one={id:'sample',title:'ร่างข้อความ',category:'งาน',description:'เตรียมข้อความจากข้อมูลจริง',body:'ถึง [ผู้รับ]\nเรื่อง [เรื่อง]\nเก็บ [ยังไม่ทราบ] ไว้',
  keywords:['email','อีเมล'],fields:[{key:'ผู้รับ',label:'ส่งถึงใคร',placeholder:'ชื่อผู้รับ'},{key:'เรื่อง',label:'หัวข้อ',multiline:true}],tips:['ตรวจข้อมูลก่อนใช้']};
const tools=[{kind:'prompt-library',id:'library',title:'คลังสูตร',description:'เลือกแล้วปรับ',prompts:[one,{id:'second',title:'ภาพประกอบ',category:'สร้างสรรค์',body:'ภาพสำหรับ [งาน]',keywords:['image']}]}];
const starter={kind:'guided-start',id:'first-source',title:'เริ่มซอสของฉัน',description:'ให้ AI ถาม แล้วตอบด้วยภาษาของคุณ',
  steps:['เปิดแชต AI ที่คุณใช้','คัดลอกข้อความแล้วส่ง','ตอบทีละคำถาม แล้วตรวจฉบับเต็ม'],expectedOutput:'ซอสฉบับแรกที่ใช้กับงานหนึ่งงาน',
  readyWhen:['ข้อมูลตรงกับที่คุณเล่า','เรื่องที่ยังไม่รู้แยกไว้ชัด'],prompts:[{id:'start',title:'พาทำซอส',body:'ถามฉันทีละข้อแล้วรอคำตอบ\nช่วยเขียนซอสฉบับเต็มจากข้อมูลที่ฉันยืนยัน ห้ามส่งแม่แบบว่าง'}]};
function setup(data=tools,options={}) {
  globalThis.document={createElement:tag=>new Element(tag)};
  const container=new Element(),control=renderLessonTools(container,data,options);
  const find=(name,value)=>container.all().find(node=>name==='class'?node.className.split(' ').includes(value):name==='text'?node.tagName==='BUTTON'&&node.textContent===value:node.getAttribute(name)===value);
  const choice=id=>container.all().find(node=>node.tagName==='BUTTON'&&node.dataset.promptId===id);
  return {container,control,find,choice};
}
const settle=()=>new Promise(setImmediate);
function closedDetailsAncestor(node){for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open)return parent;return null;}

test('tool normalization accepts only supported bounded shapes and never truncates prompt bodies',()=>{
  assert.deepEqual(normalizeLessonTools(null),[]);assert.deepEqual(normalizeLessonTools([{...tools[0],kind:'iframe'}]),[]);
  assert.deepEqual(normalizeLessonTools([{...tools[0],prompts:[{...one,body:'x'.repeat(100001)}]}]),[]);
  const exact='บรรทัดหนึ่ง\n```\n<img src=x onerror=alert(1)>\n[ค่า]';
  const result=normalizeLessonTools([{...tools[0],prompts:[{...one,body:exact},one]}]);
  assert.equal(result[0].prompts.length,1);assert.equal(result[0].prompts[0].body,exact);
  assert.deepEqual(normalizeLessonTools([{...tools[0],prompts:[{...one,fields:[...one.fields,one.fields[0]]}]}]),[]);
});
test('category and Thai/English keyword searches combine without searching hidden private prompt bodies',()=>{
  const prompts=normalizeLessonTools(tools)[0].prompts;
  assert.deepEqual(filterToolPrompts(prompts,'อีเมล').map(prompt=>prompt.id),['sample']);
  assert.deepEqual(filterToolPrompts(prompts,'EMAIL','งาน').map(prompt=>prompt.id),['sample']);
  assert.deepEqual(filterToolPrompts(prompts,'email','สร้างสรรค์'),[]);
  assert.equal(filterToolPrompts(prompts,'ยังไม่ทราบ').length,0);
  assert.equal(filterToolPrompts(prompts,'','สร้างสรรค์')[0].id,'second');
});
test('Thai caption synonyms find existing recipes while preserving categories, other query words and every prompt body',()=>{
  const prompts=normalizeLessonTools([{...tools[0],prompts:[
    {...one,id:'caption-cafe',title:'Caption ร้านกาแฟ',category:'คอนเทนต์',description:'โพสต์สำหรับร้าน',keywords:['social'],body:'ต้นฉบับ [ซอส] ห้ามแก้เพราะคำค้น'},
    {...one,id:'caption-hotel',title:'Caption โรงแรม',category:'คอนเทนต์'},
    {...one,id:'unrelated',title:'วางแผนสไลด์',category:'งาน',description:'สรุปงาน',keywords:[],body:'caption ข้อความประกอบโพสต์ อยู่เฉพาะในเนื้อหา'}
  ]}])[0].prompts;
  const before=structuredClone(prompts);
  for(const query of ['ข้อความประกอบโพสต์','ข้อความ ประกอบ โพสต์','แคปชัน','แคปชั่น','CAPTION'])
    assert.deepEqual(filterToolPrompts(prompts,query).map(p=>p.id),['caption-cafe','caption-hotel']);
  assert.deepEqual(filterToolPrompts(prompts,'ข้อความประกอบโพสต์ ร้านกาแฟ','คอนเทนต์').map(p=>p.id),['caption-cafe']);
  assert.deepEqual(filterToolPrompts(prompts,'แคปชั่น','งาน'),[]);
  assert.deepEqual(prompts,before);
});
test('a learner can search Caption and immediately copy an interview request without filling a form',async()=>{
  const prompt={...one,id:'caption',title:'Caption',category:'คอนเทนต์',description:'เขียนโพสต์จากซอส',keywords:['social'],body:'ใช้ [ซอส] เพื่อร่าง Caption ตามกติกาเดิม'};
  let copied;const d=setup([{...tools[0],prompts:[prompt,tools[0].prompts[1]]}],{copyText:async value=>{copied=value;}});
  const search=d.find('aria-label','ค้นหาสูตร');search.value='ข้อความประกอบโพสต์';await search.fire('input');
  assert.equal(d.find('class','lt-count').textContent,'พบ 1 จาก 2 สูตร');assert.ok(d.choice('caption'));assert.equal(d.choice('second'),undefined);
  await d.choice('caption').fire('click');await d.find('text','คัดลอกคำสั่ง ให้ AI พาทำ').fire('click');await settle();
  assert.equal(copied,assistedToolPrompt(prompt));assert.notEqual(copied,prompt.body);
  assert.match(copied,/ทีละ 1 คำถาม แล้วหยุดรอคำตอบ/);assert.match(copied,/ห้ามส่งแบบฟอร์มว่าง/);
  assert.match(copied,/ใช้ \[ซอส\] เพื่อร่าง Caption/);assert.match(copied,/สูตรอ้างอิงที่เลือก — ใช้หลังจากถามและตรวจข้อมูลแล้ว/);
  assert.ok(closedDetailsAncestor(d.find('aria-label','ส่งถึงใคร')));
  assert.ok(closedDetailsAncestor(d.find('aria-label','ปรับข้อความ Prompt: Caption')));
  assert.equal(d.find('aria-label','ปรับข้อความ Prompt: Caption').value,prompt.body);
});
test('field filling preserves exact values, missing placeholders and nonrecursive literal input',()=>{
  assert.equal(fillToolPrompt('[a] / [b] / [a]',new Map([['a','$& [b]'],['b','  ']])),'$& [b] / [b] / $& [b]');
  assert.equal(fillToolPrompt('[toString] [__proto__] [x]',{x:'ครบ'}),'[toString] [__proto__] ครบ');
});
test('prompt cards lead with assisted requests and keep original recipes behind explicit reference details',async()=>{
  const prompts=Array.from({length:3},(_,index)=>({id:'card-'+index,title:'ทางเลือก '+index,body:'คำสั่ง '+index+'\n<script>no()</script>\n```'}));let copied;
  const d=setup([{kind:'prompt-cards',id:'cards',title:'เลือกวัตถุดิบ',prompts}],{copyText:async value=>{copied=value;}});
  assert.equal(d.container.hidden,false);assert.equal(d.container.all().filter(node=>node.tagName==='ARTICLE').length,3);
  assert.equal(d.container.all().filter(node=>node.tagName==='SCRIPT').length,0);
  const primary=d.container.all().filter(node=>node.tagName==='BUTTON'&&node.className.includes('lt-primary'));
  assert.equal(primary.length,3);await primary[2].fire('click');await settle();assert.equal(copied,assistedToolPrompt(prompts[2]));
  const original=d.find('aria-label','Prompt: ทางเลือก 2');assert.equal(original.readOnly,true);assert.equal(original.value,prompts[2].body);assert.ok(closedDetailsAncestor(original));
  const originalButtons=d.container.all().filter(node=>node.tagName==='BUTTON'&&node.textContent==='คัดลอกสูตรต้นฉบับ');
  assert.ok(originalButtons.every(closedDetailsAncestor));await originalButtons[2].fire('click');await settle();assert.equal(copied,prompts[2].body);
});

test('assisted recipe instructions work without a Source, handle unknown answers and require confirmation before full output',()=>{
  const before=structuredClone(one),body=assistedToolPrompt(one);
  assert.match(body,/หากยังไม่มีซอสให้ช่วยเก็บข้อมูลจากคำตอบ/);
  assert.match(body,/ส่งถึงใคร \/ หัวข้อ/);assert.match(body,/ไม่ถามซ้ำเรื่องที่ตอบแล้ว/);
  assert.match(body,/ไม่เดาหรือแต่งข้อเท็จจริง/);assert.match(body,/ให้สรุปความเข้าใจให้ฉันยืนยัน/);
  assert.match(body,/คำขอฉบับเต็มที่ใช้ต่อได้/);assert.match(body,/ข้อความครบในบล็อกเดียวที่คัดลอกได้/);
  assert.match(body,/หากมีโจทย์แล้วให้ถามเฉพาะข้อมูลที่ยังขาด/);assert.ok(body.endsWith('ถ้าข้อมูลครบแล้วให้สรุปเพื่อยืนยันก่อนทำ'));
  assert.deepEqual(one,before);
});

test('guided-start requires clear steps, expected output and completion checks, with zero manual fields',()=>{
  const model=normalizeLessonTools([starter])[0];assert.deepEqual(model.steps,starter.steps);assert.equal(model.expectedOutput,starter.expectedOutput);assert.deepEqual(model.readyWhen,starter.readyWhen);
  assert.equal(model.prompts[0].body,starter.prompts[0].body);assert.deepEqual(model.prompts[0].fields,[]);
  for(const change of [{steps:[]},{steps:[{}]},{steps:['x'.repeat(1201)]},{expectedOutput:''},{readyWhen:[]},{readyWhen:[null]},
    {prompts:[{...starter.prompts[0],fields:one.fields}]},{prompts:Array.from({length:4},(_,i)=>({...starter.prompts[0],id:'p'+i}))}])
    assert.deepEqual(normalizeLessonTools([{...starter,...change}]),[]);
});

test('guided-start is usable immediately: directions, exact private interview, expected result and no form',async()=>{
  let copied;const d=setup([starter],{copyText:async value=>{copied=value;}});
  assert.equal(d.container.all().filter(node=>node.tagName==='INPUT'||node.tagName==='SELECT').length,0);
  assert.equal(d.container.all().filter(node=>node.tagName==='OL')[0].children.length,3);
  assert.match(d.container.textContent,/ทำแล้วจะได้อะไร/);assert.match(d.container.textContent,/ข้อมูลตรงกับที่คุณเล่า/);
  const field=d.find('aria-label','คำสั่งพาทำ: พาทำซอส');assert.equal(field.readOnly,true);assert.ok(closedDetailsAncestor(field));
  const primary=d.find('text','คัดลอกคำสั่ง ให้ AI พาทำ');assert.equal(closedDetailsAncestor(primary),null);
  await primary.fire('click');await settle();assert.equal(copied,starter.prompts[0].body);
  assert.match(d.container.textContent,/เปิดแชต AI ที่คุณใช้ วางข้อความ แล้วส่ง/);assert.doesNotMatch(d.container.textContent,/พร้อมซอส/);
});

test('guided and assisted clipboard failure opens full request before selecting it',async()=>{
  for(const data of [[starter],tools]){
    const d=setup(data,{copyText:async()=>{throw Error('denied');}});if(data===tools)await d.choice('sample').fire('click');
    const field=d.container.all().find(node=>node.tagName==='TEXTAREA'&&node.getAttribute('aria-label')?.startsWith('คำสั่งพาทำ:'));
    const details=closedDetailsAncestor(field);assert.ok(details);
    await d.find('text','คัดลอกคำสั่ง ให้ AI พาทำ').fire('click');await settle();
    assert.equal(details.open,true);assert.equal(field.focused,true);assert.equal(field.selected,true);assert.equal(closedDetailsAncestor(field),null);
  }
});

test('guided private request and pending clipboard work are cleared on account or lesson disposal',async()=>{
  let resolve,copies=0;const d=setup([starter],{copyText:()=>{copies++;return new Promise(done=>{resolve=done;});}});
  const field=d.find('aria-label','คำสั่งพาทำ: พาทำซอส'),control=d.find('text','คัดลอกคำสั่ง ให้ AI พาทำ');
  await control.fire('click');d.control.destroy();assert.equal(field.value,'');assert.equal(d.container.children.length,0);assert.equal(d.container.hidden,true);
  resolve();await settle();await control.fire('click');assert.equal(copies,1);assert.equal(d.container.children.length,0);
});
test('all44 recipes remain reachable through search, category filtering and the empty-state reset',async()=>{
  const prompts=Array.from({length:44},(_,index)=>({...one,id:'p'+index,title:'สูตร '+index,category:index%2?'ธุรกิจ':'งาน',keywords:['recipe-'+index]}));
  const d=setup([{...tools[0],prompts}]);assert.equal(d.container.all().filter(node=>node.dataset.promptId&&node.tagName==='BUTTON').length,44);
  const search=d.find('aria-label','ค้นหาสูตร'),category=d.find('aria-label','หมวดงาน');
  search.value='recipe-43';await search.fire('input');assert.equal(d.find('class','lt-count').textContent,'พบ 1 จาก 44 สูตร');assert.ok(d.choice('p43'));
  category.value='งาน';await category.fire('change');assert.equal(d.find('class','lt-count').textContent,'พบ 0 จาก 44 สูตร');
  await d.find('text','แสดงทุกสูตร').fire('click');assert.equal(search.value,'');assert.equal(category.value,'');assert.equal(d.find('class','lt-count').textContent,'พบ 44 จาก 44 สูตร');
});
test('selected recipe fields update an editable prompt and copy the revised exact text',async()=>{
  let copied;const d=setup(tools,{copyText:async value=>{copied=value;}});await d.choice('sample').fire('click');
  assert.equal(d.choice('sample').getAttribute('aria-pressed'),'true');
  const recipient=d.find('aria-label','ส่งถึงใคร'),topic=d.find('aria-label','หัวข้อ');recipient.value='ทีมของฉัน';await recipient.fire('input');topic.value='งานรอบใหม่';await topic.fire('input');
  const output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');assert.equal(output.value,'ถึง ทีมของฉัน\nเรื่อง งานรอบใหม่\nเก็บ [ยังไม่ทราบ] ไว้');
  output.value+='\nใช้ภาษาของฉัน';await output.fire('input');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();assert.equal(copied,output.value);
});
test('manual edits survive field changes and switching recipes until explicit rebuild or reset',async()=>{
  const d=setup();await d.choice('sample').fire('click');let output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');
  output.value='ข้อความที่ปรับเอง';await output.fire('input');
  const recipient=d.find('aria-label','ส่งถึงใคร');recipient.value='ลูกค้า';await recipient.fire('input');assert.equal(output.value,'ข้อความที่ปรับเอง');
  assert.equal(d.find('text','ประกอบจากช่องกรอก').hidden,false);
  await d.choice('second').fire('click');await d.choice('sample').fire('click');output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');assert.equal(output.value,'ข้อความที่ปรับเอง');assert.equal(d.find('aria-label','ส่งถึงใคร').value,'ลูกค้า');assert.equal(d.find('text','ประกอบจากช่องกรอก').hidden,false);
  const topic=d.find('aria-label','หัวข้อ');topic.value='ประเด็น';await topic.fire('input');await d.find('text','ประกอบจากช่องกรอก').fire('click');assert.match(output.value,/ถึง ลูกค้า\nเรื่อง ประเด็น/);
  await d.find('text','กลับสูตรต้นฉบับ').fire('click');assert.equal(output.value,one.body);assert.equal(d.find('aria-label','ส่งถึงใคร').value,'');
});
test('clipboard failure selects the visible full prompt and empty edits cannot claim successful copy',async()=>{
  let attempts=0;const d=setup(tools,{copyText:async()=>{attempts++;throw Error('clipboard denied');}});await d.choice('sample').fire('click');
  const output=d.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();
  assert.equal(output.focused,true);assert.equal(output.selected,true);assert.match(d.container.textContent,/เลือกข้อความไว้ให้แล้ว/);
  output.value='';await output.fire('input');await d.find('text','คัดลอก Prompt ที่ปรับแล้ว').fire('click');await settle();assert.equal(attempts,1);assert.match(d.container.textContent,/Prompt ยังว่างอยู่/);
});
test('destroy clears paid tools and drafts, ignores late clipboard responses and blocks detached controls',async()=>{
  let resolve,copies=0;const d=setup(tools,{copyText:()=>{copies++;return new Promise(done=>{resolve=done;});}});await d.choice('sample').fire('click');
  const copy=d.find('text','คัดลอก Prompt ที่ปรับแล้ว');await copy.fire('click');assert.equal(copies,1);d.control.destroy();assert.equal(d.container.hidden,true);assert.equal(d.container.children.length,0);
  resolve();await settle();assert.equal(d.container.children.length,0);await copy.fire('click');assert.equal(copies,1);d.control.destroy();
  const fresh=setup();await fresh.choice('sample').fire('click');assert.equal(fresh.find('aria-label','ปรับข้อความ Prompt: ร่างข้อความ').value,one.body);
});
test('the public component contains no dataset, remote calls, browser persistence or HTML execution',async()=>{
  const [js,css]=await Promise.all(['../assets/lesson-tools.js','../assets/lesson-tools.css'].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  assert.doesNotMatch(js,/\bfetch\s*\(|localStorage|sessionStorage|innerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|\/classroom\//);
  assert.match(css,/@media\(max-width:720px\)/);assert.match(css,/font-size:16px/);assert.match(css,/min-height:46px/);
  const empty=setup([]);assert.equal(empty.container.hidden,true);assert.equal(empty.container.children.length,0);
});
