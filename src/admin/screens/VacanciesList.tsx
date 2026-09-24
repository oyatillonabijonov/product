import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiVacancy } from '../../../shared/types';
import { listVacancies, updateVacancy } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';
import { EMPLOYMENT_LABEL_KEY } from './VacancyEdit';
import { VACANCIES_TEXT_ID } from './VacanciesText';

const LIST = '/admin/content/vacancies';

/** Vakansiyalar: tepada sahifa matni kartasi, ostida lavozimlar (faollari saytda tartib bo'yicha). */
const VacanciesList: FC = () => {
  const { t } = useTranslation('content');
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiVacancy[] | null);
  const items = rawItems as ApiVacancy[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (v: ApiVacancy) => updateVacancy(v.id, v));

  useEffect(() => {
    listVacancies().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  const columns: Column<ApiVacancy>[] = [
    {
      id: 'title', label: t('shared.position'), mobile: 'title',
      cell: (v) => (
        <span className="flex flex-col">
          <span className="text-primary">{v.title}</span>
          <span className="text-label text-muted-2">{[v.department, t(EMPLOYMENT_LABEL_KEY[v.employment])].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { id: 'salary', label: t('shared.salary'), cell: (v) => <span className="text-muted">{v.salary || '—'}</span> },
    { id: 'sort', label: t('shared.sortOrder'), align: 'right', className: 'w-20', cell: (v) => <span className="text-muted">{v.sortOrder}</span> },
    { id: 'active', label: t('shared.onSiteColumn'), align: 'right', className: 'w-20', cell: (v) => <Toggle on={v.isActive} onChange={(on) => toggle(v, on)} label={t('shared.toggleAria', { name: v.title })} /> },
  ];

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t('vacanciesList.pageTextTitle')}
        description={t('vacanciesList.pageTextDescription')}
        actions={<Button variant="secondary" to={`${LIST}/${VACANCIES_TEXT_ID}`}>{t('vacanciesList.edit')}</Button>}
      >
        <a href="/vakansiyalar" target="_blank" rel="noopener noreferrer" className="press text-para text-link">{t('shared.viewOnSite')}</a>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">
          <Trans
            t={t}
            i18nKey="vacanciesList.description"
            components={{ link: <Link to="/admin/orders/applications" className="press text-link" /> }}
          />
        </p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>{t('vacanciesList.new')}</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(v) => v.id}
            onRowClick={(v) => navigate(`${LIST}/${v.id}`)}
            empty={<EmptyState title={t('vacanciesList.emptyTitle')} text={t('vacanciesList.emptyText')} action={<Button to={`${LIST}/new`}>{t('vacanciesList.new')}</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default VacanciesList;
