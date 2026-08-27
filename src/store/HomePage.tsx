import type { ApiCategory, ApiPost, ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import HeroColumns from './HeroColumns';
import HeroNotch from './HeroNotch';
import ServiceCards from './ServiceCards';
import BlogSection from './BlogSection';
import BrandStrip from './BrandStrip';
import ConsultForm from './ConsultForm';

/**
 * Landing hech narsa sotmaydi — u brend haqida gapiradi va mijozni hero'dagi
 * to'rt yo'nalishdan biriga uzatadi. Mahsulot ro'yxatlari, narxlar va savat
 * katalog/mahsulot sahifalarida qoladi.
 */
export default function HomePage({
  t, categories, locale, site, posts,
}: {
  t: Translation; categories: ApiCategory[]; locale: Locale;
  site: ApiSiteConfig; posts: ApiPost[];
}) {
  return (
    <>
      <HeroNotch t={t} locale={locale} categories={categories} />
      {/* Hero'da ko'rinadigan h1 yo'q (kartalar o'zi sarlavha) — ierarxiya uchun sr-only. */}
      <h1 className="sr-only">{`${site.name} — ${t.proTitle}`}</h1>
      <HeroColumns categories={categories} />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-16 px-4 py-14 md:gap-24 md:py-20">
        <ServiceCards t={t} />
        <BlogSection title={t.blogTitle} allLabel={t.blogAll} posts={posts} locale={locale} />
        <BrandStrip title={t.homeBrands} />
        <ConsultForm t={t} config={site} />
      </div>
    </>
  );
}
