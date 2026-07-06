import type { ReactNode } from 'react';
import { useNavigation } from 'react-router';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiCategory, ApiCustomer, ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import Header from './Header';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
import { CartProvider } from './CartContext';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
  locale: Locale;
  /** D1 site_config — kontaktlar (tel/TG/WA) va brend nomi shu yerdan, kodga qotirilmaydi. Sirlarsiz (publicSiteConfig). */
  config: ApiSiteConfig;
  /** Kirgan mijoz (yoki null) — forma avto-to'ldirish + header holati uchun. */
  customer: ApiCustomer | null;
}

export default function StoreLayout({
  locale, lang, t, config, customer, pageLinks, categories, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; customer: ApiCustomer | null; pageLinks: PageLink[]; categories: ApiCategory[]; children: ReactNode }) {
  // SSR navigatsiyasi (filtr/sort/sahifa) sekin tarmoqda feedback'siz edi — indeterminate progress-bar.
  const navigation = useNavigation();
  const pending = navigation.state !== 'idle';
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-white">
        {pending && (
          <div aria-hidden className="fixed top-0 inset-x-0 z-50 h-[3px] overflow-hidden bg-accent-soft">
            <div className="nav-progress h-full w-1/3 bg-accent rounded-full" />
          </div>
        )}
        <Header t={t} lang={lang} locale={locale} pageLinks={pageLinks} categories={categories} brandName={config.name} customerName={customer ? customer.name : null} />
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
        <CookieBanner t={t} />
      </div>
    </CartProvider>
  );
}
