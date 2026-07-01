import type { ApiCategory, ApiProduct, ApiSettings, Category, Condition, Term } from '../../shared/types';

export class ValidationError extends Error {}

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

export type ProductInput = Omit<ApiProduct, 'id'> & {
  id: string;
  description: string | null;
  images: string[];
  specs: { label: string; value: string }[];
};

function asRecord(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null) throw new ValidationError('body_not_object');
  return body as Record<string, unknown>;
}

function reqString(o: Record<string, unknown>, key: string): string {
  const v = o[key];
  if (typeof v !== 'string' || v.trim() === '') throw new ValidationError(`${key}_required`);
  return v.trim();
}

function reqNumber(o: Record<string, unknown>, key: string): number {
  const v = o[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new ValidationError(`${key}_number`);
  return v;
}

export function parseProductInput(body: unknown): ProductInput {
  const o = asRecord(body);
  const category = reqString(o, 'category') as Category;
  if (!CATEGORIES.includes(category)) throw new ValidationError('category_invalid');
  const condition = reqString(o, 'condition') as Condition;
  if (!CONDITIONS.includes(condition)) throw new ValidationError('condition_invalid');
  const cashPriceUzs = reqNumber(o, 'cashPriceUzs');
  if (cashPriceUzs <= 0) throw new ValidationError('price_positive');

  const id =
    typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const conditionNote =
    typeof o.conditionNote === 'string' && o.conditionNote.trim() !== ''
      ? o.conditionNote.trim()
      : null;
  const imageUrl = typeof o.imageUrl === 'string' ? o.imageUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);

  const categoryId = typeof o.categoryId === 'string' ? o.categoryId : null;
  const oldPriceUzs = typeof o.oldPriceUzs === 'number' ? o.oldPriceUzs : null;
  const description =
    typeof o.description === 'string' && o.description.trim() !== '' ? o.description.trim() : null;
  const images = Array.isArray(o.images)
    ? o.images.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : [];
  const specs = Array.isArray(o.specs)
    ? o.specs
        .map((raw) => asRecord(raw))
        .map((s) => ({ label: reqString(s, 'label'), value: reqString(s, 'value') }))
    : [];

  return {
    id,
    name: reqString(o, 'name'),
    category,
    condition,
    conditionNote,
    cashPriceUzs,
    imageUrl,
    sortOrder,
    isActive,
    categoryId,
    oldPriceUzs,
    description,
    images,
    specs,
  };
}

export function parseSettingsInput(body: unknown): ApiSettings {
  const o = asRecord(body);
  const downPaymentPercent = reqNumber(o, 'downPaymentPercent');
  if (downPaymentPercent < 0 || downPaymentPercent > 100)
    throw new ValidationError('down_payment_range');
  const usdToUzs = reqNumber(o, 'usdToUzs');
  if (usdToUzs <= 0) throw new ValidationError('usd_positive');
  if (!Array.isArray(o.terms) || o.terms.length === 0) throw new ValidationError('terms_required');
  const terms: Term[] = o.terms.map((raw) => {
    const t = asRecord(raw);
    const months = reqNumber(t, 'months');
    const markup = reqNumber(t, 'markup');
    if (months <= 0) throw new ValidationError('months_positive');
    if (markup < 0) throw new ValidationError('markup_negative');
    return { months, markup };
  });
  return { downPaymentPercent, usdToUzs, terms };
}

export interface CategoryInput {
  id: string;
  name: string;
  iconUrl: string;
  sortOrder: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseCategoryInput(body: unknown): CategoryInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const id =
    typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : slugify(name) || crypto.randomUUID();
  const iconUrl = typeof o.iconUrl === 'string' ? o.iconUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  return { id, name, iconUrl, sortOrder };
}
