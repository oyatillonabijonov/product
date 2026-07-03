import type { ApiBanner, ApiBrand, ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import HeroBanner from './HeroBanner';
import BannerSlider from './BannerSlider';
import TrustBar from './TrustBar';
import CategoryCircles from './CategoryCircles';
import ProductRail from './ProductRail';
import BrandStrip from './BrandStrip';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';

export default function HomePage({
  t, products, config, categories, banners, deals, latest, brands, locale,
}: {
  t: Translation; products: Product[]; config: InstallmentConfig; categories: ApiCategory[];
  banners: ApiBanner[]; deals: Product[]; latest: Product[]; brands: ApiBrand[]; locale: Locale;
}) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-10 md:gap-14">
      {banners.length > 0 ? <BannerSlider banners={banners} locale={locale} /> : <HeroBanner t={t} />}
      <TrustBar t={t} />
      <section className="flex flex-col gap-6">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{t.homeCategories}</h2>
        <CategoryCircles categories={categories} />
      </section>
      <ProductRail t={t} title={t.railDeals} items={deals} config={config} moreTo="/chegirmalar" />
      <ProductRail t={t} title={t.railNew} items={latest} config={config} moreTo="/katalog?sort=yangi" />
      <BrandStrip title={t.homeBrands} brands={brands} />
      <section id="featured" className="scroll-mt-24">
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] mb-6">{t.homeFeatured}</h2>
        <ProductGrid t={t} items={products} config={config} />
      </section>
      <HowItWorks t={t} />
    </div>
  );
}
