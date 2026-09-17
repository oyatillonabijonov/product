import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiBanner } from '../../../shared/types';
import { listBanners, updateBanner } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/banners';

/** Bannerlar — bosh sahifadagi slayder; faollari tartib bo'yicha, bittasi ham bo'lmasa slayder chiqmaydi. */
const BannersList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiBanner[] | null);
  const items = rawItems as ApiBanner[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (b: ApiBanner) => updateBanner(b.id, b));

  useEffect(() => {
    listBanners().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiBanner>[] = [
    { id: 'img', label: '', className: 'w-28', mobile: 'hide', cell: (b) => <img src={b.imageUrl} alt="" className="h-12 w-24 rounded-xs bg-fill-2 object-cover" /> },
    {
      id: 'name', label: 'Banner', mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.altText || 'Nomsiz banner'}</span>
          <span className="text-label text-muted-2">{b.linkUrl || 'Havolasiz'}</span>
        </span>
      ),
    },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (b) => <Toggle on={b.isActive} onChange={(v) => toggle(b, v)} label={`${b.altText || 'Banner'} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Bosh sahifadagi slayder: faol bannerlar tartib bo'yicha aylanadi, bittasi ham bo'lmasa slayder chiqmaydi.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi banner</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={<EmptyState title="Banner yo'q" text="Bosh sahifada slayder chiqmaydi." action={<Button to={`${LIST}/new`}>Yangi banner</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BannersList;
