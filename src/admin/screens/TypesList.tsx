import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { Desktop, Headphones, ImageBroken, Package, Plus, Shapes, VideoCamera, WarningCircle } from '@phosphor-icons/react';
import { AppleLogo } from '../brand-logos';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Badge, Button, EmptyState, IconTile, type Hue } from '../ui';

const LIST = '/admin/products/types';
/** Yo'nalish ikonkasi (4 yo'nalish id'lari); boshqasi — umumiy shakl. */
const CAT_ICON: Record<string, PhIcon> = { apple: AppleLogo, pc: Desktop, audio: Headphones, video: VideoCamera };
const CAT_HUES: Hue[] = ['violet', 'orange', 'blue', 'green', 'pink', 'teal'];

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/**
 * Tur kartochkasi — kulrang yuza (hoshiya va soyasiz): ikonka oq orolchada (saytdagi 220×136 nisbatda), nom uz/ru,
 * mahsulot soni, tartib, Billz aliaslari.
 */
const TypeCard: FC<{ row: ApiProductType }> = ({ row }) => {
  const { t } = useTranslation('products');
  return (
    <Link
      to={`${LIST}/${row.categoryId}/${row.id}`}
      className="group flex min-w-0 flex-col gap-3 rounded-surface border border-border bg-surface p-3 transition-colors duration-200 hover:bg-ghost-hover"
    >
      <span className="grid aspect-[220/136] place-items-center overflow-hidden rounded-control-lg bg-surface-sunken">
        {row.iconUrl ? (
          <img src={row.iconUrl} alt="" loading="lazy" className="max-h-[72%] max-w-[78%] object-contain transition-transform duration-300 ease-standard group-hover:scale-105" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-text-faint">
            <ImageBroken className="size-6" />
            <span className="text-xs">{t('typesList.noIcon')}</span>
          </span>
        )}
      </span>
      <span className="min-w-0 px-0.5">
        <span className="block truncate text-base font-semibold text-text">{row.label}</span>
        <span className="block truncate text-sm text-text-muted">{row.labelRu && row.labelRu !== row.label ? row.labelRu : ' '}</span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 px-0.5">
        <Badge tone={row.productCount > 0 ? 'info' : 'neutral'} className="h-5 gap-1 px-2 tabular-nums">
          <Package weight="fill" className="size-3" />
          {t('typesList.products', { n: row.productCount })}
        </Badge>
        <span className="shrink-0 text-xs tabular-nums text-text-faint">#{row.sortOrder}</span>
      </span>
      <span className="truncate px-0.5 text-xs text-text-muted" title={row.billzAliases.join(', ')}>
        <span className="text-text-faint">{t('productEdit.source.billz')}: </span>
        {row.billzAliases.length ? row.billzAliases.join(', ') : t('typesList.aliasesNone')}
      </span>
    </Link>
  );
};

/**
 * Turlar — yo'nalishlar bo'yicha guruhlangan ikonkali kartochkalar to'ri; kartochka bosilsa tahrir.
 * Tartib = saytdagi tur qatori tartibi (`sortOrder`).
 */
const TypesList: FC = () => {
  const { t } = useTranslation(['products', 'common']);
  const [rawTypes, setTypes] = useState(null as ApiProductType[] | null);
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const types = rawTypes as ApiProductType[] | null;
  const cats = rawCats as ApiCategory[];

  useEffect(() => {
    setError('');
    Promise.all([listTypes(), listCategories()])
      .then(([ts, c]) => { setTypes(ts); setCats(c); })
      .catch(() => setError(t('shared.loadError')));
  }, [retry]);

  if (error) {
    return (
      <EmptyState
        icon={<WarningCircle />}
        title={t('shared.loadErrorTitle')}
        text={error}
        action={<Button variant="secondary" onClick={() => setRetry((r: number) => r + 1)}>{t('common:retry')}</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-base text-text-muted">{t('typesList.intro')}</p>
        <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{t('typesList.addButton')}</Button>
      </div>

      {!types ? (
        <div aria-busy="true" aria-label={t('common:loading')} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, i) => <div key={i} className="skeleton h-[232px] rounded-surface" />)}
        </div>
      ) : (
        cats.map((c, ci) => {
          const rows = types.filter((row) => row.categoryId === c.id);
          return (
            <section key={c.id} className="stagger flex flex-col gap-4" style={stagger(ci)}>
              <div className="flex items-center gap-3">
                <IconTile icon={CAT_ICON[c.id] ?? Shapes} hue={CAT_HUES[ci % CAT_HUES.length]} soft />
                <h2 className="text-lg font-bold text-text">{c.name}</h2>
                <Badge className="h-5 px-2 tabular-nums">{t('typesList.count', { count: rows.length })}</Badge>
              </div>
              {rows.length === 0 ? (
                <p className="rounded-surface bg-surface-sunken px-4 py-6 text-center text-base text-text-muted">{t('typesList.emptyInCategory')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                  {rows.map((row) => <TypeCard key={`${row.categoryId}/${row.id}`} row={row} />)}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
};

export default TypesList;
