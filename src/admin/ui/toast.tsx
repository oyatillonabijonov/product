import { createContext, useCallback, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WarningCircle, CheckCircle } from '@phosphor-icons/react';

type Kind = 'success' | 'error';
interface ToastItem { id: number; text: string; kind: Kind }
type Push = (text: string, kind?: Kind) => void;

// react tipsiz — `createContext<Push>` generigi tushib qoladi; qiymat cast bilan tiplanadi.
const ToastCtx = createContext((() => {}) as Push);

/** `const toast = useToast(); toast('Saqlandi')` — ERP toast (§3.7): tepa-markaz, muvaffaqiyat 3.2 s, xato 5.5 s, bosilsa yopiladi. */
export function useToast(): Push {
  return useContext(ToastCtx) as Push;
}

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [raw, setItems] = useState([] as ToastItem[]);
  const items = raw as ToastItem[];
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    // Bir vaqtda ko'pi bilan 3 ta.
    setItems((xs: ToastItem[]) => [...xs, { id, text, kind }].slice(-3));
    setTimeout(() => setItems((xs: ToastItem[]) => xs.filter((x) => x.id !== id)), kind === 'error' ? 5500 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[300] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.button
              type="button"
              key={t.id}
              layout
              role={t.kind === 'error' ? 'alert' : 'status'}
              onClick={() => setItems((xs: ToastItem[]) => xs.filter((x) => x.id !== t.id))}
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 420, damping: 34 } }}
              exit={{ opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.18 } }}
              className="pointer-events-auto flex w-[min(92vw,360px)] items-start gap-2.5 rounded-control bg-inverted px-4 py-3 text-left text-base"
            >
              {t.kind === 'error'
                ? <WarningCircle aria-hidden weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-danger" />
                : <CheckCircle aria-hidden weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-success" />}
              <span className="min-w-0 text-base font-semibold text-text-on-inverted">{t.text}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
