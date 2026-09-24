import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentPage } from '../ContentFields';

/** `/admin/content/vacancies/matn` — vakansiya id'lari UUID, shu so'z bilan to'qnashmaydi. */
// i18n: ma'lumot — tarjima qilinmaydi (URL segmenti)
export const VACANCIES_TEXT_ID = 'matn';

/** Vakansiyalar sahifasining matnlari va fotolari (`careers` guruhi). */
const VacanciesText: FC = () => {
  const { t } = useTranslation('content');
  return <ContentPage group="careers" title={t('vacanciesText.title')} siteHref="/vakansiyalar" back="/admin/content/vacancies" />;
};

export default VacanciesText;
