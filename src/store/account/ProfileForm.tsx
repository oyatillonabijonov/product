import { useRef, useState } from 'react';
import type { FC } from 'react';
import CustomerAvatar from '../CustomerAvatar';
import type { Translation } from '../../locales';
import type { ApiCustomer } from '../../../shared/types';
import { parseAvatar, serializeAvatar } from '../../../shared/avatar';
import type { Avatar } from '../../../shared/avatar';
import { formatUzPhone, isCompleteUzPhone } from '../../lib/phone';
import { BTN_MD } from '../ui';
import AvatarPicker from './AvatarPicker';
import { inputCls, labelCls } from './fields';


/** Rasmni markazdan kvadrat qilib 256 px ga kichraytiradi — serverga kichik JPEG ketadi (kabinetda 72 px chiziladi). */
async function squareJpeg(file: Blob): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // Shaffof PNG JPEG'da qora bo'lib qolmasin.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/jpeg', 0.88));
}

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
  const [rawEmail, setEmail] = useState(customer.email ?? '');
  const [rawAvatar, setAvatar] = useState(parseAvatar(customer.avatar, customer.id));
  const [rawPicking, setPicking] = useState(false);
  const [rawUploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rawBusy, setBusy] = useState(false);
  const [rawSaved, setSaved] = useState(false);
  const [rawErr, setErr] = useState('');
  const name = rawName as string;
  const phone = rawPhone as string;
  const email = rawEmail as string;
  const avatar = rawAvatar as Avatar;
  const err = rawErr as string;

  const savedPhone = customer.phone ? formatUzPhone(customer.phone) : '';
  const dirty = name.trim() !== (customer.name ?? '').trim()
    || phone !== savedPhone
    || email.trim().toLowerCase() !== (customer.email ?? '').trim().toLowerCase()
    || serializeAvatar(avatar) !== serializeAvatar(parseAvatar(customer.avatar, customer.id));

  const touch = () => { setSaved(false); setErr(''); };

  // Rasm faqat yuklanadi va qoralamaga tushadi — profilga «Saqlash» yozadi (avatar tanlash bilan bir yo'l).
  async function upload(file: Blob | undefined) {
    if (!file) return;
    touch();
    setUploading(true);
    try {
      const res = await fetch('/api/account/avatar', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: await squareJpeg(file) });
      const body = res.ok ? ((await res.json().catch(() => null)) as { avatarUrl?: string } | null) : null;
      if (!body?.avatarUrl) { setErr(t.profilePhotoError); return; }
      setAvatar({ ...avatar, photo: body.avatarUrl });
    } catch {
      setErr(t.profilePhotoError);
    } finally {
      setUploading(false);
    }
  }

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
          email: email.trim(),
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
        <CustomerAvatar avatar={avatar} size={72} />
        <div className="min-w-0">
          <div className={labelCls}>{t.profileAvatar}</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={rawUploading as boolean}
              className="press rounded-xs h-9 border border-line-2 px-4 text-label font-medium text-primary hover:border-accent disabled:opacity-40"
            >
              {rawUploading as boolean ? t.loginSubmitting : t.profilePhotoUpload}
            </button>
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="press rounded-xs h-9 border border-line-2 px-4 text-label font-medium text-primary hover:border-accent"
            >
              {t.profileAvatarTitle}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }}
          />
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

      <div className="mt-4">
        <label htmlFor="profile-email" className={labelCls}>{t.loginEmail}</label>
        <input
          id="profile-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); touch(); }}
          placeholder="pochta@example.com"
          className={inputCls}
        />
        <p className="mt-1.5 text-label text-muted-2">{t.profileEmailHint}</p>
      </div>

      <div className="mt-5 flex items-baseline gap-2 border-t border-divider pt-4">
        <span className="text-label text-muted-2">{t.profileCustomerId}</span>
        <span className="text-label text-body tabular-nums">№{customer.id}</span>
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
        onPick={(a) => { setAvatar({ type: a.type, face: a.face }); setPicking(false); touch(); }}
        onClose={() => setPicking(false)}
      />
    </form>
  );
};

export default ProfileForm;
