import type { FC } from 'react';
import { X, Heart } from 'lucide-react';
import type { Translation } from '../../locales';
import { useFavorites } from '../FavoritesContext';
import { useCurrency } from '../CurrencyContext';
import LocaleLink from '../LocaleLink';
import AccountEmptyState from './AccountEmptyState';

const FavoritesList: FC<{ t: Translation }> = ({ t }) => {
  const { items, remove, loaded } = useFavorites();
  const { price } = useCurrency();
  // SSR'da ro'yxat hali o'qilmagan — "bo'sh" holati chaqnab o'tmasin.
  if (!loaded) return null;
  if (items.length === 0) {
    return <AccountEmptyState icon={Heart} text={t.favEmpty} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((f) => (
        <div key={f.productId} className=" rounded-lg group relative bg-surface border border-line-2 p-3 flex flex-col hover:border-line transition-all duration-300">
          <button
            type="button"
            onClick={() => remove(f.productId)}
            aria-label={t.favRemove}
            className=" press absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-surface/90 backdrop-blur-sm border border-line flex items-center justify-center text-muted-2 hover:text-sale z-10"
          >
            <X className="w-4 h-4" />
          </button>
          <LocaleLink to={`/product/${f.productId}`} className="rounded-sm aspect-square bg-white flex items-center justify-center overflow-hidden">
            {f.image ? <img src={f.image} alt={f.name} className="w-full h-full object-contain" /> : <span className="text-muted-2 text-label">{f.name}</span>}
          </LocaleLink>
          <LocaleLink to={`/product/${f.productId}`} className="text-label font-medium mt-2.5 line-clamp-2 hover:text-accent transition-colors">
            {f.name}
          </LocaleLink>
          <div className="text-para font-semibold text-primary mt-1 tabular-nums">{price(f.priceUzs)}</div>
        </div>
      ))}
    </div>
  );
};

export default FavoritesList;
