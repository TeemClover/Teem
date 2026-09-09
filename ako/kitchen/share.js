/** Public recipe URLs never include a visitor's handoff, draft, or saved state. */
import { RECIPES, scaledIngredients } from './recipes.js';
export const KITCHEN_ORIGIN = 'https://www.myclover.com';
export function recipePath(id) {
  return RECIPES.some(recipe => recipe.id === id) ? `/ako/kitchen/${id}/` : '/ako/kitchen/';
}
export function recipeIdFromLocation(location) {
  const hash = String(location.hash || '').slice(1);
  if (RECIPES.some(recipe => recipe.id === hash)) return hash; // Old bookmarks stay valid.
  const path = String(location.pathname || '').replace(/index\.html$/, '').replace(/\/?$/, '/');
  return RECIPES.find(recipe => recipePath(recipe.id) === path)?.id || null;
}
export function recipeShare(recipe) {
  const url = KITCHEN_ORIGIN + recipePath(recipe.id);
  const title = `${recipe.name} — ครัวเอโกะ`;
  const text = `${recipe.name}\n${recipe.short}\nประมาณ ${recipe.minutes} นาที · วัตถุดิบและวิธีทำครบในสูตร`;
  return {url, title, text};
}
export function recipeSchema(recipe) {
  const {url}=recipeShare(recipe);
  return {'@context':'https://schema.org','@type':'Recipe',name:recipe.name,description:recipe.short,
    url,mainEntityOfPage:url,inLanguage:'th',author:{'@type':'Organization',name:'ครัวเอโกะ',url:KITCHEN_ORIGIN+'/ako/'},
    totalTime:`PT${recipe.minutes}M`,recipeYield:`${recipe.servings} ที่`,recipeCategory:{salad:'สลัด',meal:'จานอุ่น',dressing:'น้ำสลัด'}[recipe.category],
    ...(recipe.image ? {image:[KITCHEN_ORIGIN+recipe.image.path]} : {}),
    recipeIngredient:scaledIngredients(recipe,recipe.servings).map(item=>`${item.name} ${item.quantity===null?item.note:`${item.amount} ${item.unit}`}`),
    recipeInstructions:recipe.steps.map(text=>({'@type':'HowToStep',text})),
    ...(recipe.sources?.length ? {isBasedOn:recipe.sources.map(source=>source.url)} : {})};
}
export async function shareRecipe(recipe, navigator) {
  const data = recipeShare(recipe);
  if (typeof navigator?.share === 'function') {
    try { await navigator.share(data); return {status: 'shared'}; }
    catch (error) { if (error?.name === 'AbortError') return {status: 'cancelled'}; }
  }
  return copyRecipeLink(recipe, navigator);
}
export async function copyRecipeLink(recipe, navigator) {
  const {url} = recipeShare(recipe);
  try {
    if (!navigator?.clipboard?.writeText) return {status: 'manual', url};
    await navigator.clipboard.writeText(url);
    return {status: 'copied', url};
  } catch { return {status: 'manual', url}; }
}
