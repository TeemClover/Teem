import { existsSync, statSync } from 'node:fs';
import { TEAMBOOK_CARDS } from '../_shared/cards.js';
import { TEAMBOOK_SPECIES } from '../_shared/avatars.js';
import { PETS } from '../_shared/pets.js';
import { TEAMBOOK_ACTIVITY_CATALOG } from '../_shared/activities.js';

const paths = new Set();
const deferred = new Set([
  '/assets/cards/epic/orange-cat-blue.webp',
  '/assets/cards/epic/orange-cat-green.webp',
  '/assets/cards/epic/orange-cat-red.webp',
  '/assets/cards/epic/orange-cat-silver.webp',
  '/assets/cards/epic/white-cat-blue.webp',
  '/assets/cards/epic/white-cat-green.webp',
  '/assets/cards/epic/white-cat-red.webp',
  '/assets/cards/epic/white-cat-silver.webp',
]);
function collect(value) {
  if (typeof value === 'string' && value.startsWith('/assets/')) paths.add(value);
}

for (const card of TEAMBOOK_CARDS) {
  collect(card.art); collect(card.image); collect(card.imageThumb); collect(card.imageFull);
}
for (const item of [...TEAMBOOK_SPECIES, ...PETS, ...TEAMBOOK_ACTIVITY_CATALOG]) {
  collect(item.art); collect(item.image); collect(item.icon);
}

const unavailable = [...paths]
  .filter(path => !existsSync(`.${path}`) || statSync(`.${path}`).size === 0)
  .sort();
const missing = unavailable.filter(path => !deferred.has(path));
const pending = unavailable.filter(path => deferred.has(path));
if (missing.length) {
  console.error(missing.join('\n'));
  console.error(`Unexpected missing registry assets: ${missing.length}`);
  process.exitCode = 1;
} else {
  console.log(`Registry assets ready: ${paths.size - pending.length}; deferred: ${pending.length}.`);
}
