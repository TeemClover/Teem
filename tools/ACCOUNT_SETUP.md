# myClover Account + Cloud Save

The site stays guest-first. Anonymous progress continues to live in `localStorage`; signing in adds a Postgres backup and merges cloud/device unlocks.

## Required Vercel database

Connect a Neon Postgres database to the Vercel project and expose its pooled connection string as `DATABASE_URL`. Tables and indexes create themselves lazily on the first API request.

## Google Login

Set encrypted Vercel environment variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Authorized redirect URI:

`https://www.myclover.com/api/auth/oauth/google/callback`

## LINE Login

Set encrypted Vercel environment variables:

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

Set `MEMBER_ADMIN_USER` and `MEMBER_ADMIN_PASSWORD` in Vercel. If omitted, the API reuses `STAT_USER` and `STAT_PASSWORD`. When neither password exists, the registry fails closed with HTTP 503. The static dashboard contains no member data; every search and CSV download goes through the protected `/api/members` endpoint.
