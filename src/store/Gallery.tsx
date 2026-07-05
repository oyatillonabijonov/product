import { useState } from 'react';
import type { FC } from 'react';

const Gallery: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square bg-white rounded-[22px] flex items-center justify-center overflow-hidden">
        {main ? <img src={main} alt={name} className="w-full h-full object-contain" fetchPriority="high" /> : <span className="text-muted-2">{name}</span>}
      </div>
      {images.length > 1 && (
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
