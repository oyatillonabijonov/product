import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale, categoryLabel } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands, loadTypes, loadConfiguratorParts, loadT } from '../lib/loaders';
import { categoryTiles } from '../lib/tiles';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';
import CategoryCover from '../../src/store/CategoryCover';
import CategoryTiles from '../../src/store/CategoryTiles';
import PcConfigurator from '../../src/store/PcConfigurator';
import PcBuildPromo from '../../src/store/PcBuildPromo';
import { columnForCategory, heroColumns } from '../../src/store/hero-columns';
import { useAssets } from '../../src/store/SiteAssets';

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
  const [result, config, brands, types, t] = await Promise.all([
    queryProducts(env, filters), loadConfig(env), loadBrands(env), loadTypes(env), loadT(env, locale),
  ]);
  const title = categoryLabel(category, locale);
  const tiles = categoryTiles(types, slug, locale === 'ru' ? 'ru' : 'uz');
  // PC konfiguratori — hamma Billz PC qismlari (omborda va buyurtma asosida), moslik atributlari bilan.
  const parts = slug === 'pc' ? await loadConfiguratorParts(env) : {};
  return { result, config, title, brands, filters, requestUrl: request.url, category, tiles, parts, metaDesc: t.metaCatalogDesc };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const desc = data.metaDesc.replace('{title}', data.title).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.title, sfx), data.requestUrl, desc);
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters, category, tiles, parts } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  const asset = useAssets();
  // Cover — avval kategoriyaning o'z rasmi (admin → Kategoriyalar). Bo'lmasa landing ustuni, lekin faqat
  // o'zinikida: landing kartalari yo'nalishlar uchun, boshqa kategoriyada ularning rasmi yolg'on gapiradi.
  const col = columnForCategory(heroColumns(ctx.t, asset), category);
  const isOwnColumn = col !== null && col.primary === category.id;
  const own = category.coverUrl ? { img: category.coverUrl } : null;
  const base = own ?? (isOwnColumn ? { img: col.img } : null);
  // Video — yo'nalishning o'z san'ati (admin → Kontent → Bosh sahifa), shuning uchun kategoriya rasmi bo'lsa ham
  // u poster bo'lib qoladi, harakat esa videodan keladi.
  const cover = base && isOwnColumn && col.videos.length > 0
    ? { ...base, videos: col.videos, poster: col.poster || undefined }
    : base;
  return (
    <>
      {cover && <CategoryCover {...cover} t={ctx.t} />}
      {/* Sarlavha davomi har bir yo'nalishda bir xil — bu do'konning va'dasi,
          yo'nalishning ta'rifi emas; shuning uchun landing kartalarida emas,
          `locales.ts`da turadi (ru tarjimasi bilan). */}
      <CatalogView
        t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters}
        subtitle={isOwnColumn ? ctx.t.proTitle : undefined}
        tiles={<CategoryTiles tiles={tiles} t={ctx.t} />}
        promo={category.id === 'pc' ? <PcBuildPromo t={ctx.t} /> : undefined}
      />
      {category.id === 'pc' && (
        <div className="shell pb-14 md:pb-20">
          <PcConfigurator t={ctx.t} locale={ctx.locale} parts={parts} />
        </div>
      )}
    </>
  );
}
