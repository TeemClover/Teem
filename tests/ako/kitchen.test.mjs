import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {RECIPES, getRecipe, quantityText, scaledIngredients, normalizePortions, KITCHEN_KEY, validateKitchenState, persistKitchenState, loadKitchenState} from '../../ako/kitchen/recipes.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => readFileSync(root + path, 'utf8');
const storage = () => { const map = new Map([['c7:install_id', 'legacy-install'], ['mc_forge_progress', 'legacy-reading'], ['meet:intake:draft', 'private-draft']]); return {map, getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value)}; };

test('seven complete recipes include measured ingredients, short steps, substitutions and useful techniques', () => {
  assert.equal(RECIPES.length, 7);
  assert.equal(new Set(RECIPES.map(recipe => recipe.id)).size, 7);
  for (const recipe of RECIPES) {
    assert.match(recipe.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(recipe.minutes >= 3 && recipe.minutes <= 20);
    assert.equal(recipe.servings, 2);
    assert.ok(recipe.ingredients.length >= 5);
    assert.ok(recipe.steps.length >= 3 && recipe.steps.length <= 4);
    assert.ok(recipe.technique && recipe.swap && recipe.finish);
    assert.notEqual(getRecipe(recipe.pair).id, recipe.id);
    for (const item of recipe.ingredients) {
      assert.ok(item.name);
      assert.ok((Number.isFinite(item.quantity) && item.quantity > 0 && item.unit) || (item.quantity === null && item.note));
    }
  }
});

test('one/four portions scale ingredient amounts and preserve taste-adjusted notes', () => {
  const recipe = getRecipe('egg-crunch');
  assert.equal(scaledIngredients(recipe, 1)[0].amount, '1');
  assert.equal(scaledIngredients(recipe, 4)[0].amount, '4');
  assert.equal(scaledIngredients(getRecipe('tomato-lime'), 4)[0].amount, '400');
  assert.equal(scaledIngredients(getRecipe('peanut-lime'), 1)[0].amount, '½');
  assert.equal(scaledIngredients(recipe, 4).at(-1).quantity, null);
  assert.equal(quantityText(0.25), '¼');
  assert.equal(quantityText(1.5), '1½');
  assert.equal(normalizePortions(2000), 2);
  assert.equal(normalizePortions('4'), 4);
});

test('recipe illustrations are real files with distinct responsive variants', () => {
  const photos = RECIPES.filter(recipe => recipe.image);
  assert.equal(photos.length, 5);
  assert.equal(new Set(photos.map(recipe => recipe.image.path)).size, 5);
  for (const {image} of photos) {
    assert.ok(existsSync(root + image.path.slice(1)), image.path);
    assert.ok(existsSync(root + image.mobile.slice(1)), image.mobile);
    assert.match(image.alt, /ภาพประกอบ/);
  }
  assert.notEqual(getRecipe('tomato-lime').image.path, getRecipe('tomato-sesame').image.path);
});

test('save and restore selected recipe, portions, completed steps and recipe shelf', () => {
  const s = storage();
  const input = {recipeId: 'egg-crunch', portions: 4, savedIds: ['egg-crunch', 'tomato-lime'], checkedSteps: [0, 2]};
  const result = persistKitchenState(s, input);
  assert.equal(result.ok, true);
  assert.deepEqual(loadKitchenState(s), {version: 1, ...input});
  assert.equal(s.map.get('c7:install_id'), 'legacy-install');
  assert.equal(s.map.get('mc_forge_progress'), 'legacy-reading');
  assert.equal(s.map.get('meet:intake:draft'), 'private-draft');
  assert.equal(s.map.size, 4);
  assert.ok(s.map.has(KITCHEN_KEY));
});

test('storage failure or silent write loss cannot be reported as durable success', () => {
  const broken = {getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); }};
  assert.equal(persistKitchenState(broken, {recipeId: 'tofu-rice', portions: 4}).ok, false);
  assert.equal(persistKitchenState({getItem: () => null, setItem() {}}, {}).ok, false);
  assert.equal(loadKitchenState(null).recipeId, 'tomato-lime');
  assert.equal(loadKitchenState(broken).portions, 2);
});

test('malformed state is bounded to known recipes, valid portions and step indices', () => {
  const state = validateKitchenState({recipeId: '<script>', portions: Infinity, savedIds: ['egg-crunch', 'egg-crunch', 'unknown'], checkedSteps: [-1, 0, 0, 99, '1'], sensitive: 'ignored'});
  assert.deepEqual(state, {version: 1, recipeId: 'tomato-lime', portions: 2, savedIds: ['egg-crunch'], checkedSteps: [0]});
  assert.equal(getRecipe('missing').id, 'tomato-lime');
});

test('first recipe remains complete without JavaScript and no form gates value', () => {
  const html = read('ako/kitchen/index.html');
  assert.match(html, /มะเขือเทศเชอร์รี/);
  assert.match(html, /200 กรัม/);
  assert.match(html, /คนน้ำมะนาว น้ำมัน และเกลือ/);
  assert.doesNotMatch(html, /<form\b|type="email"|type="tel"/);
  assert.match(html, /href="\/favicon.ico"/);
  assert.match(html, /src="\/ako\/assets\/ako-logo.png"/);
});

test('Ako home prioritizes kitchen while retaining real media, story, social, Xircle and Meet', () => {
  const home = read('ako/index.html').split('<!-- Legacy long-form homepage')[0];
  assert.match(home, /ครัวสลัด/);
  assert.match(home, /data-track="hero-kitchen" href="\/ako\/kitchen\/"/);
  assert.match(home, /src="\/ako\/assets\/ako-real-eating-onion-hero.m4v"/);
  assert.match(home, /href="\/ako\/story\/"/);
  assert.match(home, /https:\/\/www.youtube.com\/@akosohungry/);
  assert.match(home, /https:\/\/lin.ee\/tb4HUwl/);
  assert.match(home, /href="\/xircle\/\?/);
  assert.match(home, /href="\/meet\/\?/);
  for (const path of ['ako/index.html', 'ako/story/index.html', 'ako/kitchen/index.html']) {
    assert.match(read(path), /src="\/assets\/front-door\/outcomes.js"/);
  }
});

test('recipes provide ingredient information without invented credentials or outcome guarantees', () => {
  const copy = JSON.stringify(RECIPES);
  assert.doesNotMatch(copy, /ลดน้ำหนัก\s*\d|ลด\s*\d+\s*กิโล|รักษาโรค|แคลอรี|kcal|ทดลองโดยเอโกะ|ผ่านการทดสอบโดยเอโกะ|แพทย์รับรอง/);
  assert.ok(getRecipe('egg-crunch').allergens.includes('ไข่'));
  assert.ok(getRecipe('peanut-lime').allergens.includes('ถั่วลิสง'));
  assert.ok(getRecipe('tomato-sesame').allergens.includes('งา'));
});
