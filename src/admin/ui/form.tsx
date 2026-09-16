import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Toggle } from './controls';

/** Input ko'rinishi bitta joyda; `text-control` (16px) — iOS Safari kichik inputni fokusda zoom qiladi. */
export const INPUT_CLS =
  'h-11 md:h-9 w-full rounded-xs border border-line bg-surface px-3 text-control text-primary placeholder:text-muted-3 focus:border-cta focus:outline-none focus:ring-2 focus:ring-cta/20 disabled:bg-fill-2 disabled:text-muted aria-[invalid=true]:border-danger';

/** Yorliq ustida, ostida izoh yoki xato (xato bo'lsa izoh o'rnini oladi). */
export const Field: FC<{ label: string; hint?: string; error?: string; required?: boolean; className?: string; children: ReactNode }> = ({
  label, hint, error, required, className = '', children,
}) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-label font-medium text-muted">
      {label}
      {required && <span className="text-danger"> *</span>}
    </span>
    {children}
    {error ? (
      <span className="mt-1 block text-label text-danger">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-label text-muted-2">{hint}</span>
    ) : null}
  </label>
);

export const Input: FC<{
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}> = ({ value, onChange, type = 'text', placeholder, invalid, disabled, autoComplete, className = '' }) => (
  <input
    type={type}
    value={value}
    placeholder={placeholder}
    disabled={disabled}
    autoComplete={autoComplete}
    aria-invalid={invalid || undefined}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    className={`${INPUT_CLS} ${className}`}
  />
);

/**
 * Ro'yxat qidiruvi: matn lokal holatda, `onChange` (URL'ga yozish) 250 ms kechikib chaqiriladi — har harfda
 * navigatsiya bo'lmaydi. Tashqaridan kelgan qiymat ("Filtrni tozalash", orqaga) maydonni yangilaydi; o'zimiz
 * yuborgan qiymat qaytib kelganda esa yangilamaydi — aks holda shu orada yozilgan harf yo'qolardi.
 */
export const SearchInput: FC<{ value: string; onChange: (v: string) => void; placeholder: string }> = ({ value, onChange, placeholder }) => {
  const [raw, setText] = useState(value);
  const text = raw as string;
  const sent = useRef(value) as { current: string };
  // Taymer eng oxirgi `onChange`ni chaqirsin: eskisi eski URL parametrlarini yozib, shu orada tanlangan filtrni bekor qilardi.
  const latest = useRef(onChange) as { current: (v: string) => void };
  useEffect(() => { latest.current = onChange; });
  useEffect(() => {
    if (value === sent.current) return;
    sent.current = value;
    setText(value);
  }, [value]);
  useEffect(() => {
    if (text === sent.current) return;
    const t = setTimeout(() => { sent.current = text; latest.current(text); }, 250);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <span className="relative block">
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        className={`${INPUT_CLS} appearance-none pl-9`}
      />
    </span>
  );
};

export const Textarea: FC<{ value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; invalid?: boolean; mono?: boolean }> = ({
  value, onChange, rows = 4, placeholder, invalid, mono,
}) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    aria-invalid={invalid || undefined}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
    className={`${INPUT_CLS} h-auto resize-y py-2 ${mono ? 'font-mono text-para' : ''}`}
  />
);

/** Native select — o'z chevroni bilan (brauzer ko'rsatkichi har OS'da har xil). `ariaLabel` — `Field`siz (jadval qatorida) ishlatilganda. */
export const Select: FC<{ value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel?: string; children: ReactNode }> = ({
  value, onChange, disabled, ariaLabel, children,
}) => (
  <span className="relative block">
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
      className={`${INPUT_CLS} appearance-none pr-9`}
    >
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-2" />
  </span>
);

/** macOS Settings qatori: chapda nom (+ izoh), o'ngda toggle. Karta ichida `divide-y divide-line` bilan. */
export const SwitchRow: FC<{ label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  label, hint, on, onChange, disabled,
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-para text-primary">{label}</p>
      {hint && <p className="text-label text-muted-2">{hint}</p>}
    </div>
    <Toggle on={on} onChange={onChange} label={label} disabled={disabled} />
  </div>
);

/** uz/ru juftligi — hamma ikki tilli maydon uchun bitta komponent. Ruscha ixtiyoriy (saytda uz'ga tushadi). */
export const LangPair: FC<{
  label: string;
  uz: string;
  ru: string;
  onUz: (v: string) => void;
  onRu: (v: string) => void;
  kind?: 'text' | 'textarea';
  rows?: number;
  hint?: string;
  required?: boolean;
  error?: string;
}> = ({ label, uz, ru, onUz, onRu, kind = 'text', rows, hint, required, error }) => (
  <div className="grid gap-3 md:grid-cols-2">
    <Field label={label} hint={hint} error={error} required={required}>
      {kind === 'textarea' ? <Textarea value={uz} onChange={onUz} rows={rows} invalid={Boolean(error)} /> : <Input value={uz} onChange={onUz} invalid={Boolean(error)} />}
    </Field>
    <Field label={`${label} (ru)`} hint="Bo'sh qolsa o'zbekchasi chiqadi">
      {kind === 'textarea' ? <Textarea value={ru} onChange={onRu} rows={rows} /> : <Input value={ru} onChange={onRu} />}
    </Field>
  </div>
);
