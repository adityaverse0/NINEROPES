# Deploying NINEROPES to Cloudflare Pages (Free Tier)

**NINEROPES** is configured for **Cloudflare Pages** on the **100% Free Tier** (unlimited bandwidth, edge CDN caching, DDoS protection, and free SSL/TLS).

---

## Method 1: Git Integration (Recommended — Automated CI/CD)

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Project name**: `nineropes` (or your choice)
   - **Production branch**: `main` (or `master`)
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `client/dist` (or `dist` if root directory is set to `client`)
4. *(Optional)* Add Environment Variables in the Cloudflare dashboard:
   - `VITE_API_BASE_URL` = `https://api.hicine.biz` (Default)
   - `VITE_API_KEY` = `hicine_website_secret_2025_exi9epdmrns` (Default)
5. Click **Save and Deploy**. Cloudflare will build and publish your site at `https://<your-project>.pages.dev` in ~1 minute.

---

## Method 2: Instant CLI Deployment via Wrangler

If you prefer to deploy directly from your local terminal:

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Build the project
npm run build

# 3. Deploy to Cloudflare Pages
npx wrangler pages deploy client/dist --project-name=nineropes
```

---

## Method 3: Direct Drag-and-Drop (No Git Required)

1. Run `npm run build` locally.
2. In the [Cloudflare Dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** > **Create application** > **Pages** > **Upload assets**.
3. Drag and drop the `client/dist` folder.
4. Your site is instantly live!

---

## Included Cloudflare Optimizations

- **SPA Routing Rule (`_redirects`)**: Guarantees that refreshing or direct navigation to any route returns HTTP 200 via `index.html`.
- **Edge Cache Headers (`_headers`)**:
  - `/assets/*`: Immutable edge cache for 1 year (`max-age=31536000, immutable`).
  - `/*`: Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Preconnected API Domains**: Zero-latency TLS handshakes for `https://api.hicine.biz` and `https://storage.hicine.biz`.
