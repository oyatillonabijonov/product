import type { ApiBanner, ApiCategory, ApiNews, ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import type { Locale } from '../../app/lib/i18n';
import HeroColumns from './HeroColumns';
import HeroNotch from './HeroNotch';
import ServiceCards from './ServiceCards';
import NewsSection from './NewsSection';
import { loginEnabled } from './LoginPanel';
import BrandStrip from './BrandStrip';
import ConsultForm from './ConsultForm';
import BannerSlider from './BannerSlider';

/**
 * Landing hech narsa sotmaydi — u brend haqida gapiradi va mijozni hero'dagi
 * to'rt yo'nalishdan biriga uzatadi. Mahsulot ro'yxatlari, narxlar va savat
 * katalog/mahsulot sahifalarida qoladi.
 */
export default function HomePage({
  t, categories, locale, site, news, banners,
}: {
  t: Translation; categories: ApiCategory[]; locale: Locale;
  site: ApiSiteConfig; news: ApiNews[]; banners: ApiBanner[];
}) {
  return (
    <>
      <HeroNotch t={t} locale={locale} categories={categories} showAccount={loginEnabled(site)} />
      {/* Hero'da ko'rinadigan h1 yo'q (kartalar o'zi sarlavha) — ierarxiya uchun sr-only. */}
      <h1 className="sr-only">{`${site.name} — ${t.proTitle}`}</h1>
      <HeroColumns categories={categories} />
      <div className="shell flex flex-col gap-16 py-14 md:gap-24 md:py-20">
        {/* Admin bannerlari (aksiya, yangi kelgan tovar) — hero'dan keyin, bo'sh bo'lsa hech narsa. */}
        {banners.length > 0 && <BannerSlider banners={banners} locale={locale} t={t} />}
        <ServiceCards t={t} />
        <NewsSection t={t} news={news} locale={locale} />
        <BrandStrip title={t.homeBrands} />
        <ConsultForm t={t} config={site} />
      </div>
    </>
  );
}
