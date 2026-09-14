import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, storeConfigFrom, ogMeta } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadCategories, loadNews, loadBanners } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  // Landing sotmaydi — mahsulot so'rovlari yo'q; bannerlar va yangiliklar admin'dan, bo'sh bo'lsa chiqmaydi.
  const [categories, news, banners] = await Promise.all([loadCategories(env), loadNews(env), loadBanners(env)]);
  return { categories, news, banners, locale, origin: new URL(request.url).origin };
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
  const { categories, news, banners, locale } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  return (
    <HomePage
      t={ctx.t} categories={categories} locale={locale}
      site={ctx.config} news={news} banners={banners}
    />
  );
}
