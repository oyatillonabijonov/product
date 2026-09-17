import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/page';
import { loadPage, loadT } from '../lib/loaders';
import { resolveLocale, localeToTextKey } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { firstParagraph } from '../../src/lib/markdown';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../src/lib/page-slugs';
import type { Translation } from '../../src/locales';
import Markdown from '../../src/store/Markdown';
import AboutPage from '../../src/store/AboutPage';
import LegalPage from '../../src/store/LegalPage';
import type { StoreContext } from '../../src/store/StoreLayout';

/**
 * Huquqiy hujjatlar va "Shartlar" (`muddatli-tolov`) `LegalPage` shablonida — matn bazadan, hero izohi va meta
 * description sayt matnlaridan. "Shartlar" to'lov rejimidan qat'i nazar shu shablonda (2026-09-17: `TermsBento` olib tashlandi).
 */
function legalLede(t: Translation, slug: string): string | undefined {
  const key = LEGAL_LEDE_KEYS[slug];
  return key ? t[key] : undefined;
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const slug = String(params.slug);
  const [page, t] = await Promise.all([loadPage(context.env, slug), loadT(context.env, locale)]);
  if (!page) throw new Response('Not Found', { status: 404 });
  // `meta()` bazaga kira olmaydi — admin'da tahrirlangan izoh shu yerda olinadi.
  const lede = slug === ABOUT_SLUG ? t.aboutLede : legalLede(t, slug) ?? null;
  return { page, locale, lede };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const key = localeToTextKey(data.locale);
  const desc = data.lede ?? firstParagraph(data.page.content[key]);
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

  const lede = legalLede(t, page.slug);
  if (lede) return <LegalPage t={t} title={page.title[key]} lede={lede} source={page.content[key]} />;

  return (
    <div className="max-w-[760px] mx-auto px-4 py-10 md:py-14">
      <h1 className="text-heading md:text-title font-semibold text-primary mb-6">{page.title[key]}</h1>
      <Markdown source={page.content[key]} />
    </div>
  );
}
