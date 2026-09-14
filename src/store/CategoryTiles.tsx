import type { FC } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  Aperture, AudioLines, Cable, Camera, CircuitBoard, Cpu, Drone, Fan, Gpu, HardDrive, Headphones, Laptop,
  Lightbulb, MemoryStick, Mic, Monitor, MonitorPlay, Move3d, Package, PcCase, PlugZap, SlidersVertical, Speaker,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CategoryTile } from '../../app/lib/tiles';

/**
 * Rasmi yo'q tur (na registr ikonkasi, na mahsulot rasmi) uchun chiziqli ikonka — apple.com bo'lim
 * navigatsiyasida ham rasmsiz bandlar shunday chiqadi. Tur id'si bo'yicha; ro'yxatda yo'q tur `Package`.
 */
const GLYPHS: Record<string, LucideIcon> = {
  imac: Monitor,
  aksessuar: Cable,
  noutbuk: Laptop, 'tayyor-pc': PcCase, cpu: Cpu, gpu: Gpu, motherboard: CircuitBoard, ram: MemoryStick,
  xotira: HardDrive, korpus: PcCase, psu: PlugZap, sovutish: Fan, monitor: Monitor,
  mikrofon: Mic, 'studio-monitor': Speaker, naushnik: Headphones, interfeys: AudioLines, mikser: SlidersVertical,
  kamera: Camera, obyektiv: Aperture, stabilizator: Move3d, yoruglik: Lightbulb, 'monitor-rekorder': MonitorPlay, dron: Drone,
};

/**
 * Yo'nalish sahifasidagi tur qatori — apple.com do'konidagi mahsulot navigatsiyasi
 * uslubida: karta va ramka yo'q, shaffof ikonka to'g'ridan-to'g'ri sahifa fonida,
 * ostida qisqa nom. Tile katalogni `?tur=` bilan filtrlaydi, faolini qayta bosish
 * tozalaydi.
 *
 * Ikonkalar 2x PNG (`public/sections/`) va **o'z o'lchamining yarmida** chiziladi
 * (`zoom: 0.5`), pastki chetlari bir chiziqda — Apple rasmlari shunga chizilgan:
 * Mac keng, Watch tor, Vision Pro past. Hammasini bir balandlikka cho'zish bu
 * nisbatni buzardi. Qator balandligi va element eni qat'iy — rasm yuklanganda
 * layout siljimaydi.
 *
 * Yo'nalishning hamma turi doim ko'rinadi, mahsuloti yo'qlari ham. Ikonkasi yo'q tur
 * (PC/Audio/Video, Aksessuar) mahsulot fotosini xuddi shu balandlikdagi yumaloq kvadratda
 * ko'rsatadi; mahsuloti ham yo'q bo'lsa — kulrang chiziqli ikonka (`GLYPHS`).
 *
 * Tanlangan tur ramka yoki to'ldirma bilan emas, qolganlarining xiralashishi bilan
 * ajraladi: rasmning o'zi urg'u bo'lib qoladi. Nom xiralashmaydi, faqat rangi
 * `muted-2`ga o'tadi (AA kontrast saqlanadi).
 *
 * Havola faqat `search`dan iborat — yo'l (locale prefiksi bilan) o'zgarmaydi,
 * shuning uchun `LocaleLink` kerak emas.
 */
const CategoryTiles: FC<{ tiles: CategoryTile[]; label: string }> = ({ tiles, label }) => {
  const [sp] = useSearchParams();
  if (tiles.length === 0) return null;
  const current = sp.get('tur') || null;
  return (
    <nav aria-label={label} className="-mx-4 mb-8 overflow-x-auto no-scrollbar px-4 md:mx-0 md:mb-10 md:px-0">
      <ul className="flex gap-1 md:gap-6">
        {tiles.map((tile) => {
          const active = current === tile.id;
          const dimmed = current !== null && !active;
          const Glyph = GLYPHS[tile.id] ?? Package;
          return (
            <li key={tile.id} className="shrink-0">
              <Link
                to={{ search: active ? '' : `?tur=${encodeURIComponent(tile.id)}` }}
                preventScrollReset
                aria-current={active ? 'true' : undefined}
                className="press group flex w-28 flex-col items-center gap-3 py-2"
              >
                <span
                  aria-hidden
                  className={`flex h-[68px] items-end justify-center transition-opacity duration-200 group-hover:opacity-100 ${dimmed ? 'opacity-45' : ''}`}
                >
                  {tile.img === null ? (
                    <Glyph className="size-12 text-muted" strokeWidth={1} />
                  ) : tile.icon ? (
                    <img src={tile.img} alt="" loading="lazy" className="max-w-none [zoom:0.5]" />
                  ) : (
                    <img src={tile.img} alt="" loading="lazy" className="h-[68px] w-[68px] rounded-sm bg-white object-cover" />
                  )}
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
  );
};

export default CategoryTiles;
