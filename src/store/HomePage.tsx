import type { ApiBanner, ApiBrand, ApiCategory, ApiPage, ApiSiteConfig } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import { localeToTextKey, type Locale } from '../../app/lib/i18n';
import HeroColumns from './HeroColumns';
import HeroNotch from './HeroNotch';
import FaqSection from './FaqSection';
import BannerSlider from './BannerSlider';
import TrustBar from './TrustBar';
import ProductRail from './ProductRail';
import BrandStrip from './BrandStrip';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';
import LocaleLink from './LocaleLink';
import { ChevronRight } from 'lucide-react';

export default function HomePage({
  t, products, config, categories, banners, deals, latest, brands, locale, faqPage, site,
}: {
  t: Translation; products: Product[]; config: InstallmentConfig; categories: ApiCategory[];
  banners: ApiBanner[]; deals: Product[]; latest: Product[]; brands: ApiBrand[]; locale: Locale;
  faqPage: ApiPage | null; site: ApiSiteConfig;
}) {
  const textKey = localeToTextKey(locale);
  return (
    <>
      <HeroNotch t={t} locale={locale} categories={categories} />
      {/* Hero'da ko'rinadigan h1 yo'q (kartalar o'zi sarlavha) — ierarxiya uchun sr-only. */}
      <h1 className="sr-only">{`${site.name} — ${t.utilInstallment}`}</h1>
      <HeroColumns categories={categories} />
      <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-10 md:gap-14">
        {banners.length > 0 && <BannerSlider banners={banners} locale={locale} t={t} />}
        <TrustBar t={t} />
        <ProductRail t={t} title={t.railDeals} items={deals} config={config} moreTo="/chegirmalar" />
        <ProductRail t={t} title={t.railNew} items={latest} config={config} moreTo="/katalog?sort=yangi" />
        <BrandStrip title={t.homeBrands} brands={brands} />
        <section id="featured" className="scroll-mt-24">
          <div className="flex items-center justify-between gap-3 mb-6">
            <h2 className="text-[20px] md:text-[32px] font-semibold tracking-[-0.02em] min-w-0">{t.homeFeatured}</h2>
            <LocaleLink to="/katalog" className="shrink-0 inline-flex items-center gap-1 rounded-full bg-segment px-3.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-accent-soft-2 transition-colors">
              {t.railAll} <ChevronRight className="w-3.5 h-3.5" />
            </LocaleLink>
          </div>
          <ProductGrid t={t} items={products} config={config} />
        </section>
        <HowItWorks t={t} />
        {faqPage && <FaqSection title={faqPage.title[textKey]} content={faqPage.content[textKey]} />}
      </div>
    </>
  );
}
