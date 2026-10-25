/**
 * Cloudflare Worker Entry Point for NINEROPES (Client subproject)
 * Delegates all incoming requests to Cloudflare Workers Static Assets (dist)
 */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
