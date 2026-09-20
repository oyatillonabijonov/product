import { useRef, useState } from 'react';
import type { FC } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';

/**
 * Mahsulot galereyasi — apple.com'ning xarid sahifasidagi kabi: bitta katta
 * ramka, chetlarida yumaloq o'q tugmalari va pastda nuqtalar.
 *
 * Rasmlar gorizontal lenta (`overflow-x-auto` + `snap-x snap-mandatory`) — telefonda barmoq
 * bilan suriladi, inersiya va har rasmga "yopishish"ni brauzerning o'zi beradi (JS drag yo'q).
 * O'qlar va nuqtalar lentani suradi; joriy nuqta scroll holatidan o'qiladi, shuning uchun
 * qo'lda surilganda ham to'g'ri qoladi.
 *
 * Miniatyuralar o'rniga nuqta: ramka qanchalik katta bo'lsa, pastdagi
 * miniatyura qatori shunchalik ko'p joy yeydi va diqqatni mahsulotdan oladi.
 */
const Gallery: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [activeRaw, setActive] = useState(0);
  const active = activeRaw as number;
  const track = useRef(null);
  const reduced = useReducedMotion();
  const many = images.length > 1;

  const el = () => track.current as HTMLDivElement | null;
  const scrollToIndex = (i: number) => {
    const t = el();
    if (!t) return;
    const n = (i + images.length) % images.length;
    t.scrollTo({ left: n * t.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  const onScroll = () => {
    const t = el();
    if (t && t.clientWidth > 0) setActive(Math.round(t.scrollLeft / t.clientWidth));
  };

  const arrow =
    'press absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-fill-2/80 text-primary backdrop-blur hover:bg-fill-2';

  return (
    <div className="relative">
      <div className="rounded-xl relative aspect-square overflow-hidden bg-white lg:aspect-[4/3]">
        {images.length === 0 ? (
          <span className="flex h-full items-center justify-center text-muted-2">{name}</span>
        ) : (
          <div
            ref={track}
            onScroll={onScroll}
            className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((src, i) => (
              <div key={src + i} className="h-full w-full shrink-0 snap-center">
                <img
                  src={src}
                  alt={i === 0 ? name : `${name} — ${i + 1}`}
                  draggable={false}
                  loading={i === 0 ? undefined : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  className="h-full w-full object-contain p-6 md:p-10"
                />
              </div>
            ))}
          </div>
        )}

        {many && (
          <>
            <button onClick={() => scrollToIndex(active - 1)} aria-label="Oldingi rasm" className={`${arrow} left-3 md:left-4`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => scrollToIndex(active + 1)} aria-label="Keyingi rasm" className={`${arrow} right-3 md:right-4`}>
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToIndex(i)}
                  aria-label={`${name} — ${i + 1}`}
                  aria-current={i === active || undefined}
                  className={`press h-2 w-2 rounded-full ${i === active ? 'bg-primary' : 'bg-disabled hover:bg-muted-3'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;
