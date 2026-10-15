# Clover 20 — Welcome Home

A mobile-first, responsive, scroll-directed 3D invitation for the Clover reunion on 20 October 2026. Venue intentionally remains to be confirmed.

## Preview

From the repository root, run `node tools/clover20/preview.mjs`, then open `http://127.0.0.1:4178/clover20/`.

The preview requires Node 20+ and no installation. Its RSVP adapter writes real records into a private directory under the system temporary directory. The startup output identifies that directory. These records are **local test records**, separate from production. Set `CLOVER20_PREVIEW_STORE` to a private path to retain local records across preview-server restarts.

## Experience

Eight connected scenes: a four-leaf Clover assembled from particles, one table, meeting rooms, quiet learning, a 10,000-seat hall, shared travel, independent paths, and a return to the table. Scroll controls the camera, the turning page, the hall filling, and the circles moving outward. Actual archival photographs remain intact as image planes, and stay within the story without zoom controls or a photo dialog.

The two supplied official PNG logos are used unchanged: the symbol in the header and the complete wordmark in the footer. The mobile camera and composition differ from desktop. Photos keep their aspect ratios. No third-party CDN, analytics, autoplay audio, or generated faces. All photographs are local WebP files; the entire frontend is approximately 2.7 MB before HTTP compression. Three.js r180 is vendored with its MIT license. Kanit is self-hosted.

The hall uses 10,000 instances per seat component, simple geometry and GPU-controlled filling. The renderer caps pixel density and lowers it after sustained slow frames. Rendering pauses off the journey and in a hidden tab. Reduced-motion preferences, missing WebGL2, or context loss switch to a readable photo-and-text version. The motion control also lets a visitor choose the still-image version.

## RSVP in production

`POST /api/clover20-rsvp` uses the existing repository dependency `@neondatabase/serverless`. Configure `DATABASE_URL` or `POSTGRES_URL` in the **intended deployment environment**; optionally set a stable private `CLOVER20_RATE_SALT`. No database credentials enter frontend assets.

The form has only a name and an optional story. It does not collect contact details or require a consent checkbox. The first accepted request initializes the dedicated `mc_clover20_replies` table. Records include name, optional message, privacy-notice version, creation time, payload hash, hashed source IP, and a receipt. This separate table can coexist with the earlier unshipped RSVP schema without changing previous records. There is no public list/read endpoint. Retrieve the guest list through the database's authorized administration tools. Do not export personal records into this public repository.

Writes are committed before the client receives acceptance. Idempotent retries reuse the same receipt; changed data with the same request ID is rejected. An unavailable database returns 503 and the page retains the form. Same-origin checks, an input limit, a honeypot, and a database-backed submission limit are included. No email or LINE message is sent automatically.

Before sending invitations, confirm the venue, verify the target environment's database connection and a real deployed RSVP, and remove any QA records in that environment. The current local verification does not establish production database readiness.

## Checks

Run `node --test tests/clover20/registration.test.mjs`. The checks cover durable writes, concurrent idempotent retries, changed-payload conflicts, name and input validation, origin and method boundaries, storage failure, and durable rate limiting.

The frontend and local RSVP have also been exercised in a browser at phone and desktop widths. QA screenshots and local test records stay outside this checkout.

## Photographs and edits

`assets/photos/manifest.json` maps the 14 photos back to the supplied video screenshots. Crops remove subtitles, video controls and excluded signage. Only restrained exposure, saturation and sharpness adjustments were used; people were not reconstructed. The hall photograph is a historical image and does not announce this reunion's venue.

To recreate the optimized photographs, install `sharp` in your tool environment and run `node tools/clover20/prepare-assets.cjs /absolute/path/to/the/original/screenshots`. Prepared assets are already checked in; this is unnecessary for preview or deployment.

The existing `/invite/` redirect and all other routes are preserved. This experience has its own `/clover20/` route. This work was prepared on an isolated branch from the fetched remote main branch; deployment is a separate action.

## Revision 2

The opening is a GPU-animated field of four heart-shaped leaves, with the title “โชคดีที่เราเคยได้เจอกัน”. Seating rotations now face the centre of each table. The turning book page is half the book width, pivots at the spine, and stays clear of the lamp for the full turn. Gallery buttons, photo raycasting, chapter counters, contact fields, checkbox consent and visitor receipt numbers were removed to keep the invitation minimal.
