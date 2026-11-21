import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Toggle } from './controls';

/**
 * Input ko'rinishi bitta joyda — Astryx maydoni: yuza + 1px `border-emphasized`, radius 12, 32px (telefonda 40px),
 * hover'da ichki 2px halqa, fokusda hoshiya siyoh + ichki halqa. Sensorli ekranda shrift 16px (iOS zum qilmasin —
 * `admin.css`). Native `<select>` o'qini `admin.css` chizadi.
 */
export const INPUT_CLS =
  'h-control-md max-lg:h-10 w-full rounded-control border border-border-strong bg-surface px-2.5 text-base text-text placeholder:text-text-muted outline-none transition-[border-color,box-shadow] duration-[175ms] hover:ring-2 hover:ring-inset hover:ring-border-strong/30 focus:border-accent focus:ring-2 focus:ring-inset focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft';

/** Yorliq ustida, ostida izoh yoki xato (xato bo'lsa izoh o'rnini oladi). */
export const Field: FC<{ label: string; hint?: string; error?: string; required?: boolean; tag?: string; className?: string; children: ReactNode }> = ({
  label, hint, error, required, tag, className = '', children,
}) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="flex items-center gap-1.5 text-base font-medium text-text">
      <span>
        {label}
        {required && <span className="text-danger-text"> *</span>}
      </span>
      {tag && <span className="inline-flex h-5 items-center rounded-full bg-neutral px-2 text-xs font-medium text-text">{tag}</span>}
    </span>
    {children}
    {error ? (
      <span role="alert" className="text-xs text-danger-text">{error}</span>
    ) : hint ? (
      <span className="text-xs text-text-muted">{hint}</span>
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
      <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={text}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setText(e.target.value)}
        className={`${INPUT_CLS} appearance-none pl-8`}
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
    className={`${INPUT_CLS.replace('h-control-md max-lg:h-10 ', '')} resize-y py-1.5 leading-relaxed ${mono ? 'font-mono text-sm' : ''}`}
  />
);

/** Native select — o'qni `admin.css` chizadi (ERP: chetdan 12px, 16px). `ariaLabel` — `Field`siz (jadval qatorida) ishlatilganda. */
export const Select: FC<{ value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel?: string; children: ReactNode }> = ({
  value, onChange, disabled, ariaLabel, children,
}) => (
  <select
    value={value}
    disabled={disabled}
    aria-label={ariaLabel}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    className={INPUT_CLS}
  >
    {children}
  </select>
);

/** Sozlama qatori: chapda nom (+ izoh), o'ngda switch. Ketma-ket qatorlar `divide-y divide-border` bilan. */
export const SwitchRow: FC<{ label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  label, hint, on, onChange, disabled,
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div className="min-w-0">
      <p className="text-base font-medium text-text">{label}</p>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
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
  /** Ruscha maydon izohi — sayt matnlarida bo'sh ruscha koddagi ruscha standartga tushadi. */
  ruHint?: string;
  /** Markdown maydonlari uchun monospace. */
  mono?: boolean;
  required?: boolean;
  error?: string;
  /** Berilsa — faqat shu tilning maydoni (ekranda til tanlagichi bo'lganda). */
  lang?: 'uz' | 'ru';
}> = ({ label, uz, ru, onUz, onRu, kind = 'text', rows, hint, ruHint, mono, required, error, lang }) => {
  const { t } = useTranslation('common');
  if (lang) {
    const isRu = lang === 'ru';
    const [value, onChange] = isRu ? [ru, onRu] : [uz, onUz];
    return (
      <Field label={label} hint={isRu ? ruHint ?? t('ruHint') : hint} error={isRu ? undefined : error} required={!isRu && required}>
        {kind === 'textarea' ? <Textarea value={value} onChange={onChange} rows={rows} mono={mono} /> : <Input value={value} onChange={onChange} />}
      </Field>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label={label} tag="UZ" hint={hint} error={error} required={required}>
        {kind === 'textarea' ? <Textarea value={uz} onChange={onUz} rows={rows} mono={mono} invalid={Boolean(error)} /> : <Input value={uz} onChange={onUz} invalid={Boolean(error)} />}
      </Field>
      <Field label={label} tag="RU" hint={ruHint ?? t('ruHint')}>
        {kind === 'textarea' ? <Textarea value={ru} onChange={onRu} rows={rows} mono={mono} /> : <Input value={ru} onChange={onRu} />}
      </Field>
    </div>
  );
};
