import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import type { InstallmentConfig, Product } from '../data/products';
import { fetchCategories, fetchProductsBy, fetchStore } from '../api/store';
import type { StoreContext } from './StoreLayout';
import ProductGrid from './ProductGrid';

export default function CategoryPage() {
  const { t } = useOutletContext<StoreContext>();
  const { slug } = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetchProductsBy({ category: slug }).then(setProducts);
    fetchStore().then((s) => setConfig(s.config));
    fetchCategories().then((cats) => setTitle(cats.find((c) => c.id === slug)?.name ?? slug));
  }, [slug]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.015em] mb-6">{title}</h1>
      {config && <ProductGrid t={t} items={products} config={config} />}
    </div>
  );
}
