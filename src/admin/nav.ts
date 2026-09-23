import type { LucideIcon } from 'lucide-react';
import {
  BookOpen, Boxes, Briefcase, FileText, House, Image, Inbox, LayoutDashboard, LayoutGrid, Megaphone, Newspaper, Package, Phone, Plug,
  Receipt, Search, Settings, Shapes, Smartphone, Store, Tag, UserRound, Users, Wallet,
} from 'lucide-react';
import type { AdminRoute, SectionId } from './lib/admin-path';

/** Tab — sidebar sub-bandi; `Icon` sub-bandda ham chiziladi (egasining talabi, 2026-09-16). */
export interface TabDef {
  id: string; segment: string; label: string; Icon: LucideIcon;
  /** Tab'ning id-ekrani (masalan TypeEdit) o'z `Page`ini chizadi — qobiq tashqi sarlavha va tablarni chizmaydi. */
  detail?: boolean;
  /** Tab'ning asosiy ekrani forma (landing muharriri) — o'z `Page`ini (Saqlash bilan) va mobil tablarni (`SectionTabs`) chizadi. */
  ownPage?: boolean;
}
export interface SectionDef { id: SectionId; label: string; short: string; Icon: LucideIcon; tabs: TabDef[] }

/**
 * Navigatsiya registri — bo'limlar va tablar bitta joyda; keyingi bosqichlar shu yerga tab
 * qo'shadi (Sozlamalar → Aloqa/SEO). `segment: ''` — bo'limning
 * asosiy tabi (URL'da segment yo'q: `/admin/products`). `short` — mobil tab bar yozuvi (5 ta
 * 375px'ga sig'ishi uchun qisqa).
 */
export const SECTIONS: SectionDef[] = [
  { id: 'home', label: 'Bosh sahifa', short: 'Asosiy', Icon: LayoutDashboard, tabs: [] },
  {
    id: 'products', label: 'Mahsulotlar', short: 'Tovarlar', Icon: Package,
    tabs: [
      { id: 'list', segment: '', label: 'Mahsulotlar', Icon: Boxes, detail: true },
      { id: 'types', segment: 'types', label: 'Turlar', Icon: Shapes, detail: true },
      { id: 'categories', segment: 'categories', label: 'Kategoriyalar', Icon: LayoutGrid, detail: true },
      { id: 'brands', segment: 'brands', label: 'Brendlar', Icon: Tag, detail: true },
      { id: 'models', segment: 'models', label: 'Modellar', Icon: Smartphone, detail: true },
    ],
  },
  {
    id: 'orders', label: 'Buyurtmalar', short: 'Buyurtma', Icon: Receipt,
    tabs: [
      { id: 'list', segment: '', label: 'Buyurtmalar', Icon: Inbox, detail: true },
      { id: 'applications', segment: 'applications', label: 'Ish arizalari', Icon: Users, detail: true },
      { id: 'announcements', segment: 'announcements', label: "E'lonlar", Icon: Megaphone, ownPage: true },
    ],
  },
  {
    id: 'content', label: 'Kontent', short: 'Kontent', Icon: FileText,
    tabs: [
      { id: 'home', segment: 'home', label: 'Bosh sahifa', Icon: House, ownPage: true },
      { id: 'banners', segment: 'banners', label: 'Bannerlar', Icon: Image, detail: true },
      { id: 'news', segment: 'news', label: 'Yangiliklar', Icon: Megaphone, detail: true },
      { id: 'posts', segment: 'posts', label: 'Blog', Icon: Newspaper, detail: true },
      { id: 'pages', segment: 'pages', label: 'Sahifalar', Icon: BookOpen, detail: true },
      { id: 'vacancies', segment: 'vacancies', label: 'Vakansiyalar', Icon: Briefcase, detail: true },
    ],
  },
  {
    id: 'settings', label: 'Sozlamalar', short: 'Sozlash', Icon: Settings,
    tabs: [
      { id: 'store', segment: 'store', label: "Do'kon", Icon: Store, ownPage: true },
      { id: 'contact', segment: 'contact', label: 'Aloqa', Icon: Phone, ownPage: true },
      { id: 'payment', segment: 'payment', label: "To'lov va kurs", Icon: Wallet, ownPage: true },
      { id: 'integrations', segment: 'integrations', label: 'Integratsiyalar', Icon: Plug, ownPage: true },
      { id: 'seo', segment: 'seo', label: 'SEO', Icon: Search, ownPage: true },
      { id: 'account', segment: 'account', label: 'Akkaunt', Icon: UserRound, ownPage: true },
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
