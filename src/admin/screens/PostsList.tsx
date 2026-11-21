import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CalendarBlank, Image as ImageIcon, MagnifyingGlass, Newspaper, Plus, WarningCircle } from '../icons';
import { useTranslation } from 'react-i18next';
import type { ApiPost } from '../../../shared/types';
import { listPosts, updatePost } from '../api';
import { delay } from '../ContentFields';
import { Badge, Button, EmptyState, SearchInput, Toggle } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/posts';

/** ISO sana (YYYY-MM-DD) → dd.mm.yyyy; sanasiz bo'lsa `none`. */
const showDate = (iso: string, none: string) => (iso ? iso.split('-').reverse().join('.') : none);

/** Blog maqolalari — yangisi tepada (saytdagi tartib); qidiruv URL'da (`q`). Muqovali kartalar, bosilsa tahrir. */
const PostsList: FC = () => {
  const { t } = useTranslation('content');
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [rawItems, setItems] = useState(null as ApiPost[] | null);
  const items = rawItems as ApiPost[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPost) => updatePost(p.id, p));

  useEffect(() => {
    listPosts().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  function updateQ(value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set('q', value); else next.delete('q');
    setParams(next, { replace: true });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items ?? [];
    return (items ?? []).filter((p) => `${p.title} ${p.titleRu} ${p.slug}`.toLowerCase().includes(needle));
  }, [items, q]);

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton h-72 rounded-surface" />)}
      </div>
    );
  }

  const addButton = (label: string) => <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{label}</Button>;

  if (items.length === 0) {
    return <EmptyState icon={<Newspaper />} title={t('postsList.emptyTitle')} text={t('postsList.emptyText')} action={addButton(t('postsList.addFirst'))} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <SearchInput value={q} onChange={updateQ} placeholder={t('postsList.searchPlaceholder')} />
        </div>
        <p className="flex-1 text-sm text-text-muted">{t('postsList.count', { count: filtered.length })}</p>
        {addButton(t('postsList.new'))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlass />}
          title={t('postsList.notFoundTitle')}
          action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('postsList.clearFilter')}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p, i) => (
            <article
              key={p.id}
              style={delay(i)}
              className="stagger group relative flex flex-col overflow-hidden rounded-surface border border-border bg-surface transition-colors duration-200 hover:bg-ghost-hover has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-accent/20"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-surface-sunken">
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className={`size-full object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03] ${p.isActive ? '' : 'opacity-50 grayscale'}`} />
                ) : (
                  <span className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-text-faint">
                    <ImageIcon className="size-7" />{t('postsList.noCover')}
                  </span>
                )}
                <Badge tone={p.isActive ? 'ok' : 'neutral'} dot className="absolute right-3 top-3">
                  {p.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-5">
                <p className="flex items-center gap-1.5 text-sm tabular-nums text-text-muted">
                  <CalendarBlank className="size-3.5 text-text-faint" />{showDate(p.publishedAt, t('postsList.noDate'))}
                </p>
                <Link to={`${LIST}/${p.id}`} className="line-clamp-2 text-md font-bold text-text outline-none after:absolute after:inset-0">{p.title}</Link>
                {p.excerpt && <p className="line-clamp-2 text-sm text-text-muted">{p.excerpt}</p>}
              </div>
              <div className="flex items-center gap-3 border-t border-border px-5 py-3">
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-text-faint">/blog/{p.slug}</span>
                <span className="relative z-10">
                  <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('shared.toggleAria', { name: p.title })} />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostsList;
