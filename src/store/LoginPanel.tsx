import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import { useAssets } from './SiteAssets';

const GoogleG: FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

/** Kirish faqat Google yoki Telegram sozlanganda ko'rsatiladi (Header/StoreLayout/kirish shu qoidani tekshiradi). */
export function loginEnabled(config: ApiSiteConfig): boolean {
  return Boolean(config.googleClientId || config.telegramLoginBot);
}

// Kirish kontenti — LoginModal va /kirish sahifasi ikkisi ham shundan foydalanadi.
// `active`: Telegram widget skriptini faqat ko'rinib turganda inject qiladi.
// Email+parol yo'li UI'dan olib tashlangan (2026-09): parolni tiklash oqimi yo'q edi,
// unutgan mijoz abadiy qulflanardi. Server routelari (`auth/email`) turibdi.
const LoginPanel: FC<{ t: Translation; config: ApiSiteConfig; error?: string; active?: boolean }> = ({
  t, config, error, active = true,
}) => {
  const asset = useAssets();
  const tgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = tgRef.current;
    if (!active || !config.telegramLoginBot || !host) return;
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', config.telegramLoginBot);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-radius', '20');
    s.setAttribute('data-auth-url', '/auth/telegram');
    s.setAttribute('data-request-access', 'write');
    host.appendChild(s);
    return () => { host.innerHTML = ''; };
  }, [active, config.telegramLoginBot]);

  const showDivider = Boolean(config.googleClientId && config.telegramLoginBot);

  return (
    <div className="flex flex-col items-center gap-5">
      <img src={asset('logo')} alt={config.name} className="logo-light h-9 w-auto object-contain" />
      <img src={asset('logoDark')} alt="" aria-hidden className="logo-dark h-9 w-auto object-contain" />
      <h2 className="text-heading font-semibold text-primary">{t.loginTitle}</h2>

      {error && (
        <p className="w-full text-label text-sale bg-sale/10 border border-sale/20 rounded-sm px-3.5 py-2.5 text-center">
          {t.loginError}
        </p>
      )}

      <div className="w-full flex flex-col items-center gap-3">
        {config.googleClientId && (
          <a
            href="/auth/google"
            className="press w-full h-[52px] border border-line rounded-full font-medium text-copy text-primary hover:border-accent hover:bg-bg flex items-center justify-center gap-3"
          >
            <GoogleG /> {t.loginGoogle}
          </a>
        )}
        {showDivider && (
          <div className="w-full flex items-center gap-3 text-label text-muted-2">
            <span className="flex-1 h-px bg-line" />
            {t.loginOr}
            <span className="flex-1 h-px bg-line" />
          </div>
        )}
        <div ref={tgRef} className="min-h-[1px] flex items-center justify-center empty:hidden" />
      </div>
    </div>
  );
};

export default LoginPanel;
