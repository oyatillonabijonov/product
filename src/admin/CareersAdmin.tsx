import { useState } from 'react';
import type { FC } from 'react';
import VacancyList from './VacancyList';
import JobApplicationsList from './JobApplicationsList';

type View = 'vacancies' | 'applications';

/** "Vakansiyalar" bo'limi — ikki tab: vakansiyalar CRUD va nomzodlar arizalari. */
const CareersAdmin: FC = () => {
  const [raw, setView] = useState<View>('vacancies');
  const view = raw as View;
  const tab = (id: View, label: string) => (
    <button
      onClick={() => setView(id)}
      className={`press rounded-full px-4 py-2 text-[14px] font-semibold ${view === id ? 'bg-accent text-white' : 'text-primary hover:bg-white'}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div className="mb-5 flex gap-2">
        {tab('vacancies', 'Vakansiyalar')}
        {tab('applications', 'Arizalar')}
      </div>
      {view === 'vacancies' ? <VacancyList /> : <JobApplicationsList />}
    </div>
  );
};

export default CareersAdmin;
