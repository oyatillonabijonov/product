import { useEffect, useState } from 'react';
import type { ApiSettings, Term } from '../../shared/types';
import { getSettings, updateSettings } from './api';

const SAMPLE = 10_000_000;

function monthly(price: number, downPct: number, term: Term): number {
  const total = price * (1 + term.markup);
  const down = price * (downPct / 100);
  return Math.max(0, (total - down) / term.months);
}

function fmt(v: number): string {
  return `${Math.round(v).toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;
}

export default function SettingsForm() {
  const [s, setS] = useState<ApiSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then(setS);
  }, []);

  if (!s) return <p className="text-muted">Yuklanmoqda…</p>;

  function setTerm(i: number, key: keyof Term, value: number) {
    setS((prev) =>
      prev ? { ...prev, terms: prev.terms.map((t, j) => (j === i ? { ...t, [key]: value } : t)) } : prev,
    );
  }

  function addTerm() {
    setS((prev) => (prev ? { ...prev, terms: [...prev.terms, { months: 1, markup: 0 }] } : prev));
  }

  function removeTerm(i: number) {
    setS((prev) => (prev ? { ...prev, terms: prev.terms.filter((_, j) => j !== i) } : prev));
  }

  async function save() {
    if (!s) return;
    setBusy(true);
    setSaved(false);
    setError('');
    try {
      await updateSettings(s);
      setSaved(true);
    } catch {
      setError('Saqlashda xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-24 border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';

  return (
    <div className="bg-white rounded-[20px] p-6 shadow-apple max-w-lg">
      <h3 className="font-semibold mb-4">Kalkulyator sozlamalari</h3>

      <label className="flex items-center justify-between mb-3 text-[14px]">
        Boshlang'ich to'lov foizi (%)
        <input
          type="number"
          className={input}
          value={s.downPaymentPercent}
          onChange={(e) => setS({ ...s, downPaymentPercent: Number(e.target.value) })}
        />
      </label>

      <label className="flex items-center justify-between mb-5 text-[14px]">
        USD kursi (so'm)
        <input
          type="number"
          className={input}
          value={s.usdToUzs}
          onChange={(e) => setS({ ...s, usdToUzs: Number(e.target.value) })}
        />
      </label>

      <div className="text-[13px] font-semibold text-muted mb-2">Muddatlar va ustama</div>
      <div className="space-y-2 mb-4">
        {s.terms.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-[14px]">
            <input
              type="number"
              aria-label="Muddat (oy)"
              className={input}
              value={t.months}
              onChange={(e) => setTerm(i, 'months', Number(e.target.value))}
            />
            <span>oy · ustama</span>
            <input
              type="number"
              step="0.01"
              aria-label="Ustama koeffitsiyenti"
              className={input}
              value={t.markup}
              onChange={(e) => setTerm(i, 'markup', Number(e.target.value))}
            />
            <span className="text-muted">({fmt(monthly(SAMPLE, s.downPaymentPercent, t))}/oy)</span>
            <button onClick={() => removeTerm(i)} aria-label="Muddatni o'chirish" className="text-danger ml-auto">×</button>
          </div>
        ))}
      </div>
      <button onClick={addTerm} className="text-[13px] text-accent font-semibold mb-5">
        + muddat qo'shish
      </button>

      <p className="text-[12px] text-muted mb-4">
        Oldindan ko'rish: {fmt(SAMPLE)} narxli mahsulot uchun oylik to'lov.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60"
        >
          {busy ? 'Saqlanmoqda…' : 'Saqlash'}
        </button>
        {saved && <span className="text-[13px] text-trust">Saqlandi ✓</span>}
        {error && <span className="text-[13px] text-danger">{error}</span>}
      </div>
    </div>
  );
}
