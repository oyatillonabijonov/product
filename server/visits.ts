import type { RequestHandler } from 'express';
import type { Env, SqlStatement } from '../shared/runtime';
import { classifyVisit, tashkentDay, visitorKey } from '../shared/visits.ts';

/**
 * Sayt tashriflari hisoblagichi — kunlik ko'rilishlar, noyob mehmonlar va mahsulot sahifalari
 * (`site_visits`, `product_views`). Qaysi so'rov sanalishini `shared/visits.ts` hal qiladi.
 *
 * Javob yuborilgach yoziladi va faqat 200 bo'lsa: 404, redirect (`/uz/*` → 301) va texnik tanaffus
 * sanalmaydi, mahsulot jadvaliga esa mavjud bo'lmagan id tushmaydi. Yozuv kutilmaydi — so'rovni
 * sekinlatmaydi, xato bo'lsa faqat logga.
 */
export function createVisitTracker(env: Env): RequestHandler {
  // ponytail: noyob mehmonlar xotirada — server qayta ishga tushsa o'sha kungi mehmonlar yana bir marta
  // sanaladi (deploy kuni ozgina ortadi). Aniqlik kerak bo'lsa kalitlarni jadvalga ko'chiring.
  let day = '';
  let seen = new Set<string>();

  function record(productId: string | null, ip: string, ua: string): void {
    const today = tashkentDay(Date.now());
    if (today !== day) {
      day = today;
      seen = new Set();
    }
    const key = visitorKey(today, ip, ua);
    const isNew = !seen.has(key);
    if (isNew) seen.add(key);

    const statements: SqlStatement[] = [
      env.DB.prepare(
        `INSERT INTO site_visits (day, views, visitors) VALUES (?, 1, ?)
         ON CONFLICT(day) DO UPDATE SET views = views + 1, visitors = visitors + excluded.visitors`,
      ).bind(today, isNew ? 1 : 0),
    ];
    if (productId) {
      statements.push(env.DB.prepare(
        `INSERT INTO product_views (product_id, day, views) VALUES (?, ?, 1)
         ON CONFLICT(product_id, day) DO UPDATE SET views = views + 1`,
      ).bind(productId, today));
    }
    env.DB.batch(statements).catch((err) => console.error('tashrif yozilmadi:', err));
  }

  return (req, res, next) => {
    const visit = classifyVisit({
      method: req.method, path: req.originalUrl, accept: req.get('accept'), userAgent: req.get('user-agent'),
    });
    // Admin cookie'si bilan kelgan so'rov — do'kon egasining o'zi; tashrif statistikasiga tushmaydi.
    if (visit && !/(?:^|;\s*)session=/.test(req.headers.cookie ?? '')) {
      res.once('finish', () => {
        if (res.statusCode === 200) record(visit.productId, req.ip ?? '', req.get('user-agent') ?? '');
      });
    }
    next();
  };
}
