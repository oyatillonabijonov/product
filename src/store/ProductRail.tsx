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
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] md:text-[28px] font-semibold tracking-[-0.02em] min-w-0">{title}</h2>
        <LocaleLink to={moreTo} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-segment px-3.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-accent-soft-2 transition-colors">
          {t.railAll} <ChevronRight className="w-3.5 h-3.5" />
        </LocaleLink>
      </div>
      {/* ponytail: py-3 beradi -6px hover ko'tarilishi + soyaga joy — overflow-x-auto vertikalни ham clip qiladi.
          scroll-pl-4 — snap kartani ekran chetiga yopishtirmasin (px-4 scroll-padding'ga kirmaydi). */}
      <div className="flex overflow-x-auto snap-x gap-4 no-scrollbar py-3 -my-3 -mx-4 px-4 scroll-pl-4">
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
