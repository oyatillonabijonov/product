import type { ReactNode } from 'react';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import Header from './Header';
import Footer from './Footer';
import { CartProvider } from './CartContext';

export interface StoreContext {
  t: Translation;
  lang: LangKey;
  locale: Locale;
}

export default function StoreLayout({
  locale, lang, t, config, pageLinks, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; pageLinks: PageLink[]; children: ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <div className="bg-[#F5F5F7] text-[#6E6E73] text-[12px]">
          <div className="max-w-[1200px] mx-auto px-4 h-9 flex items-center gap-4">
            <span className="font-semibold text-[#1B7A34]">{t.utilInstallment}</span>
            <span className="hidden sm:inline">{t.utilDiscounts}</span>
            <a href={`tel:${config.phone}`} className="ml-auto font-medium text-[#1D1D1F]">{config.phoneDisplay}</a>
          </div>
        </div>
        <Header t={t} lang={lang} locale={locale} />
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
      </div>
    </CartProvider>
  );
}
