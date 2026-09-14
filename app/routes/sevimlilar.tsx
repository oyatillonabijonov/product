import { useOutletContext } from 'react-router';
import type { Route } from './+types/sevimlilar';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import FavoritesList from '../../src/store/account/FavoritesList';

// Sevimlilar brauzerda (localStorage) — kirish shart emas; server faqat sahifa qobig'ini beradi.
export async function loader({ params }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { metaTitle: translations[localeToLang(locale)].accountTabFavorites };
}

export function meta({ data, matches }: Route.MetaArgs) {
  return [
    { title: pageTitle(data?.metaTitle, storeConfigFrom(matches)?.seoTitleSuffix) },
    { name: 'robots', content: 'noindex' },
  ];
}

export default function SevimlilarRoute() {
  const { t } = useOutletContext<StoreContext>();
  return (
    <div className="shell py-6 md:py-10">
      <h1 className="mb-8 text-heading font-semibold text-primary md:mb-10 md:text-title">{t.accountTabFavorites}</h1>
      <FavoritesList t={t} />
    </div>
  );
}
