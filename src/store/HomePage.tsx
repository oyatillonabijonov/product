import type { ApiBrand, ApiCategory, ApiPage, ApiPost, ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import { localeToTextKey, type Locale } from '../../app/lib/i18n';
import HeroColumns from './HeroColumns';
import HeroNotch from './HeroNotch';
import ProApproach from './ProApproach';
import ServiceCards from './ServiceCards';
import BlogSection from './BlogSection';
import BrandStrip from './BrandStrip';
import FaqSection from './FaqSection';

/**
 * Landing hech narsa sotmaydi — u brend haqida gapiradi va mijozni hero'dagi
 * to'rt yo'nalishdan biriga uzatadi. Mahsulot ro'yxatlari, narxlar va savat
 * katalog/mahsulot sahifalarida qoladi.
 */
export default function HomePage({
  t, categories, brands, locale, faqPage, site, posts,
}: {
  t: Translation; categories: ApiCategory[]; brands: ApiBrand[]; locale: Locale;
  faqPage: ApiPage | null; site: ApiSiteConfig; posts: ApiPost[];
}) {
  const textKey = localeToTextKey(locale);
  return (
    <>
      <HeroNotch t={t} locale={locale} categories={categories} />
      {/* Hero'da ko'rinadigan h1 yo'q (kartalar o'zi sarlavha) — ierarxiya uchun sr-only. */}
      <h1 className="sr-only">{`${site.name} — ${t.proTitle}`}</h1>
      <HeroColumns categories={categories} />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-16 px-4 py-14 md:gap-24 md:py-20">
        <ProApproach t={t} />
        <ServiceCards t={t} />
        <BlogSection title={t.blogTitle} lead={t.blogLead} allLabel={t.blogAll} posts={posts} locale={locale} />
        <BrandStrip title={t.homeBrands} brands={brands} />
        {faqPage && <FaqSection title={faqPage.title[textKey]} content={faqPage.content[textKey]} />}
      </div>
    </>
  );
}
