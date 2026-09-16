import type { CSSProperties, FC } from 'react';
import { SECTION_HEADING } from './ui';
import type { ApiBrand } from '../../shared/types';

const GAP_PX = 64;
/** Kam logotipda bitta nusxa ekranni to'ldirmaydi — lenta shu songacha takrorlanadi. */
const MIN_LANE_ITEMS = 8;
/** Bitta logotipga to'g'ri keladigan vaqt — tezlik ular sonidan qat'i nazar bir xil. */
const SECONDS_PER_ITEM = 3.5;

interface Logo { src: string; name: string }

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
    className="h-9 w-[132px] shrink-0 object-contain opacity-60 brand-logo transition-opacity duration-300 hover:opacity-100"
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

/**
 * Brendlar tasmasi — `brands.logo_url` dan (admin → Brendlar). Ikki qator qarama-qarshi yo'nalishda:
 * birinchi yarmi yuqorida, qolgani pastda; kam bo'lsa `Row` o'zi to'ldiradi. Logotiplar `brand-logo`
 * klassi bilan bir tonga (yorug'da qora, qorong'ida oq) keltiriladi — rangli PNG ham silhouette bo'ladi.
 */
const BrandStrip: FC<{ title: string; brands: ApiBrand[] }> = ({ title, brands }) => {
  const logos: Logo[] = brands.map((b) => ({ src: b.logoUrl, name: b.name }));
  const half = Math.ceil(logos.length / 2);
  const top = logos.slice(0, half);
  const bottom = logos.slice(half);
  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <h2 className={SECTION_HEADING}>{title}</h2>
      <div className="flex flex-col gap-14">
        <Row logos={top} />
        {bottom.length > 0 && <Row logos={bottom} reverse />}
      </div>
    </section>
  );
};

export default BrandStrip;
