import { useId } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import type { Icon as PhIcon } from '../icons';

/**
 * Admin boshqaruvlari — Astryx `Button`: pill, hoshiyasiz, 14px/500, balandlik 28/32/36, bosilganda 0.98.
 * `primary` — siyoh to'ldirma (sahifaning bitta asosiy amali), `secondary` — neytral to'ldirma, `quiet` — ghost.
 * `accent` va `outline` eski nomlar: Astryx'da urg'u = siyoh, outline varianti yo'q — `primary`/`secondary`dek.
 * Sahifadagi xavfli amal `dangerSoft`, to'yingan `destructive` — faqat tasdiqlash oynasida.
 */
export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'destructive' | 'dangerSoft' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-text-on-primary hover:bg-primary-hover',
  accent: 'bg-primary text-text-on-primary hover:bg-primary-hover',
  secondary: 'bg-neutral text-text hover:bg-neutral-hover',
  outline: 'bg-neutral text-text hover:bg-neutral-hover',
  destructive: 'bg-danger text-white hover:opacity-90',
  dangerSoft: 'bg-danger-soft text-danger-strong hover:bg-danger/25',
  quiet: 'text-text hover:bg-ghost-hover',
};
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-control-sm gap-1.5 px-2.5 text-base',
  md: 'h-control-md gap-2 px-3 text-base',
  lg: 'h-control-lg gap-2 px-4 text-base',
};
const BASE =
  'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-full font-medium transition-[background-color,color,opacity,transform] duration-[175ms] ease-standard active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

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
  if (to) return <Link to={to} className={cls} aria-label={ariaLabel} title={ariaLabel}>{children}</Link>;
  if (href) {
    return (
      <a href={href} className={cls} aria-label={ariaLabel} title={ariaLabel} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls} aria-label={ariaLabel} title={ariaLabel}>
      {children}
    </button>
  );
};

/** Faqat ikonkali tugma (Astryx `IconButton`, ghost, kvadrat 28/32, pill). `label` majburiy — `aria-label` + `title`. */
export const IconButton: FC<{
  label: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  children: ReactNode;
}> = ({ label, onClick, to, href, disabled, danger, size = 'md', className = '', children }) => {
  const cls = `inline-flex shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-[175ms] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 ${
    size === 'sm' ? 'size-7' : 'size-8'
  } ${danger ? 'text-text-muted hover:bg-danger-soft hover:text-danger-strong' : 'text-text-muted hover:bg-ghost-hover hover:text-text'} ${className}`;
  if (to) return <Link to={to} aria-label={label} title={label} className={cls}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={cls}>{children}</a>;
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={cls}>{children}</button>;
};

/** Holat ranglari (Astryx hue badge'lari: och fon + to'q matn): `attention` — e'tibor kerak, `ok` — faol/bajarildi. */
export type Tone = 'neutral' | 'attention' | 'ok' | 'danger' | 'info' | 'accent';
const TONE: Record<Tone, string> = {
  neutral: 'bg-neutral text-text',
  attention: 'bg-warning-soft text-warning-strong',
  ok: 'bg-success-soft text-success-strong',
  danger: 'bg-danger-soft text-danger-strong',
  info: 'bg-info-soft text-info-strong',
  accent: 'bg-accent-soft text-accent-text',
};
const DOT: Record<Tone, string> = {
  neutral: 'bg-text-faint',
  attention: 'bg-warning',
  ok: 'bg-success',
  danger: 'bg-danger',
  info: 'bg-info',
  accent: 'bg-accent',
};

/** Holat belgisi — Astryx `Badge`: pill, 20px, 12px/500, ixtiyoriy nuqta bilan («• Yangi»). */
export const Badge: FC<{ tone?: Tone; dot?: boolean; children: ReactNode; className?: string }> = ({ tone = 'neutral', dot, children, className = '' }) => (
  <span className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium ${TONE[tone]} ${className}`}>
    {dot && <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${DOT[tone]}`} />}
    {children}
  </span>
);

/** Holat nuqtasi + yozuv (faol / yashirin / e'tibor kerak) — jadval qatorlari uchun. */
export const Dot: FC<{ tone: Tone; children?: ReactNode }> = ({ tone, children }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-text-muted">
    <span aria-hidden className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} />
    {children}
  </span>
);

/** Qizil sanoq nishoni — faqat «diqqat kerak» uchun (yangi buyurtma). */
export const CountBadge: FC<{ count: number; label?: string; className?: string }> = ({ count, label, className = '' }) =>
  count > 0 ? (
    <span aria-label={label} className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold tabular-nums text-white ${className}`}>
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

/** Kategorik ranglar — ikonka plitkalari va grafik seriyalari bir xil nom bilan. */
export type Hue = 'violet' | 'orange' | 'blue' | 'green' | 'pink' | 'teal' | 'amber' | 'slate';
const HUE_SOLID: Record<Hue, string> = {
  violet: 'bg-c-violet', orange: 'bg-c-orange', blue: 'bg-c-blue', green: 'bg-c-green',
  pink: 'bg-c-pink', teal: 'bg-c-teal', amber: 'bg-c-amber', slate: 'bg-c-slate',
};
export const HUE_DOT = HUE_SOLID;

/**
 * Ikonka — FONSIZ (egasining talabi: ikonka plitka/doira ichida kelmaydi), neytral rangda. `soft` — chiziqli
 * (stroke), sukut — to'ldirilgan (fill). `hue` eski API uchun qoldi: rang-baranglik yo'q, ikonka doim neytral.
 */
export const IconTile: FC<{ icon: PhIcon; hue?: Hue; soft?: boolean; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  icon: I, soft, size = 'md', className = '',
}) => {
  const ico = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5';
  return <I aria-hidden weight={soft ? 'regular' : 'fill'} className={`shrink-0 text-text-muted ${ico} ${className}`} />;
};

/**
 * Switch — Astryx: telefonda md 40×24, desktopda sm 32×20; o'chiq trek `track`, yoqilgan — siyoh. Tugmacha
 * yoqilganda kattalashadi (16→20 / 14→16). Yoqilgan tugmacha rangi `text-on-primary` — qorong'i mavzuda trek oq.
 */
export const Toggle: FC<{ on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }> = ({ on, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!on)}
    className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-[175ms] disabled:opacity-50 lg:h-5 lg:w-8 ${on ? 'bg-switch-on' : 'bg-track'}`}
  >
    <span
      aria-hidden
      className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-[175ms] ease-standard ${
        on ? 'left-[18px] size-5 bg-text-on-primary lg:left-[14px] lg:size-4' : 'left-1 size-4 bg-white lg:left-[3px] lg:size-3.5'
      }`}
    />
  </button>
);

/**
 * Segment-kontrol — Astryx `SegmentedControl`: neytral trek (2px ichki bo'shliq, radius 12), tanlangani yuza +
 * `shadow-low`, 600 qalinlik; u variantlar orasida silliq suriladi (`layoutId`). 2–5 qisqa variant; ko'pi — select.
 */
export const Segmented: FC<{
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string; icon?: PhIcon; count?: number }[];
  /** Guruh nomi (`aria-label`), masalan "Tez filtr". */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ value, onChange, options, label, size = 'md', className = '' }) => {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={`no-scrollbar -mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 sm:mx-0 sm:max-w-full sm:px-0 ${className}`}>
      <div className="inline-flex rounded-control bg-neutral p-0.5">
        {options.map((o) => {
          const on = o.id === value;
          const I = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { if (!on) onChange(o.id); }}
              className={`relative isolate inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] text-base transition-colors duration-[175ms] ${
                size === 'sm' ? 'h-6 px-2' : 'h-7 px-3'
              } ${on ? 'font-semibold text-text' : 'font-medium text-text-muted hover:text-text'}`}
            >
              {on && (
                <motion.span
                  layoutId={`seg-${id}`}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  className="absolute inset-0 -z-10 rounded-[10px] bg-elevated shadow-low"
                />
              )}
              {I && <I weight={on ? 'fill' : 'regular'} className="size-4" />}
              {o.label}
              {o.count !== undefined && <span className="tabular-nums text-text-faint">{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Bosh harfli avatar (neytral kulrang doira). Rasm bo'lsa — rasm. */
export const Avatar: FC<{ name: string; src?: string | null; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ name, src, size = 'md', className = '' }) => {
  const box = { sm: 'size-7 text-xs', md: 'size-9 text-sm', lg: 'size-12 text-base', xl: 'size-16 text-xl' }[size];
  const clean = name.replace(/^SINOV\s+/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const ini = ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
  // Astryx `Avatar` (initials): neytral doira, bosh harflar siyohda.
  const tone = 'bg-neutral text-text';
  if (src) return <img src={src} alt="" className={`${box} shrink-0 rounded-full object-cover ${className}`} />;
  return <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-semibold ${box} ${tone} ${className}`}>{ini}</span>;
};
