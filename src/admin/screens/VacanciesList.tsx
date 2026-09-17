import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';
import type { ApiVacancy } from '../../../shared/types';
import { listVacancies, updateVacancy } from '../api';
import { Button, Card, DataTable, EmptyState, Skeleton, Toggle, type Column } from '../ui';
import { useActiveToggle } from '../useActiveToggle';
import { EMPLOYMENT_LABEL } from './VacancyEdit';
import { VACANCIES_TEXT_ID } from './VacanciesText';

const LIST = '/admin/content/vacancies';

/** Vakansiyalar: tepada sahifa matni kartasi, ostida lavozimlar (faollari saytda tartib bo'yicha). */
const VacanciesList: FC = () => {
  const navigate = useNavigate();
  const [rawItems, setItems] = useState(null as ApiVacancy[] | null);
  const items = rawItems as ApiVacancy[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (v: ApiVacancy) => updateVacancy(v.id, v));

  useEffect(() => {
    listVacancies().then(setItems).catch(() => setError('Yuklashda xatolik'));
  }, []);

  const columns: Column<ApiVacancy>[] = [
    {
      id: 'title', label: 'Lavozim', mobile: 'title',
      cell: (v) => (
        <span className="flex flex-col">
          <span className="text-primary">{v.title}</span>
          <span className="text-label text-muted-2">{[v.department, EMPLOYMENT_LABEL[v.employment]].filter(Boolean).join(' · ')}</span>
        </span>
      ),
    },
    { id: 'salary', label: 'Maosh', cell: (v) => <span className="text-muted">{v.salary || '—'}</span> },
    { id: 'sort', label: 'Tartib', align: 'right', className: 'w-20', cell: (v) => <span className="text-muted">{v.sortOrder}</span> },
    { id: 'active', label: 'Saytda', align: 'right', className: 'w-20', cell: (v) => <Toggle on={v.isActive} onChange={(on) => toggle(v, on)} label={`${v.title} — saytda ko'rsatish`} /> },
  ];

  if (error) return <EmptyState title="Ma'lumot yuklanmadi" text={error} />;
  if (!items) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Sahifa matni"
        description="Vakansiyalar sahifasidagi sarlavha, matnlar va 2 ta foto."
        actions={<Button variant="secondary" to={`${LIST}/${VACANCIES_TEXT_ID}`}>Tahrirlash</Button>}
      >
        <a href="/vakansiyalar" target="_blank" rel="noopener noreferrer" className="press text-para text-cta">Saytda ko'rish</a>
      </Card>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-para text-muted">
          Faol vakansiyalar saytda tartib bo'yicha chiqadi; bittasi ham bo'lmasa umumiy ariza formasi turadi. Nomzodlar arizalari —{' '}
          <Link to="/admin/orders/applications" className="press text-cta">Ish arizalari</Link>.
        </p>
        <div className="sm:ml-auto">
          <Button to={`${LIST}/new`}>Yangi vakansiya</Button>
        </div>
      </div>
      <Card padded={false}>
        <div className="px-2 py-1">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(v) => v.id}
            onRowClick={(v) => navigate(`${LIST}/${v.id}`)}
            empty={<EmptyState title="Vakansiya yo'q" text="Saytda umumiy ariza formasi chiqadi." action={<Button to={`${LIST}/new`}>Yangi vakansiya</Button>} />}
          />
        </div>
      </Card>
    </div>
  );
};

export default VacanciesList;
