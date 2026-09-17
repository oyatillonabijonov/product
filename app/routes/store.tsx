import { Outlet, isRouteErrorResponse, redirect, useLoaderData, useLocation, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang, localizedPath, DEFAULT_LOCALE, type Locale } from '../lib/i18n';
import { loadSiteConfig, loadPages, loadCategories, loadConfig, hasDeals, publicSiteConfig, loadSiteTexts, type PageLink } from '../lib/loaders';
import type { OrgContact } from '../lib/seo';
import { CURRENCY_COOKIE, parseCurrency } from '../../src/lib/currency';
import { textOverrides } from '../../src/lib/site-content';
import { loadCustomer } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import type { ApiCustomer } from '../../shared/types';
import { translations, type Translation } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  // /uz/* — default locale'ning dublikati: bare yo'lga doimiy redirect (SEO duplicate + buzuq
  // hreflang/til almashtirgichning oldini oladi).
  if (params.lang === DEFAULT_LOCALE) {
    const url = new URL(request.url);
    const bare = url.pathname.replace(/^\/uz(?=\/|$)/, '') || '/';
    throw redirect(bare + url.search, 301);
  }
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.env;
  // Kategoriyalar ham shu yerda — Header dropdown'i SSR HTMLda chiqadi
  // (crawler ichki linklarni ko'radi) va klientdagi qo'shimcha /api/categories so'rovi yo'qoladi.
  const [siteConfig, pages, categories, deals, settings, siteTexts] = await Promise.all([
    loadSiteConfig(env), loadPages(env), loadCategories(env), hasDeals(env), loadConfig(env), loadSiteTexts(env),
  ]);
  const pageLinks: PageLink[] = pages.map((p) => ({ slug: p.slug, title: p.title }));
  // Kirgan mijoz — sessiya sirini allaqachon yuklangan siteConfig'dan olamiz (qo'shimcha D1 o'qishsiz).
  const token = getCookie(request, 'customer_session');
  let customer: ApiCustomer | null = null;
  if (token && siteConfig.customerSessionSecret) {
    const cid = await verifySession(token, siteConfig.customerSessionSecret, Math.floor(Date.now() / 1000));
    if (cid) customer = await loadCustomer(env, Number(cid));
  }
  // origin — root.tsx'dagi hreflang va route meta'lardagi absolut URL'lar uchun.
  // publicSiteConfig — sirlar (bot token, OAuth secret, sessiya siri) klientga (HTML) chiqmasin.
  // Valyuta tanlovi cookie'da (USD bo'lsa server/index.ts javobni umumiy keshdan chiqaradi).
  const currency = parseCurrency(getCookie(request, CURRENCY_COOKIE));
  // Admin'da o'zgartirilgan matnlar — faqat joriy til va registr kalitlari; komponent ularni `locales.ts` ustiga qo'yadi.
  const texts = textOverrides(siteTexts, locale === 'ru' ? 'ru' : 'uz');
  const tt: Translation = { ...translations[localeToLang(locale)], ...texts };
  // Organization JSON-LD (root.tsx) manzili va ish vaqti — sayt matnlaridan.
  const orgContact: OrgContact = { address: `${tt.footerAddressText1} ${tt.footerAddressText2}`, openingHours: tt.seoOpeningHours };
  return {
    locale, siteConfig: publicSiteConfig(siteConfig), pageLinks, categories, customer, deals, currency, usdRate: settings.usdToUzs,
    origin: new URL(request.url).origin, texts, orgContact,
  };
}

export default function StoreRoot() {
  const { locale, siteConfig, pageLinks, categories, customer, deals, currency, usdRate, texts } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t: Translation = { ...translations[lang], ...texts };
  return (
    <StoreLayout locale={locale} lang={lang} t={t} config={siteConfig} customer={customer} pageLinks={pageLinks} categories={categories} hasDeals={deals} currency={currency} usdRate={usdRate}>
      <Outlet context={{ t, lang, locale, config: siteConfig, customer, pageLinks }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { pathname } = useLocation();
  const locale: Locale = pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'uz';
  const t = translations[localeToLang(locale)];
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const heading = notFound ? '404' : t.errorGeneric.split('.')[0];
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      {/* Layout loader'i yiqilganda meta() ishlamaydi — React 19 <title>'ni head'ga o'zi ko'taradi. */}
      <title>{notFound ? `404 — ${t.notFoundTitle}` : heading}</title>
      <h1 className="text-title font-semibold">{heading}</h1>
      <p className="text-muted">{notFound ? t.notFoundTitle : t.errorGeneric}</p>
      <a href={localizedPath(locale, '/')} className="px-6 py-3 bg-accent text-bg font-semibold rounded-full">
        {t.backHome}
      </a>
    </div>
  );
}
