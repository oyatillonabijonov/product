import { Link, data, useLoaderData } from 'react-router';
import type { Route } from './+types/not-found';
import { localeToLang, localizedPath, type Locale } from '../lib/i18n';
import { translations } from '../../src/locales';

// data(...) — sahifa renderlanadi, lekin HTTP status 404 bo'ladi. 200 qaytarilsa
// qidiruv tizimlari axlat URL'larni indekslaydi va edge-cache ifloslanadi (soft-404).
export function loader({ request }: Route.LoaderArgs) {
  const p = new URL(request.url).pathname;
  const locale: Locale = p === '/ru' || p.startsWith('/ru/') ? 'ru' : 'uz';
  return data({ locale }, { status: 404 });
}

export function meta({ data: d }: Route.MetaArgs) {
  const t = translations[localeToLang(d?.locale ?? 'uz')];
  return [{ title: `404 — ${t.notFoundTitle}` }];
}

export default function NotFound() {
  const { locale } = useLoaderData<typeof loader>();
  const t = translations[localeToLang(locale)];
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-[40px] font-semibold">404</h1>
      <p className="text-muted">{t.notFoundTitle}</p>
      <Link to={localizedPath(locale, '/')} className="px-6 py-3 bg-accent text-bg font-semibold rounded-full">
        {t.backHome}
      </Link>
    </div>
  );
}
