# Kate Kors — Fractional Marketing Lead

Static landing page (no build step). Deployed with Cloudflare Pages.

- `index.html` — the whole site
- `fig/` — photos and 3D figures
- `og.jpg` — link preview image, `favicon.svg` — tab icon

Cloudflare Pages settings: Framework preset **None**, build command **empty**, output directory **/**.

## Private client pages

Client pages live in `clients/<client>/` and open only at `https://clients.katekorsmarketing.com/<client>/`
(`functions/_middleware.js`). No password: whoever has the link can open it. On the main domain those folders
return 404, and the pages are marked noindex.

- New client: add a folder under `clients/`, add a line to `CLIENTS` in `functions/_middleware.js`, push.
- `clients.katekorsmarketing.com` must be added under Custom domains of the Pages project.

## Form notifications

The consultation form sends each request to kate@katekorsmarketing.com (Web3Forms, key in `index.html`)
and to Telegram via `functions/api/notify.js`. Telegram needs two Pages secrets:
`TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_CHAT_ID` (from @userinfobot).
