import type { FC, ReactNode } from 'react';
import { ArrowRight, Check, CheckCircle, Clock, Tray, WarningCircle } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '../../shared/types';
import { STATUSES } from './lib/inbox';
import { Button, KpiTile, type Hue } from './ui';

/** Jadval qatoridagi holat pill'i: yangi — urg'u, bog'lanildi — neytral, bajarildi — yashil (rang-baranglik yo'q). */
const PILL: Record<OrderStatus, { pill: string; dot: string }> = {
  new: { pill: 'bg-info-soft text-info-strong', dot: 'bg-info' },
  contacted: { pill: 'bg-neutral text-neutral-text', dot: 'bg-text' },
  done: { pill: 'bg-success-soft text-success-strong', dot: 'bg-success' },
};

/**
 * Qadam ranglari — monoxrom + urg'u (egasi: rang-baranglik yo'q): yangi — binafsha urg'u, bog'lanildi — siyoh,
 * bajarildi — yashil (yakun belgisi).
 * `solid` — joriy qadam, `soft` — o'tilgan qadam (✓; shaffof emas — ostidagi chiziq ko'rinmasin), `fill` — oradagi chiziq.
 */
const STEP: Record<OrderStatus, { icon: PhIcon; solid: string; soft: string; fill: string }> = {
  new: { icon: Tray, solid: 'bg-accent text-text-on-primary', soft: 'bg-accent-soft text-accent-text', fill: 'bg-accent' },
  contacted: { icon: Clock, solid: 'bg-primary text-text-on-primary', soft: 'bg-neutral text-text', fill: 'bg-primary' },
  done: { icon: CheckCircle, solid: 'bg-success text-white', soft: 'bg-success-soft text-success-strong', fill: 'bg-success' },
};

/** «→» tugmasi: keyingi holat; bajarilgandan keyin — qayta ochish. */
const NEXT: Record<OrderStatus, OrderStatus> = { new: 'contacted', contacted: 'done', done: 'new' };

/** Jadval qatoridagi holat: rangli pill (nuqta + nom) ichida native select; o'zgarish darhol saqlanadi. */
export const StatusSelect: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; ariaLabel: string }> = ({
  value, labels, onChange, ariaLabel,
}) => (
  <span className="relative inline-flex">
    <span aria-hidden className={`pointer-events-none absolute left-3 top-1/2 size-2 -translate-y-1/2 rounded-full ${PILL[value].dot}`} />
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as OrderStatus)}
      className={`h-8 cursor-pointer rounded-full pl-7 text-sm font-medium outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-accent/40 ${PILL[value].pill}`}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}
    </select>
  </span>
);

/**
 * Statistika plitkasi (buyurtmalar, arizalar, mijoz sahifasi, brendlar) — KPI kartasining ixcham ko'rinishi:
 * ikonka plitkasi + nom, ostida katta son. `children` — qiymat (birligi bilan). `hue` eski API uchun qoldi.
 */
export const StatTile: FC<{ icon: PhIcon; hue?: Hue; label: string; children: ReactNode }> = ({ icon, label, children }) => (
  <div className="min-w-0 rounded-surface border border-border bg-surface px-4 py-5 sm:px-6">
    <span className="flex min-w-0 items-center gap-2.5">
      <KpiTile icon={icon} />
      <span className="truncate text-base font-medium text-text">{label}</span>
    </span>
    <div className="mt-5 flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-3xl font-semibold leading-10 tabular-nums text-text sm:text-4xl">{children}</div>
  </div>
);

/**
 * Tafsilot sahifasidagi holat stepper'i: Yangi → Bog'lanildi → Bajarildi. Istalgan qadam bosilsa holat darhol
 * saqlanadi. Qadamlar faqat fon bilan ajraladi: o'tilgani yumshoq rangli ✓, joriysi to'liq rangli, keyingilari
 * oq; oradagi chiziq to'ladi. O'ngda «keyingi qadam» tugmasi (`next` — ekran o'z so'zini beradi: buyurtmada
 * «Bajarildi», arizada «Yopish»). Telegram'ga ketmagan bo'lsa ogohlantiradi.
 */
export const StatusStepper: FC<{
  value: OrderStatus;
  labels: Record<OrderStatus, string>;
  next: Record<OrderStatus, string>;
  onChange: (s: OrderStatus) => void;
  telegramSent: boolean;
}> = ({ value, labels, next, onChange, telegramSent }) => {
  const { t } = useTranslation('orders');
  const cur = STATUSES.indexOf(value);
  const hint: Record<OrderStatus, string> = { new: t('board.hintNew'), contacted: t('board.hintContacted'), done: t('board.hintDone') };
  return (
    <section className="flex flex-col gap-5 rounded-surface border border-border bg-surface p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div role="radiogroup" aria-label={t('shared.status')} className="grid flex-1 grid-cols-3">
          {STATUSES.map((s, i) => {
            const on = i === cur;
            const passed = i < cur;
            const I = STEP[s].icon;
            return (
              <div key={s} className="relative">
                {i < STATUSES.length - 1 && (
                  <span aria-hidden className="absolute left-1/2 top-5 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-surface-sunken">
                    <span className={`block h-full origin-left transition-transform duration-500 ease-standard ${STEP[STATUSES[i + 1]].fill} ${passed ? 'scale-x-100' : 'scale-x-0'}`} />
                  </span>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => { if (!on) onChange(s); }}
                  className="group relative z-10 mx-auto flex flex-col items-center gap-2.5 rounded-control px-1 text-center"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-full transition-colors duration-200 ${
                      on ? STEP[s].solid : passed ? STEP[s].soft : 'bg-surface-sunken text-text-faint group-hover:text-text-muted'
                    }`}
                  >
                    {passed ? <Check weight="bold" className="size-4" /> : <I weight={on ? 'fill' : 'regular'} className="size-[18px]" />}
                  </span>
                  <span className="flex flex-col">
                    <span className={`text-sm sm:text-base ${on ? 'font-bold text-text' : passed ? 'font-semibold text-text' : 'font-medium text-text-muted group-hover:text-text'}`}>{labels[s]}</span>
                    <span className="hidden text-sm text-text-faint sm:block">{hint[s]}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        <Button variant="outline" onClick={() => onChange(NEXT[value])} className="max-sm:w-full">
          {next[value]}
          <ArrowRight weight="bold" />
        </Button>
      </div>
      {!telegramSent && (
        <p className="flex items-start gap-2.5 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger-strong">
          <WarningCircle weight="fill" className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-danger" />
          {t('shared.telegramWarning')}
        </p>
      )}
    </section>
  );
};

/** Tafsilot sahifalarining yon kartasi (buyurtma, ariza): ikonka + yorliq chapda, qiymat o'ngda, orasida hairline. */
export const MetaRows: FC<{ rows: { icon: PhIcon; k: string; v: ReactNode }[] }> = ({ rows }) => (
  <dl className="flex flex-col">
    {rows.map((r) => {
      const I = r.icon;
      return (
        <div key={r.k} className="flex items-start justify-between gap-4 border-b border-border py-3 text-base first:pt-0 last:border-b-0 last:pb-0">
          <dt className="flex shrink-0 items-center gap-2 text-text-muted">
            <I className="size-4 text-text-faint" />
            {r.k}
          </dt>
          <dd className="min-w-0 break-words text-right font-medium text-text">{r.v}</dd>
        </div>
      );
    })}
  </dl>
);
