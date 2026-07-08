import { useState } from 'react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import { X, Send } from 'lucide-react';
import type { Translation } from '../locales';
import type { OrderInput } from '../../shared/types';
import type { StoreContext } from './StoreLayout';
import { formatUzs } from '../lib/installment';
import { formatUzPhone, isCompleteUzPhone } from '../lib/phone';

/** Ism/telefonsiz tayyor buyurtma — chaqiruvchi (ProductPage/CartPage) to'ldiradi. */
export type OrderDraft = Omit<OrderInput, 'name' | 'phone' | 'note'> & { title: string };

const OrderForm: FC<{
  t: Translation;
  draft: OrderDraft;
  onClose: () => void;
  /** Buyurtma muvaffaqiyatli yuborilgach modal yopilganda chaqiriladi (CartPage savatni tozalaydi). */
  onDone?: () => void;
}> = ({ t, draft, onClose, onDone }) => {
  const { customer } = useOutletContext<StoreContext>();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(formatUzPhone(customer?.phone ?? ''));
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  const installment = draft.paymentKind === 'installment';
  const cashTotal = draft.items.reduce((s, it) => s + it.priceUzs * it.qty, 0);

  function close() {
    onClose();
    if (done) onDone?.();
  }

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const badName = !name.trim();
    const badPhone = !isCompleteUzPhone(phone);
    setNameErr(badName ? t.orderNameRequired : '');
    setPhoneErr(badPhone ? t.orderPhoneInvalid : '');
    if (badName || badPhone) return;
    setBusy(true);
    setErr('');
    try {
      const { title, ...order } = draft;
      void title;
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...order, name: name.trim(), phone: phone.trim(), company }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setErr(t.orderError);
    } finally {
      setBusy(false);
    }
  }

  const inputCls = (bad: boolean) =>
    `w-full border rounded-xl px-3 py-2.5 text-[15px] text-primary focus:outline-none ${
      bad ? 'border-danger focus:border-danger' : 'border-line-2 focus:border-accent'
    }`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-white rounded-[24px] shadow-apple-hover p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={close} aria-label={t.orderClose} className="absolute top-4 right-4 text-muted-2 hover:text-primary">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-8 text-center">
            <p className="text-[16px] font-semibold text-trust">{t.orderSuccess}</p>
            <button onClick={close} className="mt-5 px-6 py-2.5 bg-primary text-white font-semibold rounded-full">
              {t.orderClose}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-[19px] font-semibold pr-8">{t.orderFormTitle}</h2>
            <p className="text-[14px] text-muted mt-1 mb-3 line-clamp-2">{draft.title}</p>

            {/* Buyurtma xulosasi — mijoz nimani tasdiqlayotganini ko'rsin */}
            <div className="bg-bg rounded-xl px-4 py-3 mb-4 space-y-1.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t.orderPayment}</span>
                <span className="font-semibold">{installment ? t.orderPaymentInstallment : t.orderPaymentCash}</span>
              </div>
              {installment && draft.termMonths !== null && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{t.calcTerm}</span>
                  <span className="font-semibold tabular-nums">{draft.termMonths} {t.calcMonths}</span>
                </div>
              )}
              {installment && draft.downPaymentUzs !== null && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{t.calcDownPayment}</span>
                  <span className="font-semibold tabular-nums">{formatUzs(draft.downPaymentUzs, t.sum)}</span>
                </div>
              )}
              {installment && draft.monthlyUzs !== null && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted">{t.calcMonthly}</span>
                  <span className="font-semibold tabular-nums">{formatUzs(draft.monthlyUzs, t.sum)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-muted">{t.calcTotal}</span>
                <span className="font-semibold tabular-nums">
                  {formatUzs(installment && draft.totalUzs !== null ? draft.totalUzs : cashTotal, t.sum)}
                </span>
              </div>
            </div>

            <label className="block text-[13px] text-muted mb-1">{t.orderName}</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(''); }}
              autoFocus
              aria-invalid={Boolean(nameErr) || undefined}
              className={`${inputCls(Boolean(nameErr))} ${nameErr ? 'mb-1' : 'mb-3'}`}
            />
            {nameErr && <p className="text-[12px] text-danger mb-2">{nameErr}</p>}
            <label className="block text-[13px] text-muted mb-1">{t.orderPhone}</label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => { setPhone(formatUzPhone(e.target.value)); if (phoneErr) setPhoneErr(''); }}
              aria-invalid={Boolean(phoneErr) || undefined}
              className={`${inputCls(Boolean(phoneErr))} tabular-nums ${phoneErr ? 'mb-1' : 'mb-4'}`}
            />
            {phoneErr && <p className="text-[12px] text-danger mb-3">{phoneErr}</p>}
            {/* honeypot — foydalanuvchiga ko'rinmaydi, bot to'ldirsa buyurtma tashlanadi */}
            <input
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="hidden"
              aria-hidden="true"
            />

            {err && <p className="text-[13px] text-sale mb-3">{err}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4.5 h-4.5" /> {busy ? t.orderSending : t.orderSubmit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrderForm;
