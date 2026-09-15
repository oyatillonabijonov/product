import type { FC, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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

/** Native select — o'z chevroni bilan (brauzer ko'rsatkichi har OS'da har xil). */
export const Select: FC<{ value: string; onChange: (v: string) => void; disabled?: boolean; children: ReactNode }> = ({ value, onChange, disabled, children }) => (
  <span className="relative block">
    <select
      value={value}
      disabled={disabled}
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
