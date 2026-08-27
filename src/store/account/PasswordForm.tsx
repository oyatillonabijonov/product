import { useState } from 'react';
import type { FC } from 'react';
import type { Translation } from '../../locales';

const inputCls = 'w-full border border-line-2 rounded-xl px-3.5 py-2.5 text-[15px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition';
const labelCls = 'block text-[14px] font-medium text-muted mb-1.5';

// hasEmail=false → Telegram-only hisob, parol o'rnatib bo'lmaydi.
// hasPassword=true → o'zgartirish (joriy parol shart); false → birinchi marta o'rnatish.
const PasswordForm: FC<{ t: Translation; hasEmail: boolean; hasPassword: boolean }> = ({ t, hasEmail, hasPassword }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  if (!hasEmail) return <p className="text-muted text-[14px] max-w-md">{t.pwNoEmail}</p>;

  function errMsg(code: string): string {
    if (code === 'bad_current') return t.pwBadCurrent;
    if (code === 'password_too_short') return t.loginPasswordShort;
    if (code === 'no_email') return t.pwNoEmail;
    return t.orderError;
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (next.length < 8) { setErr(t.loginPasswordShort); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'password', currentPassword: current, newPassword: next }),
      });
      if (res.ok) { setSaved(true); setCurrent(''); setNext(''); }
      else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(errMsg(data.error ?? ''));
      }
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-md flex flex-col gap-4">
      {hasPassword && (
        <div>
          <label className={labelCls}>{t.pwCurrent}</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={inputCls} />
        </div>
      )}
      <div>
        <label className={labelCls}>{t.pwNew}</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={inputCls} />
        <p className="text-[14px] text-muted-2 mt-1.5">{t.loginPasswordHint}</p>
      </div>

      {err && <p className="text-sale text-[14px]">{err}</p>}

      <div className="flex items-center gap-3 mt-1">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center px-6 bg-accent text-bg font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50">
          {busy ? t.loginSubmitting : hasPassword ? t.pwChange : t.pwSet}
        </button>
        {saved && <span className="text-trust text-[14px] font-medium">{t.pwSaved}</span>}
      </div>
    </form>
  );
};

export default PasswordForm;
