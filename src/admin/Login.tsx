import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { login, getLoginOptions } from './api';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { Button, Field, Input } from './ui';

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
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <img src={logo} alt="ProDuct" className="logo-light h-9 w-auto" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-9 w-auto" />
          <p className="text-label text-muted-2">Admin panel</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-7">
          <Field label="Login">
            <Input value={username} onChange={setUsername} autoComplete="username" />
          </Field>
          <Field label="Parol" error={error || undefined}>
            <Input type="password" value={password} onChange={setPassword} autoComplete="current-password" invalid={Boolean(error)} />
          </Field>

          <Button type="submit" size="lg" disabled={busy} className="w-full">
            {busy ? 'Kirilmoqda…' : 'Kirish'}
          </Button>

          {googleAvailable && (
            <>
              <div className="my-0.5 flex items-center gap-3 text-label text-muted-2">
                <span className="h-px flex-1 bg-line" />yoki<span className="h-px flex-1 bg-line" />
              </div>
              <Button variant="secondary" size="lg" href="/admin/auth/google" className="w-full">
                <GoogleG /> Google bilan kirish
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
