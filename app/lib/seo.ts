import type { ApiSiteConfig } from '../../shared/types';
import { siteConfig } from './site.config';
import { LOCALES, htmlLang, localizedPath, DEFAULT_LOCALE, stripLocale } from './i18n';
import { hasActiveParams } from './catalog';
import type { ProductDetail } from './loaders';

export function pageTitle(title?: string, suffix?: string): string {
  const sfx = suffix ?? siteConfig.seo.titleSuffix;
  return title ? `${title} — ${sfx}` : sfx;
}

export function catalogMeta(title: string, requestUrl: string): Array<Record<string, string>> {
  const url = new URL(requestUrl);
  const metas: Array<Record<string, string>> = [{ title }];
  if (hasActiveParams(url.searchParams)) {
    metas.push({ name: 'robots', content: 'noindex,follow' });
    metas.push({ tagName: 'link', rel: 'canonical', href: url.pathname });
  }
  return metas;
}

export function organizationJsonLd(config?: ApiSiteConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: config?.name ?? siteConfig.name,
    telephone: config?.phone ?? siteConfig.phone,
    sameAs: [config?.telegram ?? siteConfig.telegram, config?.instagram ?? siteConfig.instagram],
  };
}

export function hreflangLinks(pathname: string) {
  const bare = stripLocale(pathname);
  const links = LOCALES.map((loc) => ({
    tagName: 'link' as const, rel: 'alternate' as const,
    hrefLang: htmlLang(loc), href: localizedPath(loc, bare),
  }));
  links.push({ tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: localizedPath(DEFAULT_LOCALE, bare) });
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
