import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductGrid from './ProductGrid';

export default function SearchPage({
  t, q, products, config,
}: { t: Translation; q: string; products: Product[]; config: InstallmentConfig }) {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[20px] md:text-[26px] font-semibold">
          {t.searchResults}: <span className="text-[#6E6E73]">"{q}"</span>
        </h1>
        <span className="text-[14px] text-[#86868B]">{products.length}</span>
      </div>
      <ProductGrid t={t} items={products} config={config} />
    </div>
  );
}
