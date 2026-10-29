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
  const storeData = useRouteLoaderData('routes/store') as { locale?: Locale; siteConfig?: ApiSiteConfig; origin?: string; orgContact?: OrgContact; assets?: SiteAssets; adminViewer?: boolean } | undefined;
  // Admin cookie'si bilan ochilgan hujjatda uchinchi tomon kodi (Lydya, Metrica) ishlamaydi: admin API
  // shu origin'da, cookie `Path=/` — begona skript admin nomidan so'rov yubora olardi.
  const thirdParty = Boolean(storeData) && !storeData?.adminViewer;
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
  const metricaJs = metricaId === null || !thirdParty ? '' :
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
        {/* ponytail: Lydya AI chat (mijozning xizmati) — faqat storefront'da; kalit ochiq widget kaliti. Kerak bo'lsa admin maydoniga ko'chiriladi. */}
        {thirdParty && (
          <>
            <script src="https://lydya.ai/widget.js" data-key="wk_VH1nhTM39Con62iwi9x-RkYf" async />
            {/* Pufakcha va oyna ramkasi Shadow DOM'da (sahifa CSS'i yetmaydi) — sayt uslubiga keltiramiz: tokenlardagi rang, soyasiz, 28px radius,
                `lg`gacha pastki panel (`MobileTabBar`, 64px + chiziq + safe-area) ustida. Chat ichi lydya.ai iframe'i — unga yetib bo'lmaydi. */}
            <script dangerouslySetInnerHTML={{ __html: LYDYA_STYLE_JS }} />
          </>
        )}
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

const LYDYA_STYLE_JS = "new MutationObserver(function(_,o){var h=document.querySelector('[data-sales-manager-widget]');if(!h||!h.shadowRoot)return;o.disconnect();var s=document.createElement('style');s.textContent='/* Lydya bergan inline rang va soyalarni bosib o\\'tamiz \u2014 saytda soya yo\\'q, rang tokenlardan (mavzu bilan almashadi). */.launcher{width:52px;height:52px;background:var(--color-cta,#0071E3)!important;color:#fff!important;box-shadow:none;transition:transform .2s cubic-bezier(.25,.1,.25,1)}.launcher:hover{transform:none}.launcher:active{transform:scale(.97)}.launcher:focus-visible{outline:2px solid var(--color-cta,#0071E3);outline-offset:3px}.launcher svg{width:24px;height:24px}.badge{background:var(--color-sale,#E8404B);color:var(--color-bg,#fff)}.panel{width:380px;height:min(640px,calc(100vh - 120px));border-radius:28px;border:1px solid var(--color-line,#DCDFE4);box-shadow:none;bottom:84px}.right{right:var(--shell-pad,16px)!important}.left{left:var(--shell-pad,16px)!important}@media (max-width:1023px){.launcher{bottom:calc(81px + env(safe-area-inset-bottom))}.panel{bottom:calc(145px + env(safe-area-inset-bottom));height:min(640px,calc(100vh - 180px))}}@media (max-width:480px){.panel{inset:0;width:100%;height:100%;border-radius:0;border:0}}@media (prefers-reduced-motion:reduce){.launcher{transition:none}.launcher:active{transform:none;opacity:.7}}';h.shadowRoot.append(s)}).observe(document.body,{childList:true})";

export default function Root() {
  return <Outlet />;
}
