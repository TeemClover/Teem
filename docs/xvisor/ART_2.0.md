# 2.0 art assets

Created using the built-in imagegen tool, with the user's supplied
`xvisor/xvisor-intro-hero.webp` as the identity and style reference. The original
cover remains unchanged. Final assets are copied into the repository and are
used only by the dialogue portrait renderer, with an identity-matched fallback.
Teem and Ako speak from outside the world and never appear in its scenes.
The game world uses the original code-drawn illustration style.

- `xvisor/quest/assets/teem-ako-guides-v2.png`: 1254 × 1254, RGBA. Two equal
  half-width cells, Teem left and Ako right; the background has actual alpha.
The unused `neighborhood-scenes-v2.png` atlas and `game-scene-atlas.js` loader
were removed at the user's request. Its generation prompt below is retained
as historical provenance only. It is not loaded or shipped by this revision.

## Mentor atlas prompt

Use case: identity-preserve. Asset type: production game sprite atlas on a genuinely transparent background. Reference image is the source of the two character identities AND the warm detailed pixel-art/chibi aesthetic. Create a square atlas, 2 equal-width cells side-by-side, no borders, no text, no labels. Left cell: full-body Teem, same man with black spiky hair, rectangular glasses, black casual jacket with red hood/lining, off-white shirt, dark trousers, white sneakers. Right cell: full-body Ako, same cheerful woman with long dark high ponytail, little cream flower clip, black sleeveless dress and black shoes. Both recognizable as exactly the cover characters. Friendly guides in an educational business simulation: relaxed inviting pose, slightly angled toward the viewer, one open hand, warm modest smile, no props. Detailed crisp hand-placed pixel art, consistent thick subtly stepped outlines and golden shaded highlights, preserve anatomy and natural neck/hair layering. Characters must be wholly visible head to shoes, about 85% canvas height, feet aligned at 94% height. Each character fits completely within their own half with margin and large transparent gap, no overlap. Real alpha transparency everywhere outside characters, no checkered pattern, no floor, no backdrop, no shadows that overlap cells. No extra characters, no text, no logos, no weapons. This is a clean cutout atlas ready to draw each half separately in a canvas game.

## Environment atlas prompt

Use case: stylized-concept. Asset type: production background atlas for the X-VISOR chibi pixel-art simulation game. Reference image defines exact world style: detailed warm golden pixel-art interiors, rich dark wooden furniture, soft cream walls, leafy green plants, inviting sunlight, 2D game scene. Make ONE wide 3840x2160 atlas with EXACTLY FOUR scenes in a 2 by 2 grid, no border, no frame, no gutters, no text, no lettering. Each quadrant is an independent 16:9 background. Top LEFT: cozy home mentoring office, large window left, shelf right, golden wall lamps. Top RIGHT: bright home cooking kitchen, kitchen cabinets and food-prep counter only along rear wall, bowl of colorful vegetables at the back. Bottom LEFT: creator's livestream studio, warm acoustic panel walls, rear computer desk with small screens, camera and ring light at edges, tasteful green plants. Bottom RIGHT: peaceful sunny community garden terrace, distant leafy trees, flowers, footpath, low wood railing, blue sky. ALL scenes use SAME flat frontal/slight downward game camera and scale. Lower 40 percent of each scene is open empty floor or patio, ready for separately drawn game characters and furniture; keep foreground and center unoccupied with NO characters, NO central desk, NO central chairs. Existing game will add all people and center-table as sprites. Keep scene architecture all the way to exact cell edges. Handmade crisp subtly stepped pixel outlines, richly shaded small pixels, golden light, same material/color style as reference cover, no vector flat-art look, no blur, no photorealism. Exactly four equally sized rectangles meeting at image center, no collage overlaps.
