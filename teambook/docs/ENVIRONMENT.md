# TeamBook environment contract

TeamBook runs from a dedicated Vercel Project whose Root Directory is `teambook`.
Never copy values from the myClover/XTY project. Preview and Production may use
different values, but both must point only to TeamBook-owned resources.

| Variable | Required | Provider | Purpose |
|---|---:|---|---|
| `TEAMBOOK_DATABASE_URL` | Yes | Neon/Postgres | Isolated TeamBook accounts, books, cards, sessions and PET/Ending state |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob | TeamBook image uploads and generated Ending Art |
| `CRON_SECRET` | Yes | Vercel | Authenticates scheduled PET wake requests |
| `GROQ_API_KEY` | Yes | Groq | PET text and vision replies |
| `TEAMBOOK_PET_AI` | Yes | TeamBook | Set to `on` to enable Groq PET replies |
| `TEAMBOOK_PET_VISION` | Yes | TeamBook | Set to `on` to enable image understanding |
| `TEAMBOOK_PET_TEXT_MODEL` | Yes | Groq | Text model; default `openai/gpt-oss-20b` |
| `TEAMBOOK_PET_VISION_MODEL` | Yes | Groq | Vision model; default `qwen/qwen3.6-27b` |
| `TEAMBOOK_PET_WAKE_CONCURRENCY` | Yes | TeamBook | Maximum concurrent PET wake jobs; default `12` |
| `TEAMBOOK_ENDING_IMAGE_ENDPOINT` | Optional | Image provider/adapter | Generates the 3 evidence-grounded Ending candidates |
| `TEAMBOOK_ENDING_IMAGE_TOKEN` | Optional | Image provider/adapter | Bearer token for the Ending image adapter when required |
| `TEAMBOOK_ENDING_IMAGE_MODEL` | Optional | Image provider/adapter | Provider-specific model identifier |
| `RESEND_API_KEY` | Yes for email OTP | Resend | Sends one-time sign-in codes |
| `TEAMBOOK_FROM_EMAIL` | Yes for email OTP | Resend | Verified TeamBook sender identity |
| `TEAMBOOK_ADMIN_PASSWORD` | Yes for admin tools | TeamBook | Protects TeamBook-only administration routes |
| `GOOGLE_CLIENT_ID` | Optional | Google | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | Google | Google sign-in secret |
| `LINE_CHANNEL_ID` | Optional | LINE | LINE sign-in |
| `LINE_CHANNEL_SECRET` | Optional | LINE | LINE sign-in secret |

If `TEAMBOOK_ENDING_IMAGE_ENDPOINT` is not configured, TeamBook still builds the
Ending Evidence and the 3 Art Brief directions. It deliberately does not fill the
missing candidates with unrelated stock/random imagery. The adapter receives
`prompt`, `aspectRatio`, `width`, `height`, `n`, `responseFormat`, and optional
`model`; it may return base64 image data or an HTTPS result URL as documented in
`.env.example`.

`BLOB_STORE_ID` can be injected automatically by Vercel's OIDC integration at
runtime. It is not a substitute for configuring a dedicated TeamBook Blob store
in the project. Local and explicit-token deployments use `BLOB_READ_WRITE_TOKEN`.

Member images remain addressed through TeamBook routes rather than exposing the
storage locator in normal UI. Chat/cover images use
`/api/teambook/party/:code/image/:seq` and `/cover`. Generated Ending candidates
use `/api/teambook-ending-image?code=…&candidate=A|B|C`. These routes verify
membership before reading Blob. The final selected Ending candidate becomes the
finished-book cover and is then served through the normal member-gated cover
route.

Local-profile bearer sessions are mirrored into a path-scoped HttpOnly media
cookie for the existing party media routes so normal `<img>` elements work
without exposing the party token. Groq vision receives a temporary server-side
data URL, never a permanent storage URL. Public notebook discovery uses the
neutral notebook cover until a deliberately public derivative exists.

## Preview provisioning note

The TeamBook Vercel project uses a Neon integration that creates per-preview
branches. Neon branch capacity is therefore part of preview deployment capacity.
If Vercel fails immediately with `BUILD_FAILED: Resource provisioning failed`
and exposes no build-log events, check the Neon project branch count before
changing application code. Stale preview branches can exhaust the integration's
branch allowance and prevent Vercel from provisioning the next Preview even when
the same commit builds successfully in another Vercel project.

Do not delete `main` or a branch tied to an active validation session. Prefer
removing old `preview/...` branches whose associated Git/Preview work is already
obsolete, then trigger a fresh Preview deployment. This is an infrastructure
recovery step, not an application-code fix.

OAuth callbacks for the production project:

- `https://teambook.me/api/auth/oauth/google/callback`
- `https://teambook.me/api/auth/oauth/line/callback`

Do not commit real values. `.env.example` is the only committed value template.
