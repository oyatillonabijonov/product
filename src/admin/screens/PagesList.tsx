import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink } from 'lucide-react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { listPages, updatePage } from '../api';
import { Badge, Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/pages';

/** Maxsus shablonli sahifalar — tahririda qo'shimcha maydonlar bor; yorliq kaliti, oddiy sahifada `null`. */
function pageKind(slug: string): ParseKeys<'content'> | null {
  if (slug === ABOUT_SLUG) return 'pagesList.templateAbout';
  return LEGAL_LEDE_KEYS[slug] ? 'pagesList.templateLegal' : null;
}

/** Kontent sahifalari — faollari saytda ochiladi va footer'da chiqadi. Qator bosilsa tahrir. */
const PagesList: FC = () => {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiPage[] | null);
  const items = rawItems as ApiPage[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPage) => updatePage(p.id, p));

  useEffect(() => {
    listPages().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  const columns: Column<ApiPage>[] = [
    {
      id: 'title', label: t('pagesList.columnPage'), mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.title.uz}</span>
          <span className="text-label text-muted-2">/page/{p.slug}</span>
        </span>
      ),
    },
    {
      id: 'kind', label: t('pagesList.columnTemplate'), className: 'w-36',
      cell: (p) => {
        const kind = pageKind(p.slug);
        return kind ? <Badge>{t(kind)}</Badge> : <span className="text-muted-2">{t('shared.text')}</span>;
      },
    },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (p) => <span className="text-muted">{p.sortOrder}</span> },
    {
      id: 'open', label: '', className: 'w-12', mobile: 'hide',
      cell: (p) => (
        <a
          href={`/page/${p.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('pagesList.openAria', { name: p.title.uz })}
          className="press inline-flex size-9 items-center justify-center rounded-xs text-muted hover:bg-fill-2 hover:text-primary"
        >
          <ExternalLink aria-hidden className="size-4" />
        </a>
      ),
    },
    { id: 'active', label: t('shared.onSiteColumn'), align: 'right', className: 'w-20', cell: (p) => <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('shared.toggleAria', { name: p.title.uz })} /> },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={6} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">{t('pagesList.description')}</p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('pagesList.new')}</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(p) => p.id}
            onRowClick={(p) => navigate(`${LIST}/${p.id}`)}
            empty={<EmptyState title={t('pagesList.emptyTitle')} action={<Button to={`${LIST}/new`}>{t('pagesList.new')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default PagesList;
