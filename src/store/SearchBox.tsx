import { useEffect, useId, useRef, useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, ChevronRight } from 'lucide-react';
import type { Translation } from '../locales';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import type { SearchSuggestion } from '../../app/lib/loaders';
import { useCurrency } from './CurrencyContext';

/** Shu uzunlikdan qisqa so'rovda tavsiya so'ralmaydi — "i" butun katalogni qaytarardi. */
const MIN_CHARS = 2;

/**
 * Sayt qidiruvi + yozilganga mos tovar tavsiyalari ("ip" → iPhone'lar). Header'da (ikki joyda —
 * desktop va mobil qator) va landing notch'ida bitta komponent. Enter: tanlangan tavsiya bo'lsa
 * o'sha tovar, bo'lmasa `/search?q=`; strelkalar tavsiyalar bo'ylab yuradi, Escape yopadi.
 * `dark` — notch'ning qora foni uchun ixcham maydon; tavsiyalar ro'yxati ikkalasida bir xil (tokenlar).
 */
const SearchBox: FC<{
  t: Translation;
  locale: Locale;
  dark?: boolean;
  /** Notch yozish paytida yopilib qolmasin — fokus yoki matn bor-yo'qligi. */
  onActiveChange?: (active: boolean) => void;
}> = ({ t, locale, dark = false, onActiveChange }) => {
  const [qRaw, setQ] = useState('');
  const [itemsRaw, setItems] = useState(null);
  const [focusedRaw, setFocused] = useState(false);
  const [activeRaw, setActive] = useState(-1);
  const q = qRaw as string;
  const items = itemsRaw as SearchSuggestion[] | null;
  const focused = focusedRaw as boolean;
  const active = activeRaw as number;
  const navigate = useNavigate();
  const { price } = useCurrency();
  const listId = useId() as string;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const query = q.trim();

  // Yozish to'xtagach 150 ms o'tib so'raladi; eski so'rov bekor qilinadi — javoblar aralashmaydi.
  useEffect(() => {
    if (query.length < MIN_CHARS) { setItems(null); return; }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search-suggest?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((list: SearchSuggestion[]) => { setItems(list); setActive(-1); })
        .catch(() => {});
    }, 150);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  useEffect(() => { onActiveChange?.(focused || q !== ''); }, [focused, q, onActiveChange]);

  const open = focused && query.length >= MIN_CHARS && items !== null;
  const productPath = (id: string) => localizedPath(locale, `/product/${id}`);
  const allPath = localizedPath(locale, `/search?q=${encodeURIComponent(query)}`);
  const close = () => { setFocused(false); inputRef.current?.blur(); };
  // Tovarga o'tilganda so'rov tozalanadi (header sahifalar orasida yashaydi — aks holda keyingi yozuv
  // eski so'rovga qo'shilib ketardi); "Barcha natijalar"da esa ko'rinib turgani qoladi.
  const pick = () => { setQ(''); close(); };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Bo'sh submit jim turmasin — inputga fokus qaytadi.
    if (!query) { inputRef.current?.focus(); return; }
    const picked = items && active >= 0 ? items[active] : null;
    if (picked) pick(); else close();
    navigate(picked ? productPath(picked.id) : allPath);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items || items.length === 0) {
      if (e.key === 'Escape') close();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((active + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active <= 0 ? items.length - 1 : active - 1); }
    else if (e.key === 'Escape') close();
  }

  // text-control — iOS Safari 16px dan kichik inputni fokusda zoom qiladi (notch faqat desktopda).
  const inputCls = dark
    ? 'h-9 w-[220px] rounded-full border border-white/[0.16] bg-white/[0.08] pl-9 pr-3 text-label text-[#F5F5F7] placeholder:text-[#86868B] focus:border-white/[0.38] focus:outline-none'
    : 'h-11 w-full rounded-full bg-segment pl-11 pr-4 text-control text-primary placeholder:text-muted-2 transition-colors focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent/30';

  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        type="search"
        enterKeyHint="search"
        placeholder={t.navSearchPlaceholder}
        aria-label={t.navSearch}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className={`${inputCls} [&::-webkit-search-cancel-button]:hidden`}
      />
      <button
        type="submit"
        aria-label={t.navSearch}
        className={`press absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full ${
          dark ? 'left-1 size-7 text-[#86868B] hover:text-[#F5F5F7]' : 'left-1.5 size-8 text-muted-2 hover:text-primary'
        }`}
      >
        <Search aria-hidden className={dark ? 'size-4' : 'size-4.5'} />
      </button>

      {/* Ro'yxat bosilganda input fokusni yo'qotmasin (mousedown default) — aks holda blur uni
          bosish yetib kelmasidan oldin yopib qo'yardi. Soya yo'q: yuza chegara va fon bilan ajraladi. */}
      {open && items && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className={`absolute top-full z-50 mt-2 rounded-lg border border-line bg-surface p-1.5 text-left ${
            dark ? 'right-0 w-[440px]' : 'inset-x-0'
          }`}
        >
          {items.length === 0 ? (
            <p className="px-3 py-3 text-para text-muted-2">{t.searchNoMatch}</p>
          ) : (
            <ul id={listId} role="listbox" aria-label={t.navSearch} className="flex flex-col">
              {items.map((s, i) => (
                <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <Link
                    to={productPath(s.id)}
                    onClick={pick}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 rounded-sm px-2 py-1.5 ${i === active ? 'bg-fill-2' : ''}`}
                  >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xs border border-line bg-white">
                      {s.image && <img src={s.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
                    </span>
                    {/* Narx nom ostida — telefonda yonma-yon turganda nom 12 belgigacha kesilib qolardi. */}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-para text-primary">{s.name}</span>
                      <span className="block text-label tabular-nums text-muted-2">{price(s.priceUzs)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 && (
            <Link
              to={allPath}
              onClick={close}
              className="mt-1 flex items-center gap-1 border-t border-divider px-2 pb-1 pt-2.5 text-para text-link"
            >
              {t.searchAllResults}: «{query}» <ChevronRight aria-hidden className="size-4" />
            </Link>
          )}
        </div>
      )}
    </form>
  );
};

export default SearchBox;
