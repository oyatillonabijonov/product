import type { FC } from 'react';
import { ContentPage } from '../ContentFields';

/** `/admin/content/vacancies/matn` — vakansiya id'lari UUID, shu so'z bilan to'qnashmaydi. */
export const VACANCIES_TEXT_ID = 'matn';

/** Vakansiyalar sahifasining matnlari va fotolari (`careers` guruhi). */
const VacanciesText: FC = () => (
  <ContentPage group="careers" title="Vakansiyalar sahifasi" siteHref="/vakansiyalar" back="/admin/content/vacancies" />
);

export default VacanciesText;
