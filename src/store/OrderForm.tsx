import { useState } from 'react';
import type { FC } from 'react';
import { X, Send } from 'lucide-react';
import type { Translation } from '../locales';
import type { OrderInput } from '../../shared/types';

/** Ism/telefonsiz tayyor buyurtma — chaqiruvchi (ProductPage/CartPage) to'ldiradi. */
export type OrderDraft = Omit<OrderInput, 'name' | 'phone' | 'note'> & { title: string };

const OrderForm: FC<{ t: Translation; draft: OrderDraft; onClose: () => void }> = ({ t, draft, onClose }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [company, setCompany] = useState(''); // honeypot
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!name.trim() || phone.replace(/\D/g, '').length < 7) return;
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-[24px] shadow-apple-hover p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label={t.orderClose} className="absolute top-4 right-4 text-muted-2 hover:text-primary">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-8 text-center">
            <p className="text-[16px] font-semibold text-trust">{t.orderSuccess}</p>
            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-primary text-white font-semibold rounded-full">
              {t.orderClose}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-[19px] font-semibold pr-8">{t.orderFormTitle}</h2>
            <p className="text-[14px] text-muted mt-1 mb-4 line-clamp-2">{draft.title}</p>

            <label className="block text-[13px] text-muted mb-1">{t.orderName}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full border border-line-2 rounded-xl px-3 py-2.5 text-[15px] text-primary mb-3 focus:outline-none focus:border-accent"
            />
            <label className="block text-[13px] text-muted mb-1">{t.orderPhone}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-line-2 rounded-xl px-3 py-2.5 text-[15px] text-primary mb-4 focus:outline-none focus:border-accent tabular-nums"
            />
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
