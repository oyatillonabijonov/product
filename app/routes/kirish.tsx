import { redirect, useOutletContext, useSearchParams } from 'react-router';
import type { Route } from './+types/kirish';
import { resolveLocale, localeToLang, localizedPath } from '../lib/i18n';
import { loadSiteConfig } from '../lib/loaders';
import { loginEnabled } from '../../src/store/LoginPanel';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import LoginPage from '../../src/store/LoginPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  // Google/Telegram sozlanmagan — kirish yo'q, mehmon buyurtma ishlayveradi.
  if (!loginEnabled(await loadSiteConfig(context.env))) throw redirect(localizedPath(locale, '/'));
  return { metaTitle: translations[localeToLang(locale)].loginTitle };
}

export function meta({ data, matches }: Route.MetaArgs) {
  return [
    { title: pageTitle(data?.metaTitle, storeConfigFrom(matches)?.seoTitleSuffix) },
    { name: 'robots', content: 'noindex' },
  ];
}

export default function KirishRoute() {
  const { t } = useOutletContext<StoreContext>();
  const [sp] = useSearchParams();
  return <LoginPage t={t} error={sp.get('e') ?? undefined} />;
}
