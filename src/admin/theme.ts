import { useEffect, useState } from 'react';

/**
 * Admin mavzusi saytnikidan alohida (2026-09-24, egasining tanlovi): `localStorage.adminTheme`.
 * `root.tsx`dagi skript `/admin` yo'lida shu kalitni paint'dan oldin qo'yadi, hook faqat almashtiradi.
 * Sukut — yorug'. Almashtirgich ikki joyda (sidebar va Akkaunt) — `themechange` ularni sinxronlaydi.
 */
const KEY = 'adminTheme';

export function useAdminDark(): [boolean, (dark: boolean) => void] {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const read = () => setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    read();
    window.addEventListener('themechange', read);
    return () => window.removeEventListener('themechange', read);
  }, []);
  const set = (next: boolean) => {
    const v = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* private rejimda localStorage yo'q — mavzu shu sahifada baribir almashadi */
    }
    window.dispatchEvent(new Event('themechange'));
  };
  return [dark as boolean, set];
}
