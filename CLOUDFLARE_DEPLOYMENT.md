# Cloudflare Deployment Guide for NINEROPES

NINEROPES can be deployed either as a **Cloudflare Worker (Static Assets)** or to **Cloudflare Pages**. Both run on the Cloudflare Free Tier (unlimited bandwidth, edge CDN caching, DDoS protection, and free SSL/TLS).

---

## 1. What was the Issue?

When Cloudflare executes:
```bash
npm run build
npx wrangler deploy
```
from the repository root, Wrangler previously failed with:
```
The Cloudflare application detection logic has been run in the root of a workspace instead of targeting a specific project.
```

### Why this occurred:
1. Cloudflare Workers CI executes `npx wrangler deploy` at the repository root by default.
2. The root `package.json` defines npm workspaces (`"workspaces": ["client"]`).
3. The previous `wrangler.toml` lacked a Worker entrypoint (`main`) and used `pages_build_output_dir`, which is a Pages-only property ignored by `wrangler deploy`.
4. Without a valid Worker entrypoint or asset definition, Wrangler attempted auto-detection on the workspace root and halted to prevent misconfiguration.

### How it is now fixed:
We added:
- Root [`worker.js`](file:///worker.js): A lightweight ES module Worker entrypoint that serves static assets via `env.ASSETS.fetch(request)`.
- Root [`wrangler.toml`](file:///wrangler.toml):
  ```toml
  name = "nineropes"
  main = "worker.js"
  compatibility_date = "2024-11-01"

  [assets]
  directory = "client/dist"
  not_found_handling = "single-page-application"
  html_handling = "auto-trailing-slash"
  ```
Because a concrete Worker entrypoint and assets directory are now explicitly declared at the repository root, `npx wrangler deploy` succeeds immediately without triggering workspace detection.

---

## 2. Cloudflare Dashboard Settings

Depending on whether your project in the Cloudflare Dashboard was created as a **Worker** or **Pages** project:

### Scenario A: Your project is a Cloudflare Worker (Current Setup)
If your project is listed under **Workers & Pages** > **Workers**:
1. Go to your project in the [Cloudflare Dashboard](https://dash.cloudflare.com/) > **Settings** > **Builds & deployments**.
2. Verify the following settings:
   - **Root directory**: `/` (Default repository root)
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
3. **Trigger Deployment**: Click **Deploy** / **Redo Build**.
   - Cloudflare will run `npm run build` (compiles TypeScript + Vite into `client/dist`).
   - Cloudflare will run `npx wrangler deploy`. Wrangler reads `wrangler.toml`, bundles `worker.js`, uploads `client/dist`, and deploys.

### Scenario B: Your project is Cloudflare Pages
If you prefer native Cloudflare Pages hosting:
1. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > Select the **Pages** tab > **Connect to Git**.
2. Configure build settings:
   - **Project name**: `nineropes`
   - **Production branch**: `main`
   - **Framework preset**: `Vite` (or None)
   - **Root directory**: `/`
   - **Build command**: `npm run build`
   - **Build output directory**: `client/dist`
3. Click **Save and Deploy**. (Pages builds `client/dist` and deploys natively without `wrangler deploy`).

---

## 3. Environment Variables (Both Platforms)

In the Cloudflare Dashboard under **Settings** > **Variables and Secrets**:
- `VITE_API_BASE_URL` = `https://api.hicine.biz` (Default)
- `VITE_API_KEY` = `hicine_website_secret_2025_exi9epdmrns` (Default)

---

## 4. Local CLI Commands

To test or deploy locally:

```bash
# Build production bundle
npm run build

# Deploy as Cloudflare Worker (matches Cloudflare dashboard command):
npm run deploy
# or: npx wrangler deploy

# Deploy to Cloudflare Pages:
npm run pages:deploy
# or: npx wrangler pages deploy client/dist --project-name=nineropes
```

---

## 5. Summary of Changes

| Component | Location | Purpose |
| :--- | :--- | :--- |
| **Worker Entrypoint** | [`worker.js`](file:///worker.js) | Serves SPA assets via `env.ASSETS.fetch(request)` |
| **Worker Config** | [`wrangler.toml`](file:///wrangler.toml) | Defines `main = "worker.js"`, `[assets] directory = "client/dist"`, SPA routing |
| **Client Worker Config** | [`client/wrangler.toml`](file:///client/wrangler.toml) | Mirrors config for deployments targeting the `client/` subdirectory |
| **Package Scripts** | [`package.json`](file:///package.json) | Provides `deploy`, `deploy:worker`, and `deploy:pages` commands |
