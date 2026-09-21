import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import type { Translation } from '../locales';
import type { ApiCategory, ApiSiteConfig } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { categoryLabel, localizedPath, localeToTextKey, type Locale } from '../../app/lib/i18n';
import { safeHref } from '../../shared/safe-href';

// ponytail: sahifalar guruhi slug bo'yicha. Yangi sahifa avtomatik "Xaridorlarga"
// ustuniga tushadi; boshqa guruhga kerak bo'lsa slug shu to'plamlardan biriga qo'shiladi.
const COMPANY = new Set(['biz-haqimizda', 'kontakt']);
const LEGAL = new Set(['oferta', 'maxfiylik']);

const linkCls = 'text-muted transition-colors duration-200 hover:text-primary';

/** Ustun: sarlavha havolalardan qalinroq va yorqinroq, o'lchami bir xil (14px). */
const Col: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="font-semibold text-primary">{title}</h3>
    <ul className="mt-3 flex flex-col gap-1.5">{children}</ul>
  </div>
);

/**
 * Footer (2026-09-14) — apple.com footer'i naqshida, sahifaning davomi bo'lib
 * turadi, alohida blok emas: fon sahifa foni, ustida bitta hairline.
 *
 * Hammasi bitta o'lchamda (14px), ierarxiya faqat qalinlik va rang bilan:
 * sarlavha `primary` qalin → havola `muted` → meta `muted-2`. Har havola bir marta:
 * sahifalar ustunlarda, huquqiy sahifalar pastki qatorda copyright yonida.
 *
 * Logo, tavsif matni va til almashtirgichi yo'q — ular Header'da. Manzil ustun
 * emas, bitta qator (ustunda to'rt qatorga bo'linib ketardi).
 *
 * Havolalar bloki `shell`dan **torroq** (1080px, apple.com footer'i ham sahifadan tor):
 * 1760px kenglikda to'rt ustun bir-biridan 400px+ uzoqlashib, sarlavhalar sochilib ketardi.
 * Qolgan o'ng tomonda (faqat `xl`dan) Yandex xarita vidjeti turadi — egasining talabi
 * (2026-09-18); u uchinchi tomon iframe'i, shuning uchun `loading="lazy"` va kichik
 * ekranlarda umuman yuklanmaydi: u yerda manzil qatoridagi havola yetarli.
 */
const Footer: FC<{
  t: Translation; locale: Locale; config: ApiSiteConfig; pageLinks: PageLink[]; categories: ApiCategory[]; hasDeals: boolean;
}> = ({ t, locale, config, pageLinks, categories, hasDeals }) => {
  const textKey = localeToTextKey(locale);
  const mapLinkHref = `https://yandex.com/maps/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${config.mapLl},pm2rdm`;
  const mapWidgetSrc = `https://yandex.com/map-widget/v1/?ll=${encodeURIComponent(config.mapLl)}&z=17&pt=${encodeURIComponent(config.mapLl)},pm2rdm`;
  const link = (to: string, label: string) => (
    <li key={to}><Link to={localizedPath(locale, to)} className={linkCls}>{label}</Link></li>
  );
  const pages = pageLinks.map((p) => ({ slug: p.slug, to: `/page/${p.slug}`, label: p.title[textKey] }));
  // Trade-In footer'da yo'q, sahifa faol qoladi — unga "Biz haqimizda"dan havola bor.
  const buyers = pages.filter((p) => !COMPANY.has(p.slug) && !LEGAL.has(p.slug) && p.slug !== 'trade-in');
  const company = pages.filter((p) => COMPANY.has(p.slug));
  const legal = pages.filter((p) => LEGAL.has(p.slug));
  const telegram = safeHref(config.telegram);
  const instagram = safeHref(config.instagram);

  return (
    <footer className="mt-auto w-full border-t border-divider bg-bg text-label">
      <div className="shell pb-8 pt-12 md:pt-14">
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-12">
          <div className="min-w-0 xl:flex-1">
            <div className="grid max-w-[1080px] grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              <Col title={t.footerShop}>
                {link('/katalog', t.catalogAll)}
                {categories.map((c) => link(`/category/${c.id}`, categoryLabel(c, locale)))}
                {/* Chegirma bo'lmasa havola ham yo'q — bo'sh sahifa tashlandiq ko'rinadi. */}
                {hasDeals && link('/chegirmalar', t.dealsTitle)}
              </Col>
              {buyers.length > 0 && <Col title={t.footerBuyers}>{buyers.map((p) => link(p.to, p.label))}</Col>}
              <Col title={t.footerCompany}>
                {company.map((p) => link(p.to, p.label))}
                {link('/vakansiyalar', t.footerCareers)}
              </Col>
              <Col title={t.footerContact}>
                {config.phone && (
                  <li><a href={`tel:${config.phone}`} className={`${linkCls} whitespace-nowrap`}>{config.phoneDisplay}</a></li>
                )}
                {telegram && <li><a href={telegram} target="_blank" rel="noopener noreferrer" className={linkCls}>Telegram</a></li>}
                {instagram && <li><a href={instagram} target="_blank" rel="noopener noreferrer" className={linkCls}>Instagram</a></li>}
              </Col>
            </div>

            <p className="mt-8 text-pretty text-muted-2">
              {t.footerAddressText1} {t.footerAddressText2}
              <span aria-hidden className="px-2">·</span>
              {t.footerTime}
              <span aria-hidden className="px-2">·</span>
              <a href={mapLinkHref} target="_blank" rel="noopener noreferrer" className="text-muted underline-offset-4 transition-colors duration-200 hover:text-primary hover:underline">
                {t.mapLink}
              </a>
            </p>
          </div>

          {/* Xarita faqat `xl`dan: kichik ekranda o'ng tomonda bo'sh joy yo'q va uchinchi tomon
              iframe'i qimmatga tushadi — u yerda manzil qatoridagi "Xaritada ochish" havolasi qoladi.
              `loading="lazy"` — footer ko'rinmaguncha Yandex'ga so'rov ketmaydi. */}
          {config.mapLl && (
            <iframe
              title={t.mapLink}
              src={mapWidgetSrc}
              loading="lazy"
              className="hidden h-52 w-full rounded-lg border border-divider xl:block xl:w-[420px] xl:shrink-0"
            />
          )}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-divider pt-4 text-muted-2 md:flex-row md:items-center md:gap-6">
          <p>{`© ${new Date().getFullYear()} ${config.name}. ${t.footerCopyright}`}</p>
          {legal.length > 0 && (
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {legal.map((p, i) => (
                <li key={p.to} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="h-3 w-px bg-line" />}
                  <Link to={localizedPath(locale, p.to)} className="transition-colors duration-200 hover:text-primary">{p.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
