import type { LucideIcon } from 'lucide-react';
import {
  BookOpen, Boxes, Briefcase, FileText, House, Image, Inbox, LayoutDashboard, LayoutGrid, Megaphone, Newspaper, Package, Phone, Plug,
  Receipt, Search, Settings, Shapes, Smartphone, Store, Tag, UserRound, Users, UsersRound, Wallet,
} from 'lucide-react';
import type { ParseKeys } from 'i18next';
import type { AdminRoute, SectionId } from './lib/admin-path';

/** Tab — sidebar sub-bandi; `Icon` sub-bandda ham chiziladi (egasining talabi, 2026-09-16). */
export interface TabDef {
  id: string; segment: string; labelKey: ParseKeys<'shell'>; Icon: LucideIcon;
  /** Tab'ning id-ekrani (masalan TypeEdit) o'z `Page`ini chizadi — qobiq tashqi sarlavha va tablarni chizmaydi. */
  detail?: boolean;
  /** Tab'ning asosiy ekrani forma (landing muharriri) — o'z `Page`ini (Saqlash bilan) va mobil tablarni (`SectionTabs`) chizadi. */
  ownPage?: boolean;
}
export interface SectionDef { id: SectionId; labelKey: ParseKeys<'shell'>; shortKey: ParseKeys<'shell'>; Icon: LucideIcon; tabs: TabDef[] }

/**
 * Navigatsiya registri — bo'limlar va tablar bitta joyda; keyingi bosqichlar shu yerga tab
 * qo'shadi (Sozlamalar → Aloqa/SEO). `segment: ''` — bo'limning
 * asosiy tabi (URL'da segment yo'q: `/admin/products`). `shortKey` — mobil tab bar yozuvi (5 ta
 * 375px'ga sig'ishi uchun qisqa).
 */
export const SECTIONS: SectionDef[] = [
  { id: 'home', labelKey: 'nav.home.label', shortKey: 'nav.home.short', Icon: LayoutDashboard, tabs: [] },
  {
    id: 'products', labelKey: 'nav.products.label', shortKey: 'nav.products.short', Icon: Package,
    tabs: [
      { id: 'list', segment: '', labelKey: 'nav.products.list', Icon: Boxes, detail: true },
      { id: 'types', segment: 'types', labelKey: 'nav.products.types', Icon: Shapes, detail: true },
      { id: 'categories', segment: 'categories', labelKey: 'nav.products.categories', Icon: LayoutGrid, detail: true },
      { id: 'brands', segment: 'brands', labelKey: 'nav.products.brands', Icon: Tag, detail: true },
      { id: 'models', segment: 'models', labelKey: 'nav.products.models', Icon: Smartphone, detail: true },
    ],
  },
  {
    id: 'orders', labelKey: 'nav.orders.label', shortKey: 'nav.orders.short', Icon: Receipt,
    tabs: [
      { id: 'list', segment: '', labelKey: 'nav.orders.list', Icon: Inbox, detail: true },
      { id: 'customers', segment: 'customers', labelKey: 'nav.orders.customers', Icon: UsersRound, detail: true },
      { id: 'applications', segment: 'applications', labelKey: 'nav.orders.applications', Icon: Users, detail: true },
      { id: 'announcements', segment: 'announcements', labelKey: 'nav.orders.announcements', Icon: Megaphone, ownPage: true },
    ],
  },
  {
    id: 'content', labelKey: 'nav.content.label', shortKey: 'nav.content.short', Icon: FileText,
    tabs: [
      { id: 'home', segment: 'home', labelKey: 'nav.content.home', Icon: House, ownPage: true },
      { id: 'banners', segment: 'banners', labelKey: 'nav.content.banners', Icon: Image, detail: true },
      { id: 'news', segment: 'news', labelKey: 'nav.content.news', Icon: Megaphone, detail: true },
      { id: 'posts', segment: 'posts', labelKey: 'nav.content.posts', Icon: Newspaper, detail: true },
      { id: 'pages', segment: 'pages', labelKey: 'nav.content.pages', Icon: BookOpen, detail: true },
      { id: 'vacancies', segment: 'vacancies', labelKey: 'nav.content.vacancies', Icon: Briefcase, detail: true },
    ],
  },
  {
    id: 'settings', labelKey: 'nav.settings.label', shortKey: 'nav.settings.short', Icon: Settings,
    tabs: [
      { id: 'store', segment: 'store', labelKey: 'nav.settings.store', Icon: Store, ownPage: true },
      { id: 'contact', segment: 'contact', labelKey: 'nav.settings.contact', Icon: Phone, ownPage: true },
      { id: 'payment', segment: 'payment', labelKey: 'nav.settings.payment', Icon: Wallet, ownPage: true },
      { id: 'integrations', segment: 'integrations', labelKey: 'nav.settings.integrations', Icon: Plug, ownPage: true },
      { id: 'seo', segment: 'seo', labelKey: 'nav.settings.seo', Icon: Search, ownPage: true },
      { id: 'account', segment: 'account', labelKey: 'nav.settings.account', Icon: UserRound, ownPage: true },
    ],
  },
];

/** `parseAdminPath` uchun: har bo'limning URL segmentlari (bo'sh segment — asosiy tab — kirmaydi). */
export const SEGMENTS = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.tabs.map((t) => t.segment).filter(Boolean)]),
) as Record<SectionId, string[]>;

/** Joriy tab: URL segmenti mos kelgani, bo'lmasa birinchisi. Tabsiz bo'lim (bosh sahifa) → null. */
export function activeTab(section: SectionDef, route: AdminRoute): TabDef | null {
  if (section.tabs.length === 0) return null;
  return section.tabs.find((t) => t.segment === (route.tab ?? '')) ?? section.tabs[0];
}
