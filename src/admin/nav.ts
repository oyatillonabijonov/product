import type { IconSvgElement } from '@hugeicons/react';
import {
  Briefcase01Icon, Call02Icon, CpuIcon, CubeIcon, DashboardSquare01Icon, File02Icon, Home01Icon, Image01Icon, InboxIcon,
  Megaphone01Icon, News01Icon, Note01Icon, NotificationSquareIcon, Package01Icon, PieChartIcon, PlugIcon, Search01Icon, Settings02Icon, ShapesIcon,
  SmartPhone01Icon, Store01Icon, Tag01Icon, UserCircleIcon, UserGroupIcon, UserMultiple02Icon, Wallet01Icon,
} from '@hugeicons/core-free-icons';
import type { ParseKeys } from 'i18next';
import type { AdminRoute, SectionId } from './lib/admin-path';

/** Tab — sidebar sub-bandi; `Icon` — Hugeicons (stroke rounded, `NavIcon` bilan chiziladi; egasining tanlovi, 2026-11-21). */
export interface TabDef {
  id: string; segment: string; labelKey: ParseKeys<'shell'>; Icon: IconSvgElement;
  /** Tab'ning id-ekrani (masalan TypeEdit) o'z `Page`ini chizadi — qobiq tashqi sarlavha va tablarni chizmaydi. */
  detail?: boolean;
  /** Tab'ning asosiy ekrani forma (landing muharriri) — o'z `Page`ini (Saqlash bilan) va mobil tablarni (`SectionTabs`) chizadi. */
  ownPage?: boolean;
}
export interface SectionDef { id: SectionId; labelKey: ParseKeys<'shell'>; shortKey: ParseKeys<'shell'>; Icon: IconSvgElement; tabs: TabDef[] }

/**
 * Navigatsiya registri — bo'limlar va tablar bitta joyda; keyingi bosqichlar shu yerga tab
 * qo'shadi (Sozlamalar → Aloqa/SEO). `segment: ''` — bo'limning
 * asosiy tabi (URL'da segment yo'q: `/admin/products`). `shortKey` — mobil tab bar yozuvi (5 ta
 * 375px'ga sig'ishi uchun qisqa).
 */
export const SECTIONS: SectionDef[] = [
  { id: 'home', labelKey: 'nav.home.label', shortKey: 'nav.home.short', Icon: PieChartIcon, tabs: [] },
  {
    id: 'products', labelKey: 'nav.products.label', shortKey: 'nav.products.short', Icon: Package01Icon,
    tabs: [
      { id: 'list', segment: '', labelKey: 'nav.products.list', Icon: CubeIcon, detail: true },
      { id: 'types', segment: 'types', labelKey: 'nav.products.types', Icon: ShapesIcon, detail: true },
      { id: 'categories', segment: 'categories', labelKey: 'nav.products.categories', Icon: DashboardSquare01Icon, detail: true },
      { id: 'brands', segment: 'brands', labelKey: 'nav.products.brands', Icon: Tag01Icon, detail: true },
      { id: 'models', segment: 'models', labelKey: 'nav.products.models', Icon: SmartPhone01Icon, detail: true },
      { id: 'configurator', segment: 'configurator', labelKey: 'nav.products.configurator', Icon: CpuIcon },
    ],
  },
  {
    id: 'orders', labelKey: 'nav.orders.label', shortKey: 'nav.orders.short', Icon: InboxIcon,
    tabs: [
      { id: 'list', segment: '', labelKey: 'nav.orders.list', Icon: InboxIcon, detail: true },
      { id: 'customers', segment: 'customers', labelKey: 'nav.orders.customers', Icon: UserMultiple02Icon, detail: true },
      { id: 'applications', segment: 'applications', labelKey: 'nav.orders.applications', Icon: UserGroupIcon, detail: true },
      { id: 'announcements', segment: 'announcements', labelKey: 'nav.orders.announcements', Icon: NotificationSquareIcon, ownPage: true },
    ],
  },
  {
    id: 'content', labelKey: 'nav.content.label', shortKey: 'nav.content.short', Icon: Note01Icon,
    tabs: [
      { id: 'home', segment: 'home', labelKey: 'nav.content.home', Icon: Home01Icon, ownPage: true },
      { id: 'banners', segment: 'banners', labelKey: 'nav.content.banners', Icon: Image01Icon, detail: true },
      { id: 'news', segment: 'news', labelKey: 'nav.content.news', Icon: Megaphone01Icon, detail: true },
      { id: 'posts', segment: 'posts', labelKey: 'nav.content.posts', Icon: News01Icon, detail: true },
      { id: 'pages', segment: 'pages', labelKey: 'nav.content.pages', Icon: File02Icon, detail: true },
      { id: 'vacancies', segment: 'vacancies', labelKey: 'nav.content.vacancies', Icon: Briefcase01Icon, detail: true },
    ],
  },
  {
    id: 'settings', labelKey: 'nav.settings.label', shortKey: 'nav.settings.short', Icon: Settings02Icon,
    tabs: [
      { id: 'store', segment: 'store', labelKey: 'nav.settings.store', Icon: Store01Icon, ownPage: true },
      { id: 'contact', segment: 'contact', labelKey: 'nav.settings.contact', Icon: Call02Icon, ownPage: true },
      { id: 'payment', segment: 'payment', labelKey: 'nav.settings.payment', Icon: Wallet01Icon, ownPage: true },
      { id: 'integrations', segment: 'integrations', labelKey: 'nav.settings.integrations', Icon: PlugIcon, ownPage: true },
      { id: 'seo', segment: 'seo', labelKey: 'nav.settings.seo', Icon: Search01Icon, ownPage: true },
      { id: 'account', segment: 'account', labelKey: 'nav.settings.account', Icon: UserCircleIcon, ownPage: true },
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
