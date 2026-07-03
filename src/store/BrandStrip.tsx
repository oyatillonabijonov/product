import type { FC } from 'react';
import type { ApiBrand } from '../../shared/types';
import LocaleLink from './LocaleLink';

const BrandStrip: FC<{ title: string; brands: ApiBrand[] }> = ({ title, brands }) => {
  if (brands.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
        {brands.map((b) => (
          <LocaleLink
            key={b.id}
            to={`/brand/${b.slug}`}
            className="shrink-0 h-16 min-w-[120px] px-6 bg-white border border-[#ECECEF] rounded-2xl flex items-center justify-center shadow-[--shadow-apple] hover:border-[#0071E3] transition-colors"
          >
            {b.logoUrl
              ? <img src={b.logoUrl} alt={b.name} loading="lazy" className="max-h-8 max-w-[96px] object-contain" />
              : <span className="text-[15px] font-semibold text-[#1D1D1F]">{b.name}</span>}
          </LocaleLink>
        ))}
      </div>
    </section>
  );
};

export default BrandStrip;
