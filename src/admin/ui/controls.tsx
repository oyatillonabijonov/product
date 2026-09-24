import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * Admin boshqaruvlari — sayt tokenlari ustida, App Store Connect uslubi.
 * Tugma: `md` 36px (mobilda 44 — tegish maydoni), `lg` 44px pill (sahifaning asosiy amali).
 * Matn 400 (Apple tugmada qalin shrift ishlatmaydi). `press` bosish javobini o'zi boshqaradi —
 * ustiga `transition-*` qo'shilmaydi.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'quiet';
export type ButtonSize = 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-cta text-white hover:bg-cta-hover',
  // Hover bir pog'ona: yorug'da to'qlashadi, qorong'ida yorug'lashadi (`segment` yorug'da `fill-2`ga teng, qorong'ida qora edi).
  secondary: 'bg-fill-2 text-primary hover:bg-divider',
  // Qorong'ida `danger` och qizil — oq matn 2.78:1; `bg` (yorug'da oqish, qorong'ida qora) ikkala mavzuda ≥ 5:1.
  destructive: 'bg-danger text-bg hover:opacity-90',
  quiet: 'text-link hover:bg-fill-2',
};
const SIZE: Record<ButtonSize, string> = {
  md: 'h-11 md:h-9 px-4 rounded-xs text-para',
  lg: 'h-11 px-[21px] rounded-full text-copy',
};
const BASE =
  'press inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-normal disabled:pointer-events-none disabled:opacity-50';

export const Button: FC<{
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  /** Ichki havola — `Link` bo'lib chiziladi. */
  to?: string;
  /** Oddiy havola; `external` bo'lsa yangi tabda. */
  href?: string;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}> = ({ variant = 'primary', size = 'md', type = 'button', disabled, onClick, to, href, external, className = '', ariaLabel, children }) => {
  const cls = `${BASE} ${SIZE[size]} ${VARIANT[variant]} ${className}`;
  if (to) return <Link to={to} className={cls} aria-label={ariaLabel}>{children}</Link>;
  if (href) {
    return (
      <a href={href} className={cls} aria-label={ariaLabel} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
};

/** Holat ranglari: `attention` — e'tibor kerak (`new` to'q sariq), `ok` — faol/bajarildi (`verified`). */
export type Tone = 'neutral' | 'attention' | 'ok' | 'danger' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-fill-2 text-muted',
  attention: 'bg-new/10 text-new',
  ok: 'bg-verified/10 text-verified',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-link/10 text-link',
};
const DOT: Record<Tone, string> = {
  neutral: 'bg-muted-3',
  attention: 'bg-new',
  ok: 'bg-verified',
  danger: 'bg-danger',
  info: 'bg-cta',
};

export const Badge: FC<{ tone?: Tone; children: ReactNode; className?: string }> = ({ tone = 'neutral', children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-label font-medium ${TONE[tone]} ${className}`}>{children}</span>
);

/** Holat nuqtasi + yozuv (faol / yashirin / e'tibor kerak) — jadval qatorlari uchun. */
export const Dot: FC<{ tone: Tone; children?: ReactNode }> = ({ tone, children }) => (
  <span className="inline-flex items-center gap-1.5 text-label text-muted">
    <span aria-hidden className={`size-2 rounded-full ${DOT[tone]}`} />
    {children}
  </span>
);

/** iOS/macOS switch (51×31, tugmacha 27) — checkbox o'rniga; yoqilgani `cta` ko'k (macOS Settings). */
export const Toggle: FC<{ on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative h-[31px] w-[51px] shrink-0 rounded-full press disabled:opacity-50 ${on ? 'bg-cta' : 'bg-disabled'}`}
  >
    <span
      aria-hidden
      className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white transition-transform duration-200 ease-apple ${on ? 'translate-x-[20px]' : ''}`}
    />
  </button>
);

/**
 * Segment-kontrol (lokal holat; URL'ga bog'liq varianti — `Tabs`): tez filtrlar, Yangi/Ishlatilgan.
 * Konteyner 12px, ichki 8px — `Tabs` bilan bir o'lchov; mobilda yonga suriladi. Tugma mobilda 44px, `md`dan 36px.
 */
export const Segmented: FC<{
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  /** Guruh nomi (`aria-label`), masalan "Tez filtr". */
  label: string;
  className?: string;
}> = ({ value, onChange, options, label, className = '' }) => (
  <div role="radiogroup" aria-label={label} className={`no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0 ${className}`}>
    <div className="inline-flex gap-1 rounded-sm bg-fill-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => { if (o.id !== value) onChange(o.id); }}
          className={`press h-11 whitespace-nowrap rounded-xs px-3.5 text-para md:h-9 ${o.id === value ? 'bg-raised text-primary' : 'text-muted hover:text-primary'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);
