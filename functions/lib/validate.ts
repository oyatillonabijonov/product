import type {
  ApiCategory,
  ApiProduct,
  ApiSettings,
  ApiSiteConfig,
  Category,
  Condition,
  LocalizedText,
  OrderInput,
  OrderItemInput,
  OrderPaymentKind,
  PaymentMode,
  Term,
} from '../../shared/types';
import { deriveLegacyCategory } from '../../shared/legacy-category';

export class ValidationError extends Error {}

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
// Payload chegaralari — chegarasiz massivlar minglab ketma-ket INSERT bo'lib ketardi.
const MAX_IMAGES = 24;
const MAX_SPECS = 60;
const MAX_OPTIONS = 4;
const MAX_OPTION_VALUES = 30;
const MAX_VARIANTS = 300;
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
  const name = reqString(o, 'name');
  const categoryId = typeof o.categoryId === 'string' ? o.categoryId : null;
  const rawCategory =
    typeof o.category === 'string' && o.category.trim() !== '' ? (o.category.trim() as Category) : null;
  if (rawCategory !== null && !CATEGORIES.includes(rawCategory)) throw new ValidationError('category_invalid');
  const category = rawCategory ?? deriveLegacyCategory(categoryId);
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

  // Variant yo'lidagi kabi sanitizatsiya: manfiy/0 eski narx manfiy chegirma badge'iga aylanardi.
  const oldPriceUzs = typeof o.oldPriceUzs === 'number' && Number.isFinite(o.oldPriceUzs) && o.oldPriceUzs > 0 ? o.oldPriceUzs : null;
  const description =
    typeof o.description === 'string' && o.description.trim() !== '' ? o.description.trim() : null;
  const images = Array.isArray(o.images)
    ? o.images.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
    : [];
  if (images.length > MAX_IMAGES) throw new ValidationError('images_limit');
  const specs = Array.isArray(o.specs)
    ? o.specs
        .map((raw) => asRecord(raw))
        .map((s) => ({ label: reqString(s, 'label'), value: reqString(s, 'value') }))
    : [];

  if (specs.length > MAX_SPECS) throw new ValidationError('specs_limit');

  const brandId = typeof o.brandId === 'string' && o.brandId.trim() !== '' ? o.brandId.trim() : null;
  const slug =
    typeof o.slug === 'string' && o.slug.trim() !== '' ? slugify(o.slug) : (slugify(name) || null);
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
  if (options.length > MAX_OPTIONS) throw new ValidationError('options_limit');
  if (options.some((x) => x.values.length > MAX_OPTION_VALUES)) throw new ValidationError('option_values_limit');
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
  if (variants.length > MAX_VARIANTS) throw new ValidationError('variants_limit');
  if (options.length > 0) {
    const seenCombos = new Set<string>();
    for (const v of variants) {
      if (v.optionValues.length !== options.length) throw new ValidationError('variant_combination_incomplete');
      for (const opt of options) {
        const ov = v.optionValues.find((x) => x.optionName === opt.name);
        if (!ov) throw new ValidationError('variant_combination_incomplete');
        if (!opt.values.includes(ov.value)) throw new ValidationError('variant_value_unknown');
      }
      // Bir xil kombinatsiyali ikki variant defaultSelection/resolveVariant'ni buzadi.
      const key = v.optionValues.map((x) => `${x.optionName}=${x.value}`).sort().join('|');
      if (seenCombos.has(key)) throw new ValidationError('variant_duplicate');
      seenCombos.add(key);
    }
  }

  return {
    id,
    name,
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
  const downPaymentMaxPercent = reqNumber(o, 'downPaymentMaxPercent');
  if (downPaymentMaxPercent < downPaymentPercent || downPaymentMaxPercent > 100)
    throw new ValidationError('down_payment_max_range');
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
  return { downPaymentPercent, downPaymentMaxPercent, usdToUzs, terms };
}

export interface CategoryInput {
  id: string;
  name: string;
  nameRu: string;
  iconUrl: string;
  icon: string;
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
  const nameRu = typeof o.nameRu === 'string' ? o.nameRu.trim() : '';
  const iconUrl = typeof o.iconUrl === 'string' ? o.iconUrl.trim() : '';
  const icon = typeof o.icon === 'string' ? o.icon.trim() : '';
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  return { id, name, nameRu, iconUrl, icon, sortOrder };
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
  // nusxasi src/lib/safe-href.ts da (functions tsconfig src/ ni ko'rmaydi)
  if (linkUrl !== '' && !/^(\/(?!\/)|https?:\/\/)/i.test(linkUrl)) throw new ValidationError('link_invalid');
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

export interface DeviceModelInput {
  id: string; name: string; brandId: string; categoryId: string;
  legacyCategory: Category; chip: string; ram: string; camera: string;
  display: string; sortOrder: number;
}

export function parseDeviceModelInput(body: unknown): DeviceModelInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const brandId = reqString(o, 'brandId');
  const categoryId = reqString(o, 'categoryId');
  const rawLegacy = typeof o.legacyCategory === 'string' && o.legacyCategory.trim() !== '' ? (o.legacyCategory.trim() as Category) : null;
  if (rawLegacy !== null && !CATEGORIES.includes(rawLegacy)) throw new ValidationError('legacy_category_invalid');
  const legacyCategory = rawLegacy ?? deriveLegacyCategory(categoryId);
  const opt = (key: string): string => (typeof o[key] === 'string' ? (o[key] as string).trim() : '');
  const id = typeof o.id === 'string' && o.id.trim() !== '' ? o.id.trim() : (slugify(name) || crypto.randomUUID());
  const sortOrder = typeof o.sortOrder === 'number' ? o.sortOrder : 0;
  return { id, name, brandId, categoryId, legacyCategory, chip: opt('chip'), ram: opt('ram'), camera: opt('camera'), display: opt('display'), sortOrder };
}

export interface EmailAuthInput {
  mode: 'login' | 'register';
  email: string;
  password: string;
  name: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** /auth/email body — kirish yoki ro'yxatdan o'tish. Email lower-case normallashtiriladi. */
export function parseEmailAuthInput(body: unknown): EmailAuthInput {
  const o = asRecord(body);
  const mode = o.mode === 'register' ? 'register' : o.mode === 'login' ? 'login' : null;
  if (!mode) throw new ValidationError('mode_invalid');
  const email = (typeof o.email === 'string' ? o.email : '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new ValidationError('email_invalid');
  const password = typeof o.password === 'string' ? o.password : '';
  if (password.length < 8) throw new ValidationError('password_too_short');
  const name = (typeof o.name === 'string' ? o.name : '').trim().slice(0, 80);
  return { mode, email, password, name };
}

/** Kabinet profil tahriri — ism (majburiy) + telefon (ixtiyoriy, bo'lsa UZ format). */
export function parseProfileInput(body: unknown): { name: string; phone: string } {
  const o = asRecord(body);
  const name = (typeof o.name === 'string' ? o.name : '').trim().slice(0, 80);
  if (!name) throw new ValidationError('name_required');
  const phone = (typeof o.phone === 'string' ? o.phone : '').trim();
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 12) throw new ValidationError('phone_invalid');
  }
  return { name, phone };
}

/** Kabinet parol o'rnatish/o'zgartirish — joriy (ixtiyoriy, faqat paroli bor hisobda) + yangi (min 8). */
export function parsePasswordInput(body: unknown): { currentPassword: string; newPassword: string } {
  const o = asRecord(body);
  const currentPassword = typeof o.currentPassword === 'string' ? o.currentPassword : '';
  const newPassword = typeof o.newPassword === 'string' ? o.newPassword : '';
  if (newPassword.length < 8) throw new ValidationError('password_too_short');
  return { currentPassword, newPassword };
}

export function parseSiteConfigInput(body: unknown): ApiSiteConfig {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const phone = reqString(o, 'phone');
  const opt = (key: string): string => (typeof o[key] === 'string' ? (o[key] as string).trim() : '');
  // Banner linkUrl bilan bir xil qoida (nusxasi src/lib/safe-href.ts) — kontakt
  // URL'lar storefront'da to'g'ridan-to'g'ri href bo'ladi, javascript: o'tmasin.
  const link = (key: string): string => {
    const v = opt(key);
    if (v !== '' && !/^(\/(?!\/)|https?:\/\/)/i.test(v)) throw new ValidationError(`${key}_invalid`);
    return v;
  };
  const pm = opt('paymentMode');
  const paymentMode: PaymentMode = pm === 'cash' || pm === 'installment' ? pm : 'both';
  const yandexMetricaId = opt('yandexMetricaId');
  if (yandexMetricaId !== '' && !/^\d{1,12}$/.test(yandexMetricaId)) throw new ValidationError('yandexMetricaId_invalid');
  return {
    name,
    phone,
    phoneDisplay: opt('phoneDisplay') || phone,
    telegram: link('telegram'),
    instagram: link('instagram'),
    whatsapp: link('whatsapp'),
    mapLl: opt('mapLl'),
    mapLabel: opt('mapLabel'),
    seoTitleSuffix: opt('seoTitleSuffix') || name,
    seoDescription: opt('seoDescription'),
    ogImage: opt('ogImage'),
    paymentMode,
    telegramBotToken: opt('telegramBotToken'),
    telegramOrderChatId: opt('telegramOrderChatId'),
    googleClientId: opt('googleClientId'),
    googleClientSecret: opt('googleClientSecret'),
    telegramLoginBot: opt('telegramLoginBot'),
    // Server tomonidan boshqariladi (runtime generatsiya) — body'dan kelmaydi, yozuvda saqlanadi.
    customerSessionSecret: '',
    yandexMetricaId,
  };
}

const MAX_ORDER_ITEMS = 50;

export function parseOrderInput(body: unknown): OrderInput {
  const o = asRecord(body);
  const name = reqString(o, 'name');
  const phone = reqString(o, 'phone');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) throw new ValidationError('phone_invalid');
  const paymentKind: OrderPaymentKind | null =
    o.paymentKind === 'cash' ? 'cash' : o.paymentKind === 'installment' ? 'installment' : null;
  if (!paymentKind) throw new ValidationError('payment_kind_invalid');
  if (!Array.isArray(o.items) || o.items.length === 0) throw new ValidationError('items_required');
  if (o.items.length > MAX_ORDER_ITEMS) throw new ValidationError('items_limit');
  const items: OrderItemInput[] = o.items.map((raw) => {
    const it = asRecord(raw);
    const priceUzs = reqNumber(it, 'priceUzs');
    if (priceUzs <= 0) throw new ValidationError('price_positive');
    const qty = reqNumber(it, 'qty');
    if (!Number.isInteger(qty) || qty <= 0) throw new ValidationError('qty_positive');
    return {
      productId: reqString(it, 'productId'),
      name: reqString(it, 'name'),
      variantLabel: typeof it.variantLabel === 'string' ? it.variantLabel : '',
      qty,
      priceUzs,
    };
  });
  const num = (k: string): number | null =>
    typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : null;
  const installment = paymentKind === 'installment';
  return {
    name,
    phone: phone.trim(),
    note: typeof o.note === 'string' ? o.note.trim().slice(0, 500) : '',
    paymentKind,
    termMonths: installment ? num('termMonths') : null,
    downPaymentUzs: installment ? num('downPaymentUzs') : null,
    monthlyUzs: installment ? num('monthlyUzs') : null,
    totalUzs: installment ? num('totalUzs') : null,
    items,
    source: o.source === 'cart' ? 'cart' : 'product',
  };
}
