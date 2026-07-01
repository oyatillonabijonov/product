import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Heart, ShoppingCart } from 'lucide-react';
import type { LangKey, Translation } from '../locales';
import logo from '../assets/logo.svg';

export default function Header({
  t,
  lang,
  setLang,
}: {
  t: Translation;
  lang: LangKey;
  setLang: (l: LangKey) => void;
}) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E5E5EA]">
      <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center gap-4">
        <Link to="/" className="shrink-0">
          <img src={logo} alt="Taqsit Store" className="h-7" />
        </Link>
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[#D2D2D7] px-4 py-2 text-[14px] font-semibold text-[#1D1D1F] hover:border-[#0071E3]"
        >
          ☰ {t.navCatalog}
        </Link>
        <form onSubmit={submitSearch} className="flex-1 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.navSearchPlaceholder}
            className="w-full bg-[#F5F5F7] rounded-full pl-4 pr-11 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30"
          />
          <button type="submit" aria-label={t.navSearch} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
            <Search className="w-4 h-4" />
          </button>
        </form>
        <button title={t.navSoon} className="hidden md:flex text-[#6E6E73] hover:text-[#1D1D1F]" aria-label="Sevimlilar">
          <Heart className="w-5 h-5" />
        </button>
        <button title={t.navSoon} className="text-[#6E6E73] hover:text-[#1D1D1F]" aria-label="Savat">
          <ShoppingCart className="w-5 h-5" />
        </button>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as LangKey)}
          className="text-[13px] bg-transparent focus:outline-none text-[#6E6E73]"
        >
          <option value="O'zbek tili">O'z</option>
          <option value="Rus tili">Рус</option>
          <option value="English">EN</option>
          <option value="O'zbek tili (Cyrillic)">Ўз</option>
        </select>
      </div>
    </header>
  );
}
