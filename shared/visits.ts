import { routePath } from './http-policy.ts';

/**
 * Sayt tashriflarini sanash qoidalari — `server/visits.ts` (yozuvchi) va admin statistikasi o'qiydi.
 * Sof: `node:crypto` yo'q, shuning uchun brauzer bundle'iga ham tushishi mumkin.
 */

/** Toshkent UTC+5, yozgi vaqt yo'q. */
export const TASHKENT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Toshkent kalendar sanasi `YYYY-MM-DD`. */
export function tashkentDay(nowMs: number): string {
  return new Date(nowMs + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|curl|wget|python|headless|lighthouse|monitor|uptime/i;

/** Sahifa bo'lmagan yo'llarning birinchi segmenti (`@` bilan boshlanadiganlar — Vite: `/@vite`, `/@fs`). */
const EXCLUDED_SEGMENTS = new Set([
  'admin', 'api', 'auth', 'images', 'assets', 'mcp', 'oauth', 'yuklash', '.well-known', 'health', 'node_modules', 'src', 'app',
]);

export interface VisitRequest {
  method: string;
  /** `req.originalUrl` — query bilan bo'lishi mumkin. */
  path: string;
  accept: string | undefined;
  userAgent: string | undefined;
}

/**
 * Storefront sahifasining ko'rilishimi. `null` — sanalmaydi (API, fayl, bot, POST…).
 * Klient navigatsiyasi React Router'da `/katalog.data` so'rovi bo'lib keladi — u ham ko'rilish
 * (`/_root.data` — bosh sahifa); `.data`siz so'rov esa HTML so'ragan bo'lishi shart.
 */
export function classifyVisit(req: VisitRequest): { productId: string | null } | null {
  if (req.method !== 'GET') return null;
  const ua = req.userAgent ?? '';
  if (ua === '' || BOT_RE.test(ua)) return null;
  const path = routePath(req.path);
  if (path === null) return null;
  const isData = (req.path.split(/[?#]/)[0] ?? '').endsWith('.data');
  if (!isData && !(req.accept ?? '').includes('text/html')) return null;

  const first = path.split('/')[1]?.toLowerCase() ?? '';
  if (first.startsWith('@') || EXCLUDED_SEGMENTS.has(first)) return null;

  // Mahsulot yo'li fayl tekshiruvidan oldin: id'da nuqta bo'lishi mumkin.
  const local = path.replace(/^\/ru(?=\/|$)/i, '') || '/';
  const product = /^\/product\/([^/]+)$/i.exec(local);
  if (product) {
    try {
      return { productId: decodeURIComponent(product[1] ?? '') || null };
    } catch {
      return null;
    }
  }
  if (/\.[a-z0-9]+$/i.test(path.slice(path.lastIndexOf('/') + 1))) return null;
  return { productId: null };
}

/** Kunlik noyob mehmon kaliti — FNV-1a (32 bit), IP va brauzerning o'zi saqlanmaydi. */
export function visitorKey(day: string, ip: string, ua: string): string {
  const s = `${day}|${ip}|${ua}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
