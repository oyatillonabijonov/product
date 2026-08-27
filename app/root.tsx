import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useRouteLoaderData } from 'react-router';
import { htmlLang, DEFAULT_LOCALE, type Locale } from './lib/i18n';
import { hreflangLinks, organizationJsonLd } from './lib/seo';
import type { ApiSiteConfig } from '../shared/types';
import './styles.css';

// NOTE: RR v7's `meta` export uses "last matching route wins, entire array replaced"
// semantics (docs: start/framework/route-module.md "The meta of the last matching
// route is used ... the entire meta descriptor array is replaced, not merged").
// Every leaf route under routes/store (home/category/product/search) defines its own
// `meta()`, which fully replaces routes/store's hreflang + Organization JSON-LD before
// it ever reaches <Meta />. Rendering them here in the root Layout (which always wraps
// every page) guarantees they appear on every page regardless of leaf meta overrides.
export function Layout({ children }: { children: React.ReactNode }) {
  const storeData = useRouteLoaderData('routes/store') as { locale?: Locale; siteConfig?: ApiSiteConfig; origin?: string } | undefined;
  const lang = htmlLang(storeData?.locale ?? DEFAULT_LOCALE);
  const location = useLocation();
  const jsonLd = JSON.stringify(organizationJsonLd(storeData?.siteConfig)).replace(/</g, '\\u003c');
  // Yandex Metrica — faqat hisoblagich sozlanganda (admin "Sayt ma'lumotlari") va
  // faqat storefront'da (storeData admin/resource routelarda yo'q). Id raqamligini
  // parseSiteConfigInput kafolatlaydi — baribir Number() bilan qo'shamiz (XSS himoyasi).
  const metricaId = /^\d+$/.test(storeData?.siteConfig?.yandexMetricaId ?? '') ? Number(storeData?.siteConfig?.yandexMetricaId) : null;
  const metricaJs = metricaId === null ? '' :
    `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${metricaId},'init',{ssr:true,webvisor:true,clickmap:true,trackLinks:true,accurateTrackBounce:true});`;
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Tanlangan tema paint'dan oldin qo'yiladi — aks holda yorug'/qorong'i "chaqnashi" ko'rinadi. */}
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}" }} />
        {storeData && (
          <>
            {hreflangLinks(location.pathname, storeData.origin ?? '').map((link) => (
              // lowercase `hreflang` (not `hrefLang`) so React emits the literal HTML
              // attribute name `hreflang=` instead of the DOM-property-cased `hrefLang=`.
              <link key={link.hrefLang} rel={link.rel} hreflang={link.hrefLang} href={link.href} />
            ))}
            {/* eslint-disable-next-line react/no-danger */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
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
