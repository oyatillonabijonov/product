import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Search, Heart, ShoppingCart, Menu, Globe } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import type { ApiCategory } from '../../shared/types';
import { fetchCategories } from '../api/store';
import { localizedPath, langToLocale, stripLocale, type Locale } from '../../app/lib/i18n';
import logo from '../assets/logo.svg';
import { useCart } from './CartContext';

export default function Header({
  t,
  lang,
  locale,
}: {
  t: Translation;
  lang: LangKey;
  locale: Locale;
}) {
  const [q, setQ] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [cats, setCats] = useState<ApiCategory[]>([]);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();

  function switchLang(nextLang: LangKey) {
    const nextLocale = langToLocale(nextLang);
    const bare = stripLocale(location.pathname);
    navigate(localizedPath(nextLocale, bare) + location.search);
  }

  useEffect(() => {
    fetchCategories().then(setCats);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(localizedPath(locale, `/search?q=${encodeURIComponent(q.trim())}`));
  }

  return (
    <header
      className={`sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b transition-shadow duration-300 ${
        scrolled ? 'border-line-2 shadow-[0_1px_20px_-8px_rgba(0,0,0,0.15)]' : 'border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center gap-3 md:gap-4">
        <Link to={localizedPath(locale, '/')} className="shrink-0">
          <img src={logo} alt="Taqsit Store" className="h-8 md:h-9" />
        </Link>

        <div className="relative hidden sm:block">
          <button
            onClick={() => setCatOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[14px] font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <Menu className="w-4 h-4" /> {t.navCatalog}
          </button>
          {catOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCatOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-line-2 rounded-2xl shadow-[--shadow-apple-hover] p-2 z-50">
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
                    {c.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        <form onSubmit={submitSearch} className="flex-1 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.navSearchPlaceholder}
            className="w-full bg-segment rounded-full pl-4 pr-11 py-2.5 text-[15px] placeholder:text-muted-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:bg-white transition-colors"
          />
          <button
            type="submit"
            aria-label={t.navSearch}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        <button title={t.navSoon} className="hidden md:flex text-muted hover:text-primary transition-colors" aria-label="Sevimlilar">
          <Heart className="w-5 h-5" />
        </button>
        <Link
          to={localizedPath(locale, '/savat')}
          className="relative text-muted hover:text-primary transition-colors"
          aria-label={t.cartTitle}
        >
          <ShoppingCart className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-1 text-muted">
          <Globe className="w-4 h-4 hidden sm:block" />
          <select
            value={lang}
            onChange={(e) => switchLang(e.target.value as LangKey)}
            className="text-[13px] bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="O'zbek tili">O'z</option>
            <option value="Rus tili">Рус</option>
            <option value="English">EN</option>
            <option value="O'zbek tili (Cyrillic)">Ўз</option>
          </select>
        </div>
      </div>
    </header>
  );
}
