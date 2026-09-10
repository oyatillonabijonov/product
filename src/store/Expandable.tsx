import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Uzun matnni yig'ib ko'rsatadi: pastki qismi fonga qarab yumshoq so'nadi va
 * "Ko'proq ko'rsatish" tugmasi ochadi.
 *
 * Kesish `max-height` bilan — matn DOMda to'liq turadi, shuning uchun qidiruv
 * tizimlari ham, `Ctrl+F` ham uni ko'radi. So'nish gradienti sahifa foni
 * tokenidan (`from-bg`) oziqlanadi, ya'ni temaga qarab o'zi to'g'ri bo'ladi.
 *
 * Matn kesilmaydigan darajada qisqa bo'lsa tugma ham, gradient ham chizilmaydi:
 * `collapsedPx` dan past bo'lsa yig'iladigan narsa yo'q.
 */
const Expandable: FC<{
  moreLabel: string;
  lessLabel: string;
  /** Yig'ilgan holatdagi balandlik. */
  collapsedPx?: number;
  children: ReactNode;
}> = ({ moreLabel, lessLabel, collapsedPx = 190, children }) => {
  const [open, setOpen] = useState(false);
  const [measured, setMeasured] = useState(0);
  const body = useRef<HTMLDivElement | null>(null);
  // O'lcham render paytida emas, montajdan keyin bir marta olinadi: render
  // paytida `ref` hali bo'sh (SSR'da esa umuman yo'q). `scrollHeight` kesilgan
  // qutida ham to'liq kontent balandligini beradi, shuning uchun bitta o'lchov
  // yetarli — matn mahsulot ichida o'zgarmaydi (`ProductPage` `key` bilan
  // qayta yaratiladi).
  useEffect(() => {
    setMeasured(body.current?.scrollHeight ?? 0);
  }, []);
  const full = measured as number;
  // Hali o'lchanmagan bo'lsa tugma ko'rsatib turiladi va o'lchov kelgach o'zi
  // yo'qoladi; teskarisi (yashirib turish) matnni kesib qo'yardi.
  const clipped = full === 0 || full > collapsedPx + 8;

  return (
    <div>
      <div
        ref={body}
        className="relative overflow-hidden transition-[max-height] duration-500 ease-[var(--ease-apple)]"
        style={{ maxHeight: open || !clipped ? `${Math.max(full, collapsedPx)}px` : `${collapsedPx}px` }}
      >
        {children}
        {!open && clipped && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg to-transparent" />
        )}
      </div>

      {clipped && (
        <button
          type="button"
          onClick={() => setOpen((v: boolean) => !v)}
          className="press mt-4 inline-flex items-center gap-1.5 text-copy text-cta hover:underline"
        >
          {open ? lessLabel : moreLabel}
          <ChevronDown aria-hidden className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
};

export default Expandable;
