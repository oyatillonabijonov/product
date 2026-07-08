import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/home';
import { resolveLocale } from '../lib/i18n';
import { pageTitle, storeConfigFrom, ogMeta } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { loadStore, loadCategories, loadBanners, loadBrands, loadRail, loadPage } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import HomePage from '../../src/store/HomePage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const [{ products, config }, categories, banners, deals, latest, brands, faqPage] = await Promise.all([
    loadStore(env, { limit: 12 }), loadCategories(env), loadBanners(env),
    loadRail(env, 'deals'), loadRail(env, 'latest'), loadBrands(env), loadPage(env, 'faq'),
  ]);
  return { products, config, categories, banners, deals, latest, brands, faqPage, locale, origin: new URL(request.url).origin };
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
  const { products, config, categories, banners, deals, latest, brands, faqPage, locale } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  // Hero'dagi ikkilamchi CTA — shartlar sahifasi (mobil headerdagi pill-qator o'rniga).
  const termsPage = ctx.pageLinks.find((p) => p.slug === 'muddatli-tolov') ?? null;
  return (
    <HomePage
      t={ctx.t} products={products} config={config} categories={categories}
      banners={banners} deals={deals} latest={latest} brands={brands} locale={locale} faqPage={faqPage}
      site={ctx.config} termsPage={termsPage}
    />
  );
}
