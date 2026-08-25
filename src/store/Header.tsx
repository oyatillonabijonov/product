import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Search, ShoppingCart, Menu, Globe, User } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import type { PageLink } from '../../app/lib/loaders';
import { localizedPath, langToLocale, stripLocale, localeToTextKey, categoryLabel, type Locale } from '../../app/lib/i18n';
import logo from '../assets/logo.svg';
import { useCart } from './CartContext';

/** Curated navbar links, in order. Other active pages (faq, biz-haqimizda, kontakt, trade-in, yangiliklar) stay in the footer only. */
const NAV_SLUGS = ['muddatli-tolov'];

export default function Header({
  t,
  lang,
  locale,
  pageLinks,
  categories: cats,
  brandName,
  customerName,
  onLoginClick,
}: {
  t: Translation;
  lang: LangKey;
  locale: Locale;
  pageLinks: PageLink[];
  /** Store layout loader'idan (SSR) — klientda qayta so'ralmaydi. */
  categories: ApiCategory[];
  brandName: string;
  /** Kirgan mijoz nomi, yoki null (kirmagan). */
  customerName: string | null;
  /** Kirmagan holatda akkaunt ikonkasi kirish drawer'ini ochadi. */
  onLoginClick: () => void;
}) {
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const textKey = localeToTextKey(locale);
  const navPages = NAV_SLUGS
    .map((slug) => pageLinks.find((p) => p.slug === slug))
    .filter((p): p is PageLink => Boolean(p));

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
  // text-[16px] — iOS Safari 16px dan kichik inputni fokusda zoom qiladi.
  const searchForm = (
    <form onSubmit={submitSearch} className="w-full relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        enterKeyHint="search"
        placeholder={t.navSearchPlaceholder}
        aria-label={t.navSearch}
        className="w-full bg-segment rounded-full pl-4 pr-11 py-2.5 text-[16px] placeholder:text-muted-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:bg-white transition-colors [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        aria-label={t.navSearch}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  );

  const catMenu = catOpen && (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />
      <div className="absolute left-0 top-full mt-2 w-60 max-h-[70vh] overflow-y-auto bg-white border border-line-2 rounded-2xl shadow-apple-hover p-2 z-50">
        <div className="border-b border-divider mb-1 pb-1">
          <Link
            to={localizedPath(locale, '/katalog')}
            onClick={() => setCatOpen(false)}
            className="block px-3 py-2.5 text-[14px] rounded-xl hover:bg-bg transition-colors"
          >
            {t.catalogAll}
          </Link>
        </div>
        {cats.map((c) => (
          <Link
            key={c.id}
            to={localizedPath(locale, `/category/${c.id}`)}
            onClick={() => setCatOpen(false)}
            className="block px-3 py-2.5 text-[14px] rounded-xl hover:bg-bg transition-colors"
          >
            {categoryLabel(c, locale)}
          </Link>
        ))}
      </div>
    </>
  );

  return (
    <header
      className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b transition-shadow duration-300 ${
        scrolled ? 'border-line-2' : 'border-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 h-14 md:h-16 flex items-center gap-2 md:gap-4">
        <Link to={localizedPath(locale, '/')} className="shrink-0 mr-auto md:mr-0">
          <img src={logo} alt={brandName} className="h-8 md:h-9" />
        </Link>

        {/* Katalog — desktop (mobilda qidiruv qatorida) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setCatOpen((v) => !v)}
            aria-label={t.navCatalog}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[14px] font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <Menu className="w-4 h-4" /> {t.navCatalog}
          </button>
          {catMenu}
        </div>

        {navPages.length > 0 && (
          <nav className="hidden lg:flex items-center gap-5 shrink-0">
            {navPages.map((p) => (
              <Link
                key={p.slug}
                to={localizedPath(locale, `/page/${p.slug}`)}
                className="text-[14px] font-medium text-muted hover:text-accent transition-colors whitespace-nowrap"
              >
                {p.title[textKey]}
              </Link>
            ))}
          </nav>
        )}

        {/* Qidiruv — faqat desktop qatorida; mobilda alohida to'liq enli qator */}
        <div className="hidden md:block flex-1 min-w-0">{searchForm}</div>

        <Link
          to={localizedPath(locale, '/savat')}
          className="relative p-2.5 -m-1 text-muted hover:text-primary transition-colors"
          aria-label={t.cartTitle}
        >
          <ShoppingCart className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>

        {customerName !== null ? (
          <Link
            to={localizedPath(locale, '/kabinet')}
            className="p-2.5 -m-1 text-muted hover:text-primary transition-colors"
            aria-label={customerName || t.accountTitle}
            title={customerName || t.accountTitle}
          >
            <User className="w-5 h-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="p-2.5 -m-1 text-muted hover:text-primary transition-colors"
            aria-label={t.loginTitle}
            title={t.loginTitle}
          >
            <User className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex items-center p-2.5 -m-1 text-muted hover:text-primary transition-colors rounded-md focus-within:ring-2 focus-within:ring-accent/50">
          <Globe className="w-5 h-5" />
          <select
            value={lang}
            onChange={(e) => switchLang(e.target.value as LangKey)}
            aria-label={t.langLabel}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          >
            <option value="O'zbek tili">O'zbek tili</option>
            <option value="Rus tili">Русский</option>
          </select>
        </div>
      </div>

      {/* Mobil: Katalog (ikon) + to'liq enli qidiruv qatori. Nav sahifalar (Shartlar)
          alohida pill-qator o'rniga hero CTA'da — sticky header balandligi tejaladi. */}
      <div className="md:hidden max-w-[1440px] mx-auto px-4 pb-2.5 flex items-center gap-2">
        <div className="relative shrink-0">
          <button
            onClick={() => setCatOpen((v) => !v)}
            aria-label={t.navCatalog}
            className="flex items-center justify-center w-11 h-11 rounded-full border border-line hover:border-accent hover:text-accent transition-colors"
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
