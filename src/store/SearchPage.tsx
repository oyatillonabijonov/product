import { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import ProductGrid from './ProductGrid';

export default function SearchPage() {
  const { t } = useOutletContext<StoreContext>();
  const [sp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);

  useEffect(() => {
    fetchProductsBy({ q }).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
  }, [q]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <h1 className="text-[20px] md:text-[26px] font-semibold mb-6">
        {t.searchResults}: <span className="text-[#6E6E73]">"{q}"</span>
      </h1>
      {config && <ProductGrid t={t} items={products} config={config} />}
    </div>
  );
}
