import { createContext, useCallback, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SPRING_UI } from '../../lib/motion';

type Kind = 'success' | 'error';
interface ToastItem { id: number; text: string; kind: Kind }
type Push = (text: string, kind?: Kind) => void;

// react tipsiz — `createContext<Push>` generigi tushib qoladi; qiymat cast bilan tiplanadi.
const ToastCtx = createContext((() => {}) as Push);

/** `const toast = useToast(); toast('Saqlandi')` — pastda 3.5 s turadi, mobilda tab bar ustida. */
export function useToast(): Push {
  return useContext(ToastCtx) as Push;
}

export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [raw, setItems] = useState([] as ToastItem[]);
  const items = raw as ToastItem[];
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((xs: ToastItem[]) => [...xs, { id, text, kind }]);
    setTimeout(() => setItems((xs: ToastItem[]) => xs.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={SPRING_UI}
              className={`rounded-full px-5 py-2.5 text-para ${t.kind === 'error' ? 'bg-danger text-white' : 'bg-primary text-bg'}`}
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
};
