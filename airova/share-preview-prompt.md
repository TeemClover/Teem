# Airova social share preview — 2026-09-15

- Current output: `assets/airova-share-original-v9.png`, 2400 × 1260 lossless PNG.
- V9 restores the exact first campaign supplied by the user as the continuous base, preserving its portrait, Thai copy and neon lighting. Only a small wrong-brand patch is erased with built-in imagegen; real logos and a compact glass MCP module with cyan/violet edges are added natively. No portrait cutout or relighting. Prompt/provenance: `_source/share-v9-prompt.md`; editable composition: `_source/share-preview-v9.html`.
- Earlier V8 restores the user’s original portrait and the reference’s massive bold white Thai headline, italic neon-lime offer, and bright CTA. A fresh scene shows one source branching into four video styles with original Facebook/Instagram/TikTok destinations. Built-in imagegen scene prompt: `_source/share-v8-scene-prompt.md`; editable native composition: `_source/share-preview-v8.html`; original platform assets and release-status evidence: `_source/share-v8-platform-sources.md`. The face is never regenerated.
- Copy layers: “สร้างวิดีโอ / พูดไทยด้วย AI”, “ฟรี 30 เครดิต”, “Omni · Seedance 2.5”, “สมัครแล้วเริ่มสร้างได้เลย”, “1 ต้นฉบับ”, “หลายวิดีโอ”, “ออโต้โพสต์”, “MCP Ready”. All brand/client logos remain native original image layers.
- Earlier V7 replaces the portrait-led layout with an image-led complete marketing workflow: product and brand inputs → cinematic AI video → social posts and scheduled publishing. New prompt/provenance: `_source/share-v7-workflow-prompt.md`; native canvas composition: `_source/share-preview-v7.html`. Original logos and short Thai copy are separate layers.
- V5 uses fresh built-in imagegen artwork from the original portrait; no v3/v4 JPEG is reused. New full prompt/provenance: `_source/share-v5-prompt.md`. Native Thai typography and original logo layers: `_source/share-preview-v5.html`.
- V4 preserves the approved v3 image as its background and adds a compact bottom-right “MCP Ready” badge with original ChatGPT and Claude symbols. Editable composition: `_source/share-preview-v4.html`; logo provenance: `assets/sources.json`. No generative logo edits are used.
- V2 was retired because its generated brand logos were incorrect. The original prompt below is retained as history, not a branding workflow to repeat.
- V3 erases the generated brand row, then renders the canonical `/assets/myclover-icon.png` and exact official `assets/aistudio-white.svg` as image layers in `_source/share-preview-v3.html`. The myClover wordmark uses the same typography as the partner-page header. Original logo colors and proportions are preserved.
- Generated with the built-in `image_gen` tool, using the user's supplied portrait as identity and visual style reference.
- Generated editorial advertising artwork for myClover; not an Airova generation result or a platform screenshot.
- The 30-credit introductory offer is user supplied. Omni and Seedance 2.5 availability was checked in Airova's connected model catalog on this date. Credit requirements vary by model and settings.
- New image filename avoids reusing the old hero image cache. Facebook may still retain its cached page metadata until a re-scrape.

## Logo removal prompt for v3 (built-in image_gen)

Edit this exact supplied 1200x630 advertisement. SURGICAL REMOVAL ONLY: erase the incorrect generated brand logos and wordmarks in the upper-left rectangle x=28 to 500, y=14 to 122, including the green clover, 'myClover × Airova', and 'OFFICIAL PARTNER'. Fill that area with the same clean dark navy/black background, smoothly matched to surroundings. LEAVE THAT AREA EMPTY — DO NOT generate, redraw or replace any logos, branding, words or symbols. The official brand artwork will be placed there separately. Preserve absolutely everything else: identical portrait/face/clothing, all other Thai headline/offer/CTA text, model names, neon background, video frames, composition and exact aspect ratio. Do not move or restyle any element outside the top-left brand area. Output the same 1200x630 wide composition.

## Original v2 generation prompt (retired)

Use case: ads-marketing. Create a FINISHED professional Thai social-share advertising image for myClover's Airova Official Partner landing page, wide 1.9048:1 landscape composition, ideally 1536x806 or 1200x630. This is a Facebook link preview and must remain striking and legible when displayed at 570x299 pixels.
Input image: attached portrait is a reference for the man's identity, glasses, red/black jacket, and futuristic neon cinematic atmosphere. Preserve his recognizable face. Use ONE main waist-up portrait on the right 42% of the composition, confident warm expression and cinematic lighting, with a breathtaking luminous cyan/magenta AI cinema portal, futuristic reflective architecture and a few elegantly floating video frames containing imaginative fashion/character/product scenes. No repeated portraits or crowd of faces. Fine light trails and real photographic depth, premium cinematic photography, spectacular but controlled. Dark inky navy background on left 58%, vivid electric purple and cyan on right, acid-lime highlights linking to myClover. Do not obscure the person.
Design a complete advertising composition, with beautifully typeset EXACT Thai copy on the left, crisp massive bold modern Thai sans serif, careful correct diacritics. All letters fully inside 55px safe margins. Clear hierarchical layout:
Top small brand line: "myClover × Airova"
Directly below in small uppercase: "OFFICIAL PARTNER"
Main large white headline on two lines: "สร้างวิดีโอ" then "พูดไทยด้วย AI"
Huge high-contrast acid-lime offer line, the strongest visual element: "ฟรี 30 เครดิต"
Smaller clean model line: "Omni • Seedance 2.5"
Bottom compact bright CTA-style pill or strip: "สมัครแล้วเริ่มสร้างได้เลย ↗"
The 30 offer is introductory credits, not unlimited free usage. Do not add other claims, no guaranteed results, no additional tiny text, no fake app screenshot, no watermark, no website URL, no Facebook interface. Avoid clutter, generic abstract ring-only artwork, overdecorated text effects, cheap sticker badges, or unreadable Thai lettering. Make a polished, conversion-focused launch visual with exceptional portrait fidelity and visual energy.
