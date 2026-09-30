# Mediral LINE commerce — connection and operating guide

Updated: 2026-09-30. Repository branch: `main`. Deployment and live acceptance must be checked separately from this guide.

## What is implemented

LINE Messaging API → Vercel `/api/mediral-commerce` → the existing Neon database, with a dedicated `mc_mediral_*` namespace. EasySlip v2 is an optional transaction-verification adapter. The optional direct OpenAI GPT conversation layer understands product questions and recent context; the deterministic order engine still controls checkout and payment. Checkout fields and receipt images are deliberately excluded from model context. Personal details typed into ordinary product messages are filtered on a best-effort basis, not guaranteed absent.

The bot is **paused by default in a new environment**; production has been explicitly activated for the shared myClover OA. GPT conversation is separately **disabled by default** until `MEDIRAL_AI_ENABLED=1`. Existing public Mediral motion/copy/assets are unchanged. This is a direct-sale workflow through myClover, not a TikTok affiliate checkout: confirm with the brand who owns stock, packs, ships, handles returns and provides receipts before starting ads. The partner sample price 290 baht is not a wholesale supply agreement and is not used as a retail price.

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

## GPT conversation — configure, test, then activate

The conversation provider uses the **OpenAI Responses API**, model `gpt-5.4-mini`. It is a real model call, not a keyword reply. It receives approved product facts, the confirmed LINE merchandise prices, the customer's current product question and up to 8 recent conversation messages from the last 24 hours. That context window is not a promise that every stored record is deleted after 24 hours. The assistant may ask a follow-up, explain product differences or offer the next step; it cannot change prices, declare stock ready, mark a payment received, or send a broadcast.

1. In the Vercel project's **Production** environment, have the owner enter `MEDIRAL_OPENAI_API_KEY` as a server-side secret. `OPENAI_API_KEY` is the supported fallback. Never paste a key into LINE, this document, the public repository or the admin page. A ChatGPT subscription does not supply API credit.
2. Leave `MEDIRAL_AI_ENABLED` absent or disabled and deploy the saved environment. LINE's existing order flow is independent of the GPT enable flag.
3. Log into `/mediral/admin/`. The **ลองคุยกับ GPT** card distinguishes missing credentials, configured but inactive, and live enabled. Configuration alone is not evidence of a successful API response.
4. Press **ทดสอบการตอบจริง**. The authenticated `POST /api/mediral-commerce?action=ai-test` uses an empty JSON body and runs only a fixed synthetic conversation: “เซรั่ม” → “ตื่นมาดูโทรม สีผิวไม่เท่ากัน” → “ตัวที่แนะนำต่างจากขวดขาวยังไง”. It does not read customer conversations, send LINE messages or create orders. It does make billable API requests. Review the actual replies and the input/output token counts. Failures remain visible; they are not presented as a successful model test.
5. After the sample works, set `MEDIRAL_AI_ENABLED=1`, redeploy, and use the owner's test LINE account to check a natural conversation, a follow-up referring to the previous recommendation, checkout and human handoff. Verify one reply per inbound message. A successful admin sample does not prove the complete LINE path.

Initial limits are 100 model requests per day for the application, 20 per customer per day and 10 per minute, with a 14-second provider timeout. Each request caps output at 1,100 tokens, conversation input at 12,000 characters and approved product knowledge at 30,000 characters. These are request ceilings, not a currency budget; monitor the OpenAI project's usage and billing separately. API errors, exhausted limits or rejected output must use the existing fallback/handoff path, never fabricate a model answer or payment status.

The authenticated status response exposes `ai.configured`, `ai.enabled`, `ai.model` and `ai.dailyLimit` only, never the credential. The synthetic-test errors are `AI_NOT_CONFIGURED`, `AI_UNAVAILABLE`, `AI_LIMIT` and `AI_INVALID_OUTPUT`.

Privacy: `/mediral/privacy/` explains that ordinary product questions can be processed by OpenAI. Recipient fields, images and payment data are handled separately. Do not add full customer records, raw order history or receipt images to the model prompt. Do not claim automatic text filtering removes every personal detail. A person can request human support instead.

## Order actions

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

## Shared myClover OA — 2026-09-30 update

Initial inspection found an empty webhook and native automatic replies. The subsequent activation replaced that state: บ้าน myClover 🍀, basic ID `@140xlsju`, now uses the configured Mediral webhook with redelivery enabled; native automatic replies are inactive, native greeting remains on, and manual chat is selected. Recheck these settings if a reply is missing or duplicated.

`MEDIRAL_SHARED_OA=1` enables the house router. It supports Mediral checkout, an AI Sauce information/human-handoff route, a neutral house menu, multiple coarse interests per customer and explicit topic-specific news preferences. The house/order controls remain rule-based; the separately configured GPT layer handles natural product conversation. Without the GPT key and enable flag, the router alone is not an LLM integration. No bulk sending endpoint or automatic campaign scheduler is added.

People can say “คุยเรื่อง AI” / “คุยเรื่อง Mediral” without losing an unfinished Mediral checkout. Recipient data is not scanned for marketing intent. News subscriptions require “รับข่าวดูแลผิว”, “รับข่าว AI” or “รับข่าวของใช้ในบ้าน”; “หยุดข่าวทั้งหมด” works even during handoff. Unfollow clears news subscriptions. These are internal CRM preferences; they do not create LINE OA Manager chat tags. LINE's Messaging API cannot create chat-tag audiences directly (https://developers.line.biz/en/docs/messaging-api/using-audience/).

Next sales principle: source-specific entry messages, current conversation context, an optional customer-selected interest, and explicit handoff when ambiguous. A generic friend-add event does not reveal the ad or exact product that brought someone here. Add tracked source codes only when supported by an explicit entry link/action; do not infer provenance from generic follows.

Keep a single greeting source (OA Manager or bot). The current setup keeps the native greeting and suppresses the bot's follow greeting. Preserve the existing channel credentials and webhook when configuring GPT; the OpenAI key does not require a new LINE channel.

GPT scope: understand product questions, use approved product facts and suggest an appropriate next step. Funds, stock and price remain controlled by the order engine. Targeted campaigns are a future feature: they should be previewed by segment and require an explicit send action, respect opt-outs, cap frequency, deduplicate against order messages and measure replies/clicks/orders rather than assuming broadcasts are read. No such campaign was sent in this task.
# LINE storefront update — 2026-09-30

The shared myClover OA has a six-area rich menu: Mediral information, ordering,
AI learning, order status, news preferences, and human support. Its native greeting
and keyword replies are configured separately in OA Manager. Disable native auto
responses when the webhook goes live to avoid two replies. Keep the native greeting
and suppress the bot's follow greeting via MEDIRAL_NATIVE_GREETING=1.

The owner approved LINE pricing at 399 THB per unit and 1,899 THB per complete
five-product set, with no gifts. Shipping and available stock are not confirmed.
The bot shows merchandise price, but payment still requires an operator quote.
The quote screen supports the set discount; do not substitute historical TikTok prices.

MEDIRAL_LINE_BASIC_ID allows the server to resolve and validate bot identity using
LINE GET /v2/bot/info, without exporting its token to a local file. An explicit
MEDIRAL_LINE_BOT_ID continues to work for existing installations.

An authenticated dashboard now has an attention summary built from known order
states and handoff reasons. It does not claim to summarize complete transcripts.
When MEDIRAL_OWNER_LINE_ID is set to the verified owner's LINE ID, the existing
five-minute drain schedules one private push per new actionable state. Deduplication
and the durable outbox prevent repeated alerts on unchanged cases. Alerts contain
task type and order number, never addresses or receipt images. LINE push quotas
and delivery failures still apply. No broadcast endpoint is introduced.

Live acceptance still requires a real inbound user message, a reply in LINE,
owner alert delivery, working admin login, and payment-provider configuration.
No EasySlip key means slips go to manual review; no image model marks payments paid.
