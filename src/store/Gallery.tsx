import { useState } from 'react';
import type { FC } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Gallery: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  const many = images.length > 1;
  const go = (delta: number) => setActive((a) => (a + delta + images.length) % images.length);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square bg-white rounded-[22px] border border-line flex items-center justify-center overflow-hidden">
        {main ? <img src={main} alt={name} className="w-full h-full object-contain" fetchPriority="high" /> : <span className="text-muted-2">{name}</span>}
        {many && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Oldingi rasm"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-line shadow-apple flex items-center justify-center text-primary hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Keyingi rasm"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-line shadow-apple flex items-center justify-center text-primary hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {many && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} aria-label={`${name} — ${i + 1}`} aria-current={i === active || undefined} className={`w-16 h-16 rounded-xl bg-bg flex items-center justify-center p-2 border ${i === active ? 'border-accent' : 'border-transparent'}`}>
              <img src={img} alt="" className="w-full h-full object-contain rounded-lg" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
