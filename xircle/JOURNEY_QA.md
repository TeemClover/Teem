# Xircle real-app landing — validation

Updated 2026-11-09. This records the redesigned root and its required checks. It does not certify production deployment, health outcomes, app installation or every external video player.

## Scope

The active landing uses `landing.js` / `landing.css` to tell a scrolling eat → sleep → move story with real logos, sanitized app screens, Band/Scale imagery and a clearly identified generated hero scene. The former six-station map is superseded at the root. Preserve all 49 directly readable reference pages and their shared static navigation.

The scan interaction uses a fixed food example and bounded portion choices. It must not request camera access, upload an image, accept health inputs or present the sample as a visitor's measurement. Two silent, cropped real-app clips have local posters and direct fallback links. Ten official videos have local thumbnails and load a YouTube player only after Play. Routine X reserves exactly four **Coming soon** cards, without fake playback.

Asset provenance and the real-capture / generated-scene distinction are documented in [assets/real-app/README.md](assets/real-app/README.md). Company app destinations are the official App Store and Google Play applications; personal service or referral funnels are excluded from this landing.

## Current evidence status

The old six-station-map browser counts and earlier scrolling-page audits are historical, not certification of this redesign. The new `landing.e2e.mjs` browser harness passed all 7 groups on 2026-11-09 (07:48:41–07:49:26 UTC) using Chrome 156.0.8078.81. Layouts at 320/390/768/1440px, all 10 thumbnail decodes, scan stages/portions/replay, mobile camera button, Band colors/menu, four Routine X cards, real local-video playback/cleanup/focus, restored video URLs, reduced motion and no-JavaScript fallbacks passed. The run recorded zero page errors, failed local requests or unsolicited external requests. The 13 node contracts and shell check also passed.

Manual browser review observed the local scan clip playing through and the official Band tutorial playing inside the YouTube embed. Desktop/mobile hero, food results, Sleep, product color selection, media filtering and Routine X were inspected. These observations do not certify every external video or physical phone.

Keep the result tied to the tested revision and working-tree state. A local or preview pass does not establish production deployment. The unrelated broad-suite failures recorded in earlier audits have not been re-certified by this change; report any newly executed broad suite from its actual output.

## Required checks

- `npm run check:xircle`: generated shared navigation agrees on the 49 references; the real-app root retains its own header/footer.
- `node --test xircle/route-contract.test.mjs xircle/company-boundary.test.mjs xircle/knowledge-access.test.mjs`: active landing ownership, official company links, bounded examples, thumbnail/poster presence, four Coming soon cards and readable reference routes. `npm run test:xircle` also exercises existing alias contracts when its HTTP helper is available.
- `node xircle/landing.e2e.mjs`: responsive landing layouts; scan stages and portion totals; Band color selection; mobile menu; local-video playback setup, close/Escape and focus return; official media filters/queues/player removal; reduced-motion and no-JavaScript fallbacks. Inspect local images/posters and record browser errors or missing resources.
- Check changed JavaScript syntax and `git diff --check`. There is no general repository lint command.

Manually inspect desktop and narrow mobile layouts, Thai headings, hero proportions, food-stage labels, every visible video cover and the four Routine X placeholders. Play the real scan clip and an official tutorial in the visible browser; distinguish actual playback observations from automated player-creation checks. Verify the official store links, reference links and direct-video/official-channel fallbacks.

Reduced motion must reveal content without timed transitions. With JavaScript disabled, the static story, sample nutrition, reference/download links and direct media links remain usable. No camera permission prompt or health-input form should appear.

## Reproduce locally

```sh
npm ci
npm run check:xircle
node --test xircle/route-contract.test.mjs xircle/company-boundary.test.mjs xircle/knowledge-access.test.mjs
node xircle/landing.e2e.mjs
git diff --check
```

Use the browser harness's documented browser/proof-directory options when supplied, and retain its actual report. The older `journey.e2e.mjs` station-map flows are not evidence for the new root. Automated tests that block external traffic can verify intended YouTube URLs and player cleanup, but cannot certify live YouTube delivery, app installation, sign-in or purchase completion. Safari, Firefox and physical devices require their own checks.

## 2026-11-09 follow-up: faster footage and retained knowledge

Both active food clips were edited locally from the original cropped/silent footage. A clean scan glimpse hard-cuts to populated ingredient results on frame16(0.533s at30fps). Full/short playback is6.234s/5.634s; full decode and faststart order were verified. The short clip holds the final actual nutrition frame1extra second. The original public clips remain unchanged; new versioned URLs serve the shortened edits.

The root now exposes all4knowledge categories and the completed Absorb/Build experiences in `brand=xircle` context, while retaining the4forthcoming welcome clips. The library hub was restyled; both topic-data files, topic template and all deep-reference content are unchanged. In the two completed Routine X rooms, only the shared return-label wording and its script version were adjusted; story content is unchanged.

Validation on the follow-up candidate:15node contracts passed; generated shell check passed;7landing-browser groups passed across320/390/768/1440px, now including knowledge-category and completed-room links. Library browser proof passed at all4widths with all21topic IDs,4groups, HMB search→article→Back retaining the query, empty/reset/focus, filter/reload/direct category URLs and no-JavaScript access to all21topics. Both browser runs recorded no page errors or failed local requests.
