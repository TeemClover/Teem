# TeamBook entry illustration set

Generated with the built-in image generation tool in `illustration-story` mode, then converted to WebP for the TeamBook entry and reading pages. These are project assets, not placeholders.

## Shared prompt lock

Every scene used this shared positive prompt:

> Editorial watercolor-and-colored-pencil illustration in the existing TeamBook animal world. A warm, well-used childhood notebook on a wooden table; cream ruled paper, imperfect pencil grain, modest green, blue, and orange marks, soft natural light, and generous breathing room. Re-stage the supplied TeamBook mascots without redesigning them. Preserve exact face, body proportions, fur or feather color, scarf or bow, expression range, and handmade line quality. The notebook and participant traces carry the story. No readable text is embedded in the art.

Every scene used this shared avoid list:

> No humans, human hands, body parts, silhouettes, human shadows, reflections, or human photographs. No UI, screens, chat bubbles, logos, readable words, magic AI glow, robots, trophies, medals, confetti, ornate gold frames, rarity emblems, or Legendary card visual language.

## Scene prompt set

| Asset | Scene prompt | TeamBook references |
| --- | --- | --- |
| `notebook-open.webp` | An open spiral notebook with a few traces on the left page and a large quiet blank right page. Orange cat and white pom arrive from opposite edges; white cat sits smaller at the lower margin as a witness. The empty page feels like an invitation. | orange-cat mascot, white-pom mascot, white-cat mascot |
| `notebook-many-traces.webp` | Orange cat, white pom, owl, and turtle around one open notebook. Each has left a distinct kind of mark: paw stamp, sprout, reading trace, colored pencil line, and tucked paper fragment. The page feels passed between friends. | orange-cat mascot, white-pom mascot, owl avatar, turtle avatar |
| `notebook-different-lives.webp` | A single notebook receives traces from different lives: running shoes for orange cat, reading for owl, a project folder for pig, and a sprout for turtle. They do not perform the same activity or share a schedule. | orange-cat, owl, pig, turtle avatars |
| `notebook-seen.webp` | A close, quiet notebook moment with orange cat and white pom. One subtle green paw acknowledgement appears beside a real-life trace. The emotion is recognition, not evaluation or celebration. | orange-cat mascot, white-pom mascot |
| `notebook-quiet-witness.webp` | Participant traces remain central. Orange cat and white pom are near the top edge; the white cat is much smaller at the lower outer edge, quietly observing and keeping the page in view. It is not heroic, magical, or controlling. | orange-cat mascot, white-pom mascot, white-cat mascot, `notebook-open.webp` style reference |
| `notebook-return.webp` | Several page edges imply time. Earlier pages hold small traces; the current page is almost blank except for one green mark; a later page peeks out with a fresh paw mark. Orange cat, turtle, and owl are calm, with no shame or streak counter. | orange-cat mascot, turtle avatar, owl avatar, `notebook-open.webp` style reference |
| `notebook-closing.webp` | A worn spiral notebook is almost closed in late-afternoon light. Modest accumulated traces remain between the pages. Orange cat, white pom, turtle, and owl sit in a loose quiet circle. The feeling is memory, not achievement. | orange-cat mascot, white-pom mascot, turtle avatar, owl avatar, `notebook-open.webp` style reference |
| `notebook-waits-for-friend.webp` | The left page contains a few orange-cat traces. The right page stays mostly blank with a green pencil placed gently on it. White pom has just arrived at the far side; orange cat waits without pulling. White cat remains a tiny witness at the lower margin. | orange-cat mascot, white-pom mascot, white-cat mascot, `notebook-open.webp` style reference |

## Delivery notes

- Source generation size: 1536 × 1024.
- Delivery format: WebP, stripped metadata, quality 84.
- Hero is preloaded and receives `fetchpriority="high"`.
- All below-fold scenes use native lazy loading.
- Main copy remains HTML, never raster text.
- Common card art is used separately in HTML as a memory object; no new card design was generated.
