import { useState } from 'react';
import type { FC } from 'react';
import { BotAvatar } from 'bot-avatars';
import type { Translation } from '../../locales';
import type { ApiCustomer } from '../../../shared/types';
import { parseAvatar, serializeAvatar } from '../../../shared/avatar';
import type { Avatar } from '../../../shared/avatar';
import { formatUzPhone, isCompleteUzPhone } from '../../lib/phone';
import { BTN_MD } from '../ui';
import AvatarPicker from './AvatarPicker';

// Input — 44px balandlik (tegish maydoni) va 16px matn: undan kichigida iOS fokusda
// sahifani kattalashtirib yuboradi. Radius shkalada input uchun `rounded-xs` (8px).
const inputCls = 'rounded-xs h-11 w-full border border-line-2 px-3.5 text-control text-primary'
  + ' focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15';
const labelCls = 'block text-label font-medium text-muted mb-1.5';

/**
 * Kabinet → Profil: avatar, ism va telefon.
 *
 * Email tahrirlanmaydi (u kirish identifikatori), shuning uchun o'chirilgan input
 * emas, oddiy o'qish qatori: bosib ko'rib bo'lmaydigan maydon foydalanuvchini
 * behuda urinishga chorlaydi.
 */
const ProfileForm: FC<{ t: Translation; customer: ApiCustomer; onSaved: (c: ApiCustomer) => void }> = ({
  t, customer, onSaved,
}) => {
  const [rawName, setName] = useState(customer.name ?? '');
  const [rawPhone, setPhone] = useState(customer.phone ? formatUzPhone(customer.phone) : '');
  const [rawAvatar, setAvatar] = useState(parseAvatar(customer.avatar, customer.id));
  const [rawPicking, setPicking] = useState(false);
  const [rawBusy, setBusy] = useState(false);
  const [rawSaved, setSaved] = useState(false);
  const [rawErr, setErr] = useState('');
  const name = rawName as string;
  const phone = rawPhone as string;
  const avatar = rawAvatar as Avatar;
  const err = rawErr as string;

  const savedPhone = customer.phone ? formatUzPhone(customer.phone) : '';
  const dirty = name.trim() !== (customer.name ?? '').trim()
    || phone !== savedPhone
    || serializeAvatar(avatar) !== serializeAvatar(parseAvatar(customer.avatar, customer.id));

  const touch = () => { setSaved(false); setErr(''); };

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setErr(''); setSaved(false);
    if (!name.trim()) { setErr(t.orderNameRequired); return; }
    // Bo'sh telefon — ruxsat (ixtiyoriy maydon); yozilgan bo'lsa to'liq bo'lishi shart.
    if (phone.replace(/\D/g, '').length > 3 && !isCompleteUzPhone(phone)) { setErr(t.orderPhoneInvalid); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          intent: 'profile',
          name: name.trim(),
          phone: isCompleteUzPhone(phone) ? phone.trim() : '',
          avatar: serializeAvatar(avatar),
        }),
      });
      if (!res.ok) { setErr(t.orderError); return; }
      const body = await res.json().catch(() => null);
      const updated = (body as { customer?: ApiCustomer } | null)?.customer;
      if (updated) onSaved(updated);
      setSaved(true);
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-lg">
      <div className="flex items-center gap-4 pb-6 border-b border-divider">
        <BotAvatar type={avatar.type} face={avatar.face} size={72} />
        <div className="min-w-0">
          <div className={labelCls}>{t.profileAvatar}</div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="press rounded-full h-9 border border-line-2 px-4 text-label font-medium text-primary hover:border-accent"
          >
            {t.profileAvatarChange}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div>
          <label htmlFor="profile-name" className={labelCls}>{t.loginName}</label>
          <input id="profile-name" value={name} onChange={(e) => { setName(e.target.value); touch(); }} className={inputCls} />
        </div>
        <div>
          <label htmlFor="profile-phone" className={labelCls}>{t.orderPhone}</label>
          <input
            id="profile-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setPhone(d === '' ? '' : formatUzPhone(e.target.value)); touch(); }}
            onFocus={() => { if (phone === '') setPhone('+998 '); }}
            placeholder="+998 90 123-45-67"
            className={`${inputCls} tabular-nums`}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className={labelCls}>{t.loginEmail}</div>
        <p className="text-control text-primary">{customer.email || '—'}</p>
      </div>

      {err && <p className="text-sale text-label mt-4" role="alert">{err}</p>}

      <div className="flex items-center gap-3 mt-7">
        <button type="submit" disabled={rawBusy as boolean || !dirty} className={`${BTN_MD} bg-accent text-bg hover:bg-accent-hover disabled:opacity-40`}>
          {rawBusy as boolean ? t.loginSubmitting : t.profileSave}
        </button>
        {rawSaved as boolean && <span className="text-trust text-label font-medium">{t.profileSaved}</span>}
      </div>

      <AvatarPicker
        t={t}
        open={rawPicking as boolean}
        value={avatar}
        onPick={(a) => { setAvatar(a); setPicking(false); touch(); }}
        onClose={() => setPicking(false)}
      />
    </form>
  );
};

export default ProfileForm;
