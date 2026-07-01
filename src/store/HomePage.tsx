import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { ApiCategory } from '../../shared/types';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchCategories, fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import HeroBanner from './HeroBanner';
import CategoryCircles from './CategoryCircles';
import ProductGrid from './ProductGrid';

export default function HomePage() {
  const { t } = useOutletContext<StoreContext>();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories);
    fetchProductsBy({}).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10 flex flex-col gap-8 md:gap-12">
      <HeroBanner t={t} />
      <CategoryCircles categories={categories} />
      <section>
        <h2 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.015em] mb-6">{t.homeFeatured}</h2>
        {config && <ProductGrid t={t} items={products} config={config} />}
      </section>
    </div>
  );
}
