import type { Route } from './+types/api.admin.pc-parts';
import type { ApiPcPart } from '../../shared/types';
import { json } from '../../functions/lib/db';
import { readConfigRows, readDimensions, readPartValues } from '../../functions/lib/pc-db';
import { parsePcPartsInput } from '../../functions/lib/validate';
import type { SqlStatement } from '../../functions/env';
import { PC_SLOTS, groupValues, partGroups, suggestValues, type PartGroup, type PcDimension } from '../../shared/pc-compat';
import { requireAdmin, parseBody } from './api.admin.guard';

const toApiPart = (g: PartGroup, byProduct: Map<string, number[]>, dims: PcDimension[]): ApiPcPart => ({
  id: g.rep.id, ids: g.ids, slot: g.slot, name: g.rep.name.trim(), image: g.rep.image_url, inStock: g.inStock,
  values: groupValues(g.ids, byProduct, dims), suggested: suggestValues(g.slot, g.rep.name, dims),
});

/**
 * Konfigurator qismlari admin uchun. `?slot=` — bo'g'in jadvali (saytdagi to'plam: yashirilganlar yo'q);
 * `?product=` — bitta mahsulot guruhi (mahsulot tahriri; "Konfiguratorda ko'rsatilmasin" belgilangani ham).
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const slot = url.searchParams.get('slot');
  if (!productId && !PC_SLOTS.some((s) => s.key === slot)) return json({ error: 'slots_invalid' }, { status: 400 });
  const [rows, byProduct, dims] = await Promise.all([readConfigRows(env, { includeHidden: !!productId }), readPartValues(env), readDimensions(env)]);
  const groups = partGroups(rows);
  if (productId) {
    const g = groups.find((x) => x.ids.includes(productId));
    return g ? json(toApiPart(g, byProduct, dims)) : json({ error: 'part_not_found' }, { status: 404 });
  }
  return json(groups.filter((g) => g.slot === slot).map((g) => toApiPart(g, byProduct, dims)).sort((a, b) => a.name.localeCompare(b.name)));
}

/** Qiymatlarni yozish: har element — bitta qism guruhining (hamma dublikat qatorlarining) bitta turdagi qiymatlari almashtiriladi. */
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.env;
  const who = await requireAdmin(request, env);
  if (who instanceof Response) return who;
  if (request.method !== 'PUT') return json({ error: 'method_not_allowed' }, { status: 405 });
  const input = parseBody(await request.json().catch(() => null), parsePcPartsInput);
  if (input instanceof Response) return input;
  const [rows, dims] = await Promise.all([readConfigRows(env, { includeHidden: true }), readDimensions(env)]);
  const groupOf = new Map<string, PartGroup>();
  for (const g of partGroups(rows)) for (const id of g.ids) groupOf.set(id, g);

  const stmts: SqlStatement[] = [];
  for (const item of input.items) {
    const g = groupOf.get(item.productId);
    if (!g) return json({ error: 'part_not_found' }, { status: 400 });
    const d = dims.find((x) => x.id === item.dimensionId);
    if (!d) return json({ error: 'dimension_not_found' }, { status: 400 });
    if (!d.slots.includes(g.slot)) return json({ error: 'slot_not_in_dimension' }, { status: 400 });
    const own = d.values.map((v) => v.id);
    if (item.valueIds.some((v) => !own.includes(v))) return json({ error: 'value_not_in_dimension' }, { status: 400 });
    for (const pid of g.ids) {
      stmts.push(env.DB.prepare('DELETE FROM pc_part_values WHERE product_id = ? AND value_id IN (SELECT id FROM pc_dimension_values WHERE dimension_id = ?)').bind(pid, d.id));
      for (const v of item.valueIds) stmts.push(env.DB.prepare('INSERT OR IGNORE INTO pc_part_values (product_id, value_id) VALUES (?, ?)').bind(pid, v));
    }
  }
  await env.DB.batch(stmts);
  return json({ ok: true, updated: input.items.length });
}
