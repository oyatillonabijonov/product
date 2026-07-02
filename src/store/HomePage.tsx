import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchCategories, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import HeroBanner from './HeroBanner';
import TrustBar from './TrustBar';
import CategoryCircles from './CategoryCircles';
import ProductGrid from './ProductGrid';
import HowItWorks from './HowItWorks';
import { ProductGridSkeleton } from './Skeleton';

export default function HomePage() {
  const { t } = useOutletContext<StoreContext>();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchStore().then((s) => {
      setProducts(s.products);
      setConfig(s.config);
    });
  }, []);

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
        {products && config ? (
          <ProductGrid t={t} items={products} config={config} />
        ) : (
          <ProductGridSkeleton />
        )}
      </section>

      <HowItWorks t={t} />
    </div>
  );
}
