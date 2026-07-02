import { siteConfig } from './site.config';
import { LOCALES, htmlLang, localizedPath, DEFAULT_LOCALE, stripLocale } from './i18n';

export function pageTitle(title?: string): string {
  return title ? `${title} — ${siteConfig.seo.titleSuffix}` : siteConfig.seo.titleSuffix;
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: siteConfig.name,
    telephone: siteConfig.phone,
    sameAs: [siteConfig.telegram, siteConfig.instagram],
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
