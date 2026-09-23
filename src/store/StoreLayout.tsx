import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { SPRING_UI } from '../lib/motion';
import { useLocation, useNavigation } from 'react-router';
import { stripLocale } from '../../app/lib/i18n';
import { ymHit } from '../lib/metrica';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiCategory, ApiCustomer, ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import type { SiteAssets } from '../lib/site-content';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import { parseAvatar } from '../../shared/avatar';
import Footer from './Footer';
import ContactFab from './ContactFab';
import CookieBanner from './CookieBanner';
import { CartProvider } from './CartContext';
import { FavoritesProvider } from './FavoritesContext';
import { CurrencyProvider } from './CurrencyContext';
import { SiteAssetsProvider } from './SiteAssets';
import type { Currency } from '../lib/currency';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
  locale: Locale;
  /** D1 site_config — kontaktlar (tel/TG/WA) va brend nomi shu yerdan, kodga qotirilmaydi. Sirlarsiz (publicSiteConfig). */
  config: ApiSiteConfig;
  /** Kirgan mijoz (yoki null) — forma avto-to'ldirish + header holati uchun. */
  customer: ApiCustomer | null;
  /** Aktiv kontent sahifalar (nav/footer/hero linklari) — layout loader'idan. */
  pageLinks: PageLink[];
}

export default function StoreLayout({
  locale, lang, t, config, customer, pageLinks, categories, hasDeals, currency, usdRate, assets, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; customer: ApiCustomer | null; pageLinks: PageLink[]; categories: ApiCategory[]; hasDeals: boolean; currency: Currency; usdRate: number; assets: SiteAssets; children: ReactNode }) {
  // SSR navigatsiyasi (filtr/sort/sahifa) sekin tarmoqda feedback'siz edi — indeterminate progress-bar.
  const navigation = useNavigation();
  const pending = navigation.state !== 'idle';
  // Metrica SPA hit — birinchi renderni tashlab (uni 'init' o'zi qayd etadi), keyingi navigatsiyalarni yuboramiz.
  const location = useLocation();
  const isHome = stripLocale(location.pathname) === '/';
  // Profil tugmasi — kirgan mijozda ikonka o'rniga o'z avatari (header va mobil panel).
  const customerAvatar = customer ? parseAvatar(customer.avatar, customer.id) : null;
  const header = (
    <Header t={t} lang={lang} locale={locale} categories={categories} brandName={config.name} customerName={customer ? customer.name : null} avatar={customerAvatar} hasDeals={hasDeals} />
  );
  // Bosh sahifada (mobil) hero to'liq ekran: header, pastki panel va aloqa tugmasi yashirin,
  // foydalanuvchi pastga aylantirgach chiqadi. Boshqa sahifalarda doim ko'rinadi. SSR'da yashirin.
  const [scrolledRaw, setScrolled] = useState(false);
  const scrolled = scrolledRaw as boolean;
  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.25);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);
  const chromeHidden = isHome && !scrolled;
  const firstHit = useRef(true);
  useEffect(() => {
    if (firstHit.current) { firstHit.current = false; return; }
    ymHit(config.yandexMetricaId, location.pathname + location.search);
  }, [location.pathname, location.search, config.yandexMetricaId]);
  return (
    <SiteAssetsProvider assets={assets}>
    <CartProvider>
     <FavoritesProvider>
     <CurrencyProvider initial={currency} rate={usdRate} sum={t.sum}>
      {/* Sayt sukut bo'yicha **yorug'** (2026-09-18, egasining qarori — ilgari qorong'i edi).
          Qorong'i — foydalanuvchining aniq tanlovi: `<html data-theme="dark">`, tokenlar
          o'sha selektor ostida qayta e'lon qilinadi (app/styles.css). Landing hero'si
          ikkala rejimda ham qora — u mavzu emas, rasm. */}
      <div className="min-h-screen flex flex-col bg-bg">
        {pending && (
          <div aria-hidden className="fixed top-0 inset-x-0 z-50 h-[3px] overflow-hidden bg-accent-soft">
            <div className="nav-progress h-full w-1/3 bg-accent rounded-full" />
          </div>
        )}
        {/* Bosh sahifada hero to'liq ekranni egallaydi va desktopda o'z "notch"
            navigatsiyasini olib yuradi. Notch hover bilan ochilgani uchun mobilda
            ishlamaydi — u yerda odatdagi header qoladi. */}
        {isHome ? (
          // Hero ustida suzadi (fixed) — chiqqanda kontentni surmaydi; yuqoridan tushib keladi.
          <motion.div
            className="fixed inset-x-0 top-0 z-40 md:hidden"
            initial={false}
            animate={{ y: chromeHidden ? '-100%' : '0%' }}
            transition={SPRING_UI}
            aria-hidden={chromeHidden}
            inert={chromeHidden}
          >
            {header}
          </motion.div>
        ) : header}
        {/* `lg`gacha pastki panel (MobileTabBar) kontentni yopmasin — footer ostida uning balandligicha joy. */}
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} categories={categories} hasDeals={hasDeals} />
        <div aria-hidden className="h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden" />
        <MobileTabBar t={t} locale={locale} signedIn={customer !== null} avatar={customerAvatar} hidden={chromeHidden} />
        {!chromeHidden && <ContactFab t={t} config={config} />}
        <CookieBanner t={t} />
      </div>
     </CurrencyProvider>
     </FavoritesProvider>
    </CartProvider>
    </SiteAssetsProvider>
  );
}
