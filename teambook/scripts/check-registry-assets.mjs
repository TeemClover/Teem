import { existsSync, statSync } from 'node:fs';
import { TEAMBOOK_CARDS } from '../_shared/cards.js';
import { TEAMBOOK_SPECIES } from '../_shared/avatars.js';
import { PETS } from '../_shared/pets.js';
import { TEAMBOOK_ACTIVITY_CATALOG } from '../_shared/activities.js';

const paths = new Set();
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
if (unavailable.length) {
  console.error(unavailable.join('\n'));
  console.error(`Missing or empty registry assets: ${unavailable.length}`);
  process.exitCode = 1;
} else {
  console.log(`Registry assets ready: ${paths.size}; missing: 0.`);
}
