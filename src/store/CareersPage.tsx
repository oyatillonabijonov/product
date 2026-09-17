import { useState } from 'react';
import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Cpu, Layers, MessagesSquare, Wrench } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiVacancy, EmploymentType } from '../../shared/types';
import { localeField, type Locale } from '../../app/lib/i18n';
import { renderMarkdown } from '../lib/markdown';
import { MdBlockView } from './Markdown';
import JobApplyForm from './JobApplyForm';
import { BTN_LG, BTN_MD, LINK_MORE, SECTION_HEADING } from './ui';
import { useAssets } from './SiteAssets';

const EMPLOYMENT_KEY: Record<EmploymentType, 'employmentFull' | 'employmentPart' | 'employmentIntern'> = {
  full: 'employmentFull', part: 'employmentPart', intern: 'employmentIntern',
};

const EYEBROW = 'text-copy font-semibold text-muted-2';

/** Ochiq ariza oynasi: aniq vakansiyaga yoki umumiy (`vacancy: null`). */
type Applying = { vacancy: ApiVacancy | null } | null;

/** Vakansiya qatori — `<details>`: yopiqda nom va meta, ochilganda tavsif va "Ariza topshirish". */
const VacancyItem: FC<{ t: Translation; locale: Locale; vacancy: ApiVacancy; onApply: () => void }> = ({ t, locale, vacancy: v, onApply }) => {
  const meta = [localeField(v.department, v.departmentRu, locale), t[EMPLOYMENT_KEY[v.employment]], localeField(v.salary, v.salaryRu, locale)]
    .filter((x) => x !== '');
  return (
    <li className="border-b border-divider">
      <details className="group">
        <summary className="press press-surface flex cursor-pointer list-none items-center gap-4 py-6 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <h3 className="text-subhead font-semibold text-balance text-primary">{localeField(v.title, v.titleRu, locale)}</h3>
            <p className="mt-1 text-copy text-muted">{meta.join(' · ')}</p>
          </div>
          <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-muted-3 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="flex max-w-[760px] flex-col gap-4 pb-8 text-copy">
          {/* Tavsifdagi `##` vakansiya nomi (h3) ostida — bir pog'ona past chiziladi, aks holda nom bilan bir o'lchamda turardi. */}
          {renderMarkdown(localeField(v.description, v.descriptionRu, locale)).map((b, i) => (
            <MdBlockView key={i} block={b.type === 'h2' ? { ...b, type: 'h3' } : b} />
          ))}
          <button type="button" onClick={onApply} className={`${BTN_MD} mt-2 self-start bg-cta text-white hover:bg-cta-hover`}>
            {t.careersApply}
          </button>
        </div>
      </details>
    </li>
  );
};

/**
 * "Vakansiyalar" (2026-09-15) — apple.com/careers/us tuzilishida: qora hero → katta kirish matni →
 * "ProDuct'da ishlash" (foto + kompaniya gapi) → "Jamoadagi hayot" (egasining yashil gradienti) →
 * "Bizda ish qanday" (faqat ish mazmuni faktlari) → ochiq vakansiyalar + ariza.
 * Xodim iqtiboslari va imtiyozlar o'ylab topilmaydi (spec §1).
 */
const CareersPage: FC<{ t: Translation; locale: Locale; vacancies: ApiVacancy[] }> = ({ t, locale, vacancies }) => {
  const [applyingRaw, setApplying] = useState<Applying>(null);
  const applying = applyingRaw as Applying;
  const asset = useAssets();
  const why: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: Cpu, title: t.careersWhyTechTitle, text: t.careersWhyTechText },
    { icon: MessagesSquare, title: t.careersWhyClientTitle, text: t.careersWhyClientText },
    { icon: Wrench, title: t.careersWhyServiceTitle, text: t.careersWhyServiceText },
    { icon: Layers, title: t.careersWhyTeamTitle, text: t.careersWhyTeamText },
  ];

  return (
    <>
      {/* Hero ikkala mavzuda qora — apple.com/careers kabi; logo Apple'dagi belgining o'rnida. */}
      <section className="shell-box mt-4 flex min-h-[420px] flex-col items-center justify-center rounded-xl bg-black px-6 py-20 text-center md:min-h-[560px]">
        <img src={asset('logoDark')} alt="" className="h-9 w-auto md:h-12" />
        <h1 className="mt-8 text-balance text-heading font-semibold text-white md:text-display">{t.careersHeroTitle}</h1>
        <a href="#vakansiyalar" className={`${BTN_LG} mt-8 bg-white text-black hover:bg-white/90`}>{t.careersHeroCta}</a>
      </section>

      <section className="shell py-16 md:py-24">
        <p className="mx-auto max-w-[900px] text-balance text-center text-subhead font-semibold text-primary md:text-heading">{t.careersIntro}</p>
      </section>

      <section className="shell grid items-center gap-8 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <p className={EYEBROW}>{t.careersWorkEyebrow}</p>
          <h2 className={`mt-3 ${SECTION_HEADING}`}>{t.careersWorkTitle}</h2>
          <p className="mt-5 text-copy text-pretty text-body md:text-lede">{t.careersWorkText}</p>
          <a href="#vakansiyalar" className={`${LINK_MORE} mt-6`}>{t.careersHeroCta}<ChevronRight aria-hidden className="mt-px h-4 w-4" /></a>
        </div>
        {/* Matn md'dan fotoning chap-yuqori qorong'i qismida; mobilda foto ostida (tor kadrda yuzlarga tushardi). */}
        <figure className="relative isolate overflow-hidden rounded-xl bg-black lg:col-span-7">
          <img src={asset('careers.work')} alt="" loading="lazy" className="aspect-[3/2] w-full object-cover" />
          <figcaption className="p-6 md:absolute md:inset-x-0 md:top-0 md:w-[55%] md:p-10">
            <blockquote className="text-subhead font-semibold text-balance text-white md:text-heading">“{t.careersWorkQuote}”</blockquote>
            <p className="mt-3 text-copy text-white/70">{t.careersQuoteBy}</p>
          </figcaption>
        </figure>
      </section>

      <section className="shell grid items-center gap-8 pb-16 md:pb-24 lg:grid-cols-12 lg:gap-12">
        <div className="lg:order-2 lg:col-span-5">
          <p className={EYEBROW}>{t.careersLifeEyebrow}</p>
          <h2 className={`mt-3 ${SECTION_HEADING}`}>{t.careersLifeTitle}</h2>
          <p className="mt-5 text-copy text-pretty text-body md:text-lede">{t.careersLifeText}</p>
        </div>
        {/* Egasining yashil gradienti — "Biz haqimizda" hero'si oilasidan; qorong'ida `dark-invert`. */}
        <figure className="relative isolate flex min-h-[260px] items-center overflow-hidden rounded-xl p-8 md:min-h-[380px] md:p-12 lg:order-1 lg:col-span-7">
          <img src={asset('careers.life')} alt="" loading="lazy" className="dark-invert absolute inset-0 -z-10 h-full w-full object-cover" />
          <p className="max-w-[520px] text-heading font-semibold text-balance text-primary md:text-title">{t.careersLifeCard}</p>
        </figure>
      </section>

      <section className="shell pb-16 md:pb-24">
        <h2 className={SECTION_HEADING}>{t.careersWhyTitle} <span className="text-muted-2">{t.careersWhyMuted}</span></h2>
        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 lg:grid-cols-4">
          {why.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl bg-surface p-8">
              <Icon aria-hidden className="h-10 w-10 text-link" strokeWidth={1.5} />
              <h3 className="mt-6 text-subhead font-semibold text-balance text-primary">{title}</h3>
              <p className="mt-3 text-copy text-pretty text-body">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vakansiyalar" className="shell scroll-mt-32 pb-14 md:pb-20 lg:scroll-mt-28">
        <h2 className={SECTION_HEADING}>{t.careersRolesTitle}</h2>
        {vacancies.length === 0 ? (
          <div className="mt-8 rounded-xl bg-surface p-8 md:mt-10 md:p-10">
            <p className="max-w-[640px] text-copy text-pretty text-body md:text-lede">{t.careersRolesEmpty}</p>
            <button type="button" onClick={() => setApplying({ vacancy: null })} className={`${BTN_MD} mt-6 bg-cta text-white hover:bg-cta-hover`}>
              {t.careersGeneralApply}
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-8 border-t border-divider md:mt-10">
              {vacancies.map((v) => (
                <VacancyItem key={v.id} t={t} locale={locale} vacancy={v} onApply={() => setApplying({ vacancy: v })} />
              ))}
            </ul>
            <button type="button" onClick={() => setApplying({ vacancy: null })} className={`${LINK_MORE} mt-6`}>
              {t.careersGeneralApply}<ChevronRight aria-hidden className="mt-px h-4 w-4" />
            </button>
          </>
        )}
      </section>

      {applying && (
        <JobApplyForm
          t={t}
          vacancyId={applying.vacancy?.id ?? null}
          position={applying.vacancy ? localeField(applying.vacancy.title, applying.vacancy.titleRu, locale) : t.careersGeneralPosition}
          onClose={() => setApplying(null)}
        />
      )}
    </>
  );
};

export default CareersPage;
