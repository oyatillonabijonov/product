import type { ReactNode } from 'react';
import { Sparkles, Phone } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import type { ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import Header from './Header';
import Footer from './Footer';
import CookieBanner from './CookieBanner';
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
        <div className="bg-bg border-b border-line/60 text-[12.5px]">
          <div className="max-w-[1200px] mx-auto px-4 h-10 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-body min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="truncate">{t.utilInstallment}</span>
            </span>
            <a
              href={`tel:${config.phone}`}
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-accent transition-colors shrink-0"
            >
              <Phone className="w-3.5 h-3.5" />
              {config.phoneDisplay}
            </a>
          </div>
        </div>
        <Header t={t} lang={lang} locale={locale} pageLinks={pageLinks} />
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
        <CookieBanner t={t} />
      </div>
    </CartProvider>
  );
}
