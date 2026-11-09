import { access, mkdir, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RequestHandler } from 'express';
import { THUMB_WIDTHS, isThumbName } from '../shared/thumb.ts';

/**
 * `/images/products/<nom>?w=320|640` — rasmni shu enga kichraytirib, WebP qilib beradi (`shared/thumb.ts`).
 *
 * Natija diskda saqlanadi, ya'ni har rasm har en uchun bir marta ishlanadi. En faqat ro'yxatdagilardan:
 * ixtiyoriy o'lcham protsessor va diskni to'ldirish yo'li bo'lardi. `w` yo'q yoki boshqa qiymat — keyingi
 * qatlam asl rasmni beradi.
 *
 * ponytail: kesh tozalanmaydi — rasm nomlari takrorlanmas (uuid), o'chirilgan rasmning kichik nusxasi
 * diskda qoladi (har biri ~20 KB). Joy muammo bo'lsa `DATA_DIR/thumbs` ni o'chirish kifoya, qayta yasaladi.
 */
export function thumbs(imagesDir: string, cacheDir: string): RequestHandler {
  return async (req, res, next) => {
    const w = Number(req.query.w);
    const name = req.path.slice(1);
    if (!(THUMB_WIDTHS as readonly number[]).includes(w) || !isThumbName(name)) return next();
    const dir = resolve(cacheDir, String(w));
    const out = join(dir, `${name}.webp`);
    try {
      if (!(await access(out).then(() => true, () => false))) {
        const { default: sharp } = await import('sharp');
        await mkdir(dir, { recursive: true });
        // Vaqtinchalik faylga yozib, keyin nomini almashtiramiz — yarim yozilgan fayl hech qachon berilmaydi.
        const tmp = `${out}.${process.pid}.${Date.now()}.tmp`;
        await sharp(join(imagesDir, 'products', name)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(tmp);
        await rename(tmp, out);
      }
      res.sendFile(out, { immutable: true, maxAge: '1y' }, (err) => { if (err && !res.headersSent) fallback(); });
    } catch {
      fallback();
    }
    // Kichraytirib bo'lmadi (asl fayl yo'q yoki sharp ishlamadi) — asl manzilga yo'naltiramiz. `no-store`:
    // bu javob Cloudflare'da `?w=` manzili ostida bir yilga qotib qolmasin.
    function fallback(): void {
      res.set('Cache-Control', 'no-store').redirect(302, req.baseUrl + req.path);
    }
  };
}
