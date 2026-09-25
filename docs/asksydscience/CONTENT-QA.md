# AskSydScience demo — independent content and static QA

Date: 2026-09-25. Scope: local generated HTML, CSS, JavaScript, content JSON and builder reviewed against the supplied demo kit. This review did not open a browser, inspect live TikTok, test the deployed domain, or verify portrait identity/rights or medical evidence.

## Result

The demo preserves the requested warm editorial direction and the brief's three functional rooms: stories, a proposed workshop and curated picks. First-person “ซิด” copy is welcoming without adding biography, qualifications, testimonials, follower counts, scientific citations or outcome claims. The actual headline remains the reference headline. The apparent book is labeled as a demo concept; no fabricated product is offered for sale.

The refreshed independent offline check ran with **130 checks, 0 failures and 1 copy-positioning warning**. Run it with `python3 tools/asksydscience/validate.py`. Its successful result means the static integrity checks below passed; it is not an accessibility, performance or live-site certification. The count may change as the implementation changes.

## Checked

- Source metadata remains demo/proposed; public-release approval was not silently changed. Publication of this explicitly requested demo does not establish approval of pending content, claims or external destinations.
- All three stories remain proposed sample topics with no real video URL, publication date, duration, citations or invented audience statistics. Cards and dialogs identify them as samples.
- The workshop remains a plan: four weeks, three online sessions and one in-person session. Date, price, capacity and registration URL remain null. Registration preview explains the future path and does not collect data.
- Curated products remain empty. Selection/disclosure intent is readable without fake product buttons or checkout.
- The sole external destination is the exact owner-supplied TikTok profile. Its source status remains “not live audited”; no claim is made that the current profile or any episodes were verified.
- Every current HTML/CSS file reference and srcset candidate resolves within the public route; internal fragment, template and ARIA references exist; document IDs are unique. External asset/source URLs are rejected; only the known TikTok navigation link is allowed.
- The route contains only the page, style/script/favicon, public README and permitted image/font/license assets. No private source kit, meeting transcript, archive or content-review document is in this directory.
- There is one h1, Thai language metadata, a noindex directive, alternative text and explicit image dimensions. Visible focus styling, reduced-motion rules, native story details, all four static week descriptions, FAQ details and no-script registration/picks explanations exist.
- No form, input, embedded media/player, browser persistence or outbound JavaScript transport was found. The review counters use an in-memory Map.
- Global no-JavaScript rules now hide intention, filter, week-tab and dialog controls at all widths, including when a parent contains the control. The readable static story details, all four week sections and noscript explanations remain present. The validator reads top-level rules after media queries as well as before them.
- Interactive Thai labels now come from the content-generated `#site-ui` block; the script contains no Thai literal copy. The generated label JSON exactly matches the source.
- A clean rebuild in a disposable temporary directory exactly matched the checked-in generated HTML. The validator does not rewrite the active public page.

## Issues to resolve or explicitly inspect

1. **Copy warning:** the stories note says “หัวข้อด้านล่าง…” but is rendered after the cards. “หัวข้อในแกลเลอรีนี้…” would remain accurate at any layout. The validator reports this until the source copy is changed and rebuilt.
2. **Visual review item:** major prose is now 16px on mobile and 17px in the main desktop content; supporting FAQ/trust text is 15px. This materially improves the earlier 13–14px treatment, though it is still below the brief's proposed 18–20px body scale. Some image/sample labels remain 7–10px. Confirm their practical readability during the parent's viewport review; this static audit does not claim a WCAG failure or pass.

The earlier no-JavaScript and duplicated-Thai-copy findings have been addressed. Public README refresh and live-deployment reporting are handled separately by the parent task.

## Design and tone observations

The hero separates real HTML text from the AI scene and uses explicit AI attribution. Polaroid cards, a tactile book mockup, leaf details, warm natural light and the letter section carry the visual reference into an actual page. The mobile rules put the portrait after the main hero content, avoiding main paragraph text over the face.

The intention picker, topic filtering, readable story dialogs with reflection questions, workshop week tabs, mobile menu, FAQ disclosures and reading progress are appropriate small interactions for this brief. The reflection questions do not solicit stored responses. The implementation keeps a gentle tone and avoids a personal medical chatbot, fabricated video playback or mandatory health profiling.

The sections retain distinct navigation destinations even though the workshop heading uses the reference's “ของฝากจากซิด”. Ensure the surrounding workshop name and planning badge remain prominent enough that visitors understand this is a proposed learning activity.

## Not tested here

Actual viewport overflow and Thai glyph clipping at 360/390/768/1440; touch target dimensions; contrast; keyboard/focus containment and restoration; native-dialog fallback in older browsers; no-JS CSS cascade in a browser; reduced-motion behavior; network activity at runtime; iOS Safari/Android in-app browsers; Lighthouse or field Core Web Vitals; DNS/TLS/production routes. These require the separate visual and deployment checks.


## Final integration update

Parent corrected the gallery note, removed outdated README statements, and replaced tiny reference crops with explicitly labeled AI images. Final validation: 130 checks, 0 failures, 0 warnings. Main copy stays proposed demo material. See BROWSER-QA.md for actual Chromium checks.
