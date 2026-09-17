import type { Route } from './+types/api.admin.texts';
import { json } from '../../functions/lib/db';
import { parseTextsInput } from '../../functions/lib/validate';
import { readSiteTexts } from '../lib/loaders';
import { translations } from '../../src/locales';
import { TEXT_FIELDS, planTextWrites, type TextsResponse } from '../../src/lib/site-content';
import { requireAdmin, parseBody } from './api.admin.guard';

const UZ = translations["O'zbek tili"];
const RU = translations['Rus tili'];

/** Sayt matnlari: registr maydonlari standart matnlari bilan va admin o'zgarishlari (`site_texts`). */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const body: TextsResponse = {
    fields: TEXT_FIELDS.map((f) => ({ ...f, defaults: { uz: UZ[f.key], ru: RU[f.key] } })),
    values: await readSiteTexts(env),
  };
  return json(body);
}

/** `PUT` — faqat yuborilgan kalitlar; standartga teng til bo'sh saqlanadi, ikkala til bo'sh — qator o'chadi. */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const keys = TEXT_FIELDS.map((f) => f.key);
  const input = parseBody(await request.json().catch(() => null), (b) => parseTextsInput(b, keys));
  if (input instanceof Response) return input;
  await env.DB.batch(planTextWrites(input, UZ, RU).map((w) => (w.uz === '' && w.ru === ''
    ? env.DB.prepare('DELETE FROM site_texts WHERE key = ?').bind(w.key)
    : env.DB.prepare('INSERT OR REPLACE INTO site_texts (key, uz, ru) VALUES (?, ?, ?)').bind(w.key, w.uz, w.ru))));
  return json({ values: await readSiteTexts(env) });
}
