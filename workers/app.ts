import { createRequestHandler } from 'react-router';
import type { Env } from '../functions/env';

declare module 'react-router' {
  interface AppLoadContext {
    cloudflare: { env: Env; ctx: ExecutionContext };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

// Storefront HTML edge cache: short TTL + stale-while-revalidate. Cheap on Cloudflare's free tier.
const EDGE_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

/** Only cache safe, non-personalized storefront GET pages. Everything dynamic/private is skipped. */
function isCacheable(request: Request, url: URL): boolean {
  if (request.method !== 'GET') return false;
  const p = url.pathname;
  if (p.startsWith('/admin')) return false; // admin SPA
  if (p.startsWith('/api/')) return false; // dynamic + admin writes
  if (p.startsWith('/images/')) return false; // already immutable-cached at the route
  if (p.startsWith('/assets/')) return false; // hashed build assets, cached by the assets layer
  // noindex / query-varied / client-state pages — not worth edge-caching
  if (p === '/search' || p.endsWith('/search')) return false;
  if (p === '/savat' || p.endsWith('/savat')) return false;
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // `caches.default` is a Cloudflare Workers extension not present in the DOM CacheStorage type.
    const edgeCache = (caches as unknown as { default: Cache }).default;
    const cache = import.meta.env.PROD && isCacheable(request, url) ? edgeCache : null;

    if (cache) {
      const hit = await cache.match(request);
      if (hit) return hit;
    }

    const response = await requestHandler(request, { cloudflare: { env, ctx } });

    // Store a fresh copy at the edge; return the response to the user unchanged.
    if (cache && response.status === 200 && !response.headers.has('set-cookie')) {
      const cached = new Response(response.body, response);
      cached.headers.set('Cache-Control', EDGE_CACHE_CONTROL);
      ctx.waitUntil(cache.put(request, cached.clone()));
      return cached;
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
