# Deploying NINEROPES to Cloudflare Pages (Free Tier)

**NINEROPES** is configured for **Cloudflare Pages** on the **100% Free Tier** (unlimited bandwidth, edge CDN caching, DDoS protection, and free SSL/TLS).

---

## Method 1: Git Integration (Recommended — Automated CI/CD)

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Project name**: `nineropes` (or your choice)
   - **Production branch**: `main` (or `master`)
   - **Framework preset**: `Vite` (or None)
   - **Root directory**: `/` (Leave default root)
   - **Build command**: `npm run build`
   - **Build output directory**: `client/dist`
4. *(Optional)* Add Environment Variables in the Cloudflare dashboard:
   - `VITE_API_BASE_URL` = `https://api.hicine.biz` (Default)
   - `VITE_API_KEY` = `hicine_website_secret_2025_exi9epdmrns` (Default)
5. Click **Save and Deploy**. Cloudflare automatically runs `npm ci` at the repository root (installing all client dependencies via npm workspaces) and builds the site to `client/dist`.

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

---

## Troubleshooting: "Cloudflare application detection logic has been run in the root of a workspace"

### Why does this error occur?
If you see the error:
```
Cloudflare application detection logic has been run in the root of a workspace instead of targeting a specific project.
```
This happens when **`npx wrangler deploy`** (or a Cloudflare Workers CI build) is executed from the repository root:
1. **`wrangler deploy` is specifically for Cloudflare Workers**, not Cloudflare Pages static assets.
2. The root `package.json` defines npm workspaces (`"workspaces": ["client"]`). When `wrangler deploy` detects a workspace root without a designated Worker entrypoint, its monorepo detection safely aborts.
3. This project is a **pure static Vite SPA** that connects to an external API (`https://api.hicine.biz`). It does not run or need a Cloudflare Worker.

### How to Fix:

#### Option A: In Cloudflare Dashboard (Recommended)
1. Go to **Cloudflare Dashboard** > **Workers & Pages**.
2. Make sure you select the **Pages** tab (NOT the "Workers" tab) > **Connect to Git**.
3. Set:
   - **Framework preset**: `Vite`
   - **Root directory**: `/`
   - **Build command**: `npm run build`
   - **Build output directory**: `client/dist`
4. Cloudflare Pages natively publishes `client/dist` without invoking `wrangler deploy`.

#### Option B: If Using Cloudflare Workers Builds
If your project is connected under the "Workers" tab rather than "Pages":
1. Navigate to your project in Cloudflare Dashboard > **Settings** > **Builds & deployments**.
2. Change the **Deploy command** from `npx wrangler deploy` to:
   ```bash
   npx wrangler pages deploy client/dist --project-name=nineropes
   ```
   (Or run: `npm run deploy`)

#### Option C: Local CLI Deployment
Always deploy using the Pages workflow:
```bash
# Correct command from repository root:
npx wrangler pages deploy client/dist --project-name=nineropes

# Or via npm script:
npm run deploy

# Or from inside the client/ directory:
cd client && npm run deploy
```

