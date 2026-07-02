import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductGrid from './ProductGrid';

export default function CategoryPage({
  t, title, products, config,
}: { t: Translation; title: string; products: Product[]; config: InstallmentConfig }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{title}</h1>
        <span className="text-[14px] text-[#86868B]">{products.length}</span>
      </div>
      <ProductGrid t={t} items={products} config={config} />
    </div>
  );
}
