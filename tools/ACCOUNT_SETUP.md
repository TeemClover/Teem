# myClover Account + Cloud Save

The site stays guest-first. Anonymous progress continues to live in `localStorage`; signing in adds a D1 backup and merges cloud/device unlocks.

## Required Cloudflare binding

Bind the existing D1 database to the Pages project as `DB`. Account tables create themselves lazily; `tools/account-schema.sql` can also be run manually.

## Google Login

Set encrypted Pages environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Authorized redirect URI:

`https://www.myclover.com/api/auth/oauth/google/callback`

## LINE Login

Set encrypted Pages environment variables:

- `LINE_CHANNEL_ID`
- `LINE_CHANNEL_SECRET`

Callback URL:

`https://www.myclover.com/api/auth/oauth/line/callback`

Enable the `openid`, `profile`, and `email` scopes in the LINE Login channel. The UI only shows a provider after both required values exist.

## Behavior

- Email password: minimum 8 characters, PBKDF2-SHA256 with a unique salt and 210,000 iterations.
- Session: random opaque token, only its SHA-256 hash is stored; cookie is HttpOnly, Secure, SameSite=Lax, 30 days.
- Trigger: the optional signup dialog appears once on a device after 14 achievements are unlocked.
- Merge: flags use OR, lists use union, counters use max, and local profile choices win. Match snapshots, room tokens, analytics IDs, photos, card nickname/text, email, and private account UI flags are excluded.
- Shared device safety: the first account adopts existing guest progress. If a different account later signs in on the same browser, the old account's progress keys are replaced by the new account's cloud save instead of being copied across accounts.

## Private member registry

Open `https://www.myclover.com/members/` to search member number, name, email, login provider, join date, last progress activity, and export CSV.

Set `MEMBER_ADMIN_USER` and `MEMBER_ADMIN_PASSWORD` in Cloudflare Pages. If omitted, the page reuses `STAT_USER` and `STAT_PASSWORD`. When neither password exists, the registry fails closed with HTTP 503.
