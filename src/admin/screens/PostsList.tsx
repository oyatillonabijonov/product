import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiPost } from '../../../shared/types';
import { listPosts, updatePost } from '../api';
import { Button, Card, DataTable, EmptyState, SearchInput, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/posts';

/** ISO sana (YYYY-MM-DD) → dd.mm.yyyy; sanasiz bo'lsa `none`. */
const showDate = (iso: string, none: string) => (iso ? iso.split('-').reverse().join('.') : none);

/** Blog maqolalari — yangisi tepada (saytdagi tartib); qidiruv URL'da (`q`). Qator bosilsa tahrir. */
const PostsList: FC = () => {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
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

  const columns: Column<ApiPost>[] = [
    {
      id: 'cover', label: '', className: 'w-24', mobile: 'hide',
      cell: (p) => (p.coverUrl
        ? <img src={p.coverUrl} alt="" className="h-12 w-20 rounded-xs bg-fill-2 object-cover" />
        : <span className="block h-12 w-20 rounded-xs bg-fill-2" />),
    },
    {
      id: 'title', label: t('shared.title'), mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title}</span>
          <span className="text-label text-muted-2">/blog/{p.slug}</span>
        </span>
      ),
    },
    { id: 'date', label: t('shared.date'), className: 'w-28', cell: (p) => <span className="tabular-nums text-muted">{showDate(p.publishedAt, t('postsList.noDate'))}</span> },
    { id: 'active', label: t('shared.onSiteColumn'), align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('shared.toggleAria', { name: p.title })} /> },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={updateQ} placeholder={t('postsList.searchPlaceholder')} />
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('postsList.new')}</Button>
        </div>
      </div>
      <p className="text-label text-muted">{t('postsList.count', { count: filtered.length })}</p>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={q
              ? <EmptyState title={t('postsList.notFoundTitle')} action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>{t('postsList.clearFilter')}</Button>} />
              : <EmptyState title={t('postsList.emptyTitle')} action={<Button to={`${LIST}/new`}>{t('postsList.new')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PostsList;
