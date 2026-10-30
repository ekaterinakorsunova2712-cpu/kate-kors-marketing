# Kate Kors — Fractional Marketing Lead

Static landing page (no build step). Deployed with Cloudflare Pages.

- `index.html` — the whole site
- `fig/` — photos and 3D figures
- `og.jpg` — link preview image, `favicon.svg` — tab icon

Cloudflare Pages settings: Framework preset **None**, build command **empty**, output directory **/**.

## Private client pages

Client pages live in `clients/<client>/` and open only at `https://clients.katekorsmarketing.com/<client>/`
behind a login (`functions/_middleware.js`). On the main domain those folders return 404.

- Login: the client's slug (e.g. `dr-kate`). Password: the Pages secret named in `CLIENTS` in `functions/_middleware.js`
  (e.g. `CLIENT_DR_KATE_PASSWORD`), set in Cloudflare → Workers & Pages → kate-kors-marketing → Settings → Variables and Secrets.
- New client: add a folder under `clients/`, add a line to `CLIENTS`, add the secret, redeploy.
- `clients.katekorsmarketing.com` must be added under Custom domains of the Pages project.
