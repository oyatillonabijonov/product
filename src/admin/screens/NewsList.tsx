import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiNews } from '../../../shared/types';
import { listNews, updateNews } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/news';

/** Yangiliklar — landing tile'lari; tartib bo'yicha birinchi 3 ta faoli bosh sahifada. Qator bosilsa tahrir. */
const NewsList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiNews[] | null);
  const items = rawItems as ApiNews[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (n: ApiNews) => updateNews(n.id, n));

  useEffect(() => {
    listNews().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  // Ro'yxat ham, landing ham `sort_order` bo'yicha — birinchi 3 ta faoli bosh sahifada.
  const onHome = new Set(items.filter((n) => n.isActive).slice(0, 3).map((n) => n.id));
  const columns: Column<ApiNews>[] = [
    { id: 'img', label: '', className: 'w-14', mobile: 'hide', cell: (n) => <img src={n.imageUrl} alt="" className="size-11 rounded-xs bg-fill-2 object-contain" /> },
    {
      id: 'title', label: 'Sarlavha', mobile: 'title',
      cell: (n) => (
        <span className="flex flex-col">
          <span className="text-primary">{n.title}</span>
          <span className="text-label text-muted-2">{[n.badge, n.tag].filter(Boolean).join(' · ') || 'Yorliqsiz'}</span>
        </span>
      ),
    },
    { id: 'home', label: 'Bosh sahifada', className: 'w-32', cell: (n) => (onHome.has(n.id) ? <Badge tone="ok">Ko'rinadi</Badge> : <span className="text-muted-2">—</span>) },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (n) => <span className="text-muted">{n.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (n) => <Toggle on={n.isActive} onChange={(v) => toggle(n, v)} label={`${n.title} — saytda ko'rsatish`} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Bosh sahifada tartib bo'yicha birinchi 3 ta faol yangilik chiqadi: 1-si chapda katta, qolgan ikkitasi o'ngda.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi yangilik</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(n) => n.id}
            onRowClick={(n) => navigate(`${LIST}/${n.id}`)}
            empty={<EmptyState title="Yangilik yo'q" text="Bosh sahifada yangiliklar bo'limi chiqmaydi." action={<Button to={`${LIST}/new`}>Yangi yangilik</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default NewsList;
