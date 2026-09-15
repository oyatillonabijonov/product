import type { LucideIcon } from 'lucide-react';
import { FileText, LayoutDashboard, Package, Receipt, Settings } from 'lucide-react';
import type { AdminRoute, SectionId } from './lib/admin-path';

export interface TabDef { id: string; segment: string; label: string }
export interface SectionDef { id: SectionId; label: string; short: string; Icon: LucideIcon; tabs: TabDef[] }

/**
 * Navigatsiya registri — bo'limlar va tablar bitta joyda; keyingi bosqichlar shu yerga tab
 * qo'shadi (Turlar, Kontent → Bosh sahifa, Sozlamalar → Aloqa/SEO). `segment: ''` — bo'limning
 * asosiy tabi (URL'da segment yo'q: `/admin/products`). `short` — mobil tab bar yozuvi (5 ta
 * 375px'ga sig'ishi uchun qisqa).
 */
export const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Bosh sahifa', short: 'Asosiy', Icon: LayoutDashboard, tabs: [] },
  {
    id: 'products', label: 'Mahsulotlar', short: 'Tovarlar', Icon: Package,
    tabs: [
      { id: 'list', segment: '', label: 'Mahsulotlar' },
      { id: 'categories', segment: 'categories', label: 'Kategoriyalar' },
      { id: 'brands', segment: 'brands', label: 'Brendlar' },
      { id: 'models', segment: 'models', label: 'Modellar' },
    ],
  },
  {
    id: 'orders', label: 'Buyurtmalar', short: 'Buyurtma', Icon: Receipt,
    tabs: [
      { id: 'list', segment: '', label: 'Buyurtmalar' },
      { id: 'applications', segment: 'applications', label: 'Ish arizalari' },
    ],
  },
  {
    id: 'content', label: 'Kontent', short: 'Kontent', Icon: FileText,
    tabs: [
      { id: 'banners', segment: 'banners', label: 'Bannerlar' },
      { id: 'news', segment: 'news', label: 'Yangiliklar' },
      { id: 'posts', segment: 'posts', label: 'Blog' },
      { id: 'pages', segment: 'pages', label: 'Sahifalar' },
      { id: 'vacancies', segment: 'vacancies', label: 'Vakansiyalar' },
    ],
  },
  {
    id: 'settings', label: 'Sozlamalar', short: 'Sozlash', Icon: Settings,
    tabs: [
      { id: 'store', segment: 'store', label: "Do'kon" },
      { id: 'payment', segment: 'payment', label: "To'lov va kurs" },
      { id: 'integrations', segment: 'integrations', label: 'Integratsiyalar' },
      { id: 'account', segment: 'account', label: 'Akkaunt' },
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
