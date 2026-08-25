export type Category = 'iphone' | 'mac' | 'ipad' | 'pc';
export type Condition = 'yangi' | 'ishlatilgan';
export type PaymentMode = 'both' | 'cash' | 'installment';

export interface Term {
  months: number;
  markup: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  category: Category;
  condition: Condition;
  conditionNote: string | null;
  cashPriceUzs: number;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  categoryId: string | null;
  oldPriceUzs: number | null;
  brandId: string | null;
  slug: string | null;
  minPriceUzs: number;
}

export interface ApiSettings {
  downPaymentPercent: number;
  downPaymentMaxPercent: number;
  usdToUzs: number;
  terms: Term[];
}

export interface ApiCategory {
  id: string;
  name: string;
  /** Ruscha nom; bo'sh bo'lsa UI o'zbekcha `name`ga tushadi. */
  nameRu: string;
  iconUrl: string;
  /** Preset icon key (see src/lib/category-icons); falls back to a generic icon when empty/unknown. */
  icon: string;
  sortOrder: number;
}

export interface ApiSpec {
  label: string;
  value: string;
}

export interface ApiProductDetail extends ApiProduct {
  description: string | null;
  images: string[];
  specs: ApiSpec[];
  brand: ApiBrand | null;
  options: ApiOption[];
  variants: ApiVariant[];
}

export interface ApiBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  sortOrder: number;
}

export interface ApiOptionValue {
  id: string;
  value: string;
  sortOrder: number;
}

export interface ApiOption {
  id: string;
  name: string;
  sortOrder: number;
  values: ApiOptionValue[];
}

export interface ApiVariant {
  id: string;
  sku: string | null;
  cashPriceUzs: number;
  oldPriceUzs: number | null;
  imageUrl: string | null;
  inStock: boolean;
  sortOrder: number;
  optionValueIds: string[];
}

export interface LocalizedText {
  uz: string;
  ru: string;
  en: string;
  uzCyrl: string;
}

export interface ApiBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiPost {
  id: string;
  slug: string;
  title: string;
  /** Ruscha sarlavha; bo'sh bo'lsa UI o'zbekchasiga tushadi. */
  titleRu: string;
  excerpt: string;
  excerptRu: string;
  /** Markdown — `renderMarkdown` bilan chiqariladi. */
  content: string;
  contentRu: string;
  coverUrl: string;
  /** ISO sana (YYYY-MM-DD); bo'sh bo'lsa sana ko'rsatilmaydi. */
  publishedAt: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiPage {
  id: string;
  slug: string;
  title: LocalizedText;
  content: LocalizedText;
  sortOrder: number;
  isActive: boolean;
}

export interface ApiDeviceModel {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  legacyCategory: Category;
  chip: string;
  ram: string;
  camera: string;
  display: string;
  sortOrder: number;
}

export interface ApiSiteConfig {
  name: string;
  phone: string;
  phoneDisplay: string;
  telegram: string;
  instagram: string;
  whatsapp: string;
  mapLl: string;
  mapLabel: string;
  seoTitleSuffix: string;
  seoDescription: string;
  ogImage: string;
  paymentMode: PaymentMode;
  /** Telegram bot tokeni — buyurtmalarni botga yuborish uchun (D1'da, admin tahrirlaydi). SIR. */
  telegramBotToken: string;
  /** Buyurtma tushadigan Telegram chat/guruh id'si. */
  telegramOrderChatId: string;
  /** Google OAuth client id (ommaviy). */
  googleClientId: string;
  /** Google OAuth client secret. SIR. */
  googleClientSecret: string;
  /** Telegram Login Widget bot username (ommaviy). */
  telegramLoginBot: string;
  /** Mijoz sessiya siri — runtime'da generatsiya qilinadi. SIR. */
  customerSessionSecret: string;
  /** Yandex Metrica hisoblagich raqami (ommaviy); bo'sh = analitika o'chiq. */
  yandexMetricaId: string;
}

export interface ApiCustomer {
  id: number;
  createdAt: number;
  name: string;
  phone: string | null;
  email: string | null;
}

export type OrderPaymentKind = 'cash' | 'installment';
export type OrderSource = 'product' | 'cart' | 'consult';

export interface OrderItemInput {
  productId: string;
  name: string;
  variantLabel: string;
  qty: number;
  priceUzs: number;
}

export interface OrderInput {
  name: string;
  phone: string;
  note: string;
  paymentKind: OrderPaymentKind;
  termMonths: number | null;
  downPaymentUzs: number | null;
  monthlyUzs: number | null;
  totalUzs: number | null;
  items: OrderItemInput[];
  source: OrderSource;
}

export type OrderStatus = 'new' | 'contacted' | 'done';

export interface ApiOrder extends OrderInput {
  id: number;
  createdAt: number;
  status: OrderStatus;
  telegramSent: boolean;
}
