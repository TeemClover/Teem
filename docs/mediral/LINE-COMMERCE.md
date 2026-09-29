# Mediral LINE commerce — connection and operating guide

Date: 2026-09-30. Branch: `feat/mediral-line-orders`.

## What is implemented

LINE Messaging API → Vercel `/api/mediral-commerce` → the existing Neon database, with a dedicated `mc_mediral_*` namespace. EasySlip v2 is an optional transaction-verification adapter. No LLM receives names, addresses, phone numbers, slips or payment decisions. Product questions link to the existing Mediral page or hand off to a person.

The bot is **paused by default**. Existing public Mediral motion/copy/assets are unchanged. This is a direct-sale workflow through myClover, not a TikTok affiliate checkout: confirm with the brand who owns stock, packs, ships, handles returns and provides receipts before starting ads. The partner sample price 290 baht is not a wholesale supply agreement and is not used as a retail price.

Customer flow: select five-piece routine or individual items → consent → recipient name → phone → full address/postcode → confirm → staff checks stock and enters a quote → payment details → slip image → preliminary verification / manual review → staff confirms actual bank receipt → packing → tracking number sent to LINE.

The receiving account is reused from the existing AI Sauce page at the owner's request. Check its beneficiary against the bank before activation. It is deliberately not editable by a customer's chat or request payload.

## Connection gate — do not start ads yet

1. In LINE OA Manager, choose the actual myClover OA linked by the public website. Inspect the current webhook first. A channel has one webhook endpoint: **do not overwrite an existing AI Sauce/Homechew bot**. If occupied, route only Mediral events to this handler through the existing gateway or use a dedicated Mediral OA. The current implementation ignores unrelated initial messages, but that alone does not preserve another webhook.
2. Enable Messaging API for that OA and use its **Messaging API** channel credentials, not LINE Login credentials. Store server-side in Vercel Project Settings: `MEDIRAL_LINE_SECRET`, `MEDIRAL_LINE_ACCESS_TOKEN`, `MEDIRAL_LINE_BOT_ID`. Bot ID is `U...`, not `@...`. Obtain/confirm it via LINE's Get bot info endpoint. Never send tokens in chat, URLs, Git or public JavaScript.
3. Set a random dedicated `MEDIRAL_ADMIN_KEY` of at least 24 characters. The existing `MEET_ADMIN_KEY` is supported as a fallback, but a dedicated key is preferred. Reuse existing `DATABASE_URL`; do not rotate shared secrets. Ensure `CRON_SECRET` is set for authenticated retry/retention work.
4. Keep `MEDIRAL_MODE=paused` during deployment. Set webhook to `https://www.myclover.com/api/mediral-commerce?action=webhook`, verify its signed empty-event probe, enable redelivery. Review LINE OA automatic responses/greeting so they do not send duplicate sales prompts; do not disable unrelated OA workflows blindly.
5. If automatic slip evidence is wanted, configure EasySlip's registered receiving account to match the bank exactly and set `MEDIRAL_EASYSLIP_KEY` on the server. The code does not buy a plan. Without the key, customer slips go to a person. With it, a provider pass still requires staff confirmation of funds before `paid`.
6. Confirm retail prices, shipping and fulfillment with the brand. This version has no automatic inventory reservation. When sending a 24-hour quote, staff must set aside the quoted stock. Quotes cannot silently change after being sent. Cancel an unpaid quote and start a new order if items, recipient or price need correction. Check the bank first if payment may have arrived.
7. Connect a controlled test customer, set `MEDIRAL_MODE=live`, and execute the live acceptance sequence below before advertising. LINE push messages consume the OA's messaging allowance; monitor its quota. Vercel's five-minute cron requires a plan allowing that schedule (the existing project already uses sub-daily cron). Do not upgrade a plan without approval.

## Operating the shop

Open `/mediral/admin/`, log in with the server-configured admin key. The UI shows the latest 100 orders and handoff conversations. Filters/search apply to those 100; it is not a full historical order search.

- **แจ้งยอดหลังเช็กของ**: enter per-item prices + shipping, confirm physical stock. The server calculates the sum in integer satang. It sends the same AI Sauce bank account and a 24-hour payment window to the customer.
- **ตรวจเงินเข้าแล้ว**: open the protected receipt, compare with actual bank activity. Confirm exact total, transaction reference and transfer time. Never press this based only on the appearance of a screenshot or a provider green result.
- **เริ่มแพ็ก / แจ้งเลขพัสดุ**: record carrier/tracking only after the parcel is genuinely dispatched. This sends a LINE notification; it does not buy a shipping label or submit a carrier booking.
- **ให้คนดูแลรับช่วง**: pauses the bot for that person. Reply via LINE OA Manager. Resume through the handoff list when ready.
- **การแจ้งลูกค้า**: displays failed or queued delivery. Use retry for pending messages; inspect the actual LINE conversation before sending a replacement manually. A bank quote may be saved even if LINE sending failed.
- A cancellation after confirmed payment, refund, late/partial/over-payment, change to a paid order or data-deletion request requires a person. The system never refunds or treats a mismatched amount as paid automatically. A payment outside the quoted time window stays for investigation; do not fabricate a timestamp to pass validation.

## What the slip adapter checks

The image is fetched only from LINE's fixed API host, bounded to 3 MiB, JPEG/PNG. EasySlip v2 receives the image, order reference and exact amount, not the address. Verification compares registered receiver bank/account, amount, transfer time, duplicate signal and transaction reference. EasySlip's account matching is provider evidence, **not independent proof of actual deposit**.

`mc_mediral_transfers` atomically prevents one bank reference from settling two Mediral orders. The existing AI Sauce receipt ledger is also checked. That cross-app check is read-only and not a shared atomic ledger: an AI Sauce admin accepting the same transfer concurrently is not globally prevented. Staff must reconcile the shared bank account across both businesses. Automated paid/fulfillment is deliberately not enabled.

Database-backed customer leases, event IDs, optimistic version checks and a transactional outbox handle retries. Push retries reuse LINE's retry key. Expired reply tokens are surfaced for human recovery, not converted into potentially duplicate pushes. Old queued order prompts are skipped when their order's status advances. Webhook work is bounded; enable LINE redelivery for timeout recovery. This is an initial single-store workflow, not a load-tested high-volume queue system.

## Privacy and security

Consent precedes name/address collection; `/mediral/privacy/` explains use and providers. Admin data and receipts require an expiring HttpOnly/Secure/SameSite cookie. Mutations require a same-origin request. Secrets are not stored in browser storage. API/admin responses are non-cacheable. Login attempts and customer events are rate-limited. Request, image and input sizes are bounded; sensitive provider errors are not returned to clients.

Signed webhooks use the original request bytes via Vercel's Web Request entry point. Receipt images stay in private DB records, are stripped from list responses and are downloaded only through the authenticated endpoint. The five-minute authenticated drain job deletes images older than 90 days and purges short-lived event/outbox/limit records. Verify cron execution before relying on this retention claim. Orders and uncompleted customer drafts require an operator retention/deletion policy; this version does not provide a self-service deletion button or staff roles/auditable individual staff identities. Use a restricted shop admin key and review access.

## Live acceptance sequence (not yet completed)

- Deployment `/health` equivalent: `GET /api/mediral-commerce?action=health` says `acceptingOrders:false` until activated. Anonymous list/receipt returns 401 (or 503 if no admin key configured).
- Verify LINE bot identity matches the intended OA and the existing webhook is preserved/routed deliberately.
- Signed webhook verification succeeds; bad signature fails; unrelated initial AI Sauce chat does not trigger Mediral sales replies.
- Test account starts with “Mediral” or “ชุด 5 ชิ้น”; consent/name/phone/address reach the admin exactly once, including webhook redelivery.
- A staff-approved test quote reaches the same test customer; item prices/shipping/recipient/bank are correct. Do not publish a demo price.
- Use controlled legitimate payment evidence only with the account owner's approval. Check valid, wrong-total, wrong-account and duplicate cases with permitted provider fixtures where possible. No real transfer was made by this implementation task.
- Confirm actual funds in the bank, then tracking notification; verify delivery failures are visible. Check mobile admin and 90-day cleanup in an isolated test dataset.
- Turn ads on only after source of stock, prices/shipping, returns contact and actual live OA/payment checks are settled.

## Local verification / demo

Node 24: `npm run test:mediral-commerce`. Existing storefront tests: `node --test tests/mediral/*.test.mjs`.

Optional PostgreSQL-engine test uses PGlite installed outside the repo: `PGLITE_MODULE=/tmp/mediral-commerce-deps/node_modules/@electric-sql/pglite/dist/index.js node --test tests/mediral-commerce/postgres.test.mjs`.

`npm run dev:mediral-commerce` starts `http://127.0.0.1:4183/mediral/admin/`. Login `LOCAL-DEMO` is **only implemented in the loopback test fixture**, not in the deployable API. All records, quotes, messages and slips in that demo are synthetic and disappear on restart. No LINE or EasySlip requests are made. Fixtures and this guide are excluded from Vercel's public assets.

Official integration references: https://developers.line.biz/en/docs/messaging-api/receiving-messages/ · https://developers.line.biz/en/reference/messaging-api/ · https://document.easyslip.com/en/v2/verify/bank/ · https://vercel.com/docs/functions/runtimes/node-js
