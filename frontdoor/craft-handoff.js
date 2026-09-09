/** A bounded local artifact passes into Dungeon without changing its legacy state. */
import { randomId, validId } from '../assets/front-door/contract.js';
import { validateReward, CRAFT_COLLECTIONS, craftPhotoPath, craftPhotoFocus } from './rewards.js';

export const CRAFT_HANDOFF_TTL = 24 * 60 * 60 * 1000;
export const CRAFT_SOURCE_LIMIT = 16000;
export const craftHandoffKey = id => `mc:frontdoor:craft-handoff:v1:${id}`;
export const craftWorkKey = (journeyId, id) => `mc:frontdoor:craft-work:v1:${journeyId}:${id}`;
export const craftIndexKey = journeyId => `mc:frontdoor:craft-index:v1:${journeyId}`;
const ACTIVE_JOURNEY = 'mc:frontdoor:underpaper-study:v1:active_journey';
const escapeHTML = text => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function craftIndex(storage, journeyId) {
  try {
    const raw=storage?.getItem(craftIndexKey(journeyId));
    if(!raw || raw.length>4096)return [];
    const list=JSON.parse(raw);
    return Array.isArray(list)?list.filter(id=>validId(id,'h')).slice(0,16):[];
  } catch { return []; }
}

function findCraft(storage, reward, options) {
  for(const id of craftIndex(storage,options.journeyId)){
    const saved=loadCraftWork(storage,id,options);
    const artifact=saved?.artifact || loadCraftHandoff(storage,id,options);
    if(artifact?.title===reward.title && artifact.design===reward.design &&
      artifact.collection===reward.collection && (artifact.photo??0)===(reward.photo??0))return {artifact,saved};
  }
  return null;
}

export function writeCraftHandoff(storage, input, {journeyId, now = Date.now, idFactory = randomId} = {}) {
  const reward = validateReward('silver', input);
  if (!reward?.complete || !validId(journeyId, 'j')) return {ok:false,error:'INVALID_CRAFT'};
  const existing=findCraft(storage,reward,{journeyId,now});
  if(existing)return {ok:true,href:`/classroom/dungeon/?entry=compass&work=${existing.artifact.id}#q2`};
  const id = idFactory('h'), createdAt = now();
  if (!validId(id, 'h') || !Number.isSafeInteger(createdAt) || createdAt <= 0) return {ok:false,error:'INVALID_CRAFT'};
  const record = {version:1,id,journeyId,createdAt,title:reward.title,design:reward.design,
    ...(reward.collection ? {collection:reward.collection,photo:reward.photo} : {})};
  const raw = JSON.stringify(record);
  try {
    if (!storage) return {ok:false,error:'STORAGE_UNAVAILABLE'};
    if(storage.getItem(craftHandoffKey(id))!==null)return {ok:false,error:'CRAFT_ID_EXISTS'};
    storage.setItem(craftHandoffKey(id), raw);
    if (storage.getItem(craftHandoffKey(id)) !== raw) return {ok:false,error:'CRAFT_NOT_SAVED'};
    const index=JSON.stringify([id,...craftIndex(storage,journeyId).filter(ref=>ref!==id)].slice(0,16));
    storage.setItem(craftIndexKey(journeyId),index);
    if(storage.getItem(craftIndexKey(journeyId))!==index)return {ok:false,error:'CRAFT_NOT_SAVED'};
  } catch { return {ok:false,error:'CRAFT_NOT_SAVED'}; }
  return {ok:true,href:`/classroom/dungeon/?entry=compass&work=${id}#q2`};
}

/** An explicit keepsake continuation may start a new journey. Copy saved source
 * into its new work; never move, delete or rebind the original journey's work. */
export function forkCraftHandoff(storage, fromJourneyId, toJourneyId, input, {now=Date.now,idFactory=randomId}={}) {
  const reward=validateReward('silver',input);
  if(!reward?.complete || !validId(fromJourneyId,'j') || !validId(toJourneyId,'j'))return {ok:false,error:'INVALID_CRAFT'};
  const original=findCraft(storage,reward,{journeyId:fromJourneyId,now});
  const next=writeCraftHandoff(storage,reward,{journeyId:toJourneyId,now,idFactory});
  if(!next.ok || !original?.saved)return {...next,restored:false};
  const id=new URL(next.href,'https://local.invalid').searchParams.get('work');
  if(loadCraftWork(storage,id,{journeyId:toJourneyId,now}))return {...next,restored:true};
  const saved=saveCraftWork(storage,id,original.saved.source,{journeyId:toJourneyId,now});
  return saved.ok?{...next,restored:true}:{ok:false,error:saved.error,href:next.href,restored:false};
}

function readArtifact(storage, id, {journeyId, now = Date.now} = {}, allowExpired = false) {
  if (!validId(id, 'h')) return null;
  try {
    const expected = journeyId ?? storage?.getItem(ACTIVE_JOURNEY);
    if (!validId(expected, 'j')) return null;
    const raw = storage?.getItem(craftHandoffKey(id));
    if (!raw || raw.length > 2048) return null;
    const value = JSON.parse(raw), age = now() - value.createdAt;
    if (value.version !== 1 || value.id !== id || value.journeyId !== expected ||
      !Number.isSafeInteger(value.createdAt) || value.createdAt <= 0 || !Number.isFinite(age) || age < 0 || (!allowExpired && age > CRAFT_HANDOFF_TTL)) return null;
    if (typeof value.title !== 'string' || !['editorial','signal'].includes(value.design)) return null;
    const reward = validateReward('silver', {...value,version:1,edited:true,complete:true});
    if (!reward?.complete || reward.title !== value.title) return null;
    if(value.collection !== undefined && (!reward.collection || value.photo !== reward.photo))return null;
    return {version:1,id,journeyId:expected,createdAt:value.createdAt,title:reward.title,design:reward.design,
      ...(reward.collection ? {collection:reward.collection,photo:reward.photo} : {})};
  } catch { return null; }
}

export function loadCraftHandoff(storage, id, options = {}) {
  return readArtifact(storage, id, options);
}

/** Saved work has no artificial expiry. Its original opaque handoff and journey
 * must still match; an unsaved handoff retains its normal 24-hour expiry. */
export function loadCraftWork(storage, id, options = {}) {
  const artifact = readArtifact(storage, id, options, true);
  if (!artifact) return null;
  try {
    const key = craftWorkKey(artifact.journeyId, id), slot = storage.getItem(key);
    if (!['a', 'b'].includes(slot)) return null;
    const raw = storage.getItem(`${key}:${slot}`);
    if (!raw || raw.length > CRAFT_SOURCE_LIMIT * 6 + 1024) return null;
    const record = JSON.parse(raw), timestamp = (options.now || Date.now)();
    if (record.version !== 1 || record.id !== id || record.journeyId !== artifact.journeyId ||
      record.createdAt !== artifact.createdAt || !Number.isSafeInteger(record.savedAt) ||
      record.savedAt < artifact.createdAt || record.savedAt > timestamp ||
      typeof record.source !== 'string' || record.source.length > CRAFT_SOURCE_LIMIT) return null;
    return {artifact, source:record.source, savedAt:record.savedAt};
  } catch { return null; }
}

/** Two bounded slots keep the previous saved source intact until readback of
 * the new source succeeds. No source is sent to analytics, a URL or a server. */
export function saveCraftWork(storage, id, source, options = {}) {
  if (typeof source !== 'string' || source.length > CRAFT_SOURCE_LIMIT) return {ok:false,error:'INVALID_SOURCE'};
  const artifact = readArtifact(storage, id, options, true);
  if (!artifact) return {ok:false,error:storage?'CRAFT_UNAVAILABLE':'STORAGE_UNAVAILABLE'};
  const savedAt = (options.now || Date.now)();
  if (!Number.isSafeInteger(savedAt) || savedAt < artifact.createdAt) return {ok:false,error:'INVALID_TIME'};
  const key = craftWorkKey(artifact.journeyId, id);
  try {
    const slot = storage.getItem(key) === 'a' ? 'b' : 'a';
    const raw = JSON.stringify({version:1,id,journeyId:artifact.journeyId,createdAt:artifact.createdAt,savedAt,source});
    storage.setItem(`${key}:${slot}`, raw);
    if (storage.getItem(`${key}:${slot}`) !== raw) return {ok:false,error:'CRAFT_NOT_SAVED'};
    storage.setItem(key, slot);
    if (storage.getItem(key) !== slot) return {ok:false,error:'CRAFT_NOT_SAVED'};
    return {ok:true,savedAt};
  } catch { return {ok:false,error:'CRAFT_NOT_SAVED'}; }
}

export function craftHTML(artifact) {
  const title = escapeHTML(artifact.title), signal = artifact.design === 'signal';
  const collection = CRAFT_COLLECTIONS[artifact.collection];
  const model = {title:artifact.title,design:artifact.design,
    ...(collection ? {collection:artifact.collection,photo:artifact.photo || 0} : {})};
  const marker = JSON.stringify(model).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  if (collection) return `<!doctype html>
<!--myclover-craft:${marker}-->
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
*{box-sizing:border-box}body{margin:0;background:${signal?'#d5e7bb':'#eee6d5'};color:#223c33;font:16px/1.6 system-ui,sans-serif}
main{padding:24px;max-width:880px;margin:auto;display:flex;flex-direction:column}header{order:${signal?2:0}}small{font-size:10px;letter-spacing:.14em}h1{font-size:clamp(24px,5vw,42px);line-height:1.25;font-weight:${signal?750:500};margin:12px 0 20px;overflow-wrap:anywhere}.craft-slides{order:${signal?0:1};position:relative}.craft-slide{display:none;margin:0}.craft-slide img{display:block;width:100%;aspect-ratio:1.85;object-fit:cover;background:#d9dece}.craft-slide figcaption{margin-top:12px;line-height:1.5}.craft-slide strong{font-size:16px}.craft-slide p{font-size:13px;margin:4px 0 0;color:#52655a}
${collection.photos.map((_,i)=>`main:has(#craft-photo-${i}:checked) .craft-slide-${i}{display:block}`).join('')}
.craft-thumbs{order:${signal?1:2};display:flex;gap:8px;border:0;padding:0;margin:16px 0}.craft-thumbs label{position:relative;display:block;width:70px;height:50px;cursor:pointer}.craft-thumbs input{z-index:1;position:absolute;width:100%;height:100%;inset:0;opacity:0;margin:0;cursor:pointer}.craft-thumbs img{pointer-events:none;display:block;width:100%;height:100%;object-fit:cover;opacity:.55;border:2px solid transparent}.craft-thumbs input:checked+img{opacity:1;border-color:#2d5c46}.craft-thumbs input:focus-visible+img{outline:2px solid #215440;outline-offset:3px}.craft-expand{position:absolute;right:8px;top:8px;z-index:2;color:#fff5dc;background:#173d30e6;padding:8px 12px;min-height:44px;font-size:13px;cursor:pointer}.craft-expand input{accent-color:#b2d89b;margin-right:7px}main:has(#craft-expand:checked) .craft-slide img{aspect-ratio:1;object-fit:contain}.craft-credit{order:3;font-size:11px;color:#52655a;margin-top:10px}
</style></head><body data-craft-design="${signal?'signal':'editorial'}" data-craft-photo="${artifact.photo || 0}"><main>
<header><small>MY LITTLE WORLD</small><h1>${title}</h1></header>
<div class="craft-slides"><label class="craft-expand"><input type="checkbox" id="craft-expand">ภาพเต็ม</label>
${collection.photos.map((photo,i)=>`<figure class="craft-slide craft-slide-${i}"><img src="${craftPhotoPath(photo[0])}" style="object-position:${craftPhotoFocus(photo[0])}" alt="${escapeHTML(photo[1])}"><figcaption><strong>${escapeHTML(photo[1])}</strong><p>${escapeHTML(photo[2])}</p></figcaption></figure>`).join('')}
</div><fieldset class="craft-thumbs" aria-label="เลือกภาพในเว็บ">
${collection.photos.map((photo,i)=>`<label><input id="craft-photo-${i}" type="radio" name="craft-photo" value="${i}" aria-label="ดูภาพ ${i+1}: ${escapeHTML(photo[1])}"${i===(artifact.photo||0)?' checked':''}><img src="${craftPhotoPath(photo[0])}" alt=""></label>`).join('')}
</fieldset><p class="craft-credit">${escapeHTML(collection.caption)}</p></main></body></html>`;
  return `<!doctype html>
<!--myclover-craft:${marker}-->
<html lang="th"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
    background:${signal?'#c7e687':'#e7dec6'}; color:${signal?'#183529':'#263c2e'};
    font-family:system-ui,sans-serif; }
  main { padding:32px; max-width:600px; overflow-wrap:anywhere; }
  small { letter-spacing:.12em; }
  h1 { font-size:clamp(28px,6vw,54px); line-height:1.3; font-weight:${signal?'750':'500'}; }
</style></head><body>
<main><small>A SMALL BEGINNING</small>
  <h1>${title}</h1>
  <p>เริ่มจากสิ่งเล็ก ๆ ที่เป็นของเรา</p>
</main></body></html>`;
}

/** Only our exact generated document can be changed by visual controls. Custom
 * saved HTML remains verbatim; its marker can never silently overwrite edits. */
export function readCraftModel(source) {
  if(typeof source !== 'string' || source.length>CRAFT_SOURCE_LIMIT)return null;
  const marker=source.match(/^<!doctype html>\n<!--myclover-craft:(.{1,1000})-->/);
  if(!marker)return null;
  try {
    const model=JSON.parse(marker[1]);
    const reward=validateReward('silver',{...model,edited:true,complete:true});
    return reward?.complete && craftHTML(reward)===source ? reward : null;
  } catch {return null;}
}

// The sandbox never permits scripts or same-origin access. Photo requests are
// restricted to the exact bundled gallery image paths on this runtime's origin.
export function craftPreview(source, {origin=globalThis.location?.origin}={}) {
  let images='';
  try {const url=new URL(origin);if(['http:','https:'].includes(url.protocol)&&url.origin===origin)
    images=[...new Set(Object.values(CRAFT_COLLECTIONS).flatMap(c=>c.photos.map(p=>`${url.origin}${craftPhotoPath(p[0])}`)))].join(' ');
  }catch{}
  return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: ${images}; form-action 'none'; base-uri 'none'">${source}`;
}

export function mountDungeonCraftHandoff({doc = globalThis.document, search = globalThis.location?.search || '', storage, now = Date.now} = {}) {
  const params = new URLSearchParams(search);
  if (params.get('entry') !== 'compass' || !params.has('work')) return null;
  const quest = doc?.querySelector('#q2');
  if (!quest || doc.querySelector('#compass-craft')) return null;
  if (storage === undefined) {try { storage = globalThis.localStorage; } catch { storage = null; }}
  const savedWork = loadCraftWork(storage, params.get('work'), {now});
  const artifact = savedWork?.artifact || loadCraftHandoff(storage, params.get('work'), {now});
  const section = doc.createElement('section');section.id = 'compass-craft';
  const make = (tag, text) => {const el=doc.createElement(tag);if(text)el.textContent=text;return el;};
  const style = make('style');
  style.textContent = `#compass-craft{padding:24px;color:#fff0d0;border-bottom:1px solid #b8aa7b55;font:16px/1.65 system-ui,sans-serif;overflow-wrap:anywhere}#compass-craft [hidden]{display:none!important}#compass-craft h3{font-size:28px;line-height:1.4;margin:0 0 10px}#compass-craft h4{font-size:21px;line-height:1.5;margin:0 0 8px}#compass-craft p{margin:8px 0 16px}#compass-craft .craft-lab{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}#compass-craft label{display:block}#compass-craft textarea{display:block;box-sizing:border-box;width:100%;height:360px;font:14px/1.6 ui-monospace,monospace;padding:12px;background:#102018;color:#f6e9c6;border:1px solid #b8aa7b77;border-radius:0;resize:vertical}#compass-craft iframe{width:100%;height:360px;border:0;background:#e7dec6;display:block}#compass-craft button,#compass-craft a{box-sizing:border-box;font:inherit;min-height:44px;margin-top:12px;padding:8px 12px;display:inline-flex;align-items:center;justify-content:center;color:#ffe3a8;background:none;border:1px solid #b8aa7b77;cursor:pointer;text-decoration:none}#compass-craft button:focus-visible,#compass-craft textarea:focus-visible,#compass-craft a:focus-visible{outline:2px solid #ffe3a8;outline-offset:3px}#compass-craft .craft-actions{display:flex;flex-wrap:wrap;gap:0 10px}#compass-craft .craft-save{background:#e7dec6;color:#263c2e;border-color:#e7dec6}#compass-craft .craft-status{font-size:15px;color:#dbe7c4;min-height:1.65em}#compass-craft .craft-status[data-state=error]{color:#ffcbac}#compass-craft .craft-ending{border-top:1px solid #b8aa7b55;margin-top:22px;padding-top:22px}#compass-craft .craft-ending p{max-width:56ch}#compass-craft .craft-note{font-size:14px;color:#dbe7c4}@media(max-width:700px){#compass-craft{padding:18px 14px}#compass-craft h3{font-size:24px}#compass-craft .craft-lab{grid-template-columns:minmax(0,1fr)}#compass-craft .craft-preview{order:-1}#compass-craft textarea{height:240px;font-size:16px}#compass-craft iframe{height:280px}}@media(max-width:400px){#compass-craft .craft-actions>*{width:100%}}`;
  style.textContent += `html:has(#compass-craft){scroll-behavior:auto}#compass-craft .craft-lab{display:block}#compass-craft iframe{height:600px}#compass-craft .craft-visual{display:flex;flex-wrap:wrap;gap:0 10px}#compass-craft .craft-visual button[aria-pressed=true]{background:#d5e7bb;color:#183529}#compass-craft .craft-code{margin:18px 0}#compass-craft .craft-code summary{cursor:pointer;min-height:44px;padding:10px 0;box-sizing:border-box;color:#decda8}#compass-craft .craft-code summary:focus-visible{outline:2px solid #ffe3a8;outline-offset:3px}#compass-craft .craft-code textarea{margin-top:12px}@media(max-width:700px){#compass-craft iframe{height:545px}}`;
  section.append(style);
  if (!artifact) {
    section.append(make('h3','ชิ้นที่ส่งมายังเปิดตรงนี้ไม่ได้'),make('p','กลับไปที่เข็มทิศแล้วเปิดชิ้นเดิมอีกครั้งได้ ห้องทดลองข้างล่างยังใช้ได้ตามปกติ'));
    const back=make('a','กลับไปหาชิ้นของฉัน');back.href='/frontdoor/';section.append(back);quest.prepend(section);
    return {ok:false,error:'CRAFT_UNAVAILABLE'};
  }
  let visualModel=readCraftModel(savedWork?.source ?? craftHTML(artifact));
  section.append(make('h3',savedWork?'เว็บที่คุณเก็บไว้ อยู่ตรงนี้แล้ว':'เว็บชิ้นเดิม พร้อมให้เล่นต่อ'),make('p',visualModel
    ? 'ลองกดภาพในเว็บ แล้วเปลี่ยนการจัดวางด้วยมือคุณ'
    : 'เปิดฉบับที่คุณปรับไว้ให้แล้ว โค้ดเดิมยังอยู่ครบ'));
  const grid=make('div');grid.className='craft-lab';
  const label=make('label','HTML ของชิ้นนี้'),editor=make('textarea');editor.id='compass-craft-code';editor.setAttribute('aria-label','แก้ HTML ของชิ้นที่สร้างจากเข็มทิศ');editor.spellcheck=false;editor.maxLength=CRAFT_SOURCE_LIMIT;editor.value=savedWork?.source ?? craftHTML(artifact);label.append(editor);
  const preview=make('div');preview.className='craft-preview';
  const frame=make('iframe');frame.id='compass-craft-frame';frame.title='เว็บชิ้นที่คุณสร้างจากเข็มทิศ';frame.setAttribute('sandbox','');frame.srcdoc=craftPreview(editor.value);preview.append(frame);grid.append(preview);section.append(grid);
  const visual=make('div');visual.className='craft-visual';visual.hidden=!visualModel;
  const visualButtons=[];
  function applyVisual(patch) {
    if(!visualModel)return;
    visualModel=validateReward('silver',{...visualModel,...patch});
    editor.value=craftHTML(visualModel);renderSource();
    for(const button of visualButtons)button.setAttribute('aria-pressed',String(button.dataset.design===visualModel.design));
    report('จัดหน้าใหม่แล้ว · กดเก็บเว็บชิ้นนี้เมื่อชอบ');
  }
  for(const [design,copy]of [['editorial','เล่าเป็นเรื่อง'],['signal','ให้ภาพนำ']]) {
    const button=make('button',copy);button.type='button';button.dataset.design=design;
    button.setAttribute('aria-pressed',String(visualModel?.design===design));
    button.addEventListener('click',()=>applyVisual({design}));visual.append(button);visualButtons.push(button);
  }
  if(visualModel?.collection){
    const nextPhoto=make('button','เปลี่ยนภาพเปิด');nextPhoto.type='button';
    nextPhoto.addEventListener('click',()=>applyVisual({photo:(visualModel.photo+1)%3}));visual.append(nextPhoto);
  }
  section.append(visual);
  const code=make('details');code.className='craft-code';code.open=!visualModel;
  code.append(make('summary','อยากดูข้างใน? เปิดโค้ดของเว็บนี้'),label);
  const render=make('button','เปิดดูชิ้นที่แก้แล้ว');render.type='button';code.append(render);section.append(code);
  const save=make('button','เก็บเว็บชิ้นนี้');save.type='button';save.className='craft-save';
  const actions=make('div');actions.className='craft-actions';actions.append(save);
  let savedSource=savedWork?.source ?? null;
  const status=make('p',savedWork?'เปิดฉบับที่เก็บไว้ในเบราว์เซอร์นี้แล้ว':'เว็บนี้กดเล่นได้แล้ว · เก็บไว้เพื่อกลับมาทำต่อ');status.className='craft-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const ending=make('div');ending.className='craft-ending';ending.hidden=false;
  const accomplishment=make('h4',savedWork?'นี่คือเว็บที่คุณสร้างและเก็บไว้':'เว็บชิ้นนี้เริ่มจากมือคุณ');
  ending.append(accomplishment,make('p','จากชิ้นเล็ก ๆ ตรงนี้ อยากให้มันทำอะไรต่อ? ลองต่อเอง หรือเอาไอเดียมาคุยกับทีม'));
  const next=make('div');next.className='craft-actions';
  const keep=make('button','ลองสร้างต่อ');keep.type='button';keep.addEventListener('click',()=>{if(visualModel){visualButtons[0].focus();visual.scrollIntoView?.({block:'center',behavior:'auto'});}else{code.open=true;editor.focus();editor.scrollIntoView?.({block:'center',behavior:'auto'});}});
  const meet=make('a','คุยกับทีมเรื่องเว็บชิ้นนี้');meet.href='/meet/?entry=compass&intent=ai&topic=private';
  const back=make('a','กลับไปที่เข็มทิศ');back.href='/frontdoor/';next.append(keep,meet,back);ending.append(next);
  const note=make('p','เก็บเฉพาะในเบราว์เซอร์นี้ ยังไม่ได้เผยแพร่เว็บหรือส่งโค้ดให้ทีม');note.className='craft-note';ending.append(note);
  const report=(text,state='ready')=>{status.textContent=text;status.dataset.state=state;};
  const renderSource=()=>{
    if(editor.value.length>CRAFT_SOURCE_LIMIT){report('ชิ้นนี้ยาวเกินพื้นที่ทดลอง 16,000 ตัวอักษร ลดความยาวลงก่อนเปิดหรือเก็บ','error');return false;}
    frame.srcdoc=craftPreview(editor.value);ending.hidden=false;
    accomplishment.textContent=editor.value===savedSource?'นี่คือเว็บที่คุณสร้างและเก็บไว้':'เว็บชิ้นนี้เริ่มจากมือคุณ';
    return true;
  };
  editor.addEventListener('input',()=>{
    visualModel=readCraftModel(editor.value);visual.hidden=!visualModel;
    const unchanged=editor.value===savedSource;
    report(unchanged?'ตรงกับฉบับที่เก็บไว้ในเบราว์เซอร์นี้':'มีการแก้เพิ่มที่ยังไม่ได้เก็บ · กดเก็บก่อนออก');
    if(!unchanged)accomplishment.textContent='ลองเปิดดูสิ่งที่คุณเพิ่งเปลี่ยน';
  });
  render.addEventListener('click',()=>{
    if(renderSource())report(editor.value===savedSource?'เปิดฉบับที่เก็บไว้แล้ว':'เปิดจาก HTML ที่คุณแก้แล้ว · กดเก็บเว็บชิ้นนี้ก่อนออก');
  });
  save.addEventListener('click',()=>{
    if(!renderSource())return;
    const result=saveCraftWork(storage,artifact.id,editor.value,{journeyId:artifact.journeyId,now});
    if(!result.ok){report('ยังเก็บไม่ได้ในเบราว์เซอร์นี้ · งานยังอยู่ในช่องแก้ไข อย่าเพิ่งปิดแท็บ','error');return;}
    savedSource=editor.value;accomplishment.textContent='นี่คือเว็บที่คุณสร้างและเก็บไว้';
    report('เก็บฉบับนี้แล้ว · กลับมาเปิดลิงก์นี้ในเบราว์เซอร์เดิมเพื่อทำต่อได้','saved');
  });
  section.append(actions,status,ending);quest.prepend(section);
  // Dungeon's initial smooth #q2 scroll can already be running before this
  // asynchronous adapter arrives. Cancel that old trajectory and land on the
  // actual artifact, so its controls do not move underneath the first touch.
  if (doc.defaultView?.location.hash === '#q2') {
    section.style.scrollMarginTop='calc(var(--hud, 52px) + 20px)';
    section.scrollIntoView?.({block:'start',behavior:'instant'});
  }
  return {ok:true,artifact,restored:!!savedWork};
}
