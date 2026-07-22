import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { login, getLoginOptions } from './api';
import logo from '../assets/logo.svg';

const GoogleG = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

function oauthError(code: string | null): string {
  if (code === 'google_denied') return 'Bu Google akkaunt admin sifatida ruxsat etilmagan.';
  if (code === 'google_off') return 'Google kirishi sozlanmagan.';
  if (code === 'state') return 'Sessiya muddati tugadi — qayta urining.';
  if (code === 'google') return 'Google kirishida xatolik yuz berdi.';
  return '';
}

const inputCls = 'w-full border border-line-2 rounded-xl px-3.5 py-2.5 text-[15px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition';

export default function Login({ onSuccess }: { onSuccess: (defaultPassword: boolean) => void }) {
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    const e = oauthError(new URLSearchParams(location.search).get('e'));
    if (e) setError(e);
  }, [location.search]);

  useEffect(() => {
    getLoginOptions().then((o) => setGoogleAvailable(o.google)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { defaultPassword } = await login(username, password);
      onSuccess(defaultPassword);
    } catch (e) {
      setError(
        e instanceof Error && e.message === 'too_many_attempts'
          ? "Urinishlar ko'payib ketdi — birozdan so'ng qayta urining"
          : "Login yoki parol noto'g'ri",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2.5 mb-6">
          <img src={logo} alt="" className="h-9 w-auto object-contain" />
          <p className="text-[13px] font-medium text-muted-2 tracking-wide">ADMIN PANEL</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-[24px] p-7 shadow-apple flex flex-col gap-3.5 border border-line-2">
          <div>
            <label className="block text-[12.5px] font-medium text-muted mb-1.5">Login</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className={inputCls} />
          </div>
          <div>
            <label className="block text-[12.5px] font-medium text-muted mb-1.5">Parol</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} />
          </div>

          {error && <p className="text-[13px] text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-60"
          >
            {busy ? 'Kirilmoqda…' : 'Kirish'}
          </button>

          {googleAvailable && (
            <>
              <div className="flex items-center gap-3 text-muted-2 text-[12px] my-0.5">
                <span className="h-px flex-1 bg-line/70" />yoki<span className="h-px flex-1 bg-line/70" />
              </div>
              <a
                href="/admin/auth/google"
                className="w-full py-2.5 border border-line-2 rounded-full font-medium text-[15px] text-primary hover:bg-bg transition-colors flex items-center justify-center gap-3"
              >
                <GoogleG /> Google bilan kirish
              </a>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
