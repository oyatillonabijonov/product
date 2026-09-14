import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Search, ShoppingCart, Menu, Globe, User, Heart, Wallet } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import { localizedPath, langToLocale, stripLocale, categoryLabel, type Locale } from '../../app/lib/i18n';
import { formatUzs } from '../lib/installment';
import { parseCurrency } from '../lib/currency';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { useCart } from './CartContext';
import { useFavorites } from './FavoritesContext';
import { useCurrency } from './CurrencyContext';
import ThemeToggle from './ThemeToggle';

/**
 * O'ng tomondagi ikon ustunlari — ikonka + tagida nomi (nomi faqat `lg`dan yuqorida).
 *
 * Bir qatorli desktop header `lg`dan boshlanadi: oltita yozuvli ustun (Profil · UZS/USD ·
 * Sevimlilar · Savat · Til · Mavzu) 768–1023px'ga sig'maydi — qidiruv 0 ga tushardi. Torroq ekranda
 * 1-qatorda Profil/Sevimlilar/Savat ikonkalari, valyuta/til/mavzu ☰ menyusining pastida.
 */
const ICON_COL =
  'press flex flex-col items-center justify-center gap-1 shrink-0 min-w-[44px] min-h-[44px] lg:min-h-0 text-muted hover:text-primary';
const ICON_LABEL = 'hidden lg:block text-label leading-none whitespace-nowrap';
/** Soni belgisi — savat va sevimlilar. */
const BADGE = 'absolute -top-2 -right-2.5 min-w-[20px] h-[20px] px-1 rounded-full bg-accent text-bg text-label font-bold leading-none flex items-center justify-center';
/** ☰ menyusidagi ikki bo'lakli tanlov (valyuta, til). */
const SEG = 'press h-9 flex-1 rounded-xs text-label';

export default function Header({
  t,
  lang,
  locale,
  categories: cats,
  brandName,
  customerName,
  loginEnabled,
  onLoginClick,
}: {
  t: Translation;
  lang: LangKey;
  locale: Locale;
  /** Store layout loader'idan (SSR) — klientda qayta so'ralmaydi. */
  categories: ApiCategory[];
  brandName: string;
  /** Kirgan mijoz nomi, yoki null (kirmagan). */
  customerName: string | null;
  /** Login sozlanganmi — Profil kirmagan holatda kirish oynasini ochadi, aks holda /kirish'ga olib boradi. */
  loginEnabled: boolean;
  /** Kirmagan holatda akkaunt ikonkasi kirish drawer'ini ochadi. */
  onLoginClick: () => void;
}) {
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const { count: favCount } = useFavorites();
  const { currency, rate, setCurrency } = useCurrency();
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

  // Ikkala joyda (desktop 1-qator / mobil 2-qator) bir xil forma.
  // text-control — iOS Safari 16px dan kichik inputni fokusda zoom qiladi.
  const searchForm = (
    <form onSubmit={submitSearch} className="w-full relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder={t.navSearchPlaceholder}
        aria-label={t.navSearch}
        className="w-full bg-segment rounded-full pl-4 pr-11 py-2.5 text-control placeholder:text-muted-2 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:bg-surface transition-colors [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label={t.navSearch}
        className="press absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-accent text-bg flex items-center justify-center hover:bg-accent-hover"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  );

  // `lg`gacha valyuta, til va mavzu 1-qatorga sig'maydi — ☰ menyusining pastida turadi.
  const settings = (
    <div className="lg:hidden mt-1 flex flex-col gap-2 border-t border-divider px-1 pt-2">
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
      <div className="flex gap-1" role="group" aria-label={t.langLabel}>
        {(["O'zbek tili", 'Rus tili'] as const).map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={lang === l}
            onClick={() => { setCatOpen(false); switchLang(l); }}
            className={`${SEG} ${lang === l ? 'bg-accent text-bg' : 'bg-segment text-primary'}`}
          >
            {l === 'Rus tili' ? 'Русский' : "O'zbek"}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-2 text-label text-primary">
        {t.themeLabel}
        <ThemeToggle label={t.themeLabel} className="press flex h-9 w-9 items-center justify-center rounded-full border border-line" iconCls="w-4 h-4" />
      </div>
    </div>
  );

  const catMenu = catOpen && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />
      <div className=" rounded-lg absolute left-0 top-full mt-2 w-60 max-h-[70vh] overflow-y-auto bg-surface border border-line-2 p-2 z-50">
        <div className="border-b border-divider mb-1 pb-1">
          <Link
            to={localizedPath(locale, '/katalog')}
            onClick={() => setCatOpen(false)}
            className="rounded-sm block px-3 py-2.5 text-label hover:bg-bg transition-colors"
          >
            {t.catalogAll}
          </Link>
        </div>
        {cats.map((c) => (
          <Link
            key={c.id}
            to={localizedPath(locale, `/category/${c.id}`)}
            onClick={() => setCatOpen(false)}
            className="rounded-sm block px-3 py-2.5 text-label hover:bg-bg transition-colors"
          >
            {categoryLabel(c, locale)}
          </Link>
        ))}
        {settings}
      </div>
    </>
  );

  return (
    <header
      className={`sticky top-0 z-40 bg-bg border-b transition-colors duration-300 ${
        scrolled ? 'border-line-2' : 'border-transparent'
      }`}
    >
      <div className="shell h-14 lg:h-16 flex items-center gap-2 lg:gap-4">
        <Link to={localizedPath(locale, '/')} className="shrink-0 mr-auto lg:mr-0">
          <img src={logo} alt={brandName} className="logo-light h-8 lg:h-9" />
          {/* Qorong'i fonda logo.svg'ning to'q pillasi yo'qolib ketadi — o'rniga och wordmark. */}
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-8 lg:h-9" />
        </Link>

        {/* Katalog — desktop (torroq ekranda qidiruv qatorida) */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setCatOpen((v) => !v)}
            aria-label={t.navCatalog}
            className="press inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-label font-medium hover:border-accent hover:text-accent"
          >
            <Menu className="w-4 h-4" /> {t.navCatalog}
          </button>
          {catMenu}
        </div>

        {/* Qidiruv — faqat desktop qatorida; torroq ekranda alohida to'liq enli qator */}
        <div className="hidden lg:block flex-1 min-w-0">{searchForm}</div>

        {/* Profil — ustunlarning birinchisi, doim ko'rinadi: kirgan → kabinet; login sozlangan →
            kirish oynasi; sozlanmagan → /kirish (u bosh sahifaga qaytaradi — egasining tanlovi). */}
        {customerName !== null ? (
          <Link
            to={localizedPath(locale, '/kabinet')}
            className={ICON_COL}
            aria-label={customerName || t.navProfile}
            title={customerName || t.navProfile}
          >
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </Link>
        ) : loginEnabled ? (
          <button type="button" onClick={onLoginClick} className={ICON_COL} aria-label={t.navProfile} title={t.navProfile}>
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </button>
        ) : (
          <Link to={localizedPath(locale, '/kirish')} className={ICON_COL} aria-label={t.navProfile} title={t.navProfile}>
            <User className="w-5 h-5" />
            <span className={ICON_LABEL}>{t.navProfile}</span>
          </Link>
        )}

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
      </div>

      {/* `lg`gacha: Katalog (ikon) + to'liq enli qidiruv qatori. */}
      <div className="lg:hidden shell pb-2.5 flex items-center gap-2">
        <div className="relative shrink-0">
          <button
            onClick={() => setCatOpen((v) => !v)}
            aria-label={t.navCatalog}
            className="press flex items-center justify-center w-11 h-11 rounded-full border border-line hover:border-accent hover:text-accent"
          >
            <Menu className="w-5 h-5" />
          </button>
          {catMenu}
        </div>
        {searchForm}
      </div>
    </header>
  );
}
