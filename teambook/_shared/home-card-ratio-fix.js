/* RETIRED — TeamBook Home card ratio override.

   This file used to inject a second card-frame system with a layout border,
   cream background and object-fit:contain. That stylesheet could load after
   the canonical geometry and recreate the exact inset/letterbox bug it was
   originally meant to fix.

   Card geometry now has one owner: card-visual-final-v19.js. Keep this module
   as a harmless compatibility tombstone because older cached bootstraps may
   still import its historical URL.
*/

if (typeof document !== 'undefined') {
  document.getElementById('xty-home-card-ratio-fix')?.remove();
}
