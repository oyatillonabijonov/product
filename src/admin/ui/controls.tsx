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
  secondary: 'bg-fill-2 text-primary hover:bg-segment',
  destructive: 'bg-danger text-white hover:opacity-90',
  quiet: 'text-cta hover:bg-fill-2',
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
  info: 'bg-cta/10 text-cta',
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
    className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ease-apple disabled:opacity-50 ${on ? 'bg-cta' : 'bg-disabled'}`}
  >
    <span
      aria-hidden
      className={`absolute left-[2px] top-[2px] size-[27px] rounded-full bg-white transition-transform duration-200 ease-apple ${on ? 'translate-x-[20px]' : ''}`}
    />
  </button>
);
