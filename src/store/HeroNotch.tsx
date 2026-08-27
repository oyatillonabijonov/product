import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronDown, User, Globe } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import { categoryLabel, type Locale } from '../../app/lib/i18n';
import { Link } from 'react-router';
import LocaleLink from './LocaleLink';
import ThemeToggle from './ThemeToggle';
import wordmark from '../assets/hero/wordmark.webp';

const SPRING = { type: 'spring', stiffness: 160, damping: 24, mass: 1 } as const;

/** Nav'ning yumaloq ikon tugmasi — Kirish pill'i bilan bir balandlikda (36px). */
const ICON_BTN =
  'flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/[0.16] text-[#F5F5F7] transition-colors duration-200 hover:border-white/[0.38]';

/**
 * Hero tepasidagi qora "notch" — yopiq holatda faqat logotip ko'rinadi, hover'da
 * navigatsiya ochiladi. Hero tugagach o'zi ochiq qoladi va nav-bar vazifasini
 * bajaradi (bosh sahifada sayt headeri desktopda yashiriladi).
 *
 * Faqat `md`dan yuqorida: ochilish hover'ga bog'liq, sensorli ekranda esa hover
 * yo'q — mobilda o'rniga saytning odatdagi headeri qoladi.
 */
export default function HeroNotch({ t, locale, categories }: {
  t: Translation; locale: Locale; categories: ApiCategory[];
}) {
  const [hover, setHover] = useState(false);
  const [menu, setMenu] = useState(false);
  const [pinned, setPinned] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [navW, setNavW] = useState(0);
  const reduced = useReducedMotion();

  // Nav'ning tabiiy kengligi bir marta o'lchanadi — quti taxmin qilingan qiymatni
  // quvmasin (dizayndagi yondashuv).
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const prev = el.style.maxWidth;
    el.style.maxWidth = 'none';
    setNavW(el.offsetWidth);
    el.style.maxWidth = prev;
  }, [categories.length, locale]);

  useEffect(() => {
    // Hero balandligi HeroColumns bilan bir xil: 100vh, lekin kamida 740px.
    // `innerHeight` mount paytida hali 0 bo'lishi mumkin — shuning uchun pastki
    // chegara qo'yilmasa notch birinchi kadrda ochiq bo'lib qotib qolardi.
    const onScroll = () => setPinned(window.scrollY > Math.max(740, window.innerHeight) - 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const open = hover || menu || pinned;

  return (
    <motion.div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setMenu(false); }}
      initial={{ height: 80.53, paddingLeft: 0, paddingRight: 0, gap: 0 }}
      animate={open
        ? { height: 92, paddingLeft: 24, paddingRight: 24, gap: 28 }
        : { height: 80.53, paddingLeft: 0, paddingRight: 0, gap: 0 }}
      transition={reduced ? { duration: 0 } : SPRING}
      style={{ overflow: open ? 'visible' : 'hidden' }}
      className="fixed -top-[14px] left-1/2 z-40 hidden w-max md:flex max-w-[96vw] min-w-[231.65px] -translate-x-1/2 items-center justify-center rounded-b-[24px] bg-black pt-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_4px_162px_0_rgba(255,255,255,0.25)]"
    >
      <LocaleLink to="/" className="block flex-none">
        <img src={wordmark} alt="" aria-hidden className="block h-[25px] w-auto" />
      </LocaleLink>

      <motion.div
        ref={navRef}
        initial={{ maxWidth: 0, opacity: 0 }}
        animate={{ maxWidth: open ? navW : 0, opacity: open ? 1 : 0 }}
        transition={reduced ? { duration: 0 } : SPRING}
        className="flex flex-none items-center gap-[34px] whitespace-nowrap"
      >
        <div className="ml-7 flex items-center gap-[22px]">
          <div
            onMouseEnter={() => setMenu(true)}
            onMouseLeave={() => setMenu(false)}
            className="relative flex items-center gap-[5px]"
          >
            <span
              className="text-[14px] font-normal tracking-[-0.01em] transition-colors duration-200"
              style={{ color: menu ? '#F5F5F7' : '#A1A1A6' }}
            >
              {t.homeCategories}
            </span>
            <ChevronDown
              aria-hidden
              strokeWidth={2}
              className="h-4 w-4 text-[#6E6E73] transition-transform duration-[260ms]"
              style={{ transform: menu ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
            <div
              className="absolute left-[-16px] top-full mt-5 flex min-w-[216px] flex-col rounded-[20px] bg-black p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14),0_24px_60px_rgba(0,0,0,0.7)]"
              style={{
                opacity: menu ? 1 : 0,
                visibility: menu ? 'visible' : 'hidden',
                transform: menu ? 'translateY(0px)' : 'translateY(-8px)',
                transition: 'opacity 240ms ease, transform 300ms cubic-bezier(.22,1.1,.32,1), visibility 240ms',
              }}
            >
              {categories.map((c) => (
                <LocaleLink
                  key={c.id}
                  to={`/category/${c.id}`}
                  className="flex h-[38px] items-center rounded-xl px-3 text-[14px] font-normal tracking-[-0.01em] text-[#F5F5F7] whitespace-nowrap transition-colors duration-200 hover:bg-white/[0.08]"
                >
                  {categoryLabel(c, locale)}
                </LocaleLink>
              ))}
            </div>
          </div>
          <LocaleLink
            to="/katalog"
            className="text-[14px] font-normal tracking-[-0.01em] text-[#A1A1A6] transition-colors duration-200 hover:text-[#F5F5F7]"
          >
            {t.navCatalog}
          </LocaleLink>
        </div>

        <div aria-hidden className="h-[22px] w-px bg-white/[0.34]" />

        <div className="flex items-center gap-4">
          <LocaleLink
            to="/kirish"
            className="flex h-9 items-center rounded-full bg-[#0071E3] px-5 text-[14px] font-medium text-white transition-colors duration-200 hover:bg-[#0A84FF]"
          >
            {t.loginTitle}
          </LocaleLink>
          <LocaleLink to="/kabinet" aria-label={t.accountTitle} title={t.accountTitle} className={ICON_BTN}>
            <User aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </LocaleLink>
          <Link
            to={locale === 'ru' ? '/' : '/ru'}
            aria-label={`${t.langLabel}: ${locale === 'ru' ? "O'zbekcha" : 'Русский'}`}
            title={locale === 'ru' ? "O'zbekcha" : 'Русский'}
            className={ICON_BTN}
          >
            <Globe aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
          <ThemeToggle label={t.themeLabel} className={ICON_BTN} />
        </div>
      </motion.div>
    </motion.div>
  );
}
