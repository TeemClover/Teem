# Web checkout review — 2026-10-01

Owner approved merge and deployment on 2026-10-01. Checkout supports the website with automatic 20% coupon alongside LINE.

- `/mediral/checkout/`: choose 1–5 of each SKU, delivery information and consent, view order status and submit JPEG/PNG receipt (up to 3 MB).
- Updated 2026-10-02: web prices are server-controlled at 500 THB per item with a 20% browser-session coupon (400 per item, 2,000 for five). It expires at Bangkok midnight after the second following calendar day, 48–72 hours from first checkout session. Refreshing does not extend it. The cookie is not a cross-device identity; clearing cookies or using another browser starts a new session. LINE retains its separately configured campaign deadline. Never trusts client totals.
- Shipping and stock remain unconfirmed. Orders start at `awaiting_quote`; bank details appear only after an authenticated operator confirms stock and shipping. Do not advertise immediate payment until these business rules are supplied.
- Existing admin handles web orders without trying to send LINE messages to web customer IDs. Web coupon snapshot cannot be overridden by the legacy LINE pricing checkbox. Quote expiry is at most 24 hours and never extends beyond coupon expiry.
- Signed HttpOnly Secure SameSite cookie, same-origin POST, rate limits, server validation, private status allowlist. Repeated create calls return the same order. New order allowed only after cancellation/shipping. No PII in URLs/localStorage.
- Upload changes state to manual payment review, never marks paid. Existing bank-confirmation and duplicate-reference checks remain required.
- Privacy page explains the 30-day browser cookie. Existing order/receipt retention applies.

## Operational checks

1. Confirm shipping and stock rules with owner. Until then manual quote is intentional.
2. Draft LINE bot catalog, deterministic answers, GPT facts and admin pricing now share the 500 / 20% campaign. Existing quoted orders are unchanged. Verify newly created LINE quotes after deployment.
3. Merge and production deployment authorized on 2026-10-01; no automatic stock or free-shipping assumption is authorized.
4. Production checkout, receipt upload and owner notifications must be verified after deployment; local tests are synthetic only.

## Verification

`node --test tests/mediral-commerce/*.test.mjs tests/mediral/*.test.mjs`

Local synthetic preview: `node tests/mediral-commerce/preview.mjs` → http://127.0.0.1:4184/mediral/checkout/ (in-memory test database, fake providers, no real LINE sends).
