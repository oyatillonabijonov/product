import { useState } from 'react';
import type { FC } from 'react';
import type { Translation } from '../../locales';
import type { ApiCustomer } from '../../../shared/types';

const inputCls = 'w-full border border-line-2 rounded-xl px-3.5 py-2.5 text-[15px] text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition';
const labelCls = 'block text-[14px] font-medium text-muted mb-1.5';

// Profil tahriri — ism + telefon. Email faqat ko'rish (login/OAuth identifikatori).
const ProfileForm: FC<{ t: Translation; customer: ApiCustomer }> = ({ t, customer }) => {
  const [name, setName] = useState(customer.name ?? '');
  const [phone, setPhone] = useState(customer.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (!name.trim()) { setErr(t.orderError); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'profile', name: name.trim(), phone: phone.trim() }),
      });
      if (res.ok) setSaved(true);
      else setErr(t.orderError);
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>{t.loginName}</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t.orderPhone}</label>
          <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false); }} className={`${inputCls} tabular-nums`} placeholder="+998 " />
        </div>
      </div>
      <div className="mt-4">
        <label className={labelCls}>{t.loginEmail}</label>
        <input value={customer.email ?? '—'} readOnly disabled className={`${inputCls} bg-bg text-muted cursor-not-allowed`} />
      </div>

      {err && <p className="text-sale text-[14px] mt-3">{err}</p>}

      <div className="flex items-center gap-3 mt-6">
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center justify-center px-6 bg-accent text-bg font-semibold rounded-full hover:bg-accent-hover transition-colors disabled:opacity-50">
          {busy ? t.loginSubmitting : t.profileSave}
        </button>
        {saved && <span className="text-trust text-[14px] font-medium">{t.profileSaved}</span>}
      </div>
    </form>
  );
};

export default ProfileForm;
