/**
 * HTTP qatlamining sof qoidalari — `server/index.ts` (kesh, texnik tanaffus darvozasi, proxy)
 * va `images.$` route'i shu yerdan o'qiydi. Import yo'q: `server/` Node type-stripping bilan
 * ishlaydi, `app/` esa Vite bilan — ikkalasiga ham mos bo'lsin.
 */

/**
 * React Router marshrutlaydigan yo'l. U `request.url`ni `http://host` + `originalUrl` qilib yig'adi,
 * WHATWG URL esa `..`, `%2e%2e` va `\` ni hal qiladi — shu sababli Express'ning xom `req.path`i
 * bilan qaror qilinmaydi. `.data` (single fetch) va oxiridagi `/` kesiladi. Yaroqsiz — `null`.
 */
export function routePath(originalUrl: string): string | null {
  if (!originalUrl.startsWith('/')) return null;
  try {
    return trimRoute(new URL(`http://x${originalUrl}`).pathname);
  } catch {
    return null;
  }
}

function trimRoute(path: string): string {
  if (path === '/_root.data') return '/';
  const trimmed = (path.endsWith('.data') ? path.slice(0, -'.data'.length) : path).replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

/** `prefix` yo'lning o'zi yoki uning ichidagi segment — `/admin` `/administrator`ga mos kelmaydi. */
function underPrefix(path: string, prefix: string): boolean {
  const base = prefix.replace(/\/+$/, '');
  return path === base || path.startsWith(`${base}/`);
}

/**
 * Texnik tanaffusda ochiq yo'lmi. Kodlangan nuqta, slash yoki teskari slash bo'lsa — yopiq:
 * ular routing paytida boshqa ma'no olishi mumkin, haqiqiy admin/rasm yo'lida esa uchramaydi.
 */
export function isMaintenanceOpen(originalUrl: string, prefixes: readonly string[]): boolean {
  const path = routePath(originalUrl);
  if (path === null || /%(?:2e|2f|5c)/i.test(path)) return false;
  const lower = path.toLowerCase();
  return prefixes.some((p) => underPrefix(lower, p));
}

/** Keshlanmaydigan yo'llar: prefiks bo'yicha va (til prefiksi bilan ham) oxiri bo'yicha. */
export const NO_CACHE_PREFIXES = ['/admin', '/api/', '/auth/', '/images/', '/assets/', '/mcp', '/oauth/', '/authorize', '/token', '/register', '/revoke', '/.well-known/', '/yuklash'];
export const NO_CACHE_EXACT = ['/search', '/savat', '/kirish', '/kabinet'];

/**
 * Kesh qarori uchun yo'l — React Router kabi: WHATWG normallashtirilgan, foiz-dekodlangan,
 * kichik harfda (u katta-kichik harfni farqlamaydi), `.data` va oxirgi `/` siz.
 * Dekodlab bo'lmasa — `null` (chaqiruvchi keshlamaydi).
 */
export function cachePath(originalUrl: string): string | null {
  const path = routePath(originalUrl);
  if (path === null) return null;
  try {
    return trimRoute(decodeURIComponent(path)).toLowerCase();
  } catch {
    return null;
  }
}

/** Mijoz (`customer_session`) yoki admin (`session`) cookie'si bor — javob shaxsiy. */
export function hasSessionCookie(cookie: string | undefined): boolean {
  return /(?:^|;\s*)(?:customer_session|session)=[^;\s]/.test(cookie ?? '');
}

/**
 * Storefront javobining `Cache-Control`i; `null` — sarlavha qo'yilmaydi (dinamik yo'l, route o'zi hal qiladi).
 * Sessiya yoki USD cookie'li javob shaxsiy: unda mijoz ma'lumoti yoki boshqa narx chiziladi.
 */
export function storefrontCacheControl(method: string, originalUrl: string, cookie: string | undefined): string | null {
  if (method !== 'GET') return null;
  const path = cachePath(originalUrl);
  if (path === null) return null;
  const skip = NO_CACHE_PREFIXES.some((p) => path.startsWith(p.replace(/\/$/, '')))
    || NO_CACHE_EXACT.some((p) => path === p || path.endsWith(p));
  if (skip) return null;
  const usd = /(?:^|;\s*)currency=USD(?:;|$)/.test(cookie ?? '');
  return usd || hasSessionCookie(cookie) ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=240';
}

/**
 * `PUBLIC_URL` → kanonik host va sxema. Yaroqsiz yoki http(s) bo'lmasa — `null`
 * (dev: so'rov o'zgartirilmaydi).
 */
export function canonicalOrigin(publicUrl: string | undefined): { host: string; proto: 'http' | 'https' } | null {
  const raw = publicUrl?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.host) return null;
  return { host: url.host, proto: url.protocol === 'https:' ? 'https' : 'http' };
}

/**
 * `TRUST_PROXY` → Express `trust proxy` qiymati: bo'sh — 1 (bitta Traefik/nginx), `false` — proxy yo'q,
 * son — hop'lar soni. Boshqa qiymat (masalan `true` — har qanday `X-Forwarded-For`ga ishonish) — xato.
 */
export function parseTrustProxy(value: string | undefined): number | false {
  const v = value?.trim() ?? '';
  if (v === '') return 1;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  throw new Error(`TRUST_PROXY yaroqsiz: "${value}" — hop'lar soni (masalan 1) yoki false bo'lishi kerak`);
}

/**
 * `/images/*` kaliti — ilova yozadigan shakllardan boshqasi ochilmaydi: yuklangan
 * `products/<uuid>.<ext>` va Billz'niki `products/billz-<uuid|hash>.<ext>` (`shared/billz.ts` `photoKey`).
 */
export const IMAGE_KEY_RE = /^products\/[A-Za-z0-9_-]+\.(?:webp|png|jpe?g|avif|svg|mp4)$/;
