import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteLoaderData } from 'react-router';
import { htmlLang, DEFAULT_LOCALE, type Locale } from './lib/i18n';
import { hreflangLinks, organizationJsonLd, type OrgContact } from './lib/seo';
import type { ApiSiteConfig } from '../shared/types';
import type { SiteAssets } from '../src/lib/site-content';
import './styles.css';

// NOTE: RR v7's `meta` export uses "last matching route wins, entire array replaced"
// semantics (docs: start/framework/route-module.md "The meta of the last matching
// route is used ... the entire meta descriptor array is replaced, not merged").
// Every leaf route under routes/store (home/category/product/search) defines its own
// `meta()`, which fully replaces routes/store's hreflang + Organization JSON-LD before
// it ever reaches <Meta />. Rendering them here in the root Layout (which always wraps
// every page) guarantees they appear on every page regardless of leaf meta overrides.
export function Layout({ children }: { children: React.ReactNode }) {
  const storeData = useRouteLoaderData('routes/store') as { locale?: Locale; siteConfig?: ApiSiteConfig; origin?: string; orgContact?: OrgContact; assets?: SiteAssets } | undefined;
  const lang = htmlLang(storeData?.locale ?? DEFAULT_LOCALE);
  const location = useLocation();
  const orgContact = storeData?.orgContact;
  const jsonLd = storeData && orgContact
    ? JSON.stringify(organizationJsonLd(storeData.siteConfig, storeData.origin, orgContact)).replace(/</g, '\\u003c')
    : '';
  const favicon = storeData?.assets?.favicon || '/favicon.svg';
  // Yandex Metrica — faqat hisoblagich sozlanganda (admin Sozlamalar → Integratsiyalar) va
  // faqat storefront'da (storeData admin/resource routelarda yo'q). Id raqamligini
  // parseSiteConfigInput kafolatlaydi — baribir Number() bilan qo'shamiz (XSS himoyasi).
  const metricaId = /^\d+$/.test(storeData?.siteConfig?.yandexMetricaId ?? '') ? Number(storeData?.siteConfig?.yandexMetricaId) : null;
  const metricaJs = metricaId === null ? '' :
    `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');window.dataLayer=window.dataLayer||[];ym(${metricaId},'init',{ssr:true,ecommerce:'dataLayer',webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});`;
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={favicon} type={favicon.endsWith('.svg') ? 'image/svg+xml' : undefined} />
        {/* Tanlangan tema paint'dan oldin qo'yiladi — aks holda yorug'/qorong'i "chaqnashi" ko'rinadi.
            Admin mavzusi saytnikidan alohida — `adminTheme` (`src/admin/theme.ts`). */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem(/^\\/admin(\\/|$)/.test(location.pathname)?'adminTheme':'theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        {storeData && (
          <>
            {hreflangLinks(location.pathname, storeData.origin ?? '').map((link) => (
              // React `hrefLang` propini HTMLga `hreflang=` qilib chiqaradi (kichik harfli prop ogohlantirish berardi).
              <link key={link.hrefLang} rel={link.rel} hrefLang={link.hrefLang} href={link.href} />
            ))}
            {jsonLd && (
              <>
                {/* eslint-disable-next-line react/no-danger */}
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
              </>
            )}
          </>
        )}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {metricaJs && (
          <>
            {/* eslint-disable-next-line react/no-danger */}
            <script dangerouslySetInnerHTML={{ __html: metricaJs }} />
            <noscript>
              <img src={`https://mc.yandex.ru/watch/${metricaId}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
            </noscript>
          </>
        )}
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}
