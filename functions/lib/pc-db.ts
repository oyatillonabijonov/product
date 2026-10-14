import type { Env } from '../env';
import { PC_SLOTS, missingCount, partGroups, type ConfigPartRow, type PcDimension, type SlotKey } from '../../shared/pc-compat';
import type { ApiPcDimension } from '../../shared/types';

interface DimRow { id: number; key: string | null; name: string; name_ru: string; slots: string; is_active: number }
interface ValueRow { id: number; dimension_id: number; label: string }

const SLOT_KEYS: readonly string[] = PC_SLOTS.map((s) => s.key);

function parseSlots(raw: string): SlotKey[] {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is SlotKey => typeof x === 'string' && SLOT_KEYS.includes(x)) : [];
  } catch {
    return [];
  }
}

/** Hamma moslik turlari qiymatlari bilan (faol va nofaol), `sort_order` bo'yicha. */
export async function readDimensions(env: Env): Promise<PcDimension[]> {
  const [{ results: dims }, { results: values }] = await Promise.all([
    env.DB.prepare('SELECT id, key, name, name_ru, slots, is_active FROM pc_dimensions ORDER BY sort_order, id').all<DimRow>(),
    env.DB.prepare('SELECT id, dimension_id, label FROM pc_dimension_values ORDER BY sort_order, id').all<ValueRow>(),
  ]);
  return dims.map((d) => ({
    id: d.id, key: d.key, name: d.name, nameRu: d.name_ru, slots: parseSlots(d.slots), active: d.is_active === 1,
    values: values.filter((v) => v.dimension_id === d.id).map((v) => ({ id: v.id, label: v.label })),
  }));
}

/**
 * Konfigurator qatorlari: PC yo'nalishi, bo'g'in turlari, narxi bor, faol yoki Billz'dan (qoldiq 0 — "buyurtma asosida"),
 * qo'lda yashirilmagan. `includeHidden` — "Konfiguratorda ko'rsatilmasin" belgilanganlari ham (admin tahriri uchun).
 */
export async function readConfigRows(env: Env, opts: { includeHidden?: boolean } = {}): Promise<ConfigPartRow[]> {
  const types = PC_SLOTS.map((s) => s.type);
  const { results } = await env.DB.prepare(
    `SELECT id, name, image_url, type, COALESCE(
       (SELECT MIN(v.cash_price_uzs) FROM product_variants v WHERE v.product_id = products.id AND v.in_stock = 1),
       cash_price_uzs) AS price,
     billz_id, billz_stock, is_active, pc_watts
     FROM products
     WHERE category_id = 'pc' AND type IN (${types.map(() => '?').join(', ')})
       ${opts.includeHidden ? '' : 'AND pc_hidden = 0'}
       AND cash_price_uzs > 0 AND (is_active = 1 OR billz_id IS NOT NULL)
       AND instr(',' || COALESCE(manual_fields, '') || ',', ',hidden,') = 0`,
  ).bind(...types).all<ConfigPartRow>();
  return results;
}

/** product_id → tasdiqlangan qiymat id'lari. Jadval kichik (≈ 300 qism × 2–3 qiymat) — butunlay o'qiladi. */
export async function readPartValues(env: Env): Promise<Map<string, number[]>> {
  const { results } = await env.DB.prepare('SELECT product_id, value_id FROM pc_part_values').all<{ product_id: string; value_id: number }>();
  const map = new Map<string, number[]>();
  for (const r of results) {
    const list = map.get(r.product_id);
    if (list) list.push(r.value_id);
    else map.set(r.product_id, [r.value_id]);
  }
  return map;
}

/** Admin turlar ro'yxati: har tur + shu turda qiymati yo'q (saytda ko'rinadigan) qism guruhlari soni. */
export async function readDimensionList(env: Env): Promise<ApiPcDimension[]> {
  const [dims, rows, byProduct] = await Promise.all([readDimensions(env), readConfigRows(env), readPartValues(env)]);
  const groups = partGroups(rows);
  return dims.map((d) => ({ ...d, missing: missingCount(d, groups, byProduct, dims) }));
}
