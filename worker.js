/**
 * Cloudflare Worker Entry Point for NINEROPES
 * Delegates all incoming requests to Cloudflare Workers Static Assets (client/dist)
 * with Single Page Application (SPA) fallback and static asset caching.
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
