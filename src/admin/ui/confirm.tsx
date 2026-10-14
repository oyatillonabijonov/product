import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../store/Modal';
import { Button } from './controls';

export interface ConfirmOpts {
  title: string;
  message?: string;
  /** Sukut "Tasdiqlash"; o'chirishda "O'chirish". */
  confirmLabel?: string;
  destructive?: boolean;
}
type Ask = (opts: ConfirmOpts) => Promise<boolean>;
interface Pending { opts: ConfirmOpts; resolve: (v: boolean) => void }

const ConfirmCtx = createContext((async () => false) as Ask);

/** `const confirm = useConfirm(); if (await confirm({ title: '…', destructive: true })) …` — `window.confirm` o'rniga. */
export function useConfirm(): Ask {
  return useContext(ConfirmCtx) as Ask;
}

/**
 * Boshqa `Modal` ustida tasdiq ochiladigan joy uchun: tasdiq ochiq paytda Escape ikkala `Modal`ning window
 * tinglovchisini ishga tushiradi — pastdagi oyna yopilib, saqlanmagan o'zgarishlar yo'qolardi. Pastdagi oyna
 * `onClose`da `if (!confirming.current)` tekshirsa, tasdiq ochiq bo'lgan butun vaqt davomida yopilmaydi.
 */
export function useGuardedConfirm(): { confirm: Ask; confirming: { current: boolean } } {
  const rawConfirm = useConfirm();
  const confirming = useRef(false) as { current: boolean };
  const confirm: Ask = async (opts) => {
    confirming.current = true;
    try {
      return await rawConfirm(opts);
    } finally {
      // Keyingi tikda: Escape bir hodisada ikkala tinglovchini chaqiradi, ularning tartibi bayroqqa bog'liq bo'lmasin.
      setTimeout(() => { confirming.current = false; }, 0);
    }
  };
  return { confirm, confirming };
}

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation('common');
  const [raw, setPending] = useState(null as Pending | null);
  const pending = raw as Pending | null;
  const [open, setOpen] = useState(false);

  // `useCallback<Ask>` yozilmaydi — react tipsiz, hook'lardagi generik tushib qoladi; param tipi yetadi.
  const ask = useCallback((opts: ConfirmOpts) => new Promise<boolean>((resolve) => {
    setPending({ opts, resolve });
    setOpen(true);
  }), []);
  // Yopish faqat animatsiyani boshlaydi; ma'lumot `onExited`da tashlanadi (Modal shartnomasi).
  const finish = useCallback((v: boolean) => {
    pending?.resolve(v);
    setOpen(false);
  }, [pending]);
  const close = useCallback(() => finish(false), [finish]);

  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      <Modal open={open} label={pending?.opts.title ?? t('confirm')} onClose={close} onExited={() => setPending(null)} panelClass="max-w-sm">
        {pending && (
          <div className="p-6">
            <h2 className="text-copy font-semibold text-primary">{pending.opts.title}</h2>
            {pending.opts.message && <p className="mt-2 text-para text-muted">{pending.opts.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>{t('cancel')}</Button>
              <Button variant={pending.opts.destructive ? 'destructive' : 'primary'} onClick={() => finish(true)}>
                {pending.opts.confirmLabel ?? t('confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
};
