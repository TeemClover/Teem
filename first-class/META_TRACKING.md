# First Class · Meta tracking runbook

## Funnel

- `PageView` + `ViewContent`: browser, production hosts only, sent once to both the business Pixel and the profile Boost Pixel.
- `Lead`: browser, after the registration API confirms the record was saved, sent once to both browser pixels.
- `Purchase`: server-side Conversions API, after an admin or trusted verifier confirms the real 98 THB payment.

Client events use `AI ใส่ซอส · First Class`, course ID `ai-sauce-first-class-2026-08-18`, value `98`, and currency `THB`. The registration stores `_fbp`, `_fbc`, UTM parameters, and landing referrer. Purchase matching uses a SHA-256-normalized email plus the available browser/network signals; LINE ID, Discord Username, and AI survey answers are never sent to Meta.

## Production environment

Set these as server-only production variables:

- `META_PIXEL_ID` (primary business Pixel; used by browser and CAPI)
- `META_PROFILE_PIXEL_ID` (optional override for the public browser-only profile Boost Pixel)
- `META_CAPI_ACCESS_TOKEN`
- `META_GRAPH_API_VERSION` (optional, defaults to `v23.0`)
- `META_TEST_EVENT_CODE` (temporary; remove after Test Events verification)

Pixel IDs are intentionally exposed through the public config endpoint. The profile Boost Pixel has a public code fallback so deployment works without a new secret. The CAPI token is never returned to the browser, and server-side `Purchase` remains on the primary business Pixel only.

## Safe launch checklist

1. Open Events Manager → Test Events.
2. Add `META_TEST_EVENT_CODE` in production.
3. Visit `/first-class/` and verify `PageView` and `ViewContent`.
4. Submit one test registration and verify exactly one `Lead` after success.
5. Confirm the 98 THB test payment in First Class Control Room and verify one server `Purchase`.
6. Confirm the same registration again and verify no duplicate Purchase.
7. Remove `META_TEST_EVENT_CODE`.
8. Start the ad campaign optimized for `Purchase` only after Purchase is verified. Until then, optimize for `Lead`.

## Admin behavior

The Meta badge shows `—`, `Sent`, or `Failed`. A failed CAPI call never rolls back payment, Discord access, or confirmation email. Use **Retry Meta** after correcting configuration or a transient failure.
