# TeamBook environment contract

TeamBook runs from a dedicated Vercel Project whose Root Directory is `teambook`.
Never copy values from the myClover/XTY project. Preview and Production may use
different values, but both must point only to TeamBook-owned resources.

| Variable | Required | Provider | Purpose |
|---|---:|---|---|
| `TEAMBOOK_DATABASE_URL` | Yes | Neon/Postgres | Isolated TeamBook accounts, books, cards, sessions and PET state |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob | Private member image uploads under the `teambook/` object prefix |
| `CRON_SECRET` | Yes | Vercel | Authenticates scheduled PET wake requests |
| `GROQ_API_KEY` | Yes | Groq | PET text and vision replies |
| `TEAMBOOK_PET_AI` | Yes | TeamBook | Set to `on` to enable Groq PET replies |
| `TEAMBOOK_PET_VISION` | Yes | TeamBook | Set to `on` to enable image understanding |
| `TEAMBOOK_PET_TEXT_MODEL` | Yes | Groq | Text model; default `openai/gpt-oss-20b` |
| `TEAMBOOK_PET_VISION_MODEL` | Yes | Groq | Vision model; default `qwen/qwen3.6-27b` |
| `TEAMBOOK_PET_WAKE_CONCURRENCY` | Yes | TeamBook | Maximum concurrent PET wake jobs; default `12` |
| `RESEND_API_KEY` | Yes for email OTP | Resend | Sends one-time sign-in codes |
| `TEAMBOOK_FROM_EMAIL` | Yes for email OTP | Resend | Verified TeamBook sender identity |
| `TEAMBOOK_ADMIN_PASSWORD` | Yes for admin tools | TeamBook | Protects TeamBook-only administration routes |
| `GOOGLE_CLIENT_ID` | Optional | Google | Google sign-in |
| `GOOGLE_CLIENT_SECRET` | Optional | Google | Google sign-in secret |
| `LINE_CHANNEL_ID` | Optional | LINE | LINE sign-in |
| `LINE_CHANNEL_SECRET` | Optional | LINE | LINE sign-in secret |

`BLOB_STORE_ID` can be injected automatically by Vercel's OIDC integration at
runtime. It is not a substitute for configuring a dedicated TeamBook Blob store
in the project. Local and explicit-token deployments use `BLOB_READ_WRITE_TOKEN`.

The TeamBook Blob store must use **Private** access. Browsers receive images only
through `/api/teambook/party/:code/image/:seq` or the matching `/cover` route;
those routes verify active membership before reading Blob. Local-profile bearer
sessions are mirrored into a path-scoped HttpOnly media cookie so normal `<img>`
elements work without exposing the party token. Groq vision receives a temporary
server-side data URL, never a permanent public URL. Public notebook discovery
uses the neutral notebook cover until a deliberately public derivative exists.

OAuth callbacks for the production project:

- `https://teambook.me/api/auth/oauth/google/callback`
- `https://teambook.me/api/auth/oauth/line/callback`

Do not commit real values. `.env.example` is the only committed value template.
