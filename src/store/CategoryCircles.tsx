import { Smartphone, Laptop, Tablet, Monitor, Headphones, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ApiCategory } from '../../shared/types';
import LocaleLink from './LocaleLink';

const ICONS: Record<string, LucideIcon> = {
  telefonlar: Smartphone,
  noutbuklar: Laptop,
  planshetlar: Tablet,
  kompyuterlar: Monitor,
  aksessuarlar: Headphones,
};

export default function CategoryCircles({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-4 md:gap-7 overflow-x-auto pb-1 no-scrollbar">
      {categories.map((c) => {
        const Icon = ICONS[c.id] ?? Package;
        return (
          <LocaleLink
            key={c.id}
            to={`/category/${c.id}`}
            className="shrink-0 flex flex-col items-center gap-2.5 w-[88px] group"
          >
            <div className="w-[76px] h-[76px] rounded-full p-[2px] bg-gradient-to-br from-[#E8E8ED] to-[#F5F5F7] group-hover:from-[#0071E3] group-hover:to-[#00A2FF] transition-all duration-300">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-[--shadow-apple] group-hover:-translate-y-0.5 transition-transform">
                {c.iconUrl ? (
                  <img src={c.iconUrl} alt={c.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Icon className="w-7 h-7 text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors" strokeWidth={1.6} />
                )}
              </div>
            </div>
            <span className="text-[12.5px] text-center text-[#1D1D1F] leading-tight group-hover:text-[#0071E3] transition-colors">
              {c.name}
            </span>
          </LocaleLink>
        );
      })}
    </div>
  );
}
