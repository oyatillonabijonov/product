import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const MAX_CHIPS = 4;

/** Turlar — 4 yo'nalish bo'yicha guruhlangan; qator bosilsa tahrir. Tartib = saytdagi tur qatori tartibi. */
const TypesList: FC = () => {
  const navigate = useNavigate();
  const [rawTypes, setTypes] = useState(null as ApiProductType[] | null);
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const [error, setError] = useState('');
  const types = rawTypes as ApiProductType[] | null;
  const cats = rawCats as ApiCategory[];

  useEffect(() => {
    Promise.all([listTypes(), listCategories()])
      .then(([t, c]) => { setTypes(t); setCats(c); })
      .catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiProductType>[] = [
    {
      id: 'icon', label: '', className: 'w-16',
      cell: (t) => <img src={t.iconUrl} alt="" className="h-9 w-14 object-contain object-bottom" />,
      mobile: 'hide',
    },
    {
      id: 'label', label: 'Nomi', mobile: 'title',
      cell: (t) => (
        <span className="flex flex-col">
          <span className="text-primary">{t.label}</span>
          {t.labelRu && t.labelRu !== t.label && <span className="text-label text-muted-2">{t.labelRu}</span>}
        </span>
      ),
    },
    {
      id: 'aliases', label: 'Billz aliaslari',
      cell: (t) => (
        <span className="flex flex-wrap gap-1">
          {t.billzAliases.slice(0, MAX_CHIPS).map((a) => <Badge key={a}>{a}</Badge>)}
          {t.billzAliases.length > MAX_CHIPS && <Badge>+{t.billzAliases.length - MAX_CHIPS}</Badge>}
          {t.billzAliases.length === 0 && <span className="text-label text-muted-2">faqat nom</span>}
        </span>
      ),
    },
    { id: 'count', label: 'Mahsulot', align: 'right', className: 'w-24', cell: (t) => <span className={t.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{t.productCount}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (t) => <span className="text-muted">{t.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!types) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">Yo'nalish sahifasidagi tur qatori va Billz moslash shu ro'yxatdan. Ikonka — shaffof PNG, 220×136 ga sig'diriladi.</p>
        <Button to="/admin/products/types/new">Tur qo'shish</Button>
      </div>
      {cats.map((c) => {
        const rows = types.filter((t) => t.categoryId === c.id);
        return (
          <Card key={c.id} title={c.name} description={`${rows.length} ta tur`} padded={false}>
            <div className="px-2 pb-2">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(t) => `${t.categoryId}/${t.id}`}
                onRowClick={(t) => navigate(`/admin/products/types/${t.categoryId}/${t.id}`)}
                empty={<p className="px-3 py-6 text-para text-muted">Bu yo'nalishda tur yo'q.</p>}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TypesList;
