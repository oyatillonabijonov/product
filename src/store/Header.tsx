import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Search, ShoppingCart, Menu, X, Globe, User, Heart, Wallet, ChevronDown } from 'lucide-react';
import { BotAvatar } from 'bot-avatars';
import type { Avatar } from '../../shared/avatar';
import type { LangKey, Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import { localizedPath, langToLocale, stripLocale, categoryLabel, type Locale } from '../../app/lib/i18n';
import { formatUzs } from '../lib/installment';
import { parseCurrency } from '../lib/currency';
import { SPRING_SNAPPY, SPRING_UI } from '../lib/motion';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';
import { useCurrency } from './CurrencyContext';
import { useAssets } from './SiteAssets';
import ThemeToggle from './ThemeToggle';
import { PILL } from './ui';

/**
 * O'ng tomondagi ikon ustunlari — ikonka + tagida nomi (nomi faqat `lg`dan yuqorida).
 *
 * Bir qatorli desktop header `lg`dan boshlanadi: oltita yozuvli ustun (UZS/USD · Sevimlilar ·
 * Savat · Til · Mavzu · Profil) 768–1023px'ga sig'maydi — qidiruv 0 ga tushardi. Torroq ekranda
 * 1-qatorda Sevimlilar/Savat/Profil ikonkalari, valyuta/til/mavzu Katalog menyusining pastida.
 * Profil har ikkala holatda o'ng chetda.
 */
const ICON_COL =
  'press flex flex-col items-center justify-center gap-1 shrink-0 min-w-[44px] min-h-[44px] lg:min-h-0 text-muted hover:text-primary';
const ICON_LABEL = 'hidden lg:block text-label leading-none whitespace-nowrap';
/** Soni belgisi — savat va sevimlilar. */
const BADGE = 'absolute -top-2 -right-2.5 min-w-[20px] h-[20px] px-1 rounded-full bg-accent text-bg text-label font-bold leading-none flex items-center justify-center';
/** Menyudagi ikki bo'lakli tanlov (valyuta, til). */
const SEG = 'press h-9 flex-1 rounded-xs text-label';
/*
 * Katalog menyusi — apple.com global navigatsiyasining ochiladigan paneli naqshida: sarlavha ostidan
 * to'liq enli panel, ikonka va karta yo'q, ierarxiyani faqat tipografiya beradi — kulrang kichik
 * ustun sarlavhasi, yo'nalishlar 20px qalin, "Do'kon" havolalari 17px oddiy (tizim shkalasi).
 */
const MENU_HEADING = 'mb-3 text-label text-muted-2';
const MENU_BIG = 'text-lede font-semibold text-primary transition-colors hover:text-muted-2';
const MENU_SMALL = 'text-copy text-body transition-colors hover:text-primary';

export default function Header({
  t,
  lang,
  locale,
  categories: cats,
  brandName,
  customerName,
  avatar,
  hasDeals,
}: {
  t: Translation;
  lang: LangKey;
  locale: Locale;
  /** Store layout loader'idan (SSR) — klientda qayta so'ralmaydi. */
  categories: ApiCategory[];
  brandName: string;
  /** Kirgan mijoz nomi, yoki null (kirmagan). */
  customerName: string | null;
  /** Kirgan mijoz avatari — ikonka o'rniga chiziladi; kirmaganda null. */
  avatar: Avatar | null;
  /** Kirmagan holatda akkaunt ikonkasi kirish drawer'ini ochadi. */
  /** Chegirma bormi — bo'lmasa menyuda "Chegirmalar" havolasi chiqmaydi (footer bilan bir qoida). */
  hasDeals: boolean;
}) {
  const asset = useAssets();
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const { currency, rate, setCurrency } = useCurrency();
  const reduced = useReducedMotion();
  const closeMenu = () => setCatOpen(false);
  function switchLang(nextLang: LangKey) {
    const nextLocale = langToLocale(nextLang);
    const bare = stripLocale(location.pathname);
    navigate(localizedPath(nextLocale, bare) + location.search);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Katalog menyusi Escape bilan yopiladi.
  useEffect(() => {
    if (!catOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCatOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [catOpen]);

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      // Bo'sh submit jim turmasin — inputga fokus qaytadi.
      e.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    navigate(localizedPath(locale, `/search?q=${encodeURIComponent(query)}`));
  }

  // Ikkala joyda (desktop markaziy guruh / mobil 2-qator) bir xil forma, Katalog tugmasi bilan bir
  // balandlikda (44px). Qidiruv ikonkasi maydon ichida chapda: alohida qora doira sarlavhadagi yagona
  // to'q urg'u — Katalog — bilan raqobatlashardi. Enter ham yuboradi.
  // text-control — iOS Safari 16px dan kichik inputni fokusda zoom qiladi.
  const searchForm = (
    <form onSubmit={submitSearch} role="search" className="relative w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder={t.navSearchPlaceholder}
        aria-label={t.navSearch}
        className="h-11 w-full rounded-full bg-segment pl-11 pr-4 text-control text-primary placeholder:text-muted-2 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label={t.navSearch}
        className="press absolute left-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-2 hover:text-primary"
      >
        <Search aria-hidden className="size-4.5" />
      </button>
    </form>
  );

  // Katalog tugmasidagi ikonka: yopiq — hamburger, ochiq — ✕. Ikkalasi bir joyda ustma-ust turib
  // almashadi (masshtab + shaffoflik + blur), tugma kengligi o'zgarmaydi.
  const iconOut = reduced ? { opacity: 0 } : { opacity: 0, scale: 0.25, filter: 'blur(4px)' };
  const toggleIcon = (cls: string) => (
    <span aria-hidden className={`relative ${cls}`}>
      <AnimatePresence initial={false}>
        <motion.span
          key={catOpen ? 'close' : 'open'}
          initial={iconOut}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={iconOut}
          transition={SPRING_SNAPPY}
          className="absolute inset-0"
        >
          {catOpen ? <X className="size-full" /> : <Menu className="size-full" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  // `lg`gacha valyuta va mavzu Katalog menyusining pastida (til — 1-qatorda, logo o'ng tomonida).
  const settings = (
    <div className="lg:hidden flex flex-col gap-2 border-t border-line pt-6">
      <div className="flex gap-1" role="group" aria-label={t.currencyLabel}>
        {(['UZS', 'USD'] as const).filter((c) => c === 'UZS' || rate > 0).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={currency === c}
            onClick={() => setCurrency(c)}
            className={`${SEG} ${currency === c ? 'bg-accent text-bg' : 'bg-segment text-primary'}`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between text-label text-primary">
        {t.themeLabel}
        <ThemeToggle label={t.themeLabel} className="press flex h-9 w-9 items-center justify-center rounded-full border border-line" iconCls="w-4 h-4" />
      </div>
    </div>
  );

  const shopLinks = [
    { to: '/katalog', label: t.catalogAll },
    ...(hasDeals ? [{ to: '/chegirmalar', label: t.dealsTitle }] : []),
    { to: '/sevimlilar', label: t.accountTabFavorites },
  ];
  // Panel yuqoridan pastga ochiladi (clip-path), havolalar ketma-ket paydo bo'ladi; yopilish
  // shu yo'ldan qaytadi (§7). Harakat kamaytirilganda faqat shaffoflik.
  const panelVariants = reduced
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
    : { hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, shown: { opacity: 1, clipPath: 'inset(0 0 0% 0)' } };
  const itemVariants = reduced
    ? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
    : { hidden: { opacity: 0, y: -6 }, shown: { opacity: 1, y: 0 } };

  const catMenu = (
    <AnimatePresence>
      {/* Ostidagi sahifa xiralashadi va xira qatlam bosilsa menyu yopiladi. Qatlam header'ning
          ostidan boshlanadi: header ustini qoplasa blur pastdagi rasm rangini uning chetiga oqizardi. */}
      {catOpen && (
        <motion.div
          key="menu-scrim"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={SPRING_UI}
          onClick={closeMenu}
          className="absolute inset-x-0 top-full h-dvh bg-bg/40 backdrop-blur-xl"
        />
      )}
      {catOpen && (
        <motion.nav
          key="menu-panel"
          aria-label={t.navCatalog}
          variants={panelVariants}
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={{ ...SPRING_UI, staggerChildren: 0.03 }}
          className="absolute inset-x-0 top-full bg-bg"
        >
          <div className="shell flex max-h-[calc(100dvh-7rem)] flex-col gap-8 overflow-y-auto pb-8 pt-4 lg:max-h-[calc(100dvh-4rem)] lg:flex-row lg:gap-24 lg:pb-14 lg:pt-8">
            <div>
              <motion.p variants={itemVariants} className={MENU_HEADING}>{t.homeCategories}</motion.p>
              <ul className="flex flex-col gap-2.5">
                {cats.map((c) => (
                  <motion.li key={c.id} variants={itemVariants}>
                    <Link to={localizedPath(locale, `/category/${c.id}`)} onClick={closeMenu} className={MENU_BIG}>
                      {categoryLabel(c, locale)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </div>
            <div>
              <motion.p variants={itemVariants} className={MENU_HEADING}>{t.footerShop}</motion.p>
              <ul className="flex flex-col gap-2.5">
                {shopLinks.map((l) => (
                  <motion.li key={l.to} variants={itemVariants}>
                    <Link to={localizedPath(locale, l.to)} onClick={closeMenu} className={MENU_SMALL}>
                      {l.label}
                    </Link>
                  </motion.li>
                ))}
                <motion.li variants={itemVariants}>
                  <Link to={localizedPath(locale, '/page/biz-haqimizda')} onClick={closeMenu} className={MENU_SMALL}>
                    {t.navAbout}
                  </Link>
                </motion.li>
              </ul>
            </div>
            {settings}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );

  return (
    <header
      className={`sticky top-0 z-40 bg-bg border-b transition-colors duration-300 ${
        // Menyu ochiq bo'lsa chiziq yo'q — header va panel bitta yuza bo'lib ko'rinsin.
        scrolled && !catOpen ? 'border-line-2' : 'border-transparent'
      }`}
    >
      <div className="shell h-14 lg:h-16 flex items-center gap-2 lg:gap-4">
        <Link to={localizedPath(locale, '/')} className="shrink-0 mr-auto lg:mr-0">
          <img src={asset('logo')} alt={brandName} className="logo-light h-8 lg:h-9" />
          {/* Qorong'i fonda logo.svg'ning to'q pillasi yo'qolib ketadi — o'rniga och wordmark. */}
          <img src={asset('logoDark')} alt="" aria-hidden className="logo-dark h-8 lg:h-9" />
        </Link>

        {/* Katalog + qidiruv — bitta "mahsulot topish" guruhi, logo va ikonkalar orasidagi bo'sh joy
            markazida. Qidiruv `max-w-xl`dan uzaymaydi: keng ekranda chetdan-chetga cho'zilgan maydon
            ko'zni ikonkalardan uzoqqa olib ketardi. Faqat desktop; torroq ekranda 2-qatorda. */}
        <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-3">
          {/* Tizimdagi asosiy tugma (`PILL`, 44px) — qidiruv bilan bir balandlikda; chap tomondagi
              ikonka qutisining ichki bo'shlig'i `-ml-1` bilan optik tekislanadi. */}
          <button type="button" onClick={() => setCatOpen((v) => !v)} aria-expanded={catOpen} className={`${PILL} shrink-0`}>
            {toggleIcon('-ml-1 size-4.5')} {t.navAll}
          </button>
          <div className="w-full max-w-xl">{searchForm}</div>
        </div>

        {/* Valyuta — til ustuni naqshi: yozuvda joriy valyuta, ustida shaffof native select. */}
        <div className="hidden lg:contents">
          <div className={`rounded-sm relative focus-within:ring-2 focus-within:ring-accent/50 ${ICON_COL}`}>
            <Wallet className="w-5 h-5" />
            <span className={ICON_LABEL}>{currency}</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(parseCurrency(e.target.value))}
              aria-label={t.currencyLabel}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            >
              <option value="UZS">{`UZS — ${t.sum}`}</option>
              {rate > 0 && <option value="USD">{`USD — 1 $ = ${formatUzs(rate, t.sum)}`}</option>}
            </select>
          </div>
        </div>

        {/* `lg`gacha Sevimlilar · Savat · Profil pastki panelda (MobileTabBar), 1-qatorda esa til tanlagichi. */}
        <div className="lg:hidden relative">
          <span className="press pointer-events-none flex h-9 items-center gap-1.5 rounded-full bg-segment pl-3 pr-2.5 text-label text-primary">
            <Globe className="h-4 w-4" />
            {locale === 'ru' ? 'Русский' : "O'zbek"}
            <ChevronDown className="h-4 w-4 text-muted-2" />
          </span>
          <select
            value={lang}
            onChange={(e) => switchLang(e.target.value as LangKey)}
            aria-label={t.langLabel}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            <option value="O'zbek tili">O'zbek</option>
            <option value="Rus tili">Русский</option>
          </select>
        </div>

        <div className="hidden lg:contents">
        <Link to={localizedPath(locale, '/sevimlilar')} className={ICON_COL} aria-label={t.accountTabFavorites}>
          <span className="relative">
            <Heart className="w-5 h-5" />
            {favCount > 0 && <span className={BADGE}>{favCount}</span>}
          </span>
          <span className={ICON_LABEL}>{t.accountTabFavorites}</span>
        </Link>

        <Link to={localizedPath(locale, '/savat')} className={ICON_COL} aria-label={t.cartTitle}>
          <span className="relative">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && <span className={BADGE}>{count}</span>}
          </span>
          <span className={ICON_LABEL}>{t.cartTitle}</span>
        </Link>
        </div>

        <div className="hidden lg:contents">
          <div className={`rounded-sm relative focus-within:ring-2 focus-within:ring-accent/50 ${ICON_COL}`}>
            <Globe className="w-5 h-5" />
            {/* Ikonka tagida joriy tilning o'z nomi turadi (tarjima emas). */}
            <span className={ICON_LABEL}>{locale === 'ru' ? 'Русский' : "O'zbek"}</span>
            <select
              value={lang}
              onChange={(e) => switchLang(e.target.value as LangKey)}
              aria-label={t.langLabel}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            >
              <option value="O'zbek tili">O'zbek tili</option>
              <option value="Rus tili">Русский</option>
            </select>
          </div>

          <ThemeToggle label={t.themeLabel} caption={t.themeLabel} className={ICON_COL} iconCls="w-5 h-5" />
        </div>

        {/* Profil — o'ng chetda, doim ko'rinadi: kirgan → kabinet, aks holda /kirish.
            Kirish oynasi (modal) 2026-09-18'da olib tashlandi — egasining talabi: kirish
            bitta joyda bo'lsin (modal ichida Telegram vidjeti ham ishonchsiz edi).
            Login sozlanmagan bo'lsa /kirish bosh sahifaga qaytaradi. */}
        <Link
          to={localizedPath(locale, customerName !== null ? '/kabinet' : '/kirish')}
          className={`${ICON_COL} max-lg:hidden`}
          aria-label={customerName || t.navProfile}
          title={customerName || t.navProfile}
        >
          {avatar
            ? <BotAvatar type={avatar.type} face={avatar.face} size={22} interactive={false} />
            : <User className="w-5 h-5" />}
          <span className={ICON_LABEL}>{t.navProfile}</span>
        </Link>
      </div>

      {/* `lg`gacha: Katalog (ikon) + to'liq enli qidiruv qatori. */}
      <div className="lg:hidden shell pb-2.5 flex items-center gap-2">
        {/* Desktop'dagi Katalog pill'ining ikonkali shakli — xuddi shu to'q urg'u. */}
        <button
          type="button"
          onClick={() => setCatOpen((v) => !v)}
          aria-label={t.navCatalog}
          aria-expanded={catOpen}
          className="press flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-bg hover:opacity-85"
        >
          {toggleIcon('size-5')}
        </button>
        {searchForm}
      </div>

      {catMenu}
    </header>
  );
}
