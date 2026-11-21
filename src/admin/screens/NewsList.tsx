import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { CursorClick, Hash, House, Image as ImageIcon, Megaphone, Plus, WarningCircle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiNews } from '../../../shared/types';
import { newsProductId } from '../../../shared/news-price';
import { listNews, updateNews } from '../api';
import { delay } from '../ContentFields';
import { Badge, Button, Dot, EmptyState, IconTile, Toggle } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/news';

/** Bosh sahifadagi joylashuv sxemasi (saytdagi `newsLayout` bilan bir xil): 3 ta — chapda katta, o'ngda ikkita. */
const HomeSchema: FC<{ items: ApiNews[] }> = ({ items }) => (
  <div aria-hidden className={`grid h-24 w-full shrink-0 gap-1.5 sm:w-56 ${items.length > 1 ? 'grid-cols-2' : ''} ${items.length === 3 ? 'grid-rows-2' : ''}`}>
    {items.map((n, i) => (
      <div
        key={n.id}
        className={`relative grid place-items-center overflow-hidden rounded-item bg-surface-sunken ${items.length === 3 && i === 0 ? 'row-span-2' : ''}`}
      >
        {n.imageUrl ? <img src={n.imageUrl} alt="" className="size-full object-contain p-1.5" /> : <ImageIcon className="size-4 text-text-faint" />}
        <span className="absolute left-1 top-1 grid size-4 place-items-center rounded-full bg-accent text-xs font-semibold leading-none text-text-on-primary">{i + 1}</span>
      </div>
    ))}
  </div>
);

/** Yangiliklar — landing tile'lari; tartib bo'yicha birinchi 3 ta faoli bosh sahifada. Karta bosilsa tahrir. */
const NewsList: FC = () => {
  const { t } = useTranslation('content');
  const [rawItems, setItems] = useState(null as ApiNews[] | null);
  const items = rawItems as ApiNews[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (n: ApiNews) => updateNews(n.id, n));

  useEffect(() => {
    listNews().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="skeleton h-32 rounded-surface" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-80 rounded-surface" />)}</div>
      </div>
    );
  }

  // Ro'yxat ham, landing ham `sort_order` bo'yicha — birinchi 3 ta faoli bosh sahifada.
  const home = items.filter((n) => n.isActive).slice(0, 3);
  const hidden = items.filter((n) => !n.isActive).length;
  const slotOf = (id: string) => home.findIndex((n) => n.id === id);
  const addButton = (label: string) => <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{label}</Button>;
  const ctaLabel = (n: ApiNews) => (n.linkUrl === '' ? t('newsEdit.cta.none') : newsProductId(n.linkUrl) ? t('newsEdit.cta.product') : n.linkUrl);

  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 ? (
        <EmptyState icon={<Megaphone />} title={t('newsList.emptyTitle')} text={t('newsList.emptyText')} action={addButton(t('newsList.addFirst'))} />
      ) : (
        <>
          {/* Sarlavha guruhi: qo'shish tugmasi va bosh sahifadagi holat — bir-biriga yaqin, kartalar to'ridan uzoqroq. */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-end">{addButton(t('newsList.new'))}</div>
            <section className="stagger flex flex-col gap-4 rounded-surface border border-border bg-surface p-6 sm:flex-row sm:items-center">
              <IconTile icon={House} hue="violet" soft size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-md font-bold text-text">{home.length > 0 ? t('contentHome.blocks.news.live', { n: home.length }) : t('contentHome.blocks.news.none')}</p>
                <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-text-muted">{t('newsList.description')}</p>
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <Dot tone="ok">{t('shared.onSiteCount', { n: items.length - hidden })}</Dot>
                  {hidden > 0 && <Dot tone="neutral">{t('shared.hiddenCount', { n: hidden })}</Dot>}
                </p>
              </div>
              {home.length > 0 && <HomeSchema items={home} />}
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((n, i) => {
              const slot = slotOf(n.id);
              return (
                <article
                  key={n.id}
                  style={delay(i + 1)}
                  className={`stagger group relative flex flex-col overflow-hidden rounded-surface transition-colors duration-200 has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-accent/20 ${
                    // Bosh sahifadagi kartalar fon bilan ajraladi (hoshiya emas).
                    slot >= 0 ? 'bg-accent-soft hover:bg-accent/15' : 'bg-surface-sunken hover:bg-surface-sunken-hover'
                  }`}
                >
                  <div className="relative aspect-[16/10] bg-surface-sunken">
                    {n.imageUrl
                      ? <img src={n.imageUrl} alt="" className={`size-full object-contain p-6 transition-[opacity,transform] duration-300 group-hover:scale-[1.03] ${n.isActive ? '' : 'opacity-50 grayscale'}`} />
                      : <span className="grid size-full place-items-center text-text-faint"><ImageIcon className="size-8" /></span>}
                    {slot >= 0 && (
                      <Badge tone="accent" className="absolute left-3 top-3"><House weight="fill" className="size-3.5" />{t('newsList.slot', { n: slot + 1 })}</Badge>
                    )}
                    <Badge tone={n.isActive ? 'ok' : 'neutral'} dot className="absolute right-3 top-3">
                      {n.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-5">
                    {(n.badge || n.tag) && (
                      <p className="flex flex-wrap gap-x-2 text-sm font-semibold">
                        {n.badge && <span className="text-c-orange">{n.badge}</span>}
                        {n.tag && <span className="text-success-text">{n.tag}</span>}
                      </p>
                    )}
                    <Link to={`${LIST}/${n.id}`} className="line-clamp-1 text-md font-bold text-text outline-none after:absolute after:inset-0">{n.title}</Link>
                    {n.text && <p className="line-clamp-2 text-sm text-text-muted">{n.text}</p>}
                  </div>
                  <div className="flex items-center gap-3 border-t border-border px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-text-muted" title={t('shared.sortOrder')}>
                      <Hash weight="bold" className="size-3 text-text-faint" />{n.sortOrder}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-text-muted">
                      <CursorClick className="size-3.5 shrink-0 text-text-faint" />
                      <span className="truncate">{ctaLabel(n)}</span>
                    </span>
                    <span className="relative z-10">
                      <Toggle on={n.isActive} onChange={(v) => toggle(n, v)} label={t('shared.toggleAria', { name: n.title })} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default NewsList;
