import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { Hash, LinkSimple, Plus, Slideshow, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiBanner } from '../../../shared/types';
import { listBanners, updateBanner } from '../api';
import { delay } from '../ContentFields';
import { Badge, Button, Dot, EmptyState, Toggle } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/banners';

/**
 * Bannerlar — bosh sahifadagi slayder; faollari tartib bo'yicha, bittasi ham bo'lmasa slayder chiqmaydi.
 * Har banner — saytdagi nisbatda (3:1) rasmli karta; karta bosilsa tahrir, switch darhol saqlaydi.
 */
const BannersList: FC = () => {
  const { t } = useTranslation('content');
  const [rawItems, setItems] = useState(null as ApiBanner[] | null);
  const items = rawItems as ApiBanner[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (b: ApiBanner) => updateBanner(b.id, b));

  useEffect(() => {
    listBanners().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-surface" />)}
      </div>
    );
  }

  const live = items.filter((b) => b.isActive).length;
  const addButton = (label: string) => <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{label}</Button>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="max-w-2xl text-base text-text-muted">{t('bannersList.description')}</p>
          {items.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <Dot tone={live > 0 ? 'ok' : 'attention'}>{live > 0 ? t('contentHome.blocks.banners.live', { n: live }) : t('contentHome.blocks.banners.none')}</Dot>
              {items.length > live && <Dot tone="neutral">{t('shared.hiddenCount', { n: items.length - live })}</Dot>}
            </p>
          )}
        </div>
        {items.length > 0 && addButton(t('bannersList.new'))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<Slideshow />} title={t('bannersList.emptyTitle')} text={t('bannersList.emptyText')} action={addButton(t('bannersList.addFirst'))} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((b, i) => {
            const name = b.altText || t('bannersList.unnamed');
            return (
              <article
                key={b.id}
                style={delay(i)}
                className="stagger group relative flex flex-col overflow-hidden rounded-surface bg-surface-sunken transition-colors duration-200 hover:bg-surface-sunken-hover has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-accent/20"
              >
                <div className="relative aspect-[3/1] overflow-hidden bg-surface-sunken">
                  <img src={b.imageUrl} alt="" className={`size-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.02] ${b.isActive ? '' : 'opacity-50 grayscale'}`} />
                  <span className="absolute left-3 top-3 inline-flex h-6 items-center gap-1 rounded-full bg-surface/90 px-2 text-sm font-medium tabular-nums text-text" title={t('shared.sortOrder')}>
                    <Hash weight="bold" className="size-3 text-text-faint" />{b.sortOrder}
                  </span>
                  <Badge tone={b.isActive ? 'ok' : 'neutral'} dot className="absolute right-3 top-3">
                    {b.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <Link to={`${LIST}/${b.id}`} className="block truncate text-md font-bold text-text outline-none after:absolute after:inset-0">{name}</Link>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-text-muted">
                      <LinkSimple className="size-3.5 shrink-0 text-text-faint" />
                      <span className="truncate">{b.linkUrl || t('bannersList.noLink')}</span>
                    </p>
                  </div>
                  <span className="relative z-10">
                    <Toggle on={b.isActive} onChange={(v) => toggle(b, v)} label={t('shared.toggleAria', { name })} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BannersList;
