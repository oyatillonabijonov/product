import type { ApiCategory } from '../../shared/types';
import { categoryIcon } from '../lib/category-icons';
import LocaleLink from './LocaleLink';

export default function CategoryCircles({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-4 md:gap-7 overflow-x-auto pb-1 no-scrollbar">
      {categories.map((c) => {
        const Icon = categoryIcon(c.icon);
        return (
          <LocaleLink
            key={c.id}
            to={`/category/${c.id}`}
            className="shrink-0 flex flex-col items-center gap-2.5 w-[88px] group"
          >
            <div className="w-[76px] h-[76px] rounded-full p-[2px] bg-gradient-to-br from-fill-2 to-bg group-hover:from-accent group-hover:to-accent-bright transition-all duration-300">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden shadow-apple group-hover:-translate-y-0.5 transition-transform">
                {c.iconUrl ? (
                  <img src={c.iconUrl} alt={c.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Icon className="w-7 h-7 text-primary group-hover:text-accent transition-colors" strokeWidth={1.6} />
                )}
              </div>
            </div>
            <span className="text-[12.5px] text-center text-primary leading-tight group-hover:text-accent transition-colors">
              {c.name}
            </span>
          </LocaleLink>
        );
      })}
    </div>
  );
}
