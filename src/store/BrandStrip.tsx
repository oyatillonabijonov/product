import type { CSSProperties, FC } from 'react';
import amd from '../assets/images/logos/amd.svg';
import apple from '../assets/images/logos/apple.svg';
import asus from '../assets/images/logos/asus.svg';
import audioTechnica from '../assets/images/logos/audio-technica.svg';
import bangOlufsen from '../assets/images/logos/bang-olufsen.svg';
import blackmagic from '../assets/images/logos/blackmagic.svg';
import dji from '../assets/images/logos/dji.svg';
import gaming2e from '../assets/images/logos/2e-gaming.svg';
import hollyland from '../assets/images/logos/hollyland.svg';
import hp from '../assets/images/logos/hp.svg';
import intel from '../assets/images/logos/intel.svg';
import logitech from '../assets/images/logos/logitech.svg';
import nvidia from '../assets/images/logos/nvidia.svg';
import proart from '../assets/images/logos/proart.svg';
import sony from '../assets/images/logos/sony.svg';
import whoop from '../assets/images/logos/whoop.svg';

const GAP_PX = 64;
/** Kam logotipda bitta nusxa ekranni to'ldirmaydi — lenta shu songacha takrorlanadi. */
const MIN_LANE_ITEMS = 8;
/** Bitta logotipga to'g'ri keladigan vaqt — tezlik ular sonidan qat'i nazar bir xil. */
const SECONDS_PER_ITEM = 3.5;

interface Logo { src: string; name: string }

// Ikki qator: yuqorigisi chapga, pastkisi o'ngga suriladi.
const ROW_TOP: Logo[] = [
  { src: apple, name: 'Apple' },
  { src: sony, name: 'Sony' },
  { src: intel, name: 'Intel' },
  { src: nvidia, name: 'NVIDIA' },
  { src: asus, name: 'ASUS' },
  { src: proart, name: 'ASUS ProArt' },
  { src: hp, name: 'HP' },
  { src: amd, name: 'AMD' },
];
const ROW_BOTTOM: Logo[] = [
  { src: blackmagic, name: 'Blackmagic Design' },
  { src: dji, name: 'DJI' },
  { src: audioTechnica, name: 'Audio-Technica' },
  { src: bangOlufsen, name: 'Bang & Olufsen' },
  { src: logitech, name: 'Logitech' },
  { src: hollyland, name: 'Hollyland' },
  { src: gaming2e, name: '2E Gaming' },
  { src: whoop, name: 'WHOOP' },
];

/**
 * Ramkasiz logotip. Barchasi bir xil o'lchamli qutiga `object-contain` bilan
 * sig'adi: baland belgilar balandlikka, keng yozuvlar kenglikka tayanadi —
 * nisbat buzilmaydi. Fayllarning `viewBox`i o'z chegarasiga siqilgan, aks holda
 * ichki bo'sh joyi ko'p belgilar (Apple) juda kichik chiqardi.
 *
 * Logotiplar turli rangda keladi (ba'zisi to'q, ba'zisi rangli) — oqqa o'girilib
 * bitta ohangdagi qator hosil qiladi; aks holda to'q belgilar qorong'i fonda
 * ko'rinmay qolardi.
 */
const Mark: FC<{ logo: Logo; clone: boolean }> = ({ logo, clone }) => (
  <img
    src={logo.src}
    alt={clone ? '' : logo.name}
    aria-hidden={clone || undefined}
    loading="lazy"
    className="h-9 w-[132px] shrink-0 object-contain opacity-60 brightness-0 invert transition-opacity duration-300 hover:opacity-100"
  />
);

const Row: FC<{ logos: Logo[]; reverse?: boolean }> = ({ logos, reverse = false }) => {
  const reps = Math.max(1, Math.ceil(MIN_LANE_ITEMS / logos.length));
  const lane = Array.from({ length: reps }, () => logos).flat();
  // Ikkala nusxa ham bitta flex'ning bevosita bolasi — `brand-marquee` siljishi
  // shu tekis tuzilishga hisoblangan (styles.css).
  const style = {
    '--marquee-gap': `${GAP_PX}px`,
    '--marquee-duration': `${lane.length * SECONDS_PER_ITEM}s`,
    gap: `${GAP_PX}px`,
  } as CSSProperties;

  return (
    <div className="brand-marquee-viewport no-scrollbar overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
      <div className={`brand-marquee flex w-max ${reverse ? 'brand-marquee-reverse' : ''}`} style={style}>
        {lane.map((l, i) => <Mark key={`a-${i}-${l.name}`} logo={l} clone={false} />)}
        {/* Ikkinchi nusxa faqat uzluksizlik uchun — skrinrider uni o'qimaydi. */}
        {lane.map((l, i) => <Mark key={`b-${i}-${l.name}`} logo={l} clone />)}
      </div>
    </div>
  );
};

const BrandStrip: FC<{ title: string }> = ({ title }) => (
  <section className="flex flex-col gap-8">
    <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
    <div className="flex flex-col gap-14">
      <Row logos={ROW_TOP} />
      <Row logos={ROW_BOTTOM} reverse />
    </div>
  </section>
);

export default BrandStrip;
