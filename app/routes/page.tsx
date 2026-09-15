import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/page';
import { loadPage } from '../lib/loaders';
import { resolveLocale, localeToTextKey, localeToLang } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { firstParagraph } from '../../src/lib/markdown';
import { translations } from '../../src/locales';
import Markdown from '../../src/store/Markdown';
import TermsBento from '../../src/store/TermsBento';
import AboutPage from '../../src/store/AboutPage';
import type { StoreContext } from '../../src/store/StoreLayout';

/** "Biz haqimizda" — markdown o'rniga maxsus sahifa (matn `locales.ts`da); sarlavha va footer havolasi bazadagi yozuvdan. */
const ABOUT_SLUG = 'biz-haqimizda';

/** Slug rendered with the bespoke bento layout instead of generic markdown — faqat muddatli to'lov yoqilganda;
 *  naqd rejimda (`payment_mode='cash'`) sahifa bazadagi matnni ko'rsatadi, muddatli shartlar yolg'on bo'lardi. */
const TERMS_SLUG = 'muddatli-tolov';
const TERMS_LEAD: Record<string, string> = {
  uz: "Muddatli to'lovni rasmiylashtirish juda oddiy — quyidagi shartlar bilan tanishing.",
  ru: 'Оформить рассрочку очень просто — ознакомьтесь с условиями ниже.',
  en: 'Getting installment is simple — here are the conditions.',
  uzCyrl: 'Муддатли тўловни расмийлаштириш жуда оддий — қуйидаги шартлар билан танишинг.',
};

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const page = await loadPage(context.env, String(params.slug));
  if (!page) throw new Response('Not Found', { status: 404 });
  return { page, locale };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const key = localeToTextKey(data.locale);
  const desc = data.page.slug === ABOUT_SLUG
    ? translations[localeToLang(data.locale)].aboutLede
    : firstParagraph(data.page.content[key]);
  return [
    { title: pageTitle(data.page.title[key], sfx) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
  ];
}

export default function ContentPage() {
  const { page, locale } = useLoaderData<typeof loader>();
  const { config, t } = useOutletContext<StoreContext>();
  const key = localeToTextKey(locale);

  if (page.slug === ABOUT_SLUG) return <AboutPage t={t} config={config} title={page.title[key]} />;

  if (page.slug === TERMS_SLUG && config.paymentMode !== 'cash') {
    return <TermsBento locale={locale} heading={page.title[key]} lead={TERMS_LEAD[key]} />;
  }

  return (
    <div className="max-w-[760px] mx-auto px-4 py-10 md:py-14">
      <h1 className="text-heading md:text-title font-semibold text-primary mb-6">{page.title[key]}</h1>
      <Markdown source={page.content[key]} />
    </div>
  );
}
