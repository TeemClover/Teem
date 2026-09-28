# Mediral — Five-piece sales path (v6)

Updated 2026-09-28. Supersedes v5's routine-first order: the page now sells the fixed five-piece set, with WHY and benefit first and the complete ingredient atlas as optional deep reading after the offer. The cabinet, serum-pair and mousse-only openings remain superseded. The page order shows each piece's role; it is not a verified application order ("หน้านี้เรียงให้เห็นบทบาทของทั้ง 5 ชิ้น วิธีใช้จริงให้ยึดฉลากสินค้า").

## Customer story

1. **Opening — the problem and the set.** "เห็นหน้าที่ของทุกชิ้น ตั้งแต่ล้างหน้าถึงแต่งผิว": for someone who owns several products without knowing what each does. All five products stand together; a role map lists role → product → brand-stated time; the dated poster offer and "ดูข้อเสนอชุด 5 ชิ้น" follow. On phones the offer route precedes the map so both fit the first screen. No claim that everyone needs all five or that combined use is proven.
2. **Two serums, two roles.** White AC (ผิวที่มีแนวโน้มเป็นสิว · สมดุลผิว · ความชุ่มชื้น) beside yellow-green BR (ผิวที่ดูหมองคล้ำ · กระจ่างใส สีผิวดูสม่ำเสมอ · เรียบเนียนและสมดุล), both "เช้า · เย็น ตามสื่อแบรนด์", with featured names and links. A use-time table (เช้า / เย็น / ทาซ้ำระหว่างวัน / เมื่อแต่งหน้า; mousse: label) states times only, not layering.
3. **Material study film.** GPT's ten-second botanical/pipette clip plays once in view and rests on its last frame with replay. Caption: AI illustration, not factory, experiment, results or product texture.
4. **Five product chapters.** Unchanged grammar: materials → extraction/beaker → concentrate → formulation → drop → reveal → role. Each chapter now states when it is used and names its ingredient families, with a link to the full list and its count.
5. **Offer.** Poster price with dates and terms, then the checkout control, copy and summary card, then the saved list. On stacked layouts this card is read full-screen right under the header (the hero already showed all five) and the scene pauses; desktop keeps the five beside it.
6. **Ingredient library.** "รู้จักสูตรให้ลึกขึ้น · เลือกอ่านตามชิ้นที่สนใจ": one closed disclosure per product with every name, role and source. Links open it directly.

## Motion and reading chapters

- `u=-1..0` opening, `0..5` the five products, `5..6` the set; unchanged. Comparison, film, library and atlases are reading chapters: the fixed stage and rail withdraw and WebGL pauses. Opening/closing an atlas re-measures this without a scroll.
- Selecting any ingredient changes its detail only, never the saved list.
- Reduced motion, failed WebGL and data errors keep all sales content, the offer route and ingredient text.

## Lab-media delivery state

| Asset | Purpose |
|---|---|
| `assets/motion/lab-film-10s.mp4` | GPT's approved clip: 10.00 s, 1276×720, silent H.264 faststart, 1.15 MB. Not a seamless loop. |
| `assets/motion/lab-film-poster.webp` | Poster frame from the clip (51 KB) |
| `assets/motion/lab-botanical.webp`, `lab-research.webp`, `lab-compound.webp` | Beat stills; the reading fallback when the film is unavailable |

`data-film-ready="true"`. The MP4 path stays in `data-src` until the controller attaches it; `preload="none"`, muted, inline, no `loop`.

## Source contract

Each ingredient retains `name`, optional `image`, `benefit`, `benefit_source` and `benefit_status`. `brand-claim` attributes a role to brand marketing; `identity-only` does not establish an individual effect. `ingredient_groups` resolve names against featured and other ingredient entries and retain family-level attribution. Editorial groupings are identified as myClover's reading aid.

The four atlases (now in the library after the offer) contain AC 24, BR 18, SU 14 and PO 18 display entries. This is a source-list reading inventory, not 74 distinct actives or a verified INCI total. Sunscreen aliases, collective headings and component names are reconciled for display; they do not prove a formula count, molecular size or botanical species. Group roles do not become individual efficacy claims.

The current clover-label mousse still has unknown formula and size. The old gold-rose formula is not reused. Sunscreen illustration lettering is not authoritative for SPF/PA. Powder shade, weight and SPF are not inferred. Package images remain labelled AI drafts.

All lab scenes and stills are illustrative. They do not show Mediral's actual factory, research, manufacturing sequence, verified product texture or clinical result. Glassware and abstract particles establish no dose, chemical identity, concentration, penetration or effectiveness. No germ-killing footage, clinical charts, invented percentages or chemical bonds are introduced.

## Sales contract

The five-piece offer comes from the supplied poster for 21–30 September 2026 and remains qualified as unverified in the cart. It appears only in its date window; the purchase card additionally requires all five products in the saved list. Partial lists do not inherit the bundle offer. Affiliate checkout remains unavailable until a verified link is supplied. Internal partner pricing and private evidence remain outside public documentation and runtime assets.

For implementation contracts, release status and checks, see [README.md](README.md). The current mousse media limitation is recorded in [MEDIA_REQUEST_01_MOUSSE.md](MEDIA_REQUEST_01_MOUSSE.md).
