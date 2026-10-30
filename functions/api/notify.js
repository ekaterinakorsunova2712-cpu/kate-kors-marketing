// POST /api/notify — sends a new consultation request to Kate's Telegram.
// Needs two Pages secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
const ALLOWED = ['katekorsmarketing.com', 'www.katekorsmarketing.com', 'kate-kors-marketing.pages.dev'];

const esc = (s) => String(s || '').slice(0, 1500).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';
  let host = '';
  try { host = new URL(origin).hostname; } catch (e) {}
  if (!ALLOWED.includes(host) && !host.endsWith('.kate-kors-marketing.pages.dev')) return new Response('Forbidden', { status: 403 });
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return new Response('Not configured', { status: 503 });

  let d;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return new Response('Too large', { status: 413 });
    d = JSON.parse(raw);
  } catch (e) { return new Response('Bad request', { status: 400 }); }
  if (d.botcheck) return new Response(null, { status: 204 });
  if (!d.name || (!d.phone && !d.email)) return new Response('Missing fields', { status: 400 });

  const phoneDigits = String(d.phone || '').replace(/[^\d+]/g, '');
  const lines = [
    '<b>🔥 New consultation request</b>',
    '',
    `<b>Name:</b> ${esc(d.name)}`,
    d.phone ? `<b>Phone:</b> ${esc(d.phone)}` : '',
    d.email ? `<b>Email:</b> ${esc(d.email)}` : '',
    d.message ? `<b>About the business:</b> ${esc(d.message)}` : '',
    '',
    phoneDigits ? `<a href="https://wa.me/${phoneDigits.replace('+', '')}">Reply on WhatsApp</a>` : '',
    '<i>from katekorsmarketing.com</i>',
  ].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i > 0));

  const tg = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  return new Response(null, { status: tg.ok ? 204 : 502 });
}

export function onRequest() {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
