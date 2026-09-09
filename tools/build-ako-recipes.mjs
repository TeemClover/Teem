#!/usr/bin/env node
/** Static per-recipe sharing pages; no framework, API, or runtime rendering service. */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {RECIPES, scaledIngredients} from '../ako/kitchen/recipes.js';
import {recipePath, recipeShare, recipeSchema} from '../ako/kitchen/share.js';
export {recipeSchema};

const root = fileURLToPath(new URL('../', import.meta.url));
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
const labels = {salad:'สลัด', meal:'จานอุ่น', dressing:'น้ำสลัด'};
function inner(html, tag, id, value) {
  const expression = new RegExp(`(<${tag}\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(<\\/${tag}>)`);
  if (!expression.test(html)) throw Error(`Missing recipe template target: ${id}`);
  return html.replace(expression, (_, open, close) => open + value + close);
}
function meta(html, key, value) {
  const expression = new RegExp(`(<meta\\s+(?:name|property)="${key}"\\s+content=")[^"]*("[^>]*>)`);
  if (!expression.test(html)) throw Error(`Missing recipe meta: ${key}`);
  return html.replace(expression, (_, open, close) => open + escape(value) + close);
}
export function renderRecipePage(template, recipe, {library = false} = {}) {
  let html = template;
  const share=recipeShare(recipe), url=library?'https://www.myclover.com/ako/kitchen/':share.url;
  html=html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(library?'ครัวเอโกะ — อร่อยง่าย จากของในครัว':share.title)}</title>`);
  html=meta(html,'description',library?`${RECIPES.length} สูตรสลัด จานอุ่น และอาหารบ้านแบบญี่ปุ่น วัตถุดิบหาง่าย ปรับเสิร์ฟ เก็บสูตร และแบ่งปันได้`:recipe.short+' · วัตถุดิบพร้อมปริมาณและวิธีทำทีละขั้น');
  for(const [key,value] of Object.entries({'og:title':library?'ครัวเอโกะ — วันนี้ทำอะไรอร่อย ๆ กัน':share.title,'og:description':recipe.short,'og:url':url,'og:image':'https://www.myclover.com'+(recipe.image?.path||'/ako/assets/ako-logo.png')}))html=meta(html,key,value);
  html=html.replace(/(<link rel="canonical" href=")[^"]*(">)/,(_,a,b)=>a+url+b);
  html=html.replace(/<body[^>]*>/,library?'<body>':`<body data-recipe-page="${recipe.id}">`);
  html=html.replace(/เลือกจาก \d+ สูตร/g,`เลือกจาก ${RECIPES.length} สูตร`).replace(/\d+ สูตร · \d+–\d+ นาที/g,`${RECIPES.length} สูตร · 3–${Math.max(...RECIPES.map(r=>r.minutes))} นาที`);
  html=inner(html,'span','library-count',`${RECIPES.length} สูตร`);
  html=inner(html,'nav','recipe-list',RECIPES.map(r=>`<a href="${recipePath(r.id)}" data-recipe="${r.id}" aria-current="${r.id===recipe.id}">${escape(r.name)} <span>${r.minutes} นาที</span></a>`).join('\n'));
  html=inner(html,'p','recipe-kicker',`${labels[recipe.category]} · ประมาณ ${recipe.minutes} นาที`);
  html=inner(html,'h2','recipe-title',escape(recipe.name));
  if(!library)html=html.replace(/<h2 id="recipe-title">(.*?)<\/h2>/, '<h1 id="recipe-title">$1</h1>');
  for(const [id,value] of Object.entries({'recipe-short':recipe.short,technique:recipe.technique,substitution:recipe.swap,'serving-note':recipe.finish}))html=inner(html,'p',id,escape(value));
  html=inner(html,'span','step-progress',`0 / ${recipe.steps.length}`);
  html=inner(html,'p','portion-summary',`ปริมาณสำหรับ ${recipe.servings} คน`);
  html=inner(html,'ul','ingredients',scaledIngredients(recipe,recipe.servings).map(item=>`<li><span>${escape(item.name)}</span><b${item.quantity===null?' class="note-amount"':''}>${escape(item.quantity===null?item.note:`${item.amount} ${item.unit}`)}</b></li>`).join(''));
  html=inner(html,'ol','steps',recipe.steps.map(step=>`<li>${escape(step)}</li>`).join(''));
  html=inner(html,'p','allergens',recipe.allergens.length?'ส่วนผสมที่ควรเช็ก: '+escape(recipe.allergens.join(' · ')):'');
  html=html.replace(/(<p class="allergens" id="allergens")(?: hidden)?/,`$1${recipe.allergens.length?'':' hidden'}`);
  // Set each toggle independently (all matches), rather than leaving the template default.
  html=html.replace(/(<button type="button" data-portions="(1|2|4)" aria-pressed=")[^"]*/g,(_,open,n)=>open+String(Number(n)===recipe.servings));
  const image=recipe.image;
  html=html.replace(/(<figure class="recipe-photo" id="recipe-photo")(?: hidden)?/,`$1${image?'':' hidden'}`);
  html=html.replace(/(<div class="mixing-note" id="mixing-note")(?: hidden)?/,`$1${image?' hidden':''}`);
  if(image)html=html.replace(/<img id="dish-image"[^>]*>/,`<img id="dish-image" src="${image.path}" srcset="${image.mobile} 600w, ${image.path} 1000w" sizes="(max-width: 760px) 100vw, 60vw" width="1000" height="667" alt="${escape(image.alt)}" decoding="async">`);
  else html=inner(html,'div','mixing-note',(recipe.mixing||[]).map(line=>`<strong>${escape(line)}</strong>`).join('')+`<small>${escape(recipe.mixingUnit||'')}</small>`);
  html=html.replace(/(<input id="share-link"[^>]*value=")[^"]*/,(_,a)=>a+share.url);
  html=html.replace(/(<a id="share-line" href=")[^"]*/,(_,a)=>a+'https://line.me/R/share?text='+encodeURIComponent(share.text+'\n'+share.url));
  const pair=RECIPES.find(r=>r.id===recipe.pair);
  html=html.replace(/(<a class="pair-link" id="pair-link" href=")[^"]*/,(_,a)=>a+recipePath(pair.id));
  html=inner(html,'a','pair-link',`<small>${recipe.category==='dressing'?'ลองกับจานนี้':'ครั้งหน้า ลองเปลี่ยนรส'}</small><span>${escape(pair.name)} <b aria-hidden="true">↗</b></span>`);
  html=inner(html,'div','recipe-sources',(recipe.sources||[]).map(source=>`<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>`).join(''));
  html=html.replace(/(<details id="source-note" class="source-note")(?: hidden)?/,`$1${recipe.sources?.length?'':' hidden'}`);
  html=html.replace(/<noscript>[\s\S]*?<\/noscript>/,'<noscript><p class="noscript-note">อ่านสูตรและเปิดเมนูอื่นได้ครบ เปิด JavaScript เพื่อปรับจำนวนเสิร์ฟ เก็บสูตร และติ๊กขั้นตอน</p></noscript>');
  html=html.replace(/\s*<script type="application\/ld\+json" id="recipe-schema">[\s\S]*?<\/script>/,'');
  html=html.replace('</head>',`  <script type="application/ld+json" id="recipe-schema">${json(recipeSchema(recipe))}</script>\n</head>`);
  return html;
}
export async function build({check = false} = {}) {
  const template=await readFile(path.join(root,'ako/kitchen/index.html'),'utf8');
  const files=new Map([['ako/kitchen/index.html',renderRecipePage(template,RECIPES[0],{library:true})]]);
  const catalog=RECIPES.map(({id,name,minutes,category})=>({id,path:recipePath(id),name,minutes,category}));
  files.set('ako/kitchen/catalog.js',`// Generated by tools/build-ako-recipes.mjs; edit recipes.js instead.\nexport const RECIPE_LINKS = Object.freeze(${JSON.stringify(catalog,null,2)});\n`);
  for(const recipe of RECIPES)files.set(recipePath(recipe.id).slice(1)+'index.html',renderRecipePage(template,recipe));
  const sitemap=(await readFile(path.join(root,'sitemap.xml'),'utf8')).replace(/\s*<!-- AKO_RECIPES_START -->[\s\S]*?<!-- AKO_RECIPES_END -->/,'');
  const entries=catalog.map(recipe=>`  <url><loc>https://www.myclover.com${recipe.path}</loc><lastmod>2026-09-10</lastmod></url>`).join('\n');
  files.set('sitemap.xml',sitemap.replace('</urlset>',`  <!-- AKO_RECIPES_START -->\n${entries}\n  <!-- AKO_RECIPES_END -->\n</urlset>`));
  const outdated=[];
  for(const [name,content] of files){
    const filename=path.join(root,name);
    let current;try{current=await readFile(filename,'utf8');}catch{}
    if(current===content)continue;
    if(check){outdated.push(name);continue;}
    await mkdir(path.dirname(filename),{recursive:true});await writeFile(filename,content);
  }
  if(outdated.length)throw Error('Regenerate Ako recipes: '+outdated.join(', '));
  console.log(`${check?'Verified':'Generated'} ${RECIPES.length} shareable recipe pages + library/catalog`);
}
if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url))await build({check:process.argv.includes('--check')});
