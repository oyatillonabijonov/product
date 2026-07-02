import { useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/cart';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { pageTitle } from '../lib/seo';
import { loadConfig } from '../lib/loaders';
import { translations } from '../../src/locales';
import type { StoreContext } from '../../src/store/StoreLayout';
import CartPage from '../../src/store/CartPage';

export async function loader({ params, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const config = await loadConfig(context.cloudflare.env);
  const metaTitle = translations[localeToLang(locale)].cartTitle;
  return { config, metaTitle };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: pageTitle(data?.metaTitle) },
    { name: 'robots', content: 'noindex' },
  ];
}

export default function CartRoute() {
  const { config } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <CartPage t={t} config={config} />;
}
