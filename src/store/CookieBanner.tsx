import { useEffect, useState, type FC } from 'react';
import { Cookie } from 'lucide-react';
import type { Translation } from '../locales';

const STORAGE_KEY = 'cookie-consent';

/** Lightweight cookie notice. SSR-safe: renders nothing until the effect confirms no prior consent. */
const CookieBanner: FC<{ t: Translation }> = ({ t }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'ok') setVisible(true);
    } catch {
      /* localStorage unavailable — stay hidden */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'ok');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="max-w-[720px] mx-auto bg-white border border-line-2 rounded-2xl shadow-[--shadow-apple-hover] px-4 py-3 flex items-center gap-3">
        <Cookie className="w-5 h-5 shrink-0 text-accent" />
        <p className="flex-1 text-[13px] text-body leading-snug">{t.cookieText}</p>
        <button
          onClick={accept}
          className="shrink-0 px-4 py-2 rounded-full bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover transition-colors"
        >
          {t.cookieAccept}
        </button>
      </div>
    </div>
  );
};

export default CookieBanner;
