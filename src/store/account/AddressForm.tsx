import { useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import { BTN_MD } from '../ui';
import { inputCls, labelCls } from './fields';
import type { Translation } from '../../locales';
import type { ApiAddress } from '../../../shared/address';
import { UZ_REGIONS, regionById } from '../../../shared/uz-regions';

/**
 * Yangi manzil oynasi. Tuman ro'yxati viloyat tanlangunicha bo'sh va o'chirilgan —
 * 205 tumanni bitta ro'yxatga yig'ish mumkin emas, tanlov ikki qadamda.
 *
 * Saqlash `POST /api/addresses` ga ketadi va server to'liq ro'yxatni qaytaradi,
 * shuning uchun ota komponent qayta so'rov yubormaydi.
 */
const AddressForm: FC<{
  t: Translation;
  open: boolean;
  onSaved: (list: ApiAddress[]) => void;
  onClose: () => void;
}> = ({ t, open, onSaved, onClose }) => {
  const empty = { region: '', district: '', street: '', house: '', apartment: '', entrance: '', floor: '', isDefault: false };
  const [rawForm, setForm] = useState(empty);
  const [rawBusy, setBusy] = useState(false);
  const [rawErr, setErr] = useState('');
  const form = rawForm as typeof empty;
  const err = rawErr as string;

  const districts = form.region ? (regionById(form.region)?.districts ?? []) : [];
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => {
    setForm({ ...form, [k]: v });
    setErr('');
  };

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) { setErr(t.orderError); return; }
      onSaved((body as { addresses: ApiAddress[] }).addresses);
      setForm(empty);
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} label={t.addressAdd} onClose={onClose} panelClass="max-w-lg">
      <form onSubmit={submit} className="p-6">
        <button type="button" onClick={onClose} aria-label={t.orderClose} className="press absolute right-4 top-4 text-muted-2 hover:text-primary">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lede font-semibold text-primary">{t.addressAdd}</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="addr-region" className={labelCls}>{t.addressRegion}</label>
            <select
              id="addr-region"
              value={form.region}
              onChange={(e) => { setForm({ ...form, region: e.target.value, district: '' }); setErr(''); }}
              className={inputCls}
            >
              <option value="">{t.addressSelectRegion}</option>
              {UZ_REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="addr-district" className={labelCls}>{t.addressDistrict}</label>
            <select
              id="addr-district"
              value={form.district}
              disabled={!form.region}
              onChange={(e) => set('district', e.target.value)}
              className={`${inputCls} disabled:opacity-50`}
            >
              <option value="">{t.addressSelectDistrict}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="addr-street" className={labelCls}>{t.addressStreet}</label>
            <input id="addr-street" value={form.street} onChange={(e) => set('street', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="addr-house" className={labelCls}>{t.addressHouse}</label>
            <input id="addr-house" value={form.house} onChange={(e) => set('house', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="addr-apartment" className={labelCls}>{t.addressApartment}</label>
            <input id="addr-apartment" value={form.apartment} onChange={(e) => set('apartment', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="addr-entrance" className={labelCls}>{t.addressEntrance}</label>
            <input id="addr-entrance" value={form.entrance} onChange={(e) => set('entrance', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="addr-floor" className={labelCls}>{t.addressFloor}</label>
            <input id="addr-floor" value={form.floor} onChange={(e) => set('floor', e.target.value)} className={inputCls} />
          </div>
        </div>

        <label className="mt-4 flex w-fit items-center gap-2.5 text-para text-body">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} className="size-[18px] accent-accent" />
          {t.addressDefault}
        </label>

        {err && <p className="mt-4 text-label text-sale" role="alert">{err}</p>}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="press rounded-full h-11 px-5 text-copy text-muted hover:text-primary">
            {t.addressCancel}
          </button>
          <button
            type="submit"
            disabled={rawBusy as boolean || !form.region || !form.district || form.street.trim() === ''}
            className={`${BTN_MD} bg-accent text-bg hover:bg-accent-hover disabled:opacity-40`}
          >
            {rawBusy as boolean ? t.loginSubmitting : t.profileSave}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddressForm;
