import type { BillzSyncStatus, ManualField } from './billz';
import type { ProductTypeRow } from './product-types';

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
  /** Tovar turi (`product_types` jadvali, admin → Turlar); belgilanmagan bo'lsa `null`. */
  type: string | null;
  oldPriceUzs: number | null;
  brandId: string | null;
  slug: string | null;
  minPriceUzs: number;
  /** Yulduzcha o'rtachasi 0–5; baholanmagan bo'lsa `null`. Admin qo'lda kiritadi. */
  ratingAvg: number | null;
  /** Sharhlar soni; 0 = hali sharh yo'q. */
  reviewCount: number;
  /** Oldindan buyurtma (pre-order): sahifada "Yangi" o'rniga "Pre-order", tugma matni boshqa. */
  preorder: boolean;
  /** PC konfiguratorida ko'rsatilmasin (egasi eskirgan modelni chiqaradi). */
  pcHidden: boolean;
  /** Konfigurator atributlarining admin tuzatishi; null — nomdan avtomatik (shared/pc-compat.ts). */
  pcSocket: string | null;
  pcMemory: string | null;
  pcWatts: number | null;
  /** Billz tovar UUID'si — sinxronizatsiya bog'lanishi; qo'lda kiritilgan mahsulotda `null`. */
  billzId: string | null;
  /** Billz'dagi qoldiq (tanlangan do'kon); qo'lda kiritilganda `null`. */
  billzStock: number | null;
  /** Billz tovarida qo'lda tahrirlangan maydonlar — sinxronizatsiya ularga tegmaydi. */
  manualFields: ManualField[];
  /** Mahsulot tavsifi; qo'lda kiritilgan yoki Billz'dan — olinadi. */
  description: string | null;
}

export interface ApiReview {
  id: string;
  author: string;
  /** 1..5 */
  rating: number;
  body: string;
  /** unix sekund */
  createdAt: number;
}

export interface ApiSettings {
  downPaymentPercent: number;
  downPaymentMaxPercent: number;
  usdToUzs: number;
  /** Markaziy bank kursiga qo'shiladigan ustama (%); `null` — avtomatik kurs o'chiq, `usdToUzs` qo'lda. */
  usdMarkupPercent: number | null;
  /** Oxirgi olingan MB kursi — server yozadi. */
  usdCbuRate: number | null;
  /** MB kursi sanasi ("14.09.2026") — server yozadi. */
  usdRateDate: string;
  terms: Term[];
}

export interface ApiCategory {
  id: string;
  name: string;
  /** Ruscha nom; bo'sh bo'lsa UI o'zbekcha `name`ga tushadi. */
  nameRu: string;
  /** Kategoriya sahifasidagi cover rasmi; bo'sh bo'lsa cover ko'rsatilmaydi. */
  coverUrl: string;
  sortOrder: number;
}

export interface ApiSpec {
  label: string;
  value: string;
}

export interface ApiProductDetail extends ApiProduct {
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

/** Admin ro'yxati — brenddagi mahsulot soni bilan (`GET /api/admin/brands`). */
export interface ApiAdminBrand extends ApiBrand {
  productCount: number;
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

/** Sayt ikki tilda chiqadi. `pages` jadvalidagi en/cyrl ustunlari eski
 *  migratsiyalardan qolgan — o'qilmaydi ham, yozilmaydi ham. */
export interface LocalizedText {
  uz: string;
  ru: string;
}

export interface ApiBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
}

/** Landing "Yangiliklar" tile'i. uz maydonlari asosiy, `*Ru` bo'sh bo'lsa UI o'zbekchasiga tushadi. */
export interface ApiNews {
  id: string;
  /** To'q sariq yorliq ("Yangi"). */
  badge: string;
  badgeRu: string;
  /** Yashil teg ("Tez orada"). */
  tag: string;
  tagRu: string;
  title: string;
  titleRu: string;
  text: string;
  textRu: string;
  /** Tugma matni; bo'sh bo'lsa "Batafsil". Havola bo'lmasa tugma chiqmaydi. */
  cta: string;
  ctaRu: string;
  linkUrl: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
}

/** Bandlik turi — `vacancies.employment`. */
export type EmploymentType = 'full' | 'part' | 'intern';

/** Vakansiya. uz maydonlari asosiy, `*Ru` bo'sh bo'lsa sayt o'zbekchasini ko'rsatadi. */
export interface ApiVacancy {
  id: string;
  title: string;
  titleRu: string;
  /** Bo'lim ("Sotuv", "Servis"). */
  department: string;
  departmentRu: string;
  employment: EmploymentType;
  /** Erkin matn; bo'sh bo'lsa ko'rsatilmaydi. */
  salary: string;
  salaryRu: string;
  /** Markdown — vazifalar va talablar ro'yxati. */
  description: string;
  descriptionRu: string;
  sortOrder: number;
  isActive: boolean;
}

/** Nomzod arizasi (admin → Vakansiyalar → Arizalar). */
export interface ApiJobApplication {
  id: number;
  createdAt: number;
  vacancyId: string | null;
  /** Ariza paytidagi lavozim nomi — vakansiya keyin o'chsa ham qoladi. */
  position: string;
  name: string;
  phone: string;
  message: string;
  resumeUrl: string;
  status: OrderStatus;
  telegramSent: boolean;
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
  /** Billz integratsiya kaliti. SIR. */
  billzSecretToken: string;
  /** Billz do'koni (shop UUID) — narx va qoldiq shu do'kondan. */
  billzShopId: string;
  /** Oxirgi sinxronizatsiya natijasi (JSON) — server yozadi, admin o'qiydi. */
  billzLastSync: string;
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

/** Admin'da tahrirlangan sayt matni (`site_texts`); bo'sh til — `locales.ts`dagi standart. */
export interface ApiSiteText {
  uz: string;
  ru: string;
}

/** Admin bosh sahifasi — faqat harakat talab qiladigan sanoqlar (`GET /api/admin/dashboard`). */
export interface ApiDashboard {
  /** Billz tovarlari: qoldiq bor, rasm yo'q — saytda ko'rinmaydi. */
  needsImage: number;
  newOrders: number;
  newApplications: number;
  billz: BillzSyncStatus;
  /** Do'kon kursi; `auto` — Markaziy bank + ustama bilan hisoblanadi. */
  usd: { rate: number; auto: boolean };
}

/** Tovar turi (`product_types`) — admin CRUD; `id` yo'nalish ichida noyob, `products.type` shunga bog'lanadi. */
export interface ApiProductType extends ProductTypeRow {
  /** Shu turdagi mahsulotlar soni (ro'yxatda ko'rinadi, o'chirish tasdig'ida aytiladi). */
  productCount: number;
}

export interface ApiAdminToken {
  id: number;
  label: string;
  /** `manual` — admin'da qo'lda yaratilgan; `oauth` — konnektor bergan. */
  kind: 'manual' | 'oauth';
  createdAt: number;
  lastUsedAt: number | null;
}
