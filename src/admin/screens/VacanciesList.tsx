import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { ArrowSquareOut, Article, Briefcase, Hash, Money, PencilSimple, Plus, Users, WarningCircle } from '@phosphor-icons/react';
import { Trans, useTranslation } from 'react-i18next';
import type { ApiJobApplication, ApiVacancy, EmploymentType } from '../../../shared/types';
import { listJobApplications, listVacancies, updateVacancy } from '../api';
import { delay } from '../ContentFields';
import { Badge, Button, Dot, EmptyState, IconButton, IconTile, Toggle, type Hue, type Tone } from '../ui';
import { useActiveToggle } from '../useActiveToggle';
import { EMPLOYMENT_LABEL_KEY } from './VacancyEdit';
import { VACANCIES_TEXT_ID } from './VacanciesText';

const LIST = '/admin/content/vacancies';
const APPLICATIONS = '/admin/orders/applications';
const EMPLOYMENT_HUE: Record<EmploymentType, Hue> = { full: 'blue', part: 'orange', intern: 'green' };
const EMPLOYMENT_TONE: Record<EmploymentType, Tone> = { full: 'info', part: 'attention', intern: 'ok' };

/**
 * Vakansiyalar: tepada sahifa matni kartasi, ostida lavozim kartalari (faollari saytda tartib bo'yicha) —
 * bandlik turi, maosh va kelgan arizalar soni bilan.
 */
const VacanciesList: FC = () => {
  const { t } = useTranslation('content');
  const [rawItems, setItems] = useState(null as ApiVacancy[] | null);
  const items = rawItems as ApiVacancy[] | null;
  const [rawApps, setApps] = useState([] as ApiJobApplication[]);
  const apps = rawApps as ApiJobApplication[];
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (v: ApiVacancy) => updateVacancy(v.id, v));

  useEffect(() => {
    listVacancies().then(setItems).catch(() => setError(t('shared.loadError')));
    // Arizalar soni — qo'shimcha ma'lumot; yuklanmasa kartalar sonsiz chiqadi.
    listJobApplications().then(setApps).catch(() => {});
  }, []);

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="skeleton h-24 rounded-surface" />
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-40 rounded-surface" />)}</div>
      </div>
    );
  }

  const appsOf = (id: string) => apps.filter((a) => a.vacancyId === id);
  const live = items.filter((v) => v.isActive).length;
  const addButton = (label: string) => <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{label}</Button>;

  return (
    <div className="flex flex-col gap-8">
      <section className="stagger flex flex-col gap-4 rounded-surface bg-surface-sunken p-6 sm:flex-row sm:items-center">
        <IconTile icon={Article} hue="violet" soft size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-md font-bold text-text">{t('vacanciesList.pageTextTitle')}</p>
          <p className="mt-0.5 text-sm text-text-muted">{t('vacanciesList.pageTextDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" href="/vakansiyalar" external className="max-sm:flex-1"><ArrowSquareOut />{t('shared.viewOnSite')}</Button>
          <Button variant="secondary" to={`${LIST}/${VACANCIES_TEXT_ID}`} className="max-sm:flex-1"><PencilSimple />{t('vacanciesList.edit')}</Button>
        </div>
      </section>

      {/* Lavozimlar — alohida guruh: bo'lim sarlavhasi, izoh va kartalar. */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-text">{t('vacanciesList.positionsTitle')}</h2>
            <p className="mt-0.5 max-w-2xl text-base text-text-muted">
              <Trans
                t={t}
                i18nKey="vacanciesList.description"
                components={{ link: <Link to={APPLICATIONS} className="font-medium text-text underline underline-offset-2 hover:text-accent-text" /> }}
              />
            </p>
            {items.length > 0 && (
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                <Dot tone="ok">{t('shared.onSiteCount', { n: live })}</Dot>
                {items.length > live && <Dot tone="neutral">{t('shared.hiddenCount', { n: items.length - live })}</Dot>}
              </p>
            )}
          </div>
          {items.length > 0 && addButton(t('vacanciesList.new'))}
        </div>

        {items.length === 0 ? (
          <EmptyState icon={<Briefcase />} title={t('vacanciesList.emptyTitle')} text={t('vacanciesList.emptyText')} action={addButton(t('vacanciesList.addFirst'))} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((v, i) => {
              const own = appsOf(v.id);
              const fresh = own.filter((a) => a.status === 'new').length;
              return (
                <article
                  key={v.id}
                  style={delay(i + 1)}
                  className="stagger group relative flex flex-col gap-4 rounded-surface bg-surface-sunken p-5 transition-colors duration-200 hover:bg-surface-sunken-hover has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-accent/20"
                >
                  <div className="flex items-start gap-3">
                    <IconTile icon={Briefcase} hue={EMPLOYMENT_HUE[v.employment]} soft size="lg" className={v.isActive ? '' : 'opacity-60'} />
                    <div className="min-w-0 flex-1">
                      <Link to={`${LIST}/${v.id}`} className="block truncate text-md font-bold text-text outline-none after:absolute after:inset-0">{v.title}</Link>
                      <p className="mt-0.5 truncate text-sm text-text-muted">{v.department || '—'}</p>
                    </div>
                    <span className="relative z-10 pt-1">
                      <Toggle on={v.isActive} onChange={(on) => toggle(v, on)} label={t('shared.toggleAria', { name: v.title })} />
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={EMPLOYMENT_TONE[v.employment]}>{t(EMPLOYMENT_LABEL_KEY[v.employment])}</Badge>
                    {v.salary && (
                      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 text-sm font-medium text-text">
                        <Money weight="fill" className="size-3.5 text-text-muted" />{v.salary}
                      </span>
                    )}
                    {own.length > 0 && (
                      <Link to={APPLICATIONS} className="relative z-10 inline-flex h-6 items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-sunken-hover">
                        <Users weight="fill" className="size-3.5 text-text-muted" />
                        {t('vacanciesList.applications', { n: own.length })}
                        {fresh > 0 && <span className="text-danger-text">· {t('vacanciesList.newApplications', { n: fresh })}</span>}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2 border-t border-border pt-4">
                    <Dot tone={v.isActive ? 'ok' : 'neutral'}>{v.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}</Dot>
                    <span className="flex-1" />
                    <span className="inline-flex items-center gap-1 text-sm tabular-nums text-text-muted" title={t('shared.sortOrder')}>
                      <Hash weight="bold" className="size-3 text-text-faint" />{v.sortOrder}
                    </span>
                    <span className="relative z-10">
                      <IconButton size="sm" href="/vakansiyalar" label={t('shared.viewOnSite')}><ArrowSquareOut /></IconButton>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VacanciesList;
