const SOCIAL_CRAWLER = /(facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|WhatsApp|LINE)/i;

export const config = {
  matcher: [
    '/xircle',
    '/xircle/:path*',
    '/xty/join',
    '/xty/join/:path*',
    '/xty/p',
    '/xty/p/:path*',
  ],
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (!SOCIAL_CRAWLER.test(ua)) return;

  const source = new URL(request.url);
  const meta = new URL('/api/share-meta', source.origin);
  meta.searchParams.set('path', source.pathname);

  const mode = source.searchParams.get('mode');
  const code = source.searchParams.get('c');
  if (mode) meta.searchParams.set('mode', mode);
  if (code) meta.searchParams.set('c', code);

  try {
    const response = await fetch(meta.toString(), {
      headers: { 'x-myclover-share-preview': '1' },
    });
    if (response.ok) return response;
  } catch {
    // If social-preview rendering fails, fall through to the real static page.
  }
}
