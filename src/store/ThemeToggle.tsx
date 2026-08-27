import { useEffect, useState, type FC } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Dark/light almashtirgich.
 *
 * Tanlov `localStorage.theme`da saqlanadi va `<html data-theme>`ga yoziladi
 * (`root.tsx`dagi kichik skript uni paint'dan oldin qo'yadi — chaqnash yo'q).
 * Tanlanmaguncha sayt o'z sukut holatida qoladi: landing qorong'i, qolgan
 * sahifalar yorug'.
 */
export const effectiveDark = () => {
  const set = document.documentElement.getAttribute('data-theme');
  return set ? set === 'dark' : Boolean(document.querySelector('.landing-dark'));
};

const ThemeToggle: FC<{ label: string; className?: string; iconCls?: string }> = ({
  label, className, iconCls = 'h-[18px] w-[18px]',
}) => {
  // Server va birinchi klient render bir xil bo'lishi kerak — haqiqiy holat effektda o'qiladi.
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(effectiveDark()), []);

  function toggle() {
    const next = effectiveDark() ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private rejimda localStorage yo'q — tema shu sahifada baribir almashadi */
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    setDark(next === 'dark');
  }

  const Icon = dark ? Sun : Moon;
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={className}>
      <Icon aria-hidden className={iconCls} strokeWidth={1.8} />
    </button>
  );
};

export default ThemeToggle;
