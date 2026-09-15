import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { CategoryTile } from '../../app/lib/tiles';
import type { Translation } from '../locales';

/** Chetdagi so'nishning eng katta eni, px — mask'dagi `5rem` bilan bir xil. */
const FADE = 80;

/**
 * Yo'nalish sahifasidagi tur qatori — apple.com do'konidagi mahsulot navigatsiyasi
 * uslubida: karta va ramka yo'q, shaffof ikonka to'g'ridan-to'g'ri sahifa fonida,
 * ostida qisqa nom. Tile katalogni `?tur=` bilan filtrlaydi, faolini qayta bosish
 * tozalaydi.
 *
 * Ikonkalar 2x rasm (`public/sections/`) va **o'z o'lchamining yarmida** chiziladi
 * (`zoom: 0.5`), pastki chetlari bir chiziqda — Apple rasmlari shunga chizilgan:
 * Mac keng, Watch tor, Vision Pro past. Hammasini bir balandlikka cho'zish bu
 * nisbatni buzardi. Qator balandligi va element eni qat'iy — rasm yuklanganda
 * layout siljimaydi.
 *
 * Qorong'i mavzuda ikonka ortida yumshoq yorug'lik dog'i (`spotlight` tokeni, yorug'
 * mavzuda shaffof): qora qurilmalar (PSU, kuler, naushnik) aks holda fonga singib ketardi.
 * Dog' rasmga emas, tile eniga bog'langan (`w-full`) — hamma turda bir xil, rasm
 * yuklanguncha ingichka chiziq bo'lib qolmaydi.
 *
 * Qator `.shell` chetigacha chiqadi (`--shell-pad` qadar, har ekranda) va chetlarda
 * so'nadi. So'nish eni scroll bilan uzluksiz o'zgaradi (`--fade-l`/`--fade-r`, 0…80px):
 * qaysi tomonda yashirin tur bo'lsa, o'sha chet so'nadi; tinch holatda chapda faqat
 * padding, oxirida o'ngda hech narsa — chegarada birdan paydo bo'lmaydi. JS'gacha
 * (SSR) o'ngda 5rem turadi. Nav'ning o'z padding'i scroll oxiriga qo'shilmaydi,
 * shuning uchun oxirgi `li`da `pr-(--shell-pad)`.
 *
 * Strelkalar — faqat sichqoncha/trackpad'li qurilmada (`pointer-fine`): oddiy g'ildirak
 * qatorni yonga surmaydi. Tomonida yashirin tur bo'lsagina chiqadi; bosilganda ko'rinib
 * turgan en minus ikki so'nish qadar suradi (kesilgan tur to'liq ko'rinadi). Sensorli
 * ekranda barmoq bilan suriladi, strelka yo'q.
 *
 * Tanlangan tur ramka yoki to'ldirma bilan emas, qolganlarining xiralashishi bilan
 * ajraladi: rasmning o'zi urg'u bo'lib qoladi. Nom xiralashmaydi, faqat rangi
 * `muted-2`ga o'tadi (AA kontrast saqlanadi).
 *
 * Havola faqat `search`dan iborat — yo'l (locale prefiksi bilan) o'zgarmaydi,
 * shuning uchun `LocaleLink` kerak emas.
 */
const CategoryTiles: FC<{ tiles: CategoryTile[]; t: Translation }> = ({ tiles, t }) => {
  const [sp] = useSearchParams();
  const nav = useRef<HTMLElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = nav.current;
    if (!el) return;
    const update = () => {
      const rest = el.scrollWidth - el.clientWidth - el.scrollLeft;
      el.style.setProperty('--fade-l', `${Math.min(el.scrollLeft, FADE)}px`);
      el.style.setProperty('--fade-r', `${Math.min(Math.max(rest, 0), FADE)}px`);
      setCanPrev(el.scrollLeft > 1);
      setCanNext(rest > 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [tiles]);

  if (tiles.length === 0) return null;
  const current = sp.get('tur') || null;
  const scroll = (dir: number) =>
    nav.current?.scrollBy({ left: dir * (nav.current.clientWidth - 2 * FADE), behavior: reduced ? 'auto' : 'smooth' });
  const arrow =
    'press absolute top-5 z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-fill-2/80 text-primary backdrop-blur hover:bg-fill-2 pointer-fine:flex';

  return (
    <div className="relative -mx-(--shell-pad) mb-8 md:mb-10">
      <nav
        ref={nav}
        aria-label={t.homeCategories}
        className="overflow-x-auto no-scrollbar px-(--shell-pad) [mask-image:linear-gradient(to_right,transparent,black_max(var(--shell-pad),var(--fade-l,0px)),black_calc(100%-var(--fade-r,5rem)),transparent)]"
      >
        <ul className="flex gap-1 md:gap-6">
          {tiles.map((tile) => {
            const active = current === tile.id;
            const dimmed = current !== null && !active;
            return (
              <li key={tile.id} className="shrink-0 last:pr-(--shell-pad)">
                <Link
                  to={{ search: active ? '' : `?tur=${encodeURIComponent(tile.id)}` }}
                  preventScrollReset
                  aria-current={active ? 'true' : undefined}
                  className="press group flex w-28 flex-col items-center gap-3 py-2"
                >
                  <span
                    aria-hidden
                    className={`relative isolate flex h-[68px] w-full items-end justify-center transition-opacity duration-200 group-hover:opacity-100 before:absolute before:-inset-x-2 before:-inset-y-4 before:-z-10 before:bg-[radial-gradient(closest-side,var(--color-spotlight),transparent)] ${dimmed ? 'opacity-45' : ''}`}
                  >
                    <img src={tile.img} alt="" loading="lazy" className="max-w-none [zoom:0.5]" />
                  </span>
                  <span className={`text-label font-semibold text-center ${dimmed ? 'text-muted-2 group-hover:text-primary' : 'text-primary'}`}>
                    {tile.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {canPrev && (
        <button type="button" onClick={() => scroll(-1)} aria-label={t.tilesPrev} className={`${arrow} left-(--shell-pad)`}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button type="button" onClick={() => scroll(1)} aria-label={t.tilesNext} className={`${arrow} right-(--shell-pad)`}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default CategoryTiles;
