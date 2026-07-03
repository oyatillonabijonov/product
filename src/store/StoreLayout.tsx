import type { ReactNode } from 'react';
import { useNavigation } from 'react-router';
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
  /** D1 site_config — kontaktlar (tel/TG/WA) va brend nomi shu yerdan, kodga qotirilmaydi. */
  config: ApiSiteConfig;
}

export default function StoreLayout({
  locale, lang, t, config, pageLinks, children,
}: { locale: Locale; lang: LangKey; t: Translation; config: ApiSiteConfig; pageLinks: PageLink[]; children: ReactNode }) {
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
        <Header t={t} lang={lang} locale={locale} pageLinks={pageLinks} brandName={config.name} />
        <main className="flex-1">{children}</main>
        <Footer t={t} locale={locale} config={config} pageLinks={pageLinks} />
        <CookieBanner t={t} />
      </div>
    </CartProvider>
  );
}
