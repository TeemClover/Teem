# Mobile exports · 2026-09-10

Existing originals remain unchanged. These are responsive encodes, not new generated artwork:

- [underpaper-valley-mobile.webp](../../frontdoor/art/underpaper-valley-mobile.webp): original [underpaper-valley.webp](../../frontdoor/art/underpaper-valley.webp) → 600 × 800, WebP quality 84; 191,768 bytes (original ~573 KiB).
- [compass-body-mobile.webp](../../frontdoor/art/compass-body-mobile.webp): original [compass-body.webp](../../frontdoor/art/compass-body.webp) → 640 × 640, WebP quality 88; 76,098 bytes (original ~175 KiB). Alpha retained.

Exported with the supplied Sharp runtime; no new repository dependency. Desktop uses the original world image. Compass uses responsive srcset with the original high-density option. Logo and favicon files are unchanged.

Opening video waits for essential discovery layers instead of competing with them. A tap before the deferred module arrives is retained and visibly acknowledged, then lifted automatically. Slow-network browser proof is reproducible through [the performance browser test](../../tests/frontdoor/performance.e2e.mjs).
