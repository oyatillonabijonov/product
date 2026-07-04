import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { Translation } from '../locales';
import ProductCard from './ProductCard';
import LocaleLink from './LocaleLink';

const ProductRail: FC<{
  t: Translation; title: string; items: Product[]; config: InstallmentConfig; moreTo: string;
}> = ({ t, title, items, config, moreTo }) => {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
        <LocaleLink to={moreTo} className="text-[14px] font-semibold text-accent hover:underline inline-flex items-center gap-0.5">
          {t.railAll} <ChevronRight className="w-4 h-4" />
        </LocaleLink>
      </div>
      <div className="flex overflow-x-auto snap-x gap-4 no-scrollbar pb-1 -mx-4 px-4">
        {items.map((p) => (
          <div key={p.id} className="w-[220px] md:w-[260px] shrink-0 snap-start flex">
            <ProductCard t={t} product={p} config={config} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ProductRail;
