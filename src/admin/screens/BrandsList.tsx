import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiAdminBrand } from '../../../shared/types';
import { listBrands } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const LIST = '/admin/products/brands';

/** Brendlar — logotipi borlari bosh sahifadagi tasmada chiqadi; qator bosilsa tahrir. */
const BrandsList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiAdminBrand[] | null);
  const items = rawItems as ApiAdminBrand[] | null;
  const [error, setError] = useState('');

  useEffect(() => {
    listBrands().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiAdminBrand>[] = [
    {
      id: 'logo', label: '', className: 'w-14', mobile: 'hide',
      cell: (b) => (b.logoUrl
        ? <img src={b.logoUrl} alt="" className="size-10 rounded-xs bg-fill-2 object-contain p-1" />
        : <span className="flex size-10 items-center justify-center rounded-xs bg-fill-2 text-para font-medium text-primary">{b.name.slice(0, 1)}</span>),
    },
    {
      id: 'name', label: 'Nomi', mobile: 'title',
      cell: (b) => (
        <span className="flex flex-col">
          <span className="text-primary">{b.name}</span>
          <span className="text-label text-muted-2">/brand/{b.slug}</span>
        </span>
      ),
    },
    { id: 'count', label: 'Mahsulot', align: 'right', className: 'w-24', cell: (b) => <span className={b.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{b.productCount}</span> },
    { id: 'strip', label: 'Tasmada', className: 'w-24', cell: (b) => <span className="text-muted">{b.logoUrl ? 'Ha' : '—'}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (b) => <span className="text-muted">{b.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={8} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Billz sinxronizatsiyasi yangi brendni o'zi yaratadi; logotip shu yerda yuklanadi.</p>
        <Button to={`${LIST}/new`}>Yangi brend</Button>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`${LIST}/${b.id}`)}
            empty={<EmptyState title="Brend yo'q" action={<Button to={`${LIST}/new`}>Yangi brend</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default BrandsList;
