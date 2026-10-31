# ร่างกายมีเรื่อง: comment → website → workbook

Public paths:

- `/bodymestory/` — channel hub
- `/bodymestory/7-days/` — request and download the free six-page workbook
- `/bodymestory/references/#RG01` through `#RG30` — episode sources
- `/bodymestory/privacy/` — campaign-specific privacy and advertising choice

The PDF and supporting assets are served by this repository. No Google Drive link is needed.

## Data and deployment

Apply `migrations/20261101_bodymestory_leads.sql` to an isolated branch and test
`tests/bodymestory-postgres-statements.json` once in a single transaction/session
before applying the additive migration to production. The fixture is for a fresh
development branch only. Public requests never create tables.

`POST /api/bodymestory` persists the request before returning a download URL.
Names are optional; email and privacy acknowledgement are required. Newsletter
and advertising consent are independent, unchecked choices. The form does not
collect health details. PageView and Lead are browser events sent to Meta only
after advertising consent; name/email are not sent as event or advanced-matching
parameters. `BODYMESTORY_PIXEL_ID` can override the existing myClover pixel;
an explicitly empty or invalid override disables the Pixel.

Read-only admin JSON/CSV at `/api/bodymestory?format=csv` uses the existing
member-admin Basic credentials (`MEMBER_ADMIN_*`, with `STAT_*` fallback).
There is no public lead listing. Consent dates in the lead row record historical
opt-in; the event table records each request's current choices. These records
are not an automatic email sender or an email-based Meta Custom Audience.
Handle withdrawal/suppression requests before any future mailing campaign.

## ManyChat setup

Connect the Facebook Page **ร่างกายมีเรื่อง**, Page `61595980173020`, Meta
asset `1414123481782641`, to its own ManyChat account. Keep existing myClover
accounts and automations unchanged. Adding Page access may require the owner's
approval in Facebook. Do not claim this connection is live until it is verified.

Use keyword **เริ่ม** for comments and incoming messages. Public reply example:
“ส่งทางข้อความให้แล้วนะคะ 🌿”

DM example:
“สมุดรู้มื้อรู้ตัว 7 วันอยู่ตรงนี้ค่ะ 🌿 เปิดเว็บ ใส่อีเมล แล้วดาวน์โหลดได้เลย”

Button: **รับสมุดฟรี**

Target:
`https://www.myclover.com/bodymestory/7-days/?utm_source=facebook&utm_medium=manychat&utm_campaign=bodymestory_7days`

For an episode-specific flow add `&episode=RG01&utm_content=RG01` (through
RG30). Use only the public episode and campaign identifiers; do not put email,
name, Messenger/Instagram contact IDs, or tokens in the URL. ManyChat maintains
its own contact list, while the website stores only the submitted form fields.

Test a real eligible comment → DM → website → saved request → PDF before using
the short comment CTA in published captions. Page-owned comments may be
excluded by the provider. Do not enable the previous native Meta automations
that sent the Drive link alongside ManyChat; that can produce duplicate replies.

## Validation

`npm run test:bodymestory` runs API, flow, and actual browser-entrypoint logic
tests without production credentials. Validate the mobile UI and live download
after deployment. A commit or an open PR is not proof of a live deployment.
