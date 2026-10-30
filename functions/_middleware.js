// Private client pages on clients.katekorsmarketing.com/<client>/
// Each client page lives in /clients/<client>/ and is protected by a login prompt.
// Password for each client is a Cloudflare Pages secret (Settings -> Variables and Secrets).
const CLIENTS = {
  'dr-kate': 'CLIENT_DR_KATE_PASSWORD',
};

const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

function notFound() {
  return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS } });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function askForLogin(slug) {
  return new Response('Login required', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="Kate Kors · ${slug}", charset="UTF-8"`, 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS },
  });
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

  const password = env[CLIENTS[slug]];
  if (!password) return new Response('This page is not set up yet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...PRIVATE_HEADERS } });

  const auth = request.headers.get('Authorization') || '';
  let ok = false;
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const i = decoded.indexOf(':');
      ok = i >= 0 && safeEqual(decoded.slice(0, i), slug) && safeEqual(decoded.slice(i + 1), password);
    } catch (e) { ok = false; }
  }
  if (!ok) return askForLogin(slug);

  if (!rest) return Response.redirect(`${url.origin}/${slug}/`, 302);

  const assetPath = `/clients/${slug}${rest === '/index.html' ? '/' : rest}`;
  const res = await env.ASSETS.fetch(new Request(new URL(assetPath, url.origin), request));
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) out.headers.set(k, v);
  return out;
}
