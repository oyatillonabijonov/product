import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';

const LoginPage: FC<{ t: Translation; error?: string }> = ({ t, error }) => {
  const { config } = useOutletContext<StoreContext>();
  const tgRef = useRef<HTMLDivElement>(null);

  // Telegram Login Widget — skript klientda inject qilinadi (bot username BotFather'da domen bilan sozlanadi).
  useEffect(() => {
    const host = tgRef.current;
    if (!config.telegramLoginBot || !host) return;
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.setAttribute('data-telegram-login', config.telegramLoginBot);
    s.setAttribute('data-size', 'large');
    s.setAttribute('data-auth-url', '/auth/telegram');
    s.setAttribute('data-request-access', 'write');
    host.appendChild(s);
    return () => {
      host.innerHTML = '';
    };
  }, [config.telegramLoginBot]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{t.loginTitle}</h1>
      <p className="text-muted text-[14px]">{t.loginSubtitle}</p>
      {error && <p className="text-sale text-[13px]">{t.loginError}</p>}
      {config.googleClientId && (
        <a href="/auth/google" className="w-full py-3 border border-line-2 rounded-full font-semibold text-primary hover:bg-bg transition-colors">
          {t.loginGoogle}
        </a>
      )}
      <div ref={tgRef} className="min-h-[48px] flex items-center justify-center" />
      {!config.googleClientId && !config.telegramLoginBot && (
        <p className="text-muted-2 text-[13px]">{t.loginNoProviders}</p>
      )}
    </div>
  );
};

export default LoginPage;
