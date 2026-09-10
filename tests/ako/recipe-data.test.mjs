import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES,getRecipe,scaledIngredients,validateKitchenState} from '../../ako/kitchen/recipes.js';
import {KITCHEN_ORIGIN,recipePath} from '../../ako/kitchen/share.js';
import {renderRecipePage} from '../../tools/build-ako-recipes.mjs';

const root=new URL('../../',import.meta.url);
const readPublic=pathname=>readFileSync(new URL(pathname.replace(/^\//,''),root),'utf8');

test('every public recipe has its own responsive photo in static HTML and sharing previews',async t=>{
  const template=readPublic('/ako/kitchen/index.html');
  const usedPhotos=new Set();
  // Do not filter by recipe.image: that previously let two published dressings
  // silently pass without photos while the image-equipped dishes were checked.
  for(const recipe of RECIPES)await t.test(recipe.id,()=>{
    const {image}=recipe;
    assert.ok(image,`${recipe.id}: public recipes must include a dish photo`);
    assert.match(image.alt,/ภาพประกอบ/,`${recipe.id}: describe the illustration honestly`);
    assert.notEqual(image.path,image.mobile,`${recipe.id}: responsive variants must be distinct`);
    for(const pathname of [image.path,image.mobile]){
      assert.match(pathname,/^\/(?:ako\/kitchen\/art|frontdoor\/art)\/[a-z0-9-]+\.webp$/);
      assert.ok(!usedPhotos.has(pathname),`${recipe.id}: do not substitute another recipe's photo`);
      usedPhotos.add(pathname);
      const bytes=readFileSync(new URL(pathname.slice(1),root));
      assert.equal(bytes.toString('ascii',0,4),'RIFF',`${recipe.id}: ${pathname} must be an actual WebP file`);
      assert.equal(bytes.toString('ascii',8,12),'WEBP',`${recipe.id}: ${pathname} must be an actual WebP file`);
    }
    const expectedImage=KITCHEN_ORIGIN+image.path;
    for(const [surface,html] of [
      ['generator',renderRecipePage(template,recipe)],
      ['published page',readPublic(recipePath(recipe.id)+'index.html')],
    ]){
      const label=`${recipe.id} ${surface}`;
      const figure=html.match(/<figure\b[^>]*\bid="recipe-photo"[^>]*>/)?.[0];
      assert.ok(figure,`${label}: dish figure is present`);
      assert.doesNotMatch(figure,/\bhidden\b/,`${label}: dish photo must be visible without JavaScript`);
      const img=html.match(/<img\b[^>]*\bid="dish-image"[^>]*>/)?.[0];
      assert.ok(img,`${label}: dish image is present`);
      assert.equal(img.match(/\bsrc="([^"]*)"/)?.[1],image.path,`${label}: correct desktop photo`);
      assert.equal(img.match(/\bsrcset="([^"]*)"/)?.[1],`${image.mobile} 600w, ${image.path} 1000w`,`${label}: correct mobile and desktop photos`);
      assert.equal(html.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]*)"/)?.[1],expectedImage,`${label}: sharing uses this dish, not a fallback logo`);
      const json=html.match(/<script\b[^>]*id="recipe-schema"[^>]*>([\s\S]*?)<\/script>/)?.[1];
      assert.ok(json,`${label}: Recipe JSON-LD is present`);
      assert.deepEqual(JSON.parse(json).image,[expectedImage],`${label}: search previews use the same dish photo`);
    }
  });
});

const additions=RECIPES.filter(recipe=>recipe.collection==='japanese-everyday');
const expected=['ginger-chicken-cabbage','chicken-egg-bowl','tofu-mushroom-pan','cabbage-egg-pan','cucumber-sesame-vinegar','mushroom-egg-soup','carrot-tuna-pan','tofu-tomato-cool'];
test('eight distinct additions have a one-person base, source attribution and actual recipe pair links',()=>{
  assert.deepEqual(additions.map(recipe=>recipe.id),expected);
  for(const recipe of additions){
    assert.equal(recipe.servings,1);assert.ok(recipe.adaptation.length>20);
    assert.ok(recipe.sources.length>0);
    for(const source of recipe.sources){
      const url=new URL(source.url);assert.equal(url.protocol,'https:');
      assert.ok(['cookpad.com','www.kikkoman.com','www.kikkoman.co.jp','park.ajinomoto.co.jp'].includes(url.hostname));
      assert.equal(url.search,'');assert.ok(source.title);
    }
    assert.ok(RECIPES.some(item=>item.id===recipe.pair),'Pair must not silently fall back to first recipe');
    assert.equal(recipe.image.path, `/ako/kitchen/art/${recipe.id}-v1.webp`, 'Each new dish has its own matching image');
    assert.equal(recipe.image.mobile, `/ako/kitchen/art/${recipe.id}-v1-mobile.webp`);
    assert.ok(recipe.mixing?.length,'Retain truthful no-image content');
  }
});

test('new recipe quantities scale exactly without fractional eggs or changing taste notes',()=>{
  for(const recipe of additions){
    for(const portions of [1,2,4]){
      const ingredients=scaledIngredients(recipe,portions);
      for(let n=0;n<ingredients.length;n++){
        const item=recipe.ingredients[n],result=ingredients[n];
        assert.equal(result.note,item.note);assert.equal(result.name,item.name);
        if(item.unit==='ฟอง')assert.equal(Number(result.amount),item.quantity*portions);
      }
    }
  }
  assert.equal(scaledIngredients(getRecipe('ginger-chicken-cabbage'),4)[0].amount,'600');
  assert.equal(scaledIngredients(getRecipe('tofu-mushroom-pan'),2)[0].amount,'360');
  assert.equal(scaledIngredients(getRecipe('cucumber-sesame-vinegar'),1)[3].amount,'½');
});

test('raw poultry and egg recipes provide verified cooking endpoints and relevant allergens',()=>{
  for(const id of ['ginger-chicken-cabbage','chicken-egg-bowl']){
    const recipe=getRecipe(id);assert.match(recipe.steps.join(' '),/74°C/);assert.match(recipe.steps.join(' '),/เขียง/);
  }
  for(const id of ['cabbage-egg-pan','mushroom-egg-soup']){
    const recipe=getRecipe(id);assert.match(recipe.steps.join(' '),/71°C/);assert.ok(recipe.allergens.includes('ไข่'));
  }
  assert.ok(getRecipe('carrot-tuna-pan').allergens.includes('ปลา'));
  assert.ok(getRecipe('cabbage-egg-pan').allergens.includes('ข้าวสาลี'));
  assert.ok(getRecipe('cucumber-sesame-vinegar').allergens.includes('งา'));
  assert.match(getRecipe('tofu-tomato-cool').ingredients[0].name,/พร้อมกินตามฉลาก/);
  assert.match(getRecipe('tofu-tomato-cool').steps[0],/ปรุงสุกต้องทำตามฉลาก/);
});

test('old recipe IDs, saved steps and portion semantics remain valid after expansion',()=>{
  const state={version:1,recipeId:'egg-crunch',portions:2,savedIds:['tomato-lime','tomato-sesame','egg-crunch','tofu-rice','yogurt-mustard','soy-lime','peanut-lime'],checkedSteps:[0,2]};
  assert.deepEqual(validateKitchenState(state),state);
  const newState={...state,recipeId:'chicken-egg-bowl',savedIds:[...state.savedIds,'chicken-egg-bowl']};
  assert.deepEqual(validateKitchenState(newState),newState);
});
