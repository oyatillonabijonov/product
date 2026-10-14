import type { Route } from './+types/api.admin.pc-dimensions.$id';
import { json } from '../../functions/lib/db';
import { readDimensionList } from '../../functions/lib/pc-db';
import { parsePcDimensionInput } from '../../functions/lib/validate';
import { requireAdmin, parseBody } from './api.admin.guard';

/** Bitta moslik turi: tahrir (qiymatlar to'liq almashtiriladi) va o'chirish (faqat admin yaratgan tur). */
export async function action({ request, context, params }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const id = Number(params.id);
  const cur = Number.isInteger(id)
    ? await env.DB.prepare('SELECT id, key FROM pc_dimensions WHERE id = ?').bind(id).first<{ id: number; key: string | null }>()
    : null;
  if (!cur) return json({ error: 'dimension_not_found' }, { status: 404 });

  if (request.method === 'PUT') {
    const input = parseBody(await request.json().catch(() => null), parsePcDimensionInput);
    if (input instanceof Response) return input;
    const { results } = await env.DB.prepare('SELECT id FROM pc_dimension_values WHERE dimension_id = ?').bind(id).all<{ id: number }>();
    const existing = results.map((r) => r.id);
    // Begona turning qiymatini shu yo'l bilan "qayta nomlab" olib bo'lmasin.
    if (input.values.some((v) => v.id !== null && !existing.includes(v.id))) return json({ error: 'value_not_in_dimension' }, { status: 400 });
    const kept = input.values.flatMap((v) => (v.id === null ? [] : [v.id]));
    const removed = existing.filter((x) => !kept.includes(x));
    // Tartib: avval o'chirish (eski yorliq bo'shaydi), keyin yangilash, keyin qo'shish — UNIQUE(dimension_id, label) buzilmasin.
    await env.DB.batch([
      env.DB.prepare('UPDATE pc_dimensions SET name = ?, name_ru = ?, slots = ?, is_active = ? WHERE id = ?')
        .bind(input.name, input.nameRu, JSON.stringify(input.slots), input.active ? 1 : 0, id),
      ...removed.flatMap((v) => [
        env.DB.prepare('DELETE FROM pc_part_values WHERE value_id = ?').bind(v),
        env.DB.prepare('DELETE FROM pc_dimension_values WHERE id = ?').bind(v),
      ]),
      ...input.values.map((v, i) => (v.id === null
        ? env.DB.prepare('INSERT INTO pc_dimension_values (dimension_id, label, sort_order) VALUES (?, ?, ?)').bind(id, v.label, (i + 1) * 10)
        : env.DB.prepare('UPDATE pc_dimension_values SET label = ?, sort_order = ? WHERE id = ?').bind(v.label, (i + 1) * 10, v.id))),
    ]);
    return json(await readDimensionList(env));
  }

  if (request.method === 'DELETE') {
    if (cur.key !== null) return json({ error: 'dimension_protected' }, { status: 400 });
    await env.DB.batch([
      env.DB.prepare('DELETE FROM pc_part_values WHERE value_id IN (SELECT id FROM pc_dimension_values WHERE dimension_id = ?)').bind(id),
      env.DB.prepare('DELETE FROM pc_dimension_values WHERE dimension_id = ?').bind(id),
      env.DB.prepare('DELETE FROM pc_dimensions WHERE id = ?').bind(id),
    ]);
    return json(await readDimensionList(env));
  }

  return json({ error: 'method_not_allowed' }, { status: 405 });
}
