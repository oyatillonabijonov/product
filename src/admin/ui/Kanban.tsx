import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HUE_DOT, type Hue } from './controls';

export interface KanbanColumn { id: string; label: string; hue: Hue; hint?: string; footer?: ReactNode }

interface Over { col: string; index: number }

const SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const;

/**
 * Kanban: ustun sarlavhasi sahifa fonida, ostida kulrang ustun va oq kartalar. Kartani sudrab boshqa kartalar
 * ustiga olib borganda ular surilib, tashlanadigan joy (bo'sh joy) ochiladi; tashlansa karta o'sha joyda qoladi,
 * boshqa ustunga tushsa holat o'zgaradi (`onMove`). Sensorli ekran va klaviatura uchun karta o'zi `move` tugmasini
 * chizadi (`renderCard(item, move)`). Telefonda ustunlar yonma-yon suriladi.
 * ponytail: qo'lda qo'yilgan tartib faqat shu sahifada eslab qolinadi (serverda tartib maydoni yo'q) — sahifa
 * yangilansa kartalar yana vaqt bo'yicha turadi.
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
  const [rawOver, setOver] = useState(null as Over | null);
  const over = rawOver as Over | null;
  // Qo'lda qo'yilgan o'rin: kalit → `items` indeksi fazosidagi kasr qiymat (qo'shnilar o'rtasi).
  const [rawPos, setPos] = useState({} as Record<string, number>);
  const pos = rawPos as Record<string, number>;
  const height = useRef(72);

  const base = new Map(items.map((x, i) => [keyOf(x), i]));
  const rank = (k: string) => pos[k] ?? base.get(k) ?? 0;
  const listOf = (col: string) => items.filter((x) => columnOf(x) === col).sort((a, b) => rank(keyOf(a)) - rank(keyOf(b)));

  const reset = () => { setDrag(null); setOver(null); };

  const drop = () => {
    const it = drag ? items.find((x) => keyOf(x) === drag) : undefined;
    if (!it || !over || !drag) { reset(); return; }
    const rest = listOf(over.col).filter((x) => keyOf(x) !== drag);
    const prev = rest[over.index - 1];
    const next = rest[over.index];
    const value = prev && next ? (rank(keyOf(prev)) + rank(keyOf(next))) / 2
      : prev ? rank(keyOf(prev)) + 0.5
        : next ? rank(keyOf(next)) - 0.5
          : 0;
    setPos({ ...pos, [drag]: value });
    if (columnOf(it) !== over.col) onMove(it, over.col);
    reset();
  };

  const placeholder = (
    <motion.li
      key="kb-placeholder"
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={SPRING}
      aria-hidden
      style={{ height: height.current }}
      className="shrink-0 rounded-control-lg bg-accent/10"
    />
  );

  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:snap-none lg:overflow-visible lg:px-0" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((col) => {
        const list = listOf(col.id);
        const visible = list.filter((x) => keyOf(x) !== drag);
        const isOver = drag !== null && over?.col === col.id;
        return (
          <section
            key={col.id}
            aria-label={col.label}
            onDragOver={(e: React.DragEvent<HTMLElement>) => {
              if (!drag) return;
              e.preventDefault();
              if (over?.col !== col.id) setOver({ col: col.id, index: visible.length });
            }}
            onDrop={(e: React.DragEvent<HTMLElement>) => { e.preventDefault(); drop(); }}
            className="flex w-[86vw] max-w-[380px] shrink-0 snap-center flex-col sm:w-[340px] lg:w-auto lg:max-w-none"
          >
            <header className="flex items-center gap-2 px-1 pb-2.5">
              <span aria-hidden className={`size-2 shrink-0 rounded-full ${HUE_DOT[col.hue]}`} />
              <span className="truncate text-base font-semibold text-text">{col.label}</span>
              <span className="text-sm font-medium tabular-nums text-text-faint">{list.length}</span>
              {col.hint && <span className="ml-auto hidden truncate text-sm text-text-faint xl:block">{col.hint}</span>}
            </header>
            <div className={`flex flex-1 flex-col rounded-surface transition-colors duration-200 ${isOver ? 'bg-surface-sunken-hover' : 'bg-surface-sunken'}`}>
              <ul className="flex min-h-40 flex-1 flex-col gap-2 p-2 lg:max-h-[calc(100dvh-280px)] lg:overflow-y-auto lg:thin-scroll">
                <AnimatePresence initial={false}>
                  {list.map((it) => {
                    const k = keyOf(it);
                    const dragged = k === drag;
                    // Sudralayotgan karta DOMda qoladi (yashirin) — olib tashlansa brauzer `dragend` yubormaydi.
                    const i = dragged ? -1 : visible.indexOf(it);
                    return [
                      isOver && !dragged && over?.index === i ? placeholder : null,
                      <motion.li
                        key={k}
                        layout
                        layoutId={`kb-${k}`}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={SPRING}
                        draggable
                        onDragStart={(e: React.DragEvent<HTMLElement>) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', k);
                          height.current = e.currentTarget.offsetHeight;
                          // Brauzer sudrash rasmini olgandan keyin karta ro'yxatdan chiqadi, o'rnida bo'sh joy qoladi.
                          const index = visible.indexOf(it);
                          setTimeout(() => { setDrag(k); setOver({ col: col.id, index }); }, 0);
                        }}
                        onDragOver={(e: React.DragEvent<HTMLElement>) => {
                          if (!drag || dragged) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const r = e.currentTarget.getBoundingClientRect();
                          const index = e.clientY > r.top + r.height / 2 ? i + 1 : i;
                          if (over?.col !== col.id || over.index !== index) setOver({ col: col.id, index });
                        }}
                        onDragEnd={reset}
                        className={`cursor-grab active:cursor-grabbing ${dragged ? 'hidden' : ''}`}
                      >
                        {renderCard(it, (to) => { if (to !== columnOf(it)) onMove(it, to); })}
                      </motion.li>,
                    ];
                  })}
                  {isOver && over && over.index >= visible.length ? placeholder : null}
                </AnimatePresence>
                {visible.length === 0 && !isOver && (
                  <li className="grid flex-1 place-items-center px-4 py-10 text-center text-sm text-text-faint">{empty(col)}</li>
                )}
              </ul>
              {col.footer && <div className="px-2 pb-2">{col.footer}</div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
