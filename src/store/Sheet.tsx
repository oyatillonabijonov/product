import { useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { SPRING_SHEET, SPRING_SNAPPY, project } from '../lib/motion';

/** Proyeksiya qilingan to'xtash nuqtasi panel balandligining shu ulushidan o'tsa — yopiladi. */
const DISMISS_RATIO = 0.35;

/**
 * Pastdan chiquvchi panel (bottom sheet) — barmoq bilan sudraladigan.
 *
 * Apple "Designing Fluid Interfaces" bo'yicha:
 * - **1:1 kuzatish** (§2): panel barmoqqa yopishib turadi, oxirida emas, butun
 *   jest davomida.
 * - **Impuls proyeksiyasi** (§6): qo'yib yuborilgan nuqtaga emas, jest **qayerga
 *   ketayotganiga** qarab qaror qilinadi — shuning uchun qisqa, tez silkitish ham
 *   panelni yopadi, sekin uzoq tortish esa yopmaydi.
 * - **Rezina chegara** (§9): tepaga tortilganda qattiq to'xtamaydi, qarshilik
 *   ortib boradi ("javob beryapti, lekin bu yog'i yo'q").
 * - **Simmetriya** (§7): qaysi yo'ldan chiqqan bo'lsa, o'sha yo'ldan ketadi.
 *
 * Sudrash faqat tepadagi tutqichdan boshlanadi (`dragListener={false}`): ichkarida
 * scroll bor, aks holda ro'yxatni aylantirmoqchi bo'lgan barmoq panelni tortib
 * yuborardi.
 */
const Sheet: FC<{
  open: boolean;
  label: string;
  onClose: () => void;
  /** Sarlavha qatori — tutqich bilan bir joyda, sudrash shu yerdan boshlanadi. */
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}> = ({ open, label, onClose, header, footer, children }) => {
  const reduced = useReducedMotion();
  const controls = useDragControls();
  const panel = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const hidden = reduced ? { opacity: 0 } : { y: '100%' };
  const shown = reduced ? { opacity: 1 } : { y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_SNAPPY}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={SPRING_SHEET}
            drag={reduced ? false : 'y'}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            /* Pastga — to'liq 1:1; tepaga — rezina qarshilik. */
            dragElastic={{ top: 0.05, bottom: 1 }}
            onDragEnd={(_e: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
              const height = panel.current?.getBoundingClientRect().height ?? 0;
              if (info.offset.y + project(info.velocity.y) > height * DISMISS_RATIO) onClose();
            }}
            className="absolute bottom-0 inset-x-0 flex max-h-[85vh] flex-col rounded-t-xl bg-surface outline-none"
          >
            <div
              onPointerDown={(e: { preventDefault: () => void }) => { controls.start(e as never); e.preventDefault(); }}
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
            >
              {/* Tutqich — sudralishini aytib turadigan yagona belgi. */}
              <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-line" />
              {header}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">{children}</div>
            {footer}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
