import type { ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import HeroBanner from './HeroBanner';
import TrustBar from './TrustBar';
import CategoryCircles from './CategoryCircles';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';

export default function HomePage({
  t, products, config, categories,
}: { t: Translation; products: Product[]; config: InstallmentConfig; categories: ApiCategory[] }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-10 md:gap-14">
      <HeroBanner t={t} />
      <TrustBar t={t} />
      <section className="flex flex-col gap-6">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{t.homeCategories}</h2>
        <CategoryCircles categories={categories} />
      </section>
      <section id="featured" className="scroll-mt-24">
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] mb-6">{t.homeFeatured}</h2>
        <ProductGrid t={t} items={products} config={config} />
      </section>
      <HowItWorks t={t} />
    </div>
  );
}
