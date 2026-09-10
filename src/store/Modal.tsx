import { useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SPRING_UI, SPRING_SNAPPY } from '../lib/motion';

/**
 * Modal oyna — sayt bo'ylab bitta xulq.
 *
 * Apple qoidalari (Designing Fluid Interfaces / Materials):
 * - **Materiallashadi, shunchaki so'nmaydi** (§12): blur radiusi va masshtab birga
 *   o'zgaradi, shuning uchun yuza "haqiqiy material kelib qolgan"dek o'qiladi.
 * - **Kirish va chiqish bitta yo'ldan** (§7): exit — enter'ning aynan teskarisi.
 * - **Fon qoraytiriladi** (§12): modal — bloklovchi vazifa, shuning uchun scrim
 *   bor va fon orqaga suriladi.
 * - Harakat kamaytirilganda (§14) faqat opacity o'zgaradi — masshtab va blur yo'q.
 *
 * `onExited` yopilish animatsiyasi **tugagach** chaqiriladi: ota komponent
 * ma'lumotni shundan keyin tashlab yuboradi, aks holda chiqish kadrlari
 * ko'rinmay qolardi.
 */
const Modal: FC<{
  open: boolean;
  label: string;
  onClose: () => void;
  onExited?: () => void;
  /** Panel kengligi — sukut bo'yicha `max-w-md`. */
  panelClass?: string;
  children: ReactNode;
}> = ({ open, label, onClose, onExited, panelClass = 'max-w-md', children }) => {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      restoreTo.current?.focus();
    };
  }, [open, onClose]);

  const hidden = reduced
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.94, y: 10, filter: 'blur(8px)' };
  const shown = reduced
    ? { opacity: 1 }
    : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' };

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRING_SNAPPY}
          onClick={onClose}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={SPRING_UI}
            className={`relative w-full ${panelClass} rounded-xl bg-surface border border-line outline-none`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
