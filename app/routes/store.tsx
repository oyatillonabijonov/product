import { Outlet, useLoaderData, useRouteError } from 'react-router';
import type { Route } from './+types/store';
import { resolveLocale, localeToLang } from '../lib/i18n';
import { translations } from '../../src/locales';
import StoreLayout from '../../src/store/StoreLayout';

export async function loader({ params }: Route.LoaderArgs) {
  const locale = resolveLocale(params.lang);
  if (!locale) throw new Response('Not Found', { status: 404 });
  return { locale };
}

export default function StoreRoot() {
  const { locale } = useLoaderData<typeof loader>();
  const lang = localeToLang(locale);
  const t = translations[lang];
  return (
    <StoreLayout locale={locale} lang={lang} t={t}>
      <Outlet context={{ t, lang, locale }} />
    </StoreLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return <div className="p-16 text-center text-[#6E6E73]">Xatolik yuz berdi.</div>;
}
