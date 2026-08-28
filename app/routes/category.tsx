import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { localeField, resolveLocale, categoryLabel } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands } from '../lib/loaders';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';
import CategoryCover from '../../src/store/CategoryCover';
import PcConfigurator from '../../src/store/PcConfigurator';
import { columnForCategory } from '../../src/store/hero-columns';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  const slug = params.slug as string;
  const filters = parseCatalogFilters(new URL(request.url).searchParams, { category: slug });
  // Avval arzon kategoriya tekshiruvi — noma'lum slug (bot probing) qolgan og'ir
  // so'rovlarni ishga tushirmasin (free-tier D1).
  const categories = await loadCategories(env);
  const category = categories.find((c) => c.id === slug);
  if (!category) throw new Response('Not Found', { status: 404 }); // noma'lum slug 200 + soft-404 bo'lib indekslanmasin
  const [result, config, brands] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadBrands(env),
  ]);
  const title = categoryLabel(category, locale);
  return { result, config, title, brands, filters, requestUrl: request.url, category };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  return catalogMeta(pageTitle(data.title, sfx), data.requestUrl);
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters, category } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  // Cover — avval kategoriyaning o'z rasmi (admin yuklaydi). Bo'lmasa landing
  // ustuni, lekin faqat o'zinikida: HERO_COLUMNS landing uchun yasalgan, boshqa
  // kategoriyada uning rasmi ham, matni ham yolg'on gapiradi.
  const col = columnForCategory(category);
  const own = category.coverUrl
    ? { img: category.coverUrl, lede: localeField(category.coverLede, category.coverLedeRu, ctx.locale) }
    : null;
  const cover = own ?? (col && col.primary === category.id ? { img: col.img, tag: col.tag, lede: col.lede } : null);
  return (
    <>
      {cover && <CategoryCover {...cover} title={title} total={result.total} t={ctx.t} />}
      <CatalogView t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters} hideTitle={!!cover} />
      {category.id === 'pc' && (
        <div className="max-w-[1440px] mx-auto px-4 pb-14 md:pb-20">
          <PcConfigurator t={ctx.t} />
        </div>
      )}
    </>
  );
}
