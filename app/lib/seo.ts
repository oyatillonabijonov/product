import type { ApiSiteConfig } from '../../shared/types';
import { siteConfig } from './site.config';
import { LOCALES, htmlLang, localizedPath, DEFAULT_LOCALE, stripLocale } from './i18n';
import { hasActiveParams } from './catalog';

export function pageTitle(title?: string): string {
  return title ? `${title} — ${siteConfig.seo.titleSuffix}` : siteConfig.seo.titleSuffix;
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
