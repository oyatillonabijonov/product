import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const LIST = '/admin/products/categories';

/** Yo'nalishlar — saytdagi 4 bo'lim (Apple · PC · Audio · Video); qator bosilsa tahrir. */
const CategoriesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiCategory[] | null);
  const items = rawItems as ApiCategory[] | null;
  const [rawTypes, setTypes] = useState([] as ApiProductType[]);
  const types = rawTypes as ApiProductType[];
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listCategories(), listTypes()])
      .then(([c, t]) => { setItems(c); setTypes(t); })
      .catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiCategory>[] = [
    {
      id: 'cover', label: '', className: 'w-14', mobile: 'hide',
      cell: (c) => (c.coverUrl
        ? <img src={c.coverUrl} alt="" className="size-10 rounded-xs bg-fill-2 object-cover" />
        : <span className="flex size-10 items-center justify-center rounded-xs bg-fill-2 text-para font-medium text-primary">{c.name.slice(0, 1)}</span>),
    },
    {
      id: 'name', label: 'Nomi', mobile: 'title',
      cell: (c) => (
        <span className="flex flex-col">
          <span className="text-primary">{c.name}</span>
          {c.nameRu && c.nameRu !== c.name && <span className="text-label text-muted-2">{c.nameRu}</span>}
        </span>
      ),
    },
    { id: 'types', label: 'Turlar', align: 'right', className: 'w-20', cell: (c) => <span className="text-muted">{types.filter((t) => t.categoryId === c.id).length}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (c) => <span className="text-muted">{c.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Saytdagi yo'nalishlar; har birining o'z cover rasmi va turlari bor.</p>
        <Button to={`${LIST}/new`}>Yangi kategoriya</Button>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(c) => c.id}
            onRowClick={(c) => navigate(`${LIST}/${c.id}`)}
            empty={<EmptyState title="Kategoriya yo'q" action={<Button to={`${LIST}/new`}>Yangi kategoriya</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default CategoriesList;
