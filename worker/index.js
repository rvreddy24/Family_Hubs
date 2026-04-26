/**
 * Cloudflare Worker entry for FamilyHubs.in
 *
 * Two jobs:
 *   1. Proxy /api/* requests to the Render-hosted backend so the frontend can
 *      keep using relative URLs like fetch('/api/state').
 *   2. Fall through to ASSETS for everything else (the Vite-built SPA).
 *
 * Socket.io connects directly to family-hubs.onrender.com via VITE_SOCKET_URL,
 * so it does NOT need to be proxied here.
 */

const BACKEND_ORIGIN = 'https://family-hubs.onrender.com';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const upstream = new URL(url.pathname + url.search, BACKEND_ORIGIN);
      const proxied = new Request(upstream.toString(), request);
      proxied.headers.set('X-Forwarded-Host', url.host);
      proxied.headers.set('X-Forwarded-Proto', 'https');
      return fetch(proxied);
    }

    return env.ASSETS.fetch(request);
  },
};
