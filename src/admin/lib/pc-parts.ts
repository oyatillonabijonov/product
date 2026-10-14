import type { ApiPcDimension, ApiPcPart, PcDimensionInput, PcPartWrite } from '../../../shared/types';
import type { PcDimension, SlotKey } from '../../../shared/pc-compat';

export type PartFilter = 'all' | 'untagged' | 'tagged';
export const PART_FILTERS: readonly PartFilter[] = ['all', 'untagged', 'tagged'];

/** Bo'g'inga tegishli turlar — faol va nofaol (admin yangi turni yoqishdan oldin to'ldiradi). Jadval ustunlari shular. */
export function dimsForSlot(slot: SlotKey, dims: PcDimension[]): PcDimension[] {
  return dims.filter((d) => d.slots.includes(slot));
}

/** Belgilanmagan: bo'g'ini kirgan biror turda tasdiqlangan qiymati yo'q. */
export function isUntagged(part: ApiPcPart, dims: PcDimension[]): boolean {
  return dimsForSlot(part.slot, dims).some((d) => (part.values[d.id]?.length ?? 0) === 0);
}

/** Holat filtri + ko'p so'zli qidiruv (har so'z nomda, tartibdan qat'i nazar). */
export function filterParts(parts: ApiPcPart[], dims: PcDimension[], filter: PartFilter, q: string): ApiPcPart[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return parts.filter((p) =>
    (filter === 'all' || (filter === 'untagged') === isUntagged(p, dims)) && words.every((w) => p.name.toLowerCase().includes(w)));
}

/**
 * «Taklifni tasdiqlash»: har qismning qiymati yo'q turlariga nomdan taklif yoziladi (tasdiqlangan qiymat
 * almashtirilmaydi). `confirmed` — kamida bitta yozuv olgan qismlar, `skipped` — qaysidir turda taklifi yo'qlar.
 */
export function acceptSuggestions(parts: ApiPcPart[], dims: PcDimension[]): { items: PcPartWrite[]; confirmed: number; skipped: number } {
  const items: PcPartWrite[] = [];
  let skipped = 0;
  for (const p of parts) {
    let gap = false;
    for (const d of dimsForSlot(p.slot, dims)) {
      if ((p.values[d.id]?.length ?? 0) > 0) continue;
      const s = p.suggested[d.id] ?? [];
      if (s.length === 0) { gap = true; continue; }
      items.push({ productId: p.id, dimensionId: d.id, valueIds: s });
    }
    if (gap) skipped++;
  }
  return { items, confirmed: new Set(items.map((i) => i.productId)).size, skipped };
}

/** «Qiymat berish» / «Tozalash» (`valueIds = []`): faqat tur bog'laydigan bo'g'indagi qismlar. */
export function assignValues(parts: ApiPcPart[], dim: PcDimension, valueIds: number[]): PcPartWrite[] {
  return parts.filter((p) => dim.slots.includes(p.slot)).map((p) => ({ productId: p.id, dimensionId: dim.id, valueIds }));
}

/** Chip bosildi: qiymat bor bo'lsa olib tashlanadi, yo'q bo'lsa qo'shiladi. */
export function toggleValue(current: number[], valueId: number): number[] {
  return current.includes(valueId) ? current.filter((v) => v !== valueId) : [...current, valueId];
}

/** Tur tahriri formasi; null — yangi tur. */
export function dimToForm(dim: ApiPcDimension | null): PcDimensionInput {
  return dim
    ? { name: dim.name, nameRu: dim.nameRu, slots: [...dim.slots], active: dim.active, values: dim.values.map((v) => ({ id: v.id, label: v.label })) }
    : { name: '', nameRu: '', slots: [], active: false, values: [] };
}

/** Yangi qiymat yorlig'i: bo'sh yoki (katta-kichik harfsiz) takror bo'lsa ro'yxat o'zgarmaydi (o'sha massiv qaytadi). */
export function addValue(values: PcDimensionInput['values'], label: string): PcDimensionInput['values'] {
  const l = label.trim();
  if (!l || values.some((v) => v.label.toLowerCase() === l.toLowerCase())) return values;
  return [...values, { id: null, label: l }];
}
