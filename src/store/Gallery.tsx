import { useState } from 'react';
import type { FC } from 'react';

const Gallery: FC<{ images: string[]; name: string }> = ({ images, name }) => {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-square bg-[#F5F5F7] rounded-[22px] flex items-center justify-center p-8">
        {main ? <img src={main} alt={name} className="max-w-full max-h-full object-contain" /> : <span className="text-[#C7C7CC]">{name}</span>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)} className={`w-16 h-16 rounded-xl bg-[#F5F5F7] flex items-center justify-center p-2 border ${i === active ? 'border-[#0071E3]' : 'border-transparent'}`}>
              <img src={img} alt="" className="max-w-full max-h-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;
