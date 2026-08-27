import type { FC } from 'react';
import { Heart } from 'lucide-react';
import type { FavoriteItem } from '../lib/favorites';
import { useFavorites } from './FavoritesContext';

// Yurak tugmasi — ProductCard (link ichida) va ProductPage'da. Link ichida bo'lgani uchun
// bosilganda navigatsiyani to'xtatadi (preventDefault + stopPropagation).
const FavoriteButton: FC<{ item: FavoriteItem; className?: string; addLabel: string; removeLabel: string }> = ({
  item, className = '', addLabel, removeLabel,
}) => {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(item.productId);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(item); }}
      aria-label={active ? removeLabel : addLabel}
      aria-pressed={active}
      title={active ? removeLabel : addLabel}
      className={`inline-flex items-center justify-center rounded-full bg-surface/90 border border-line-2 backdrop-blur-sm shadow-apple transition-colors hover:bg-surface before:absolute before:-inset-1 before:content-[''] ${className}`}
    >
      <Heart className={`w-[18px] h-[18px] transition-colors ${active ? 'fill-sale text-sale' : 'text-muted'}`} />
    </button>
  );
};

export default FavoriteButton;
