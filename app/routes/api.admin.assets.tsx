import type { Route } from './+types/api.admin.assets';
import { json } from '../../functions/lib/db';
import { parseAssetsInput } from '../../functions/lib/validate';
import { readSiteAssets } from '../lib/loaders';
import { ASSET_FIELDS, staleVideoFiles, type AssetsResponse } from '../../src/lib/site-content';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Sayt rasm/videolari: registr maydonlari va yuklanganlari (`site_assets`); standartlar klientda (`ASSET_DEFAULTS`). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const body: AssetsResponse = { fields: ASSET_FIELDS, values: await readSiteAssets(env) };
  return json(body);
}

/**
 * `PUT` — kalit → yuklangan fayl yo'li; bo'sh qiymat qatorni o'chiradi (standartga qaytadi). Almashtirilgan yoki
 * olib tashlangan video fayli diskdan ham o'chadi — 40 MB'lik fayllar yig'ilmasin.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), (b) => parseAssetsInput(b, ASSET_FIELDS));
  if (input instanceof Response) return input;
  const before = await readSiteAssets(env);
  await env.DB.batch(Object.entries(input).map(([key, url]) => (url === ''
    ? env.DB.prepare('DELETE FROM site_assets WHERE key = ?').bind(key)
    : env.DB.prepare('INSERT OR REPLACE INTO site_assets (key, url) VALUES (?, ?)').bind(key, url))));
  const values = await readSiteAssets(env);
  // Yozuv saqlangan: fayl o'chmay qolsa (ruxsat xatosi) javob buzilmaydi — fayl diskda qoladi xolos.
  await Promise.all(staleVideoFiles(before, values).map((key) => env.IMAGES.delete(key).catch(() => undefined)));
  return json({ values });
}
