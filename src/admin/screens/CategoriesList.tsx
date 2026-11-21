import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { CaretRight, DesktopTower, Headphones, Plus, SquaresFour, VideoCamera, WarningCircle } from '../icons';
import { AppleLogo } from '../brand-logos';
import type { Icon as PhIcon } from '../icons';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { formatThousands } from '../lib/format';
import { Button, EmptyState, IconTile, type Hue } from '../ui';

const LIST = '/admin/products/categories';
/** Yo'nalish ikonkasi id bo'yicha; rang tartib bo'yicha — Bosh sahifadagi «Yo'nalishlar» grafigi bilan bir xil. */
const ICON: Record<string, PhIcon> = { apple: AppleLogo, pc: DesktopTower, audio: Headphones, video: VideoCamera };
const HUES: Hue[] = ['violet', 'orange', 'blue', 'green'];
const HUE_BG: Record<Hue, string> = {
  violet: 'bg-c-violet/10', orange: 'bg-c-orange/10', blue: 'bg-c-blue/10', green: 'bg-c-green/10',
  pink: 'bg-c-pink/10', teal: 'bg-c-teal/10', amber: 'bg-c-amber/10', slate: 'bg-c-slate/10',
};
const MAX_TYPES = 5;

/**
 * Yo'nalishlar — saytdagi 4 bo'lim (Apple · PC · Audio · Video) kartochkalar to'ri: kulrang yuza (hoshiya va soyasiz),
 * tepada cover (yo'q bo'lsa rangli ikonka), nom uz/ru, turlar soni va turlardagi tovarlar (oq plitkalar), turlar
 * chiplari. Karta bosilsa tahrir.
 */
const CategoriesList: FC = () => {
  const { t, i18n } = useTranslation('products');
  const [rawItems, setItems] = useState(null as ApiCategory[] | null);
  const items = rawItems as ApiCategory[] | null;
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listCategories(), listTypes()])
      .then(([c, ts]) => { setItems(c); setTypes(ts); })
      .catch(() => setError(t('shared.loadError')));
  }, []);

  const newButton = <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{t('shared.newCategory')}</Button>;

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-80 rounded-surface" />)}
      </div>
    );
  }

  const typeLabel = (ty: ApiProductType) => (i18n.language === 'ru' && ty.labelRu ? ty.labelRu : ty.label);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base text-text-muted">{t('categoriesList.intro')}</p>
        {newButton}
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<SquaresFour />} title={t('categoriesList.empty')} action={newButton} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((c, i) => {
            const hue = HUES[i % HUES.length];
            const icon = ICON[c.id] ?? SquaresFour;
            const own = types.filter((ty) => ty.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
            const products = own.reduce((s, ty) => s + ty.productCount, 0);
            return (
              <Link
                key={c.id}
                to={`${LIST}/${c.id}`}
                className="stagger group flex flex-col overflow-hidden rounded-surface border border-border bg-surface transition-colors duration-200 hover:bg-ghost-hover"
                style={{ ['--i' as string]: i } as Record<string, number>}
              >
                <div className={`relative aspect-[114/55] ${c.coverUrl ? 'bg-surface-sunken' : HUE_BG[hue]}`}>
                  {c.coverUrl ? (
                    <img src={c.coverUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2">
                      <IconTile icon={icon} hue={hue} size="lg" />
                      <span className="text-sm text-text-muted">{t('categoriesList.noCover')}</span>
                    </div>
                  )}
                  <span title={t('shared.sortOrder')} className="absolute left-3 top-3 rounded-full bg-surface/90 px-2 py-0.5 text-xs font-semibold tabular-nums text-text-muted backdrop-blur">
                    #{c.sortOrder}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <IconTile icon={icon} hue={hue} soft />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-md font-bold text-text">{c.name}</p>
                      <p className="truncate text-sm text-text-muted">{c.nameRu || c.name}</p>
                    </div>
                    <CaretRight aria-hidden weight="bold" className="size-3.5 shrink-0 text-text-faint transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-control bg-surface-sunken px-3 py-2.5">
                      <p className="text-lg font-bold tabular-nums text-text">{own.length}</p>
                      <p className="truncate text-sm text-text-muted">{t('categoriesList.typesColumn')}</p>
                    </div>
                    <div className="rounded-control bg-surface-sunken px-3 py-2.5">
                      <p className="text-lg font-bold tabular-nums text-text">{formatThousands(products) || '0'}</p>
                      <p className="truncate text-sm text-text-muted">{t('categoriesList.statProducts')}</p>
                    </div>
                  </div>
                  {own.length === 0 ? (
                    <p className="mt-auto text-sm text-text-faint">{t('categoriesList.noTypes')}</p>
                  ) : (
                    <ul className="mt-auto flex flex-wrap gap-1.5">
                      {own.slice(0, MAX_TYPES).map((ty) => (
                        <li key={ty.id} className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-surface-sunken pl-1.5 pr-2.5 text-sm text-text">
                          {ty.iconUrl && <img src={ty.iconUrl} alt="" className="h-4 w-6 shrink-0 object-contain" />}
                          <span className="truncate">{typeLabel(ty)}</span>
                        </li>
                      ))}
                      {own.length > MAX_TYPES && (
                        <li className="inline-flex h-7 items-center rounded-full bg-surface-sunken px-2.5 text-sm font-medium tabular-nums text-text-muted">+{own.length - MAX_TYPES}</li>
                      )}
                    </ul>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CategoriesList;
