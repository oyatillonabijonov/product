import { useState } from 'react';
import { data, useFetcher, useLoaderData } from 'react-router';
import type { Route } from './+types/yuklash.$token';
import type { Env } from '../../shared/runtime';
import { loadAdminAuth } from '../../functions/lib/db';
import { verifyUploadToken } from '../../functions/lib/upload-link';
import { imagesStatements } from '../../shared/product-statements';
import { billzVisible, parseManualFields, serializeManualFields, MANUAL_FIELDS, type ManualField } from '../../shared/billz';
import { createLimiter } from '../../shared/rate-limit';
import { normalizeImage } from '../../src/admin/lib/image-normalize';

/**
 * Telefondan rasm yuklash (spec 2026-09-24 §8). Claude chatga tashlangan rasmni tool'ga uzata olmaydi —
 * shuning uchun egasiga bir martalik havola beriladi: bosadi, galereyadan tanlaydi, rasmlar tovarga qo'shiladi.
 * Parolsiz: token faqat **shu tovar** uchun va 30 daqiqa ishlaydi, faqat rasm **qo'shadi**.
 */
const EXPIRED = "Havola eskirgan yoki noto'g'ri — Claude'dan yangisini so'rang.";
const MB = 1024 * 1024;
const MAX_FILES = 10;
const ALLOWED: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
/** Bitta IP'dan daqiqasiga 30 so'rov — havola ochiq, parolsiz. */
const allowUpload = createLimiter(30, 60 * 1000);

type Product = { name: string; main: string; gallery: string[]; billzId: string | null; manual: string | null };

async function productFromToken(env: Env, token: string): Promise<string | null> {
  const auth = await loadAdminAuth(env);
  if (!auth) return null;
  return verifyUploadToken(token, auth.sessionSecret, Math.floor(Date.now() / 1000));
}

async function readProduct(env: Env, id: string): Promise<Product | null> {
  const row = await env.DB.prepare('SELECT name, image_url, billz_id, manual_fields FROM products WHERE id = ?')
    .bind(id)
    .first<{ name: string; image_url: string | null; billz_id: string | null; manual_fields: string | null }>();
  if (!row) return null;
  const gallery = await env.DB.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC')
    .bind(id)
    .all<{ image_url: string }>();
  return { name: row.name, main: row.image_url ?? '', gallery: gallery.results.map((g) => g.image_url), billzId: row.billz_id, manual: row.manual_fields };
}

function isFile(obj: unknown): obj is File {
  return typeof obj === 'object' && obj !== null && 'arrayBuffer' in obj && 'type' in obj && 'size' in obj;
}

export const meta: Route.MetaFunction = () => [{ title: 'Rasm yuklash' }, { name: 'robots', content: 'noindex, nofollow' }];

export async function loader({ context, params }: Route.LoaderArgs) {
  const id = await productFromToken(context.env, String(params.token));
  const p = id ? await readProduct(context.env, id) : null;
  if (!p) return { ok: false as const };
  return { ok: true as const, name: p.name, images: p.main ? [p.main, ...p.gallery] : p.gallery };
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  if (!allowUpload(context.ip)) return data({ ok: false as const, error: "Juda ko'p urinish — bir daqiqadan keyin qayta urining." }, { status: 429 });
  const id = await productFromToken(env, String(params.token));
  if (!id) return data({ ok: false as const, error: EXPIRED }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? '0') > (MAX_FILES * 5 + 2) * MB) {
    return data({ ok: false as const, error: 'Rasmlar juda katta — kamroq tanlang.' }, { status: 413 });
  }
  const files = (await request.formData()).getAll('files').filter(isFile);
  if (files.length === 0) return data({ ok: false as const, error: 'Rasm tanlanmagan.' }, { status: 400 });
  if (files.length > MAX_FILES) return data({ ok: false as const, error: `Bir martada ${MAX_FILES} tagacha rasm.` }, { status: 400 });
  // Avval hammasi tekshiriladi — bittasi yaroqsiz bo'lsa hech narsa yozilmaydi.
  for (const f of files) {
    if (!ALLOWED[f.type]) return data({ ok: false as const, error: 'Faqat JPG, PNG yoki WebP rasm.' }, { status: 400 });
    if (f.size > 5 * MB) return data({ ok: false as const, error: '5 MB dan katta rasm bor.' }, { status: 400 });
  }
  const p = await readProduct(env, id);
  if (!p) return data({ ok: false as const, error: EXPIRED }, { status: 404 });

  const urls: string[] = [];
  for (const f of files) {
    const key = `products/${crypto.randomUUID()}.${ALLOWED[f.type]}`;
    await env.IMAGES.put(key, await f.arrayBuffer(), { httpMetadata: { contentType: f.type } });
    urls.push(`/images/${key}`);
  }
  const main = p.main || urls[0];
  const gallery = [...p.gallery, ...(p.main ? urls : urls.slice(1))];
  const now = Math.floor(Date.now() / 1000);

  let update;
  if (p.billzId) {
    // Billz tovarida rasmlar qulflanadi (Billz rasmi ularni almashtirmaydi) va ko'rinish qoidadan —
    // ya'ni rasm qo'shilgan tovar **darhol** saytda chiqadi.
    const set = new Set<ManualField>(parseManualFields(p.manual));
    set.add('images');
    const locks = MANUAL_FIELDS.filter((f) => set.has(f));
    const visible = billzVisible({ hasImage: true, hiddenLocked: locks.includes('hidden') });
    update = env.DB.prepare('UPDATE products SET image_url = ?, manual_fields = ?, is_active = ? WHERE id = ?')
      .bind(main, serializeManualFields(locks), visible ? 1 : 0, id);
  } else {
    update = env.DB.prepare('UPDATE products SET image_url = ? WHERE id = ?').bind(main, id);
  }
  await env.DB.batch([
    update,
    ...imagesStatements(env, id, gallery),
    // Havola orqali yozuv ham jurnalga tushadi — tokenli yozuvlar kabi.
    env.DB.prepare('INSERT INTO admin_audit (at, token_label, tool, target_id) VALUES (?, ?, ?, ?)')
      .bind(now, 'yuklash havolasi', 'yuklash', id),
  ]);
  return data({ ok: true as const, added: urls.length, images: [main, ...gallery] });
}

export default function Yuklash() {
  const page = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [rawPreparing, setPreparing] = useState(false);
  const preparing = rawPreparing as boolean;
  const busy = preparing || fetcher.state !== 'idle';
  const result = fetcher.data;
  const images = result && result.ok ? result.images : page.ok ? page.images : [];

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_FILES);
    e.target.value = '';
    if (files.length === 0) return;
    setPreparing(true);
    const fd = new FormData();
    // Admin'dagi kabi: chekka kesiladi, kichraytiriladi, WebP — server rasmni qayta ishlamaydi.
    for (const f of files) fd.append('files', await normalizeImage(f));
    setPreparing(false);
    fetcher.submit(fd, { method: 'post', encType: 'multipart/form-data' });
  }

  if (!page.ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center bg-bg px-4">
        <p className="text-copy text-primary">{EXPIRED}</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-bg px-4 py-8">
      <div>
        <p className="text-label text-muted-2">Rasm qo'shish</p>
        <h1 className="text-subhead font-semibold text-primary">{page.name}</h1>
      </div>
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {images.map((src) => (
            <img key={src} src={src} alt="" className="aspect-square w-full rounded-sm border border-line bg-white object-contain" />
          ))}
        </div>
      ) : (
        <p className="text-para text-muted">Hozircha rasm yo'q.</p>
      )}
      <label className={`press flex h-13 cursor-pointer items-center justify-center rounded-full bg-cta text-control text-white ${busy ? 'opacity-60' : ''}`}>
        {busy ? 'Yuklanmoqda…' : 'Rasm tanlash'}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={pick} />
      </label>
      {result && (
        <p className={`text-para ${result.ok ? 'text-verified' : 'text-danger'}`}>
          {result.ok ? `${result.added} ta rasm qo'shildi.` : result.error}
        </p>
      )}
      <p className="text-label text-muted-2">Havola 30 daqiqa ishlaydi. Rasmlar tovarga qo'shiladi; tartibini admin panelida o'zgartirish mumkin.</p>
    </main>
  );
}
