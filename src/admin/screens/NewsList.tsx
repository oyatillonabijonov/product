import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiNews } from '../../../shared/types';
import { listNews, updateNews } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/news';

/** Yangiliklar — landing tile'lari; tartib bo'yicha birinchi 3 ta faoli bosh sahifada. Qator bosilsa tahrir. */
const NewsList: FC = () => {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiNews[] | null);
  const items = rawItems as ApiNews[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (n: ApiNews) => updateNews(n.id, n));

  useEffect(() => {
    listNews().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={4} />;

  // Ro'yxat ham, landing ham `sort_order` bo'yicha — birinchi 3 ta faoli bosh sahifada.
  const onHome = new Set(items.filter((n) => n.isActive).slice(0, 3).map((n) => n.id));
  const columns: Column<ApiNews>[] = [
    { id: 'img', label: '', className: 'w-14', mobile: 'hide', cell: (n) => <img src={n.imageUrl} alt="" className="size-11 rounded-xs bg-fill-2 object-contain" /> },
    {
      id: 'title', label: t('shared.title'), mobile: 'title',
      cell: (n) => (
        <span className="flex flex-col">
          <span className="text-primary">{n.title}</span>
          <span className="text-label text-muted-2">{[n.badge, n.tag].filter(Boolean).join(' · ') || t('newsList.untagged')}</span>
        </span>
      ),
    },
    { id: 'home', label: t('newsList.columnHome'), className: 'w-32', cell: (n) => (onHome.has(n.id) ? <Badge tone="ok">{t('newsList.onHome')}</Badge> : <span className="text-muted-2">—</span>) },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (n) => <span className="text-muted">{n.sortOrder}</span> },
    { id: 'active', label: t('shared.onSiteColumn'), align: 'right', className: 'w-20', cell: (n) => <Toggle on={n.isActive} onChange={(v) => toggle(n, v)} label={t('shared.toggleAria', { name: n.title })} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">{t('newsList.description')}</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('newsList.new')}</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(n) => n.id}
            onRowClick={(n) => navigate(`${LIST}/${n.id}`)}
            empty={<EmptyState title={t('newsList.emptyTitle')} text={t('newsList.emptyText')} action={<Button to={`${LIST}/new`}>{t('newsList.new')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default NewsList;
