import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECIPES,getRecipe} from '../../ako/kitchen/recipes.js';
import {recipePath,recipeIdFromLocation,recipeShare,shareRecipe,copyRecipeLink} from '../../ako/kitchen/share.js';
import {recipeSchema,renderRecipePage,build} from '../../tools/build-ako-recipes.mjs';
import {OUTCOME_PATHS,acceptsOutcomePath} from '../../assets/front-door/outcome-contract.js';

test('every recipe has a clean public URL and old hash bookmarks still select the recipe',()=>{
 for(const recipe of RECIPES){
  const path=recipePath(recipe.id),url=new URL(path,'https://www.myclover.com');
  assert.equal(recipeIdFromLocation(url),recipe.id);
  assert.equal(recipeIdFromLocation(new URL('/ako/kitchen/#'+recipe.id,url)),recipe.id);
  assert.equal(recipeIdFromLocation(new URL(path+'index.html',url)),recipe.id);
  const shared=recipeShare(recipe);assert.equal(shared.url,url.href);
  assert.doesNotMatch(shared.url,/[?#]/);
  assert.ok(OUTCOME_PATHS.includes(path));assert.equal(acceptsOutcomePath('ako',path),true);
  assert.equal(acceptsOutcomePath('xircle',path),false);
 }
 assert.equal(recipePath('../secrets'),'/ako/kitchen/');
 assert.equal(recipeIdFromLocation({pathname:'/ako/kitchen/unknown/',hash:''}),null);
 assert.equal(recipeIdFromLocation({pathname:'/ako/kitchen/',hash:'#<script>'}),null);
});
test('native share receives only public recipe data; cancel neither copies nor reports success',async()=>{
 const recipe=getRecipe('ginger-chicken-cabbage'),calls=[];
 assert.deepEqual(await shareRecipe(recipe,{share:async data=>calls.push(data)}),{status:'shared'});
 assert.deepEqual(calls,[recipeShare(recipe)]);
 const cancelled={share:async()=>{throw Object.assign(Error('cancelled'),{name:'AbortError'});},clipboard:{writeText:async()=>assert.fail('cancel must not copy')}};
 assert.deepEqual(await shareRecipe(recipe,cancelled),{status:'cancelled'});
});
test('sharing falls back to copy; missing/denied clipboard exposes a selectable public URL',async()=>{
 const recipe=getRecipe('cucumber-sesame-vinegar'),url=recipeShare(recipe).url,calls=[];
 assert.deepEqual(await shareRecipe(recipe,{clipboard:{writeText:async text=>calls.push(text)}}),{status:'copied',url});
 assert.deepEqual(calls,[url]);
 assert.deepEqual(await copyRecipeLink(recipe,{}),{status:'manual',url});
 assert.deepEqual(await shareRecipe(recipe,{share:async()=>{throw Error('unavailable');},clipboard:{writeText:async()=>{throw Error('denied');}}}),{status:'manual',url});
});
test('all published recipe pages contain exact preview metadata and complete ingredients/steps without JavaScript',()=>{
 const template=readFileSync(new URL('../../ako/kitchen/index.html',import.meta.url),'utf8');
 for(const recipe of RECIPES){
  const html=renderRecipePage(template,recipe),schema=recipeSchema(recipe);
  assert.match(html,new RegExp(`<body data-recipe-page="${recipe.id}">`));
  assert.ok(html.includes(`<h1 id="recipe-title">${recipe.name}</h1>`));
  assert.ok(html.includes(`<link rel="canonical" href="${recipeShare(recipe).url}">`));
  assert.ok(html.includes(`property="og:url" content="${recipeShare(recipe).url}"`));
  assert.equal(schema.recipeIngredient.length,recipe.ingredients.length);
  assert.equal(schema.recipeInstructions.length,recipe.steps.length);
  assert.equal(schema.recipeYield,recipe.servings+' ที่');
  assert.equal(schema.aggregateRating,undefined);assert.equal(schema.nutrition,undefined);
  for(const step of recipe.steps)assert.ok(html.includes(step),recipe.id+' missing step');
  assert.doesNotMatch(html,/<form\b|type="email"|type="tel"/);
 }
});
test('generated files are current and reproducible',async()=>{await build({check:true});});
