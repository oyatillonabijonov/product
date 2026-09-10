import { useState } from 'react';
import type { FC } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Mahsulot galereyasi — apple.com'ning xarid sahifasidagi kabi: bitta katta
 * ramka, chetlarida yumaloq o'q tugmalari va pastda nuqtalar.
 *
 * Miniatyuralar o'rniga nuqta: ramka qanchalik katta bo'lsa, pastdagi
 * miniatyura qatori shunchalik ko'p joy yeydi va diqqatni mahsulotdan oladi.
 * Nuqta esa nechta rasm borligini aytadi, xolos.
 */
const Gallery: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  const many = images.length > 1;
  const go = (delta: number) => setActive((a) => (a + delta + images.length) % images.length);

  const arrow =
    'press absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-fill-2/80 text-primary backdrop-blur hover:bg-fill-2';

  return (
    <div className="relative">
      <div className="rounded-xl relative flex aspect-square items-center justify-center overflow-hidden bg-white">
        {main
          ? <img src={main} alt={name} className="h-full w-full object-contain p-6 md:p-10" fetchPriority="high" />
          : <span className="text-muted-2">{name}</span>}

        {many && (
          <>
            <button onClick={() => go(-1)} aria-label="Oldingi rasm" className={`${arrow} left-3 md:left-4`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => go(1)} aria-label="Keyingi rasm" className={`${arrow} right-3 md:right-4`}>
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
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
