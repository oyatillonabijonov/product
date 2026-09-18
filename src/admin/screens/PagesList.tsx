import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink } from 'lucide-react';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { listPages, updatePage } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/pages';

/** Maxsus shablonli sahifalar — tahririda qo'shimcha maydonlar bor. */
function pageKind(slug: string): string {
  if (slug === ABOUT_SLUG) return 'Biz haqimizda';
  return LEGAL_LEDE_KEYS[slug] ? 'Huquqiy' : '';
}

/** Kontent sahifalari — faollari saytda ochiladi va footer'da chiqadi. Qator bosilsa tahrir. */
const PagesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiPage[] | null);
  const items = rawItems as ApiPage[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPage) => updatePage(p.id, p));

  useEffect(() => {
    listPages().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiPage>[] = [
    {
      id: 'title', label: 'Sahifa', mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title.uz}</span>
          <span className="text-label text-muted-2">/page/{p.slug}</span>
        </span>
      ),
    },
    { id: 'kind', label: 'Shablon', className: 'w-36', cell: (p) => (pageKind(p.slug) ? <Badge>{pageKind(p.slug)}</Badge> : <span className="text-muted-2">Matn</span>) },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (p) => <span className="text-muted">{p.sortOrder}</span> },
    {
      id: 'open', label: '', className: 'w-12', mobile: 'hide',
      cell: (p) => (
        <a
          href={`/page/${p.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${p.title.uz} — saytda ko'rish`}
          className="press inline-flex size-9 items-center justify-center rounded-xs text-muted hover:bg-fill-2 hover:text-primary"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ),
    },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={`${p.title.uz} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">Faol sahifalar saytda ochiladi va footer'da chiqadi. «Biz haqimizda» va huquqiy hujjatlar tahririda qo'shimcha maydonlar bor.</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi sahifa</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={<EmptyState title="Sahifa yo'q" action={<Button to={`${LIST}/new`}>Yangi sahifa</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PagesList;
