/**
 * Tovar turlari — yo'nalish ichidagi bo'linish (iPhone, GPU, Mikrofon …).
 * Ro'yxat bazada (`product_types`, migratsiya 0035; admin → Mahsulotlar → Turlar). Bu fayl sof:
 * qator shakli va yordamchilar — sayt (`loadTypes`), Billz runner (`server/`) va admin ishlatadi,
 * shuning uchun `shared/`da va `.ts` kengaytmali import bilan.
 */

export interface ProductTypeRow {
  id: string;
  categoryId: string;
  label: string;
  labelRu: string;
  iconUrl: string;
  /** Billz kategoriya nomlari (katta-kichik harfsiz) — `label` ham mos keladi. */
  billzAliases: string[];
  sortOrder: number;
}

/** SQL qatori (snake_case). */
export interface ProductTypeDbRow {
  id: string;
  category_id: string;
  label: string;
  label_ru: string;
  icon_url: string;
  billz_aliases: string;
  sort_order: number;
}

/** `billz_aliases` JSON matn; buzilgan bo'lsa bo'sh ro'yxat — bitta yomon qator sinxronizatsiyani yiqitmasin. */
export function rowToProductType(r: ProductTypeDbRow): ProductTypeRow {
  let billzAliases: string[] = [];
  try {
    const v: unknown = JSON.parse(r.billz_aliases);
    if (Array.isArray(v)) billzAliases = v.filter((x): x is string => typeof x === 'string');
  } catch {
    // bo'sh qoladi
  }
  return { id: r.id, categoryId: r.category_id, label: r.label, labelRu: r.label_ru, iconUrl: r.icon_url, billzAliases, sortOrder: r.sort_order };
}

/** Yo'nalishning turlari `sort_order` bo'yicha; noma'lum yoki bo'sh yo'nalish → []. */
export function typesOf(all: ProductTypeRow[], categoryId: string | null | undefined): ProductTypeRow[] {
  if (!categoryId) return [];
  return all
    .filter((t) => t.categoryId === categoryId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

/** Billz kategoriya nomi → tur id'si (nom yoki alias, katta-kichik harfsiz); mos kelmasa null. */
export function matchBillzType(types: ProductTypeRow[], billzName: string): string | null {
  const needle = billzName.trim().toLowerCase();
  if (!needle) return null;
  for (const t of types) {
    if (t.label.toLowerCase() === needle) return t.id;
    if (t.billzAliases.some((a) => a.toLowerCase() === needle)) return t.id;
  }
  return null;
}
