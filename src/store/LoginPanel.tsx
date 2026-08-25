import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import logo from '../assets/logo.svg';

const GoogleG: FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kirish kontenti — LoginModal va /kirish sahifasi ikkisi ham shundan foydalanadi.
// `active`: Telegram widget skriptini faqat ko'rinib turganda inject qiladi.
const LoginPanel: FC<{ t: Translation; config: ApiSiteConfig; error?: string; active?: boolean }> = ({
  t, config, error, active = true,
}) => {
  const tgRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const hasOAuth = Boolean(config.googleClientId || config.telegramLoginBot);

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

  function errMsg(code: string): string {
    if (code === 'email_taken') return t.loginEmailTaken;
    if (code === 'bad_credentials') return t.loginBadCredentials;
    if (code === 'password_too_short') return t.loginPasswordShort;
    if (code === 'email_invalid') return t.loginEmailInvalid;
    return t.loginError;
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setErr('');
    if (!EMAIL_RE.test(email.trim())) { setErr(t.loginEmailInvalid); return; }
    if (password.length < 8) { setErr(t.loginPasswordShort); return; }
    setBusy(true);
    try {
      const res = await fetch('/auth/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode, email: email.trim(), password, name: name.trim() }),
      });
      if (res.ok) { window.location.reload(); return; }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(errMsg(data.error ?? ''));
    } catch {
      setErr(t.loginError);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full border border-line-2 rounded-xl px-3 py-2.5 text-[15px] text-primary focus:outline-none focus:border-accent';

  return (
    <div className="flex flex-col items-center gap-5">
      <img src={logo} alt={config.name} className="h-9 w-auto object-contain" />

      {/* Kirish / Ro'yxatdan o'tish toggle */}
      <div className="w-full grid grid-cols-2 p-1 bg-bg rounded-full text-[14px] font-medium">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setErr(''); }}
            className={`py-2 rounded-full transition-colors ${mode === m ? 'bg-white text-primary shadow-apple' : 'text-muted'}`}
          >
            {m === 'login' ? t.loginTab : t.registerTab}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="w-full flex flex-col gap-3">
        {mode === 'register' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.loginName}
            autoComplete="name"
            className={inputCls}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.loginEmail}
          autoComplete="email"
          className={inputCls}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.loginPassword}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className={inputCls}
        />
        {mode === 'register' && <p className="text-[14px] text-muted-2 -mt-1">{t.loginPasswordHint}</p>}

        {(err || error) && <p className="text-sale text-[14px]">{err || t.loginError}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {busy ? t.loginSubmitting : mode === 'login' ? t.loginTab : t.registerTab}
        </button>
      </form>

      {hasOAuth && (
        <>
          <div className="w-full flex items-center gap-3 text-muted-2 text-[14px]">
            <span className="h-px flex-1 bg-line/70" />{t.loginOr}<span className="h-px flex-1 bg-line/70" />
          </div>
          <div className="w-full flex flex-col items-center gap-3">
            {config.googleClientId && (
              <a
                href="/auth/google"
                className="w-full py-3 border border-line-2 rounded-full font-medium text-[15px] text-primary hover:bg-bg transition-colors flex items-center justify-center gap-3"
              >
                <GoogleG /> {t.loginGoogle}
              </a>
            )}
            <div ref={tgRef} className="min-h-[1px] flex items-center justify-center empty:hidden" />
          </div>
        </>
      )}
    </div>
  );
};

export default LoginPanel;
