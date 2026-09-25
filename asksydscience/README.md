# Ask Syd Science demo foundation

Status: awaiting product brief. Foundation prepared on a dedicated GitHub branch; verify deployment and domain activation separately.

## Entry points

- Main site: `/asksydscience/` (`/asksydscience` normalizes through existing middleware).
- Intended custom domain: `https://asksydscience.myclover.com/`.
- Vercel host-specific root rewrite serves the same `asksydscience/index.html`, keeping the subdomain in the address bar.
- Use `/asksydscience/`-prefixed asset and internal page URLs so both entry points work. Do not add a domain-wide catch-all rewrite: unknown routes should remain 404.
- Demo pages are marked noindex; this is not authentication.

## Before activation

1. Build the demo from the forthcoming brief.
2. Deploy the prepared changes to the myClover Vercel project.
3. Add `asksydscience.myclover.com` to that project and apply the exact DNS record provided by Vercel at the DNS provider.
4. Verify HTTPS, both entry points, assets, query parameters, and unknown-route behavior on the deployed host.

## Backend scope pending brief

No database, AI service, login system, write API, or data collection has been provisioned. Define data fields, user roles, integrations, and persistence requirements from the brief before implementing them. Keep future API handlers under the existing `api/` serverless boundary; never place credentials in this public folder.
