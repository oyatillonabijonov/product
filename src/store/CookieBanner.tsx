import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Translation } from '../locales';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import { PRIVACY_SLUG } from '../lib/page-slugs';
import { SPRING_UI } from '../lib/motion';
import { BTN_SM } from './ui';

const STORAGE_KEY = 'cookie-consent';
/** Sahifa avval o'zini ko'rsatsin — bildirishnoma undan keyin sirg'alib chiqadi. */
const DELAY_MS = 900;

/**
 * Cookie bildirishnomasi — **rozilik so'ramaydi**, xabar beradi.
 *
 * Sayt kuzatuv cookie'sini ishlatmaydi (analitika ulanmagan): faqat sessiya,
 * OAuth CSRF va foydalanuvchi o'zi tanlagan valyuta. Shuning uchun bu bloklovchi
 * vazifa emas — kartochka bo'lib kontent ustida turmaydi, footer kabi **chrome**:
 * `bg-bg` va bitta hairline. Yopish tugmasi ham asosiy CTA emas, ixcham chegara.
 *
 * SSR-xavfsiz: effekt oldingi roziligni tekshirmaguncha hech narsa chizilmaydi.
 */
const CookieBanner: FC<{ t: Translation; locale: Locale }> = ({ t, locale }) => {
  const [rawVisible, setVisible] = useState(false);
  const visible = rawVisible as boolean;
  const reduced = useReducedMotion();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (localStorage.getItem(STORAGE_KEY) !== 'ok') timer = setTimeout(() => setVisible(true), DELAY_MS);
    } catch {
      /* localStorage yo'q (private rejim) — ko'rsatmaymiz */
    }
    return () => clearTimeout(timer);
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, 'ok');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: '0%' }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={SPRING_UI}
          className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-50 border-t border-divider bg-bg lg:bottom-0"
        >
          <div className="shell flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
            <p className="min-w-0 flex-1 text-para text-muted">{t.cookieText}</p>
            <div className="flex items-center gap-5 max-sm:w-full max-sm:justify-end">
              <Link
                to={localizedPath(locale, `/page/${PRIVACY_SLUG}`)}
                className="press rounded-xs text-label text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t.cookieMore}
              </Link>
              <button
                type="button"
                onClick={accept}
                className={`${BTN_SM} border border-line-2 text-primary hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              >
                {t.cookieAccept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
