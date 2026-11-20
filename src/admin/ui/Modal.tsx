import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * Admin modali — ERP `Sheet` (§3.7): 640px dan kengda markazda dialog (radius 16, `surface-raised`, parda),
 * telefonda pastdan bottom sheet (yuqori burchaklar 20, tutqich, 92dvh). Sarlavha/tugmalarni bola chizadi.
 * Saytning `store/Modal`i o'rniga: admin o'z CSS build'ida, sayt komponentlari bu yerda uslubsiz qoladi.
 *
 * Shartnoma saytnikidek: `onClose` faqat yopilishni boshlaydi, ota ma'lumotni `onExited`da tashlaydi.
 */
const Modal: FC<{
  open: boolean;
  label: string;
  onClose: () => void;
  onExited?: () => void;
  /** Panel kengligi — sukut `sm:max-w-md`. */
  panelClass?: string;
  children: ReactNode;
}> = ({ open, label, onClose, onExited, panelClass = 'sm:max-w-md', children }) => {
  const reduced = useReducedMotion();
  const [phone, setPhone] = useState(false);
  const panel = useRef(null) as { current: HTMLDivElement | null };
  const restoreTo = useRef(null) as { current: HTMLElement | null };
  // Ota `onClose`ni har renderda yangi funksiya qilib beradi — effekt unga bog'lansa fokus inputdan ketardi.
  const closeRef = useRef(onClose) as { current: () => void };
  closeRef.current = onClose;

  useEffect(() => {
    const mq = window.matchMedia('(width < 40rem)');
    setPhone(mq.matches);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      restoreTo.current?.focus();
    };
  }, [open]);

  const motionProps = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : phone
      ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } }
      : { initial: { scale: 0.95, opacity: 0, y: 20 }, animate: { scale: 1, opacity: 1, y: 0 }, exit: { scale: 0.95, opacity: 0, y: 20 } };

  return (
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-overlay sm:backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            {...motionProps}
            className={`relative flex max-h-[92dvh] w-full flex-col overflow-y-auto overscroll-contain rounded-t-sheet bg-surface-raised pb-[env(safe-area-inset-bottom)] outline-none sm:max-h-[calc(100dvh-2rem)] sm:rounded-overlay sm:pb-0 ${panelClass}`}
          >
            <div aria-hidden className="mx-auto mb-1 mt-2 h-1 w-9 shrink-0 rounded-full bg-neutral sm:hidden" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
