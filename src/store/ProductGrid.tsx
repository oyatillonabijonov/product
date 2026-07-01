import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import ProductCard from './ProductCard';

export default function ProductGrid({ t, items, config }: { t: Translation; items: Product[]; config: InstallmentConfig }) {
  if (items.length === 0) return <p className="text-[#6E6E73] py-8 text-center">{t.gridEmpty}</p>;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((p) => <ProductCard key={p.id} t={t} product={p} config={config} />)}
    </div>
  );
}
