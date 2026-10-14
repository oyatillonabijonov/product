import type { Route } from './+types/api.admin.pc-dimensions';
import { json } from '../../functions/lib/db';
import { readDimensionList } from '../../functions/lib/pc-db';
import { parsePcDimensionInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Konfigurator moslik turlari: ro'yxat (belgilanmagan qismlar soni bilan) va yaratish. */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  return json(await readDimensionList(env));
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parsePcDimensionInput);
  if (input instanceof Response) return input;
  // Yangi tur doim nofaol: yoqilgan zahoti uning bo'g'inlaridagi hamma qism saytdan yo'qolardi — admin avval belgilaydi.
  // Qiymatlar shu tranzaksiyada `MAX(id)` ga bog'lanadi (batch atomik — oraga boshqa yozuv tushmaydi).
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO pc_dimensions (key, name, name_ru, slots, is_active, sort_order) VALUES (NULL, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM pc_dimensions))',
    ).bind(input.name, input.nameRu, JSON.stringify(input.slots)),
    ...input.values.map((v, i) =>
      env.DB.prepare('INSERT INTO pc_dimension_values (dimension_id, label, sort_order) VALUES ((SELECT MAX(id) FROM pc_dimensions), ?, ?)').bind(v.label, (i + 1) * 10)),
  ]);
  return json(await readDimensionList(env), { status: 201 });
}
