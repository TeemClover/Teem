import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../shelf/', import.meta.url));

export async function readShelfCatalog() {
  const catalog = JSON.parse(await readFile(path.join(root, 'catalog.json'), 'utf8'));
  if (catalog.schema_version !== 1 || !Array.isArray(catalog.sources) || !Array.isArray(catalog.categories)) {
    throw new Error('INVALID_SHELF_CATALOG');
  }
  return catalog;
}

export async function readShelfSource(source) {
  // Only a catalog entry reaches this loader. Check containment as a second
  // boundary so a malformed catalog or symlink cannot expose other files.
  if (!source || typeof source.path !== 'string' || !/^source\/[a-z0-9/_-]+\.md$/.test(source.path)) {
    throw new Error('INVALID_SOURCE_PATH');
  }
  const sourceRoot = await realpath(path.join(root, 'source'));
  const filename = await realpath(path.join(root, source.path));
  if (!filename.startsWith(`${sourceRoot}${path.sep}`)) throw new Error('INVALID_SOURCE_PATH');
  return readFile(filename, 'utf8');
}

export function shelfCatalogPreview(catalog) {
  return {
    schema_version: 1, title: String(catalog.title || 'Shelf'), updated_at: catalog.updated_at,
    categories: catalog.categories.map(category => ({ id: category.id, label: category.label })),
    collections: (catalog.collections || []).map(collection => ({
      id: collection.id, title: collection.title, description: collection.description,
    })),
    sources: catalog.sources.map(source => ({
      id: source.id, title: source.title, description: source.description, version: source.version,
      status_label: source.status_label, categories: source.categories, tags: source.tags,
      ...(source.recipe ? { recipe: {
        collection_id: source.recipe.collection_id, order: source.recipe.order,
        stage: source.recipe.stage, short_title: source.recipe.short_title,
        use_with: source.recipe.use_with, inputs: source.recipe.inputs, outputs: source.recipe.outputs,
        prerequisites: source.recipe.prerequisites,
        lessons: (source.recipe.lessons || []).filter(lesson =>
          typeof lesson.href === 'string' && /^\/(?:classroom|course)\/(?:[a-z0-9-]+\.html)?(?:[?#][^\s\\]*)?$/.test(lesson.href)
        ).map(lesson => ({ label: lesson.label, href: lesson.href })),
      } } : {}),
    })),
  };
}
