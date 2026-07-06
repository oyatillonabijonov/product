import { redirect, useLoaderData, useOutletContext } from 'react-router';
import type { Route } from './+types/kabinet';
import { resolveLocale, localeToLang, localizedPath } from '../lib/i18n';
import { pageTitle, storeConfigFrom } from '../lib/seo';
import { translations } from '../../src/locales';
import { currentCustomerId } from '../../functions/lib/customer-auth';
import { loadCustomer, loadCustomerOrders } from '../../functions/lib/db';
import type { StoreContext } from '../../src/store/StoreLayout';
import AccountPage from '../../src/store/AccountPage';

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  const env = context.cloudflare.env;
  const id = await currentCustomerId(request, env);
  if (!id) throw redirect(localizedPath(locale, '/kirish'));
  const customer = await loadCustomer(env, id);
  if (!customer) throw redirect(localizedPath(locale, '/kirish'));
  const orders = await loadCustomerOrders(env, id);
  return { customer, orders, metaTitle: translations[localeToLang(locale)].accountTitle };
}

export function meta({ data, matches }: Route.MetaArgs) {
  return [
    { title: pageTitle(data?.metaTitle, storeConfigFrom(matches)?.seoTitleSuffix) },
    { name: 'robots', content: 'noindex' },
  ];
}

export default function KabinetRoute() {
  const { customer, orders } = useLoaderData<typeof loader>();
  const { t } = useOutletContext<StoreContext>();
  return <AccountPage t={t} customer={customer} orders={orders} />;
}
