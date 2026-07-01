import { Link } from 'react-router-dom';
import type { ApiCategory } from '../../shared/types';

export default function CategoryCircles({ categories }: { categories: ApiCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="flex gap-5 md:gap-8 overflow-x-auto pb-2 no-scrollbar">
      {categories.map((c) => (
        <Link key={c.id} to={`/category/${c.id}`} className="shrink-0 flex flex-col items-center gap-2 w-[92px] group">
          <div className="w-[72px] h-[72px] rounded-full bg-[#F5F5F7] border border-[#E8E8ED] flex items-center justify-center overflow-hidden group-hover:border-[#0071E3] transition-colors">
            {c.iconUrl ? <img src={c.iconUrl} alt={c.name} className="w-full h-full object-cover" /> : <span className="text-[11px] text-[#C7C7CC] px-1 text-center">{c.name}</span>}
          </div>
          <span className="text-[12px] text-center text-[#1D1D1F] leading-tight">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
