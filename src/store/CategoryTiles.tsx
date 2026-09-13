import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { CategoryTile } from '../../app/lib/tiles';

/**
 * Yo'nalish sahifasidagi rasmli bo'lim qatori — sarlavha ostida, katalogdan
 * yuqorida. Har bir tile katalogning o'z filtriga tushadi (brend yoki qidiruv),
 * faolini qayta bosish filtrni tozalaydi.
 *
 * Havola faqat `search`dan iborat — yo'l (locale prefiksi bilan birga) o'zgarmaydi,
 * shuning uchun bu yerda `LocaleLink` kerak emas.
 */
const CategoryTiles: FC<{ tiles: CategoryTile[]; label: string }> = ({ tiles, label }) => {
  const [sp] = useSearchParams();
  if (tiles.length === 0) return null;
  return (
    <nav aria-label={label} className="-mx-4 mb-8 overflow-x-auto no-scrollbar px-4 md:mx-0 md:mb-10 md:px-0">
      <ul className="flex gap-3 md:gap-4">
        {tiles.map((tile) => {
          const active = sp.get('tur') === tile.id;
          return (
            <li key={tile.id} className="shrink-0">
              <Link
                to={{ search: active ? '' : `?tur=${encodeURIComponent(tile.id)}` }}
                preventScrollReset
                aria-current={active ? 'true' : undefined}
                className={`press flex w-[120px] flex-col items-center gap-2 rounded-lg p-2 md:w-[136px] ${active ? 'bg-segment' : ''}`}
              >
                {/* Mahsulot rasmi — do'kon qoidasi bo'yicha oq fonda, kesilmasdan.
                    Tanlangani chegara bilan emas, to'ldirma bilan belgilanadi: qorong'i
                    temada `accent` deyarli oq, oq ramka ustida u ko'rinmasdi. */}
                <span className="aspect-square w-full overflow-hidden rounded-md border border-line bg-white">
                  <img src={tile.img} alt="" aria-hidden loading="lazy" className="h-full w-full object-contain p-2" />
                </span>
                <span className={`text-label text-center ${active ? 'font-semibold text-accent' : 'text-primary'}`}>{tile.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default CategoryTiles;
