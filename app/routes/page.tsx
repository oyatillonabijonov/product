import { useLoaderData } from 'react-router';
import type { Route } from './+types/page';
import { loadPage } from '../lib/loaders';
import { resolveLocale, localeToTextKey } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { firstParagraph } from '../../src/lib/markdown';
import Markdown from '../../src/store/Markdown';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const page = await loadPage(context.cloudflare.env, String(params.slug));
  if (!page) throw new Response('Not Found', { status: 404 });
  return { page, locale };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const key = localeToTextKey(data.locale);
  const desc = firstParagraph(data.page.content[key]);
  return [
    { title: pageTitle(data.page.title[key], sfx) },
    ...(desc ? [{ name: 'description', content: desc }] : []),
  ];
}

export default function ContentPage() {
  const { page, locale } = useLoaderData<typeof loader>();
  const key = localeToTextKey(locale);
  return (
    <div className="max-w-[760px] mx-auto px-4 py-10 md:py-14">
      <h1 className="text-[32px] md:text-[40px] font-semibold text-primary tracking-[-0.03em] mb-6">{page.title[key]}</h1>
      <Markdown source={page.content[key]} />
    </div>
  );
}
