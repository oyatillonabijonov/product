import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigation } from 'react-router';
import { stripLocale } from '../../app/lib/i18n';
import { ymHit } from '../lib/metrica';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiCategory, ApiCustomer, ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import Header from './Header';
import Footer from './Footer';
import ContactFab from './ContactFab';
import CookieBanner from './CookieBanner';
import LoginModal from './LoginModal';
import { CartProvider } from './CartContext';
import { FavoritesProvider } from './FavoritesContext';

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
  locale, lang, t, config, customer, pageLinks, categories, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; customer: ApiCustomer | null; pageLinks: PageLink[]; categories: ApiCategory[]; children: ReactNode }) {
  // SSR navigatsiyasi (filtr/sort/sahifa) sekin tarmoqda feedback'siz edi — indeterminate progress-bar.
  const navigation = useNavigation();
  const pending = navigation.state !== 'idle';
  const [loginOpen, setLoginOpen] = useState(false);
  // Metrica SPA hit — birinchi renderni tashlab (uni 'init' o'zi qayd etadi), keyingi navigatsiyalarni yuboramiz.
  const location = useLocation();
  const isHome = stripLocale(location.pathname) === '/';
  const header = (
    <Header t={t} lang={lang} locale={locale} categories={categories} brandName={config.name} customerName={customer ? customer.name : null} onLoginClick={() => setLoginOpen(true)} />
  );
  const firstHit = useRef(true);
  useEffect(() => {
    if (firstHit.current) { firstHit.current = false; return; }
    ymHit(config.yandexMetricaId, location.pathname + location.search);
  }, [location.pathname, location.search, config.yandexMetricaId]);
  return (
    <CartProvider>
     <FavoritesProvider>
      {/* Sayt sukut bo'yicha qorong'i — tokenlar `.theme-dark` ichida qayta e'lon
          qilinadi (app/styles.css), shu sabab ichkaridagi bloklar o'zgarishsiz
          qayta ranglanadi. Yorug' rejim — foydalanuvchi tanlovi
          (`<html data-theme="light">`), u shu klassni bekor qiladi. */}
      <div className="min-h-screen flex flex-col bg-bg theme-dark">
        {pending && (
          <div aria-hidden className="fixed top-0 inset-x-0 z-50 h-[3px] overflow-hidden bg-accent-soft">
            <div className="nav-progress h-full w-1/3 bg-accent rounded-full" />
          </div>
        )}
        {/* Bosh sahifada hero to'liq ekranni egallaydi va desktopda o'z "notch"
            navigatsiyasini olib yuradi. Notch hover bilan ochilgani uchun mobilda
            ishlamaydi — u yerda odatdagi header qoladi. */}
        {isHome ? <div className="md:hidden">{header}</div> : header}
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
        <ContactFab t={t} config={config} />
        <CookieBanner t={t} />
        <LoginModal t={t} config={config} open={loginOpen} onClose={() => setLoginOpen(false)} />
      </div>
     </FavoritesProvider>
    </CartProvider>
  );
}
