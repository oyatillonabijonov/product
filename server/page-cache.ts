import type { OutgoingHttpHeaders } from 'node:http';
import type { RequestHandler } from 'express';
import { storefrontCacheControl } from '../shared/http-policy.ts';

/**
 * SSR sahifalarining xotiradagi qisqa keshi.
 *
 * Sayt `s-maxage=60` yuboradi, lekin oldinda uni bajaradigan kesh yo'q: Traefik keshlamaydi, Cloudflare HTML'ni
 * sukut bo'yicha keshlamaydi. Natijada har ochilish to'liq SSR edi (yo'nalish sahifasi ~45 ms, bitta jarayon) —
 * 100 kishi bir vaqtda kirganda navbat 5–7 soniyaga cho'zilardi (2026-11-10 o'lchovi).
 *
 * Qoida `storefrontCacheControl` bilan bitta: u `public` degan so'rovgina keshdan beriladi va keshga yoziladi.
 * Sessiya yoki USD cookie'li so'rov, `/api`, `/admin`, savat, kabinet bu yerga umuman tegmaydi.
 *
 * ponytail: bir vaqtda kelgan birinchi so'rovlar birlashtirilmaydi — render 15–45 ms, shu oraliqda bir necha
 * so'rov parallel chizilishi mumkin. Og'ir sahifa paydo bo'lsa, kalit bo'yicha kutish navbati qo'shiladi.
 */
const TTL_MS = 60_000;
/** Eng katta sahifa ~350 KB — 200 ta yozuv ≈ 70 MB (konteyner chegarasi 1 GB). */
const MAX_ENTRIES = 200;
const MAX_BODY = 2_000_000;

interface Entry {
  expires: number;
  headers: OutgoingHttpHeaders;
  body: Buffer;
}

/** Javobni saqlasa bo'ladimi: route o'zi `private` qilgan yoki cookie qo'ygan bo'lishi mumkin. */
function storable(status: number, headers: OutgoingHttpHeaders): boolean {
  const cc = [headers['cache-control']].flat().join(',');
  return status === 200 && cc.includes('s-maxage') && !/private|no-store/.test(cc) && headers['set-cookie'] === undefined;
}

export function pageCache(): RequestHandler {
  const cache = new Map<string, Entry>();

  return (req, res, next) => {
    if (!storefrontCacheControl(req.method, req.originalUrl, req.headers.cookie)?.includes('s-maxage')) return next();
    const key = req.originalUrl;
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) {
      // `res.end` — compression'niki: javob mijozning `Accept-Encoding`iga qarab shu yerda siqiladi.
      res.status(200).set(hit.headers).set('X-Page-Cache', 'HIT').end(hit.body);
      return;
    }

    // Javob oqim bilan yoziladi: bo'laklarni yig'amiz, sarlavhalarni birinchi bo'lakdan oldin olamiz
    // (compression o'zinikini keyin qo'shadi — `Content-Encoding` keshga tushmaydi).
    const chunks: Buffer[] = [];
    let size = 0;
    let headers: OutgoingHttpHeaders | null = null;
    const capture = (chunk: unknown): void => {
      headers ??= storable(res.statusCode, res.getHeaders()) ? { ...res.getHeaders() } : {};
      if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) return;
      const buf = Buffer.from(chunk as string);
      size += buf.length;
      if (size <= MAX_BODY) chunks.push(buf);
    };
    const write = res.write.bind(res) as (...args: unknown[]) => boolean;
    const end = res.end.bind(res) as (...args: unknown[]) => typeof res;
    res.write = ((...args: unknown[]) => { capture(args[0]); return write(...args); }) as typeof res.write;
    res.end = ((...args: unknown[]) => {
      capture(args[0]);
      if (headers && headers['cache-control'] !== undefined && size > 0 && size <= MAX_BODY) {
        delete headers['content-length'];
        cache.delete(key);
        // Eng eski yozuv chiqariladi (Map qo'shilish tartibini saqlaydi).
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
        cache.set(key, { expires: Date.now() + TTL_MS, headers, body: Buffer.concat(chunks) });
      }
      return end(...args);
    }) as typeof res.end;
    next();
  };
}
