import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import ProductGrid from './ProductGrid';
import { ProductGridSkeleton } from './Skeleton';

export default function SearchPage() {
  const { t } = useOutletContext<StoreContext>();
  const [sp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const [products, setProducts] = useState<Product[] | null>(null);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    setProducts(null);
    fetchProductsBy({ q }).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
  }, [q]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[20px] md:text-[26px] font-semibold">
          {t.searchResults}: <span className="text-[#6E6E73]">"{q}"</span>
        </h1>
        {products && <span className="text-[14px] text-[#86868B]">{products.length}</span>}
      </div>
      {products && config ? <ProductGrid t={t} items={products} config={config} /> : <ProductGridSkeleton />}
    </div>
  );
}
