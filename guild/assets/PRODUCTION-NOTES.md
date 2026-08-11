# Guild X Visitor Pro Max — Production Assets

- Large hero/reward artwork stays at native HQ resolution (1024–1536px).
- Only assets rendered tiny in the UI have `-ui.png` derivatives, resized with Pillow LANCZOS and saved losslessly as PNG.
- Every visual stage uses overflow clipping and object-fit containment to prevent artwork from crossing card/page bounds.
- Extras used by the page: emerald dust, magical light sweep, golden comet, radiant X sigil, magic circle, fantasy frame glow, starburst.
- `/assets/config.js` and `/assets/track.js` remain external site dependencies as before.
