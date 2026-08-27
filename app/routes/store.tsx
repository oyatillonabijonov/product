import { Outlet, isRouteErrorResponse, redirect, useLoaderData, useLocation, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang, localizedPath, DEFAULT_LOCALE, type Locale } from '../lib/i18n';
import { loadSiteConfig, loadPages, loadCategories, publicSiteConfig, type PageLink } from '../lib/loaders';
import { loadCustomer } from '../../functions/lib/db';
import { getCookie, verifySession } from '../../functions/lib/auth';
import type { ApiCustomer } from '../../shared/types';
import { translations } from '../../src/locales';
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
  const env = context.cloudflare.env;
  // Kategoriyalar ham shu yerda — Header dropdown'i SSR HTMLda chiqadi
  // (crawler ichki linklarni ko'radi) va klientdagi qo'shimcha /api/categories so'rovi yo'qoladi.
  const [siteConfig, pages, categories] = await Promise.all([loadSiteConfig(env), loadPages(env), loadCategories(env)]);
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
  return { locale, siteConfig: publicSiteConfig(siteConfig), pageLinks, categories, customer, origin: new URL(request.url).origin };
}

export default function StoreRoot() {
  const { locale, siteConfig, pageLinks, categories, customer } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t} config={siteConfig} customer={customer} pageLinks={pageLinks} categories={categories}>
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
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-[40px] font-semibold">{notFound ? '404' : t.errorGeneric.split('.')[0]}</h1>
      <p className="text-muted">{notFound ? t.notFoundTitle : t.errorGeneric}</p>
      <a href={localizedPath(locale, '/')} className="px-6 py-3 bg-accent text-bg font-semibold rounded-full">
        {t.backHome}
      </a>
    </div>
  );
}
