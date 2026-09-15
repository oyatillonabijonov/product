import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/category';
import { resolveLocale, categoryLabel, localeToLang } from '../lib/i18n';
import { pageTitle, catalogMeta, storeConfigFrom } from '../lib/seo';
import { siteConfig } from '../lib/site.config';
import { parseCatalogFilters } from '../lib/catalog';
import { queryProducts, loadConfig, loadCategories, loadBrands, loadProductsBy } from '../lib/loaders';
import { categoryTiles } from '../lib/tiles';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import CatalogView from '../../src/store/CatalogView';
import CategoryCover from '../../src/store/CategoryCover';
import CategoryTiles from '../../src/store/CategoryTiles';
import PcConfigurator, { PC_SLOTS } from '../../src/store/PcConfigurator';
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
  const tiles = categoryTiles(slug, locale === 'ru' ? 'ru' : 'uz');
  // PC konfiguratori — har bo'g'in uchun shu turdagi haqiqiy tovarlar (qoldiqli, rasmli).
  const parts: Record<string, Awaited<ReturnType<typeof loadProductsBy>>> = {};
  if (slug === 'pc') {
    await Promise.all(PC_SLOTS.map(async (s) => { parts[s.key] = await loadProductsBy(env, { category: 'pc', type: s.type, limit: 12 }); }));
  }
  return { result, config, title, brands, filters, requestUrl: request.url, category, tiles, locale, parts };
}

export function meta({ data, matches }: Route.MetaArgs) {
  const sfx = storeConfigFrom(matches)?.seoTitleSuffix;
  if (!data) return [{ title: pageTitle(undefined, sfx) }];
  const t = translations[localeToLang(data.locale)];
  const desc = t.metaCatalogDesc.replace('{title}', data.title).replace('{store}', storeConfigFrom(matches)?.name ?? siteConfig.name);
  return catalogMeta(pageTitle(data.title, sfx), data.requestUrl, desc);
}

export default function CategoryRoute() {
  const { result, config, title, brands, filters, category, tiles, parts } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<StoreContext>();
  // Cover — avval kategoriyaning o'z rasmi (admin yuklaydi). Bo'lmasa landing
  // ustuni, lekin faqat o'zinikida: HERO_COLUMNS landing uchun yasalgan, boshqa
  // kategoriyada uning rasmi ham, matni ham yolg'on gapiradi.
  const col = columnForCategory(category);
  const isOwnColumn = col !== null && col.primary === category.id;
  const own = category.coverUrl ? { img: category.coverUrl } : null;
  const base = own ?? (isOwnColumn ? { img: col.img } : null);
  // Video — yo'nalishning o'z san'ati, shuning uchun admin rasmi bo'lsa ham u
  // poster bo'lib qoladi, harakat esa videodan keladi.
  const cover = base && isOwnColumn && col.videos
    ? { ...base, videos: col.videos, poster: col.poster }
    : base;
  return (
    <>
      {cover && <CategoryCover {...cover} t={ctx.t} />}
      {/* Sarlavha davomi har bir yo'nalishda bir xil — bu do'konning va'dasi,
          yo'nalishning ta'rifi emas; shuning uchun `HERO_COLUMNS`da emas,
          `locales.ts`da turadi (ru tarjimasi bilan). */}
      <CatalogView
        t={ctx.t} title={title} result={result} config={config} brands={brands} filters={filters}
        subtitle={isOwnColumn ? ctx.t.proTitle : undefined}
        tiles={<CategoryTiles tiles={tiles} t={ctx.t} />}
      />
      {category.id === 'pc' && (
        <div className="shell pb-14 md:pb-20">
          <PcConfigurator t={ctx.t} locale={ctx.locale} parts={parts} />
        </div>
      )}
    </>
  );
}
