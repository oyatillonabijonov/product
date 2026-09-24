import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiBanner } from '../../../shared/types';
import { listBanners, updateBanner } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/banners';

/** Bannerlar — bosh sahifadagi slayder; faollari tartib bo'yicha, bittasi ham bo'lmasa slayder chiqmaydi. */
const BannersList: FC = () => {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiBanner[] | null);
  const items = rawItems as ApiBanner[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (b: ApiBanner) => updateBanner(b.id, b));

  useEffect(() => {
    listBanners().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  const columns: Column<ApiBanner>[] = [
    { id: 'img', label: '', className: 'w-28', mobile: 'hide', cell: (b) => <img src={b.imageUrl} alt="" className="h-12 w-24 rounded-xs bg-fill-2 object-cover" /> },
    {
      id: 'name', label: t('bannersList.banner'), mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.altText || t('bannersList.unnamed')}</span>
          <span className="text-label text-muted-2">{b.linkUrl || t('bannersList.noLink')}</span>
        </span>
      ),
    },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span> },
    { id: 'active', label: t('shared.onSiteColumn'), align: 'right', className: 'w-20', cell: (b) => <Toggle on={b.isActive} onChange={(v) => toggle(b, v)} label={t('shared.toggleAria', { name: b.altText || t('bannersList.banner') })} /> },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">{t('bannersList.description')}</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('bannersList.new')}</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={<EmptyState title={t('bannersList.emptyTitle')} text={t('bannersList.emptyText')} action={<Button to={`${LIST}/new`}>{t('bannersList.new')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BannersList;
