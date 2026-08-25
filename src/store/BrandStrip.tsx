import type { CSSProperties, FC } from 'react';
import type { ApiBrand } from '../../shared/types';
import LocaleLink from './LocaleLink';
import { brandLogo } from './brand-logos';

const GAP_PX = 12;
/** Kam brendda bitta nusxa ekranni to'ldirmaydi — lenta shu songacha takrorlanadi. */
const MIN_LANE_ITEMS = 8;
/** Bitta logotipga to'g'ri keladigan vaqt — tezlik brendlar sonidan qat'i nazar bir xil. */
const SECONDS_PER_ITEM = 3.5;

/**
 * Tartib: admin yuklagan logotip → repodagi brend glifi → oxirgi chora sifatida nom.
 * Glif bitta rangli, `currentColor` bilan bo'yaladi — landing dark rejimida ham,
 * oq brend sahifasida ham to'g'ri ko'rinadi.
 */
const BrandMark: FC<{ brand: ApiBrand }> = ({ brand }) => {
  if (brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.name} loading="lazy" className="max-h-8 max-w-[96px] object-contain" />;
  }
  const logo = brandLogo(brand.slug, brand.name);
  if (logo) {
    // Quti qat'iy, glif esa ichiga "meet" bilan sig'adi — baland belgi ham (Apple),
    // keng yozuv ham (Samsung) bir xil optik og'irlikda ko'rinadi.
    return (
      <svg
        viewBox={logo.viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={brand.name}
        className="h-8 w-[84px] fill-current text-primary"
      >
        <path d={logo.path} />
      </svg>
    );
  }
  return <span className="text-[15px] font-semibold text-primary">{brand.name}</span>;
};

const Logo: FC<{ brand: ApiBrand; clone: boolean }> = ({ brand, clone }) => (
  <LocaleLink
    to={`/brand/${brand.slug}`}
    aria-hidden={clone || undefined}
    tabIndex={clone ? -1 : undefined}
    className="flex h-16 min-w-[120px] shrink-0 items-center justify-center rounded-2xl border border-line-3 bg-surface px-6 shadow-apple transition-colors hover:border-accent"
  >
    <BrandMark brand={brand} />
  </LocaleLink>
);

const BrandStrip: FC<{ title: string; brands: ApiBrand[] }> = ({ title, brands }) => {
  if (brands.length === 0) return null;

  const reps = Math.max(1, Math.ceil(MIN_LANE_ITEMS / brands.length));
  const lane = Array.from({ length: reps }, () => brands).flat();
  // Ikkala nusxa ham bitta flex'ning bevosita bolasi — `brand-marquee` siljishi
  // shu tekis tuzilishga hisoblangan (styles.css).
  const style = {
    '--marquee-gap': `${GAP_PX}px`,
    '--marquee-duration': `${lane.length * SECONDS_PER_ITEM}s`,
    gap: `${GAP_PX}px`,
  } as CSSProperties;

  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
      {/* Lenta chetlarda yumshoq so'nadi — logotiplar qirrada keskin kesilmasin. */}
      <div className="brand-marquee-viewport no-scrollbar overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        <div className="brand-marquee flex w-max" style={style}>
          {lane.map((b, i) => <Logo key={`a-${i}-${b.id}`} brand={b} clone={false} />)}
          {/* Ikkinchi nusxa faqat uzluksizlik uchun — skrinrider va Tab uni ko'rmaydi. */}
          {lane.map((b, i) => <Logo key={`b-${i}-${b.id}`} brand={b} clone />)}
        </div>
      </div>
    </section>
  );
};

export default BrandStrip;
