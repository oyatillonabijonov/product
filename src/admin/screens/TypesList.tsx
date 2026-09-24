import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { listCategories, listTypes } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, type Column } from '../ui';

const MAX_CHIPS = 4;

/** Turlar — 4 yo'nalish bo'yicha guruhlangan; qator bosilsa tahrir. Tartib = saytdagi tur qatori tartibi. */
const TypesList: FC = () => {
  const { t } = useTranslation('products');
  const navigate = useNavigate();
  const [rawTypes, setTypes] = useState(null as ApiProductType[] | null);
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const [error, setError] = useState('');
  const types = rawTypes as ApiProductType[] | null;
  const cats = rawCats as ApiCategory[];

  useEffect(() => {
    Promise.all([listTypes(), listCategories()])
      .then(([ts, c]) => { setTypes(ts); setCats(c); })
      .catch(() => setError(t('shared.loadError')));
  }, []);

  const columns: Column<ApiProductType>[] = [
    {
      id: 'icon', label: '', className: 'w-16',
      cell: (row) => <img src={row.iconUrl} alt="" className="h-9 w-14 object-contain object-bottom" />,
      mobile: 'hide',
    },
    {
      id: 'label', label: t('shared.name'), mobile: 'title',
      cell: (row) => (
        <span className="flex flex-col">
          <span className="text-primary">{row.label}</span>
          {row.labelRu && row.labelRu !== row.label && <span className="text-label text-muted-2">{row.labelRu}</span>}
        </span>
      ),
    },
    {
      id: 'aliases', label: t('shared.billzAliases'),
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.billzAliases.slice(0, MAX_CHIPS).map((a) => <Badge key={a}>{a}</Badge>)}
          {row.billzAliases.length > MAX_CHIPS && <Badge>+{row.billzAliases.length - MAX_CHIPS}</Badge>}
          {row.billzAliases.length === 0 && <span className="text-label text-muted-2">{t('typesList.aliasesNone')}</span>}
        </span>
      ),
    },
    { id: 'count', label: t('shared.product'), align: 'right', className: 'w-24', cell: (row) => <span className={row.productCount > 0 ? 'text-primary' : 'text-muted-2'}>{row.productCount}</span> },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (row) => <span className="text-muted">{row.sortOrder}</span>, mobile: 'hide' },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!types) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-para text-muted">{t('typesList.intro')}</p>
        <Button to="/admin/products/types/new">{t('typesList.addButton')}</Button>
      </div>
      {cats.map((c) => {
        const rows = types.filter((row) => row.categoryId === c.id);
        return (
          <Card key={c.id} title={c.name} description={t('typesList.count', { count: rows.length })} padded={false}>
            <div className="px-2 pb-2">
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => `${row.categoryId}/${row.id}`}
                onRowClick={(row) => navigate(`/admin/products/types/${row.categoryId}/${row.id}`)}
                empty={<p className="px-3 py-6 text-para text-muted">{t('typesList.emptyInCategory')}</p>}
              />
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default TypesList;
