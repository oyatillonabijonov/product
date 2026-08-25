import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, storeConfigFrom, ogMeta } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadCategories, loadPosts } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  // Landing sotmaydi — mahsulot/banner so'rovlari olib tashlandi (D1 free-tier'da
  // har bir sahifa ochilishi uchun 4 ta ortiqcha so'rov edi).
  const [categories, posts] = await Promise.all([loadCategories(env), loadPosts(env, 3)]);
  return { categories, posts, locale, origin: new URL(request.url).origin };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const cfg = storeConfigFrom(matches);
  const title = pageTitle(undefined, cfg?.seoTitleSuffix);
  const desc = cfg?.seoDescription ?? siteConfig.seo.description;
  const img = cfg?.ogImage;
  return [
    { title },
    ...(data ? [{ tagName: 'link', rel: 'canonical', href: data.origin + (data.locale === 'uz' ? '/' : `/${data.locale}`) }] : []),
    { name: 'description', content: desc },
    ...ogMeta({
      title,
      description: desc,
      image: img ? (img.startsWith('http') ? img : (data?.origin ?? '') + img) : undefined,
      url: data ? data.origin + (data.locale === 'uz' ? '/' : `/${data.locale}`) : undefined,
    }),
  ];
}

export default function HomeRoute() {
  const { categories, posts, locale } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return (
    <HomePage
      t={ctx.t} categories={categories} locale={locale}
      site={ctx.config} posts={posts}
    />
  );
}
