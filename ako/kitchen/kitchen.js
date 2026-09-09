import {RECIPES, getRecipe, normalizePortions, scaledIngredients, loadKitchenState, persistKitchenState} from './recipes.js';
import {recipePath, recipeIdFromLocation, recipeShare, recipeSchema, shareRecipe, copyRecipeLink} from './share.js';
import {createOutcomeClient} from '/assets/front-door/outcomes.js';

const $ = id => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let state = loadKitchenState(storage);
const initialId = recipeIdFromLocation(location);
if (RECIPES.some(recipe => recipe.id === initialId) && initialId !== state.recipeId) {
  state = {...state, recipeId: initialId, portions: getRecipe(initialId).servings, checkedSteps: []};
}
let filter = 'all';
let query = '';
let cooking = false;
let storageWorks = true;
const labels = {salad: 'สลัด', meal: 'จานอุ่น', dressing: 'น้ำสลัด'};
history.replaceState({...history.state, akoRecipeId: state.recipeId}, '', location.href);

function persist(announce = false) {
  const result = persistKitchenState(storage, state);
  state = result.state;
  storageWorks = result.ok;
  if (!result.ok) $('save-status').textContent = 'เครื่องนี้เก็บสูตรถาวรไม่ได้ แต่ยังเปิดทำต่อได้ในหน้านี้';
  else if (announce) $('save-status').textContent = 'เก็บสูตรไว้บนเครื่องนี้แล้ว กลับมาที่ “ที่เก็บไว้” ได้เลย';
  return result.ok;
}

function renderLibrary() {
  const recipes = RECIPES.filter(recipe => (filter === 'all' || (filter === 'saved' ? state.savedIds.includes(recipe.id) : recipe.category === filter)) &&
    (!query || [recipe.name, recipe.short, ...recipe.ingredients.map(item => item.name)].join(' ').toLowerCase().includes(query)));
  $('recipe-list').replaceChildren(...recipes.map(recipe => {
    const link = document.createElement('a');
    link.href = recipePath(recipe.id);
    link.dataset.recipe = recipe.id;
    link.setAttribute('aria-current', String(recipe.id === state.recipeId));
    link.append(document.createTextNode(recipe.name));
    const timing = document.createElement('span');
    timing.textContent = `${recipe.minutes} นาที`;
    link.append(timing);
    return link;
  }));
  $('empty-library').hidden = recipes.length !== 0;
  $('empty-library').textContent = query ? 'ยังไม่เจอสูตรจากคำนี้ ลองชื่อวัตถุดิบสั้น ๆ เช่น ไข่ เต้าหู้ หรือแตงกวา' : 'ยังไม่ได้เก็บสูตร ลองเปิดจานที่ชอบ แล้วกด “เก็บสูตรนี้” ได้เลย';
  $('library-count').textContent = `${recipes.length} สูตร`;
  $('saved-count').textContent = String(state.savedIds.length);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
}

function renderIngredients() {
  const recipe = getRecipe(state.recipeId);
  $('portion-summary').textContent = `ปริมาณสำหรับ ${state.portions} คน`;
  $('ingredients').replaceChildren(...scaledIngredients(recipe, state.portions).map(ingredient => {
    const li = document.createElement('li'), name = document.createElement('span'), amount = document.createElement('b');
    name.textContent = ingredient.name;
    amount.textContent = ingredient.quantity === null ? ingredient.note : `${ingredient.amount} ${ingredient.unit}`;
    if (ingredient.quantity === null) amount.className = 'note-amount';
    li.append(name, amount);
    return li;
  }));
  document.querySelectorAll('[data-portions]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.portions) === state.portions)));
  $('allergens').hidden = recipe.allergens.length === 0;
  $('allergens').textContent = recipe.allergens.length ? 'ส่วนผสมที่ควรเช็ก: ' + recipe.allergens.join(' · ') : '';
  if (recipe.id === 'soy-lime') {
    const quantity = scaledIngredients(recipe, state.portions)[0].amount;
    $('mixing-note').replaceChildren(...['ซีอิ๊ว', 'มะนาว', 'น้ำ'].map(name => {
      const line = document.createElement('strong'); line.textContent = `${name} ${quantity}`; return line;
    }));
    const small = document.createElement('small'); small.textContent = `ช้อนชา · สำหรับ ${state.portions} ที่`; $('mixing-note').append(small);
  }
}

function renderProgress() {
  const total = getRecipe(state.recipeId).steps.length;
  $('step-progress').textContent = `${state.checkedSteps.length} / ${total}`;
  $('finished-note').hidden = state.checkedSteps.length !== total;
  $('reset-steps').hidden = state.checkedSteps.length === 0;
}

function renderRecipe() {
  const recipe = getRecipe(state.recipeId), saved = state.savedIds.includes(recipe.id);
  $('recipe-kicker').textContent = `${labels[recipe.category]} · ประมาณ ${recipe.minutes} นาที`;
  $('recipe-title').textContent = recipe.name;
  $('recipe-short').textContent = recipe.short;
  $('technique').textContent = recipe.technique;
  $('substitution').textContent = recipe.swap;
  $('serving-note').textContent = recipe.finish;
  $('save-recipe').setAttribute('aria-pressed', String(saved));
  $('save-recipe').textContent = saved ? 'เก็บไว้แล้ว ✓' : 'เก็บสูตรนี้ ↗';
  $('recipe-photo').hidden = !recipe.image;
  $('mixing-note').hidden = Boolean(recipe.image);
  if (recipe.image) {
    const img = $('dish-image');
    img.srcset = `${recipe.image.mobile} 600w, ${recipe.image.path} 1000w`;
    img.src = recipe.image.path;
    img.alt = recipe.image.alt;
  } else {
    $('mixing-note').replaceChildren(...recipe.mixing.map(text => {
      const line = document.createElement('strong'); line.textContent = text; return line;
    }));
    const small = document.createElement('small'); small.textContent = recipe.mixingUnit; $('mixing-note').append(small);
  }
  $('steps').replaceChildren(...recipe.steps.map((text, index) => {
    const li = document.createElement('li'), label = document.createElement('label');
    const input = document.createElement('input'), span = document.createElement('span');
    input.type = 'checkbox'; input.checked = state.checkedSteps.includes(index); input.dataset.step = String(index);
    input.setAttribute('aria-label', `ทำขั้นที่ ${index + 1} แล้ว`);
    span.textContent = text; label.append(input, span); li.append(label); return li;
  }));
  const pair = getRecipe(recipe.pair);
  const link = $('pair-link'); link.href = recipePath(pair.id); link.dataset.recipe = pair.id;
  const title = document.createElement('span'); title.textContent = pair.name;
  const arrow = document.createElement('b'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); title.append(arrow);
  const lead = document.createElement('small'); lead.textContent = recipe.category === 'dressing' ? 'ลองกับจานนี้' : 'ครั้งหน้า ลองเปลี่ยนรส';
  link.replaceChildren(lead, title);
  document.title = `${recipe.name} — ครัวสลัดเอโกะ`;
  const shared = recipeShare(recipe);
  $('recipe-schema').textContent = JSON.stringify(recipeSchema(recipe));
  $('share-line').href = 'https://line.me/R/share?text=' + encodeURIComponent(shared.text + '\n' + shared.url);
  $('share-link').value = shared.url;
  $('share-fallback').hidden = true;
  $('share-status').textContent = '';
  document.querySelector('link[rel="canonical"]').href = shared.url;
  for (const [key, value] of Object.entries({'og:title': shared.title, 'og:description': recipe.short, 'og:url': shared.url, 'og:image': 'https://www.myclover.com' + (recipe.image?.path || '/ako/assets/ako-logo.png')})) {
    document.querySelector(`meta[property="${key}"]`)?.setAttribute('content', value);
  }
  const sources = $('recipe-sources');
  sources.replaceChildren(...(recipe.sources || []).map(source => {
    const a = document.createElement('a'); a.href = source.url; a.textContent = source.title; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a;
  }));
  $('source-note').hidden = !(recipe.sources?.length);
  renderIngredients(); renderProgress(); renderLibrary();
}

function selectRecipe(id, {scroll = true, updateHistory = true} = {}) {
  if (!RECIPES.some(recipe => recipe.id === id)) return;
  if (id !== state.recipeId) state = {...state, recipeId: id, checkedSteps: []};
  if (updateHistory) history.pushState({akoRecipeId:id}, '', recipePath(id) + location.search);
  else history.replaceState({...history.state, akoRecipeId:id}, '', location.href);
  $('recipe-browse').open = false;
  if (storageWorks) $('save-status').textContent = '';
  persist(); renderRecipe();
  // Only a valid existing Compass handoff may emit a receipt. Ordinary recipe
  // readers acquire neither a new identity nor a Front Door event here.
  createOutcomeClient({location: new URL(location.href)})?.arrival();
  if (scroll) { $('recipe').scrollIntoView({block: 'start'}); $('recipe').focus({preventScroll: true}); }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-recipe]');
  if (link && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    event.preventDefault(); selectRecipe(link.dataset.recipe);
  }
  const category = event.target.closest('[data-filter]');
  if (category) { filter = category.dataset.filter; renderLibrary(); }
  const portion = event.target.closest('[data-portions]');
  if (portion) { state.portions = normalizePortions(portion.dataset.portions); persist(); renderIngredients(); }
});
$('save-recipe').addEventListener('click', () => {
  const wasSaved = state.savedIds.includes(state.recipeId);
  const previous = [...state.savedIds];
  state.savedIds = wasSaved ? state.savedIds.filter(id => id !== state.recipeId) : [...state.savedIds, state.recipeId];
  if (!persist(!wasSaved)) state.savedIds = previous;
  else if (wasSaved) $('save-status').textContent = 'เอาออกจากสูตรที่เก็บไว้แล้ว';
  $('save-recipe').setAttribute('aria-pressed', String(state.savedIds.includes(state.recipeId)));
  $('save-recipe').textContent = state.savedIds.includes(state.recipeId) ? 'เก็บไว้แล้ว ✓' : 'เก็บสูตรนี้ ↗';
  renderLibrary();
});
$('steps').addEventListener('change', event => {
  if (!event.target.matches('input[data-step]')) return;
  const step = Number(event.target.dataset.step);
  state.checkedSteps = event.target.checked ? [...new Set([...state.checkedSteps, step])] : state.checkedSteps.filter(value => value !== step);
  persist(); renderProgress();
});
$('reset-steps').addEventListener('click', () => {
  state.checkedSteps = []; persist();
  $('steps').querySelectorAll('input').forEach(input => { input.checked = false; }); renderProgress();
});
$('cook-mode').addEventListener('click', () => {
  cooking = !cooking; document.body.dataset.cooking = String(cooking);
  $('cook-mode').setAttribute('aria-pressed', String(cooking));
  $('cook-mode').textContent = cooking ? 'กลับไปดูภาพและสูตรอื่น ↙' : 'เปิดโหมดทำอาหาร ↗';
  $('recipe').scrollIntoView({block: 'start'});
});
async function handleShare(action) {
  const recipe = getRecipe(state.recipeId);
  const result = await action(recipe, navigator);
  $('share-status').textContent = result.status === 'shared' ? 'เปิดตัวเลือกแชร์สูตรแล้ว' : result.status === 'copied' ? 'คัดลอกลิงก์สูตรนี้แล้ว ส่งให้คนที่อยากชวนทำได้เลย' : result.status === 'manual' ? 'คัดลอกลิงก์ด้านล่าง แล้วส่งให้เพื่อนได้เลย' : '';
  $('share-fallback').hidden = result.status !== 'manual';
  if (result.status === 'manual') { $('share-link').value = result.url; $('share-link').focus(); $('share-link').select(); }
}
$('share-recipe').addEventListener('click', () => { void handleShare(shareRecipe); });
$('copy-recipe').addEventListener('click', () => { void handleShare(copyRecipeLink); });
$('print-recipe').addEventListener('click', () => window.print());
$('recipe-search').addEventListener('input', event => { query = event.target.value.trim().toLowerCase(); renderLibrary(); });
window.addEventListener('hashchange', () => selectRecipe(recipeIdFromLocation(location), {updateHistory: false}));
window.addEventListener('popstate', event => selectRecipe(recipeIdFromLocation(location) || event.state?.akoRecipeId || state.recipeId, {updateHistory: false}));
renderRecipe();
if (RECIPES.some(recipe => recipe.id === initialId)) requestAnimationFrame(() => $('recipe').scrollIntoView({block: 'start', behavior: 'instant'}));
