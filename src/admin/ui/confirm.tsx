import { createContext, useCallback, useContext, useState } from 'react';
import type { FC, ReactNode } from 'react';
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

export const ConfirmProvider: FC<{ children: ReactNode }> = ({ children }) => {
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
      <Modal open={open} label={pending?.opts.title ?? 'Tasdiqlash'} onClose={close} onExited={() => setPending(null)} panelClass="max-w-sm">
        {pending && (
          <div className="p-6">
            <h2 className="text-copy font-semibold text-primary">{pending.opts.title}</h2>
            {pending.opts.message && <p className="mt-2 text-para text-muted">{pending.opts.message}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={close}>Bekor qilish</Button>
              <Button variant={pending.opts.destructive ? 'destructive' : 'primary'} onClick={() => finish(true)}>
                {pending.opts.confirmLabel ?? 'Tasdiqlash'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
};
