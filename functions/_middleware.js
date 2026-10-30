// Private client pages on clients.katekorsmarketing.com/<client>/
// Each client page lives in /clients/<client>/ and opens only on the clients subdomain (no password).
const CLIENTS = {
  'dr-kate': true,
};

const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS } });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const onClientsHost = url.hostname.startsWith('clients.');

  // Main site: never expose the client folders.
  if (!onClientsHost) {
    if (url.pathname === '/clients' || url.pathname.startsWith('/clients/') || url.pathname.startsWith('/functions/')) return notFound();
    return next();
  }

  // Shared static bits the client pages may use.
  if (url.pathname === '/favicon.svg') return next();
  if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });

  const m = url.pathname.match(/^\/([a-z0-9-]+)(\/.*)?$/);
  if (!m || !CLIENTS[m[1]]) return notFound();
  const slug = m[1];
  const rest = m[2] || '';

  if (!rest) return Response.redirect(`${url.origin}/${slug}/`, 302);

  const assetPath = `/clients/${slug}${rest === '/index.html' ? '/' : rest}`;
  const res = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request));
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) out.headers.set(k, v);
  return out;
}
