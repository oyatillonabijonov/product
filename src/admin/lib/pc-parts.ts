import type { ApiPcDimension, ApiPcPart, PcDimensionInput, PcPartWrite } from '../../../shared/types';
import type { PcDimension, SlotKey } from '../../../shared/pc-compat';

export type PartFilter = 'all' | 'untagged' | 'tagged';

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

/** Qo'lda tanlash kerak: bo'g'iniga tegishli biror turda na tasdiqlangan qiymat, na nomdan taklif bor. */
export function needsManual(part: ApiPcPart, dims: PcDimension[]): boolean {
  return dimsForSlot(part.slot, dims).some((d) => (part.values[d.id]?.length ?? 0) === 0 && (part.suggested[d.id]?.length ?? 0) === 0);
}

/** Tasdiqlangan qiymatlar bir qatorda: turlar " · " bilan, bir turdagi bir nechta qiymat " / " bilan ("AM5 · DDR5"). */
export function partSummary(part: ApiPcPart, dims: PcDimension[]): string {
  return dimsForSlot(part.slot, dims)
    .map((d) => d.values.filter((v) => (part.values[d.id] ?? []).includes(v.id)).map((v) => v.label).join(' / '))
    .filter(Boolean)
    .join(' · ');
}

/** Server bitta so'rovda 500 tagacha yozuv qabul qiladi — ommaviy tasdiqlash bo'laklab yuboriladi. */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
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

/**
 * Yangi qiymat yorlig'i; vergul bilan bir nechtasi bir yo'la («ATX, mATX, ITX»). Bo'sh yoki (katta-kichik harfsiz)
 * takror qism tashlanadi; hech narsa qo'shilmasa o'sha massiv qaytadi.
 */
export function addValue(values: PcDimensionInput['values'], label: string): PcDimensionInput['values'] {
  return label.split(',').reduce((acc, part) => {
    const l = part.trim();
    return !l || acc.some((v) => v.label.toLowerCase() === l.toLowerCase()) ? acc : [...acc, { id: null, label: l }];
  }, values);
}

/** Jumla ichidagi nom: bosh harf kichrayadi («Ona plata» → «ona plata»), qisqartma emas («SSD disk» o'zgarmaydi). */
export function lowerFirst(s: string): string {
  return s.length > 1 && s[1] === s[1].toLowerCase() ? s[0].toLowerCase() + s.slice(1) : s;
}

/** Turning nomi admin tilida; ruschasi bo'sh bo'lsa o'zbekchasi (saytdagi `dimName` bilan bir qoida). */
export function dimLabel(d: Pick<PcDimension, 'name' | 'nameRu'>, lang: string): string {
  return lang === 'ru' && d.nameRu ? d.nameRu : d.name;
}

/**
 * Ro'yxat jumlada: «protsessor va ona plata», «ATX, mATX yoki ITX». Bog'lovchi tarjimadan keladi —
 * ponytail: `Intl.ListFormat` brauzerda o'zbekcha ma'lumotsiz, «and/or» qaytaradi.
 */
export function listText(items: string[], word: string): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}
