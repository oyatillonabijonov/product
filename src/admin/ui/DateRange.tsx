import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { tashkentDay } from '../../../shared/visits';
import { Button, IconButton } from './controls';

export interface DayRange { from: string; to: string }

/** Kunlar `YYYY-MM-DD` satri — UTC sanasi sifatida hisoblanadi (soat mintaqasi aralashmaydi). */
const key = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);

/** «1 – 10 noy», yil joriy bo'lmasa qo'shiladi. */
export function useRangeLabel(): (r: DayRange) => string {
  const { t } = useTranslation('common');
  const short = t('calendar.monthsShort').split(',');
  const thisYear = tashkentDay(Date.now()).slice(0, 4);
  const one = (s: string, withMonth = true) => {
    const [y, m, d] = s.split('-');
    return `${Number(d)}${withMonth ? ` ${short[Number(m) - 1]}` : ''}${y !== thisYear ? ` ${y}` : ''}`;
  };
  return (r) => {
    if (r.from === r.to) return one(r.from);
    const sameMonth = r.from.slice(0, 7) === r.to.slice(0, 7);
    return `${one(r.from, !sameMonth)} – ${one(r.to)}`;
  };
}

/**
 * Davr tanlagichi: pill tugma + bitta oylik kalendar. Bugundan keyingi kunlar yopiq.
 * Birinchi bosish — boshi, ikkinchisi — oxiri (teskari bo'lsa almashadi); «Qo'llash» `onChange` qiladi.
 */
export const DateRangePicker: FC<{ value: DayRange | null; onChange: (r: DayRange | null) => void; className?: string }> = ({ value, onChange, className = '' }) => {
  const { t } = useTranslation('common');
  const label = useRangeLabel();
  const reduced = useReducedMotion();
  const today = tashkentDay(Date.now());
  const months = t('calendar.months').split(',');
  const weekdays = t('calendar.weekdays').split(',');

  const [open, setOpen] = useState(false);
  const [rawDraft, setDraft] = useState(null as { from: string; to: string | null } | null);
  const draft = rawDraft as { from: string; to: string | null } | null;
  const [rawHover, setHover] = useState(null as string | null);
  const hover = rawHover as string | null;
  const [rawView, setView] = useState({ y: 0, m: 0 });
  const view = rawView as { y: number; m: number };
  const ref = useRef(null as HTMLDivElement | null);

  function toggle() {
    if (open) { setOpen(false); return; }
    const anchor = value?.to ?? today;
    setView({ y: Number(anchor.slice(0, 4)), m: Number(anchor.slice(5, 7)) - 1 });
    setDraft(value ? { ...value } : null);
    setHover(null);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  function pick(day: string) {
    if (!draft || draft.to !== null) { setDraft({ from: day, to: null }); return; }
    setDraft(day < draft.from ? { from: day, to: draft.from } : { from: draft.from, to: day });
  }

  // Oy to'ri: dushanbadan boshlanadi.
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => key(view.y, view.m, i + 1))];
  const canNext = key(view.y, view.m + 1, 1) <= today;
  const shift = (n: number) => setView((v: { y: number; m: number }) => {
    const d = new Date(Date.UTC(v.y, v.m + n, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  // Ko'rinadigan oraliq: tugallangan qoralama yoki boshi + sichqoncha ostidagi kun.
  const preview = draft && draft.to === null && hover ? hover : null;
  const lo = draft ? (draft.to ? draft.from : preview && preview < draft.from ? preview : draft.from) : null;
  const hi = draft ? (draft.to ?? (preview && preview > draft.from ? preview : draft.from)) : null;
  const done = draft?.to ? { from: draft.from, to: draft.to } : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex h-control-md shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-base font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
          value ? 'bg-accent-soft text-accent-text' : 'bg-surface-sunken text-text-muted hover:bg-surface-sunken-hover hover:text-text'
        }`}
      >
        <CalendarBlank weight={value ? 'fill' : 'regular'} className="size-4 shrink-0" />
        {value ? label(value) : t('calendar.label')}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('calendar.label')}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className="absolute right-0 top-full z-40 mt-2 w-[308px] origin-top-right rounded-[22px] bg-bg-subtle p-3 max-sm:left-0 max-sm:right-auto max-sm:origin-top-left"
          >
            <div className="flex items-center justify-between pb-2 pl-2">
              <span className="text-md font-semibold text-text">{months[view.m]} {view.y}</span>
              <span className="flex">
                <IconButton label={t('calendar.prev')} onClick={() => shift(-1)} className="text-text-muted hover:bg-surface-sunken-hover hover:text-text"><CaretLeft weight="bold" /></IconButton>
                <IconButton label={t('calendar.next')} onClick={() => shift(1)} disabled={!canNext} className="text-text-muted hover:bg-surface-sunken-hover hover:text-text"><CaretRight weight="bold" /></IconButton>
              </span>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-medium text-text-faint">
              {weekdays.map((w) => <span key={w} className="py-1.5">{w}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHover(null)}>
              {cells.map((day, i) => {
                if (!day) return <span key={`e${i}`} />;
                const future = day > today;
                const inRange = lo !== null && hi !== null && day >= lo && day <= hi;
                const edge = day === lo || day === hi;
                // Tasma qator chetida ham yumaloqlanadi.
                const startEdge = (day === lo && lo !== hi) || i % 7 === 0;
                const endEdge = (day === hi && lo !== hi) || i % 7 === 6;
                return (
                  <span
                    key={day}
                    className={`relative ${inRange && !(day === lo && day === hi) ? 'bg-surface' : ''} ${startEdge ? 'rounded-l-full' : ''} ${endEdge ? 'rounded-r-full' : ''}`}
                  >
                    <button
                      type="button"
                      disabled={future}
                      onClick={() => pick(day)}
                      onMouseEnter={() => setHover(day)}
                      aria-pressed={edge}
                      aria-label={day}
                      className={`relative grid h-9 w-full place-items-center rounded-full text-base tabular-nums transition-colors duration-100 disabled:text-text-faint/50 ${
                        edge ? 'bg-primary font-semibold text-text-on-primary' : inRange ? 'text-text' : 'text-text hover:bg-surface-sunken-hover'
                      }`}
                    >
                      {Number(day.slice(8))}
                      {day === today && !edge && <span aria-hidden className="absolute bottom-1 size-1 rounded-full bg-accent" />}
                    </button>
                  </span>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 pl-2">
              <span className="min-w-0 flex-1 truncate text-sm text-text-muted">
                {done ? label(done) : draft ? `${label({ from: draft.from, to: draft.from })} – …` : t('calendar.label')}
              </span>
              {value && <Button variant="quiet" size="sm" onClick={() => { onChange(null); setOpen(false); }}>{t('calendar.clear')}</Button>}
              <Button size="sm" disabled={!done} onClick={() => { if (done) { onChange(done); setOpen(false); } }}>{t('calendar.apply')}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
