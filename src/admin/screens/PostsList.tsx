import { useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ApiPost } from '../../../shared/types';
import { listPosts, updatePost } from '../api';
import { Button, Card, DataTable, EmptyState, SearchInput, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/posts';

/** ISO sana (YYYY-MM-DD) → dd.mm.yyyy. */
const showDate = (iso: string) => (iso ? iso.split('-').reverse().join('.') : 'Sanasiz');

/** Blog maqolalari — yangisi tepada (saytdagi tartib); qidiruv URL'da (`q`). Qator bosilsa tahrir. */
const PostsList: FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [rawItems, setItems] = useState(null as ApiPost[] | null);
  const items = rawItems as ApiPost[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPost) => updatePost(p.id, p));

  useEffect(() => {
    listPosts().then(setItems).catch(() => setError('Yuklashda xatolik'));
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
      id: 'title', label: 'Sarlavha', mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title}</span>
          <span className="text-label text-muted-2">/blog/{p.slug}</span>
        </span>
      ),
    },
    { id: 'date', label: 'Sana', className: 'w-28', cell: (p) => <span className="tabular-nums text-muted">{showDate(p.publishedAt)}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.title} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64">
          <SearchInput value={q} onChange={updateQ} placeholder="Sarlavha bo'yicha qidirish…" />
        </div>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi maqola</Button>
        </div>
      </div>
      <p className="text-label text-muted">{filtered.length} ta maqola · saytda /blog sahifasida</p>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={q
              ? <EmptyState title="Maqola topilmadi" action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Filtrni tozalash</Button>} />
              : <EmptyState title="Maqola yo'q" action={<Button to={`${LIST}/new`}>Yangi maqola</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PostsList;
