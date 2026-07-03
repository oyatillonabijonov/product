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
// SWR 240s: Workers Cache API hit'ni fon-yangilashsiz qaytaradi, ya'ni SWR oynasi to'liq
// eskirish oynasi — admin tahriri eng ko'pi ~5 daqiqada ko'rinadi (oldingi 600s = ~11 daqiqa edi).
const EDGE_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=240';

// Marketing/trafik parametrlari sahifa mazmunini o'zgartirmaydi — kesh kalitidan olib
// tashlanadi, aks holda har bir ?utm_* varianti alohida nusxa bo'lib keshni to'ldiradi.
const JUNK_PARAMS = new Set(['fbclid', 'gclid', 'yclid', 'wbraid', 'gbraid', 'ref', '_ga']);

function cacheKey(url: URL): Request {
  const u = new URL(url.href);
  const drop: string[] = [];
  u.searchParams.forEach((_, k) => {
    if (k.startsWith('utm_') || JUNK_PARAMS.has(k)) drop.push(k);
  });
  for (const k of drop) u.searchParams.delete(k);
  u.hash = '';
  return new Request(u.href, { method: 'GET' });
}

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

    const key = cache ? cacheKey(url) : null;
    if (cache && key) {
      const hit = await cache.match(key);
      if (hit) return hit;
    }

    const response = await requestHandler(request, { cloudflare: { env, ctx } });

    // Store a fresh copy at the edge; return the response to the user unchanged.
    if (cache && key && response.status === 200 && !response.headers.has('set-cookie')) {
      const cached = new Response(response.body, response);
      cached.headers.set('Cache-Control', EDGE_CACHE_CONTROL);
      ctx.waitUntil(cache.put(key, cached.clone()));
      return cached;
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
