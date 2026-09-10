import type { FC } from 'react';
import { X, Heart } from 'lucide-react';
import type { Translation } from '../../locales';
import { formatUzs } from '../../lib/installment';
import { useFavorites } from '../FavoritesContext';
import LocaleLink from '../LocaleLink';

const FavoritesList: FC<{ t: Translation }> = ({ t }) => {
  const { items, remove } = useFavorites();
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
        <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center">
          <Heart className="w-7 h-7 text-muted-2" />
        </div>
        <p className="text-muted text-label">{t.favEmpty}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((f) => (
        <div key={f.productId} className=" rounded-lg group relative bg-surface border border-line-2 p-3 flex flex-col hover:border-line transition-all duration-300">
          <button
            type="button"
            onClick={() => remove(f.productId)}
            aria-label={t.favRemove}
            className=" press absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 border border-line flex items-center justify-center text-muted-2 hover:text-sale z-10"
          >
            <X className="w-4 h-4" />
          </button>
          <LocaleLink to={`/product/${f.productId}`} className="rounded-sm aspect-square bg-white flex items-center justify-center overflow-hidden">
            {f.image ? <img src={f.image} alt={f.name} className="w-full h-full object-contain" /> : <span className="text-muted-2 text-label">{f.name}</span>}
          </LocaleLink>
          <LocaleLink to={`/product/${f.productId}`} className="text-label font-medium mt-2.5 line-clamp-2 hover:text-accent transition-colors">
            {f.name}
          </LocaleLink>
          <div className="text-para font-semibold text-primary mt-1 tabular-nums">{formatUzs(f.priceUzs, t.sum)}</div>
        </div>
      ))}
    </div>
  );
};

export default FavoritesList;
