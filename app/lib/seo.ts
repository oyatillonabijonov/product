import type { ApiSiteConfig } from '../../shared/types';
import { siteConfig } from './site.config';
import { LOCALES, htmlLang, localizedPath, DEFAULT_LOCALE, stripLocale } from './i18n';
import { hasActiveParams } from './catalog';
import type { ProductDetail } from './loaders';

export function pageTitle(title?: string, suffix?: string): string {
  const sfx = suffix ?? siteConfig.seo.titleSuffix;
  return title ? `${title} — ${sfx}` : sfx;
}

export function catalogMeta(title: string, requestUrl: string, description?: string): Array<Record<string, string>> {
  const url = new URL(requestUrl);
  // Canonical har doim (absolut, toza path) — utm-li nusxalar asl sahifaga birlashadi;
  // filtr/sahifalash parametrlari qo'shimcha noindex oladi.
  const metas: Array<Record<string, string>> = [
    { title },
    { tagName: 'link', rel: 'canonical', href: url.origin + url.pathname },
    ...(description ? [{ name: 'description', content: description }] : []),
  ];
  if (hasActiveParams(url.searchParams)) {
    metas.push({ name: 'robots', content: 'noindex,follow' });
  }
  return metas;
}

/** OG/Twitter meta deskriptorlari — TG/WA'ga ulashilganda preview chiqishi uchun (asosiy lead kanal). */
export function ogMeta(o: { title: string; description?: string; image?: string; url?: string; type?: string }): Array<Record<string, string>> {
  return [
    { property: 'og:title', content: o.title },
    { property: 'og:type', content: o.type ?? 'website' },
    { name: 'twitter:card', content: o.image ? 'summary_large_image' : 'summary' },
    ...(o.url ? [{ property: 'og:url', content: o.url }] : []),
    ...(o.description ? [{ property: 'og:description', content: o.description }] : []),
    ...(o.image ? [{ property: 'og:image', content: o.image }] : []),
  ];
}

/** Mahsulot tavsifi bo'sh bo'lganda (Billz tovarlarining ko'pchiligi) meta description shablondan yasaladi. */
export function productDescriptionFallback(locale: 'uz' | 'ru', name: string, brand: string | null, price: string, store: string): string {
  const b = brand ? `${brand}, ` : '';
  return locale === 'ru'
    ? `${name} — ${b}оригинал с официальной гарантией. Цена ${price}. ${store}, Ташкент.`
    : `${name} — ${b}original, rasmiy kafolat bilan. Narxi ${price}. ${store}, Toshkent.`;
}

export function organizationJsonLd(config?: ApiSiteConfig, origin?: string) {
  // Yandex `ll` = "lon,lat"; schema.org geo lat/lon alohida.
  const [lon, lat] = (config?.mapLl ?? siteConfig.map.ll).split(',').map(Number);
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: config?.name ?? siteConfig.name,
    telephone: config?.phone ?? siteConfig.phone,
    sameAs: [config?.telegram ?? siteConfig.telegram, config?.instagram ?? siteConfig.instagram],
    ...(origin ? { url: origin } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: config?.mapLabel ?? siteConfig.map.label,
      addressLocality: 'Toshkent',
      addressCountry: 'UZ',
    },
    ...(Number.isFinite(lat) && Number.isFinite(lon) ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lon } } : {}),
    // Ish vaqti footer'dagi `footerTime` bilan bir xil (Du-Yak 10:00-21:00).
    openingHours: 'Mo-Su 10:00-21:00',
  };
}

// hreflang faqat to'liq (absolut) URL bilan ishlaydi — Google nisbiy qiymatlarni tashlab yuboradi.
export function hreflangLinks(pathname: string, origin = '') {
  const bare = stripLocale(pathname);
  const links = LOCALES.map((loc) => ({
    tagName: 'link' as const, rel: 'alternate' as const,
    hrefLang: htmlLang(loc), href: origin + localizedPath(loc, bare),
  }));
  links.push({ tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: origin + localizedPath(DEFAULT_LOCALE, bare) });
  return links;
}

export function storeConfigFrom(matches: unknown): ApiSiteConfig | undefined {
  if (!Array.isArray(matches)) return undefined;
  for (const m of matches) {
    const c = (m as { data?: { siteConfig?: ApiSiteConfig } } | null | undefined)?.data?.siteConfig;
    if (c && typeof c.seoTitleSuffix === 'string') return c;
  }
  return undefined;
}

export function productJsonLd(p: ProductDetail, url: string) {
  const inStock = p.variants.length === 0 || p.variants.some((v) => v.inStock);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(p.images.length > 0 ? { image: p.images } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand.name } } : {}),
    offers: {
      '@type': 'Offer',
      price: p.minPriceUzs,
      priceCurrency: 'UZS',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: it.url,
    })),
  };
}
