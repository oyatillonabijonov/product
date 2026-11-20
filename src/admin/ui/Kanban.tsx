import { useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HUE_DOT, type Hue } from './controls';

export interface KanbanColumn { id: string; label: string; hue: Hue; hint?: string; footer?: ReactNode }

/**
 * CRM uslubidagi kanban: ustunlar (holatlar), ichida kartalar. Kartani boshqa ustunga sudrab tashlash —
 * holat o'zgaradi (`onMove`); karta yangi joyiga silliq suriladi (`layout`). Sensorli ekran va klaviatura
 * uchun karta o'zi `move` tugmasini chizadi (`renderCard(item, move)`). Telefonda ustunlar yonma-yon suriladi.
 */
export function Kanban<T>({ columns, items, columnOf, keyOf, renderCard, onMove, empty }: {
  columns: KanbanColumn[];
  items: T[];
  columnOf: (item: T) => string;
  keyOf: (item: T) => string;
  renderCard: (item: T, move: (to: string) => void) => ReactNode;
  onMove: (item: T, to: string) => void;
  empty: (column: KanbanColumn) => ReactNode;
}) {
  const [rawDrag, setDrag] = useState(null as string | null);
  const drag = rawDrag as string | null;
  const [rawOver, setOver] = useState(null as string | null);
  const over = rawOver as string | null;

  const drop = (to: string) => {
    const it = items.find((x) => keyOf(x) === drag);
    setDrag(null);
    setOver(null);
    if (it && columnOf(it) !== to) onMove(it, to);
  };

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => {
        const list = items.filter((x) => columnOf(x) === col.id);
        const isOver = over === col.id && drag !== null;
        return (
          <section
            key={col.id}
            aria-label={col.label}
            onDragOver={(e: React.DragEvent<HTMLElement>) => { if (drag) { e.preventDefault(); if (over !== col.id) setOver(col.id); } }}
            onDragLeave={(e: React.DragEvent<HTMLElement> & { relatedTarget: EventTarget | null }) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null); }}
            onDrop={(e: React.DragEvent<HTMLElement>) => { e.preventDefault(); drop(col.id); }}
            className={`flex w-[86vw] max-w-[380px] shrink-0 snap-center flex-col rounded-surface transition-colors duration-200 sm:w-[360px] lg:w-auto lg:max-w-none ${
              isOver ? 'bg-accent-soft' : 'bg-surface-sunken'
            }`}
          >
            <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className={`size-2 shrink-0 rounded-full ${HUE_DOT[col.hue]}`} />
                <span className="truncate text-base font-semibold text-text">{col.label}</span>
                <span className="rounded-full bg-surface px-2 py-px text-sm font-semibold tabular-nums text-text-muted">{list.length}</span>
              </span>
              {col.hint && <span className="hidden truncate text-sm text-text-faint xl:block">{col.hint}</span>}
            </header>
            <ul className="flex min-h-40 flex-1 flex-col gap-2 p-2 pt-1 lg:max-h-[calc(100dvh-280px)] lg:overflow-y-auto lg:thin-scroll">
              <AnimatePresence initial={false}>
                {list.map((it) => {
                  const k = keyOf(it);
                  return (
                    <motion.li
                      key={k}
                      layout
                      layoutId={`kb-${k}`}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: drag === k ? 0.45 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                      draggable
                      onDragStart={(e: React.DragEvent<HTMLElement>) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', k); setDrag(k); }}
                      onDragEnd={() => { setDrag(null); setOver(null); }}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {renderCard(it, (to) => { if (to !== columnOf(it)) onMove(it, to); })}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {list.length === 0 && (
                <li className={`grid flex-1 place-items-center rounded-control px-4 py-10 text-center text-sm transition-colors ${isOver ? 'text-accent-text' : 'bg-surface-sunken text-text-faint'}`}>
                  {empty(col)}
                </li>
              )}
            </ul>
            {col.footer && <div className="border-t border-border px-3 py-2">{col.footer}</div>}
          </section>
        );
      })}
    </div>
  );
}
