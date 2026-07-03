import type {
  ApiCategory,
  ApiProduct,
  ApiSettings,
  ApiSiteConfig,
  Category,
  Condition,
  LocalizedText,
  Term,
} from '../../shared/types';

export class ValidationError extends Error {}

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

export type ProductInput = Omit<ApiProduct, 'id' | 'minPriceUzs'> & {
  id: string;
  description: string | null;
  images: string[];
  specs: { label: string; value: string }[];
  options: { name: string; values: string[] }[];
  variants: {
    sku: string | null;
    cashPriceUzs: number;
    oldPriceUzs: number | null;
    imageUrl: string | null;
    inStock: boolean;
    optionValues: { optionName: string; value: string }[];
  }[];
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

  const brandId = typeof o.brandId === 'string' && o.brandId.trim() !== '' ? o.brandId.trim() : null;
  const slug = typeof o.slug === 'string' && o.slug.trim() !== '' ? slugify(o.slug) : null;
  const options = Array.isArray(o.options)
    ? o.options.map((raw) => {
        const r = asRecord(raw);
        const name = reqString(r, 'name');
        const values = Array.isArray(r.values)
          ? r.values.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim())
          : [];
        if (values.length === 0) throw new ValidationError('option_values_required');
        return { name, values };
      })
    : [];
  const optNames = options.map((x) => x.name);
  if (new Set(optNames).size !== optNames.length) throw new ValidationError('option_names_unique');
  const variants = Array.isArray(o.variants)
    ? o.variants.map((raw) => {
        const r = asRecord(raw);
        const cashPriceUzsV = reqNumber(r, 'cashPriceUzs');
        if (cashPriceUzsV <= 0) throw new ValidationError('variant_price_positive');
        const optionValues = Array.isArray(r.optionValues)
          ? r.optionValues.map((ov) => {
              const q = asRecord(ov);
              return { optionName: reqString(q, 'optionName'), value: reqString(q, 'value') };
            })
          : [];
        return {
          sku: typeof r.sku === 'string' && r.sku.trim() !== '' ? r.sku.trim() : null,
          cashPriceUzs: cashPriceUzsV,
          oldPriceUzs: typeof r.oldPriceUzs === 'number' && r.oldPriceUzs > 0 ? r.oldPriceUzs : null,
          imageUrl: typeof r.imageUrl === 'string' && r.imageUrl.trim() !== '' ? r.imageUrl.trim() : null,
          inStock: r.inStock === undefined ? true : Boolean(r.inStock),
          optionValues,
        };
      })
    : [];
  if (options.length > 0) {
    for (const v of variants) {
      if (v.optionValues.length !== options.length) throw new ValidationError('variant_combination_incomplete');
      for (const opt of options) {
        const ov = v.optionValues.find((x) => x.optionName === opt.name);
        if (!ov) throw new ValidationError('variant_combination_incomplete');
        if (!opt.values.includes(ov.value)) throw new ValidationError('variant_value_unknown');
      }
    }
  }

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
    brandId,
    slug,
    options,
    variants,
  };
}

export interface BrandInput {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  sortOrder: number;
}

export function parseBrandInput(body: unknown): BrandInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const slug = typeof o.slug === 'string' && o.slug.trim() !== '' ? slugify(o.slug) : slugify(name);
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : slug || crypto.randomUUID();
  const logoUrl = typeof o.logoUrl === 'string' ? o.logoUrl.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  if (!slug) throw new ValidationError('slug_invalid');
  return { id, name, slug, logoUrl, sortOrder };
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

export interface BannerInput {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

export function parseBannerInput(body: unknown): BannerInput {
  const o = asRecord(body);
  const imageUrl = reqString(o, 'imageUrl');
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const linkUrl = typeof o.linkUrl === 'string' ? o.linkUrl.trim() : '';
  if (linkUrl !== '' && !/^(\/|https?:\/\/)/i.test(linkUrl)) throw new ValidationError('link_invalid');
  const altText = typeof o.altText === 'string' ? o.altText.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);
  return { id, imageUrl, linkUrl, altText, sortOrder, isActive };
}

const PAGE_SLUG_RE = /^[a-z0-9-]+$/;
const TEXT_KEYS: (keyof LocalizedText)[] = ['uz', 'ru', 'en', 'uzCyrl'];

function localizedText(o: Record<string, unknown>, key: string, required: boolean): LocalizedText {
  const raw = o[key];
  const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const out = {} as LocalizedText;
  for (const k of TEXT_KEYS) {
    const v = r[k];
    const s = typeof v === 'string' ? v.trim() : '';
    if (required && s === '') throw new ValidationError(`${key}_${k}_required`);
    out[k] = s;
  }
  return out;
}

export interface PageInput {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export function parsePageInput(body: unknown): PageInput {
  const o = asRecord(body);
  const slug = reqString(o, 'slug').toLowerCase();
  if (!PAGE_SLUG_RE.test(slug)) throw new ValidationError('slug_invalid');
  const title = localizedText(o, 'title', true);
  const content = localizedText(o, 'content', false);
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : crypto.randomUUID();
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  const isActive = o.isActive === undefined ? true : Boolean(o.isActive);
  return { id, slug, title, content, sortOrder, isActive };
}

export function parseSiteConfigInput(body: unknown): ApiSiteConfig {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const phone = reqString(o, 'phone');
  const opt = (key: string): string => (typeof o[key] === 'string' ? (o[key] as string).trim() : '');
  return {
    name,
    phone,
    phoneDisplay: opt('phoneDisplay') || phone,
    telegram: opt('telegram'),
    instagram: opt('instagram'),
    whatsapp: opt('whatsapp'),
    mapLl: opt('mapLl'),
    mapLabel: opt('mapLabel'),
    seoTitleSuffix: opt('seoTitleSuffix') || name,
    seoDescription: opt('seoDescription'),
    ogImage: opt('ogImage'),
  };
}
