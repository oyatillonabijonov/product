import type { AssetField, AssetKey, ContentGroup, SiteAssets, SiteSection, SiteTexts, TextsResponse } from '../../lib/site-content';
import type { NormalizeOptions } from './image-normalize';

/** `GET /api/admin/texts` maydoni — registr qatori standart matnlari bilan. */
export type TextFieldDef = TextsResponse['fields'][number];

export interface ContentSection {
  id: SiteSection;
  texts: TextFieldDef[];
  assets: AssetField[];
}

/**
 * Guruh maydonlarini admin kartalariga bo'ladi. Tartib registrdagidek: matnli bo'limlar oldin, faqat rasmli bo'limlar
 * (`images`) oxirida; bo'lim ichida matnlar, keyin rasmlar. `keys` berilsa faqat shu kalitlar (sahifa tahriridagi izoh).
 */
export function contentSections(group: ContentGroup, texts: TextFieldDef[], assets: AssetField[], keys?: string[]): ContentSection[] {
  const wanted = (f: { key: string; group: ContentGroup }) => f.group === group && (!keys || keys.includes(f.key));
  const out: ContentSection[] = [];
  const sectionFor = (id: SiteSection): ContentSection => {
    const found = out.find((s) => s.id === id);
    if (found) return found;
    const created: ContentSection = { id, texts: [], assets: [] };
    out.push(created);
    return created;
  };
  for (const f of texts.filter(wanted)) sectionFor(f.section).texts.push(f);
  for (const f of assets.filter(wanted)) sectionFor(f.section).assets.push(f);
  return out;
}

/** Forma qiymatlari: admin o'zgartirgan matn, bo'lmasa standart — maydon bo'sh ko'rinmasin. */
export function initialTexts(fields: TextFieldDef[], values: SiteTexts): SiteTexts {
  const out: SiteTexts = {};
  for (const f of fields) {
    out[f.key] = { uz: values[f.key]?.uz || f.defaults.uz, ru: values[f.key]?.ru || f.defaults.ru };
  }
  return out;
}

/** `PUT /api/admin/texts` tanasi — faqat o'zgargan kalitlar (bo'shatilgan til serverda standartga qaytadi). */
export function changedTexts(base: SiteTexts, draft: SiteTexts): SiteTexts {
  const out: SiteTexts = {};
  for (const [key, v] of Object.entries(draft)) {
    const b = base[key];
    if (!b || b.uz !== v.uz || b.ru !== v.ru) out[key] = v;
  }
  return out;
}

/** `PUT /api/admin/assets` tanasi — faqat o'zgargan kalitlar; `''` — standartga qaytarish. */
export function changedAssets(base: SiteAssets, draft: SiteAssets): SiteAssets {
  const out: SiteAssets = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(draft)]) as Set<AssetKey>;
  for (const key of keys) {
    const next = draft[key] ?? '';
    if ((base[key] ?? '') !== next) out[key] = next;
  }
  return out;
}

/** Foto yuklash: chekkasi kesilmaydi (bir xil rangli chekka — kompozitsiya qismi), keng banner ham sig'adi. */
export const PHOTO_UPLOAD: NormalizeOptions = { maxSize: 2400, maxTrimRatio: 0 };

/**
 * Sayt rasmi yuklanishidagi ishlov: favicon o'zgarishsiz (Safari WebP favicon'ni ko'rsatmaydi), shaffof logolar va
 * "Biz haqimizda" yangiliklar rasmining chekkasi kesiladi, qolgani — foto.
 */
export function uploadOptions(key: AssetKey): NormalizeOptions | false {
  if (key === 'favicon') return false;
  if (key === 'logo' || key === 'logoDark' || key === 'about.news') return {};
  return PHOTO_UPLOAD;
}

/** Ro'yxat yozuvidan forma: `id` URL'da turadi, tanaga kirmaydi. */
export function withoutId<T extends { id: string }>(item: T): Omit<T, 'id'> {
  const { id, ...rest } = item;
  void id;
  return rest;
}

/**
 * Fayl turi yuklagichning `accept` ro'yxatiga to'g'ri keladimi. `accept` berilmasa — hammasi; `image/*` kabi
 * joker ham tushuniladi (hozircha chaqiruvchilar aniq ro'yxat beradi).
 */
export function acceptsType(accept: string | undefined, type: string): boolean {
  if (!accept) return true;
  return accept.split(',').map((t) => t.trim()).some((t) => (t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : t === type));
}

/** `accept` ro'yxatini xato xabarida ko'rsatish uchun: `image/png,image/jpeg` → `PNG, JPEG`. */
export function acceptLabel(accept: string): string {
  return accept.split(',').map((t) => t.trim().split('/')[1]?.replace('*', 'fayl').toUpperCase() ?? '').filter(Boolean).join(', ');
}
