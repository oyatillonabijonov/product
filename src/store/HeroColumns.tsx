import { useRef, useState } from 'react';
import { Link, useOutletContext, useViewTransitionState } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { localizedPath } from '../../app/lib/i18n';
import type { ApiCategory } from '../../shared/types';
import type { StoreContext } from './StoreLayout';
import { HERO_COLUMNS, columnHref, type HeroColumn } from './hero-columns';
import proMark from '../assets/hero/pro.svg';

const GLIDE = [0.16, 1, 0.3, 1] as const;

function HeroCard({ col, href, index, hovered, onHover, proY }: {
  col: HeroColumn;
  href: string;
  index: number;
  hovered: number | null;
  onHover: (i: number | null) => void;
  proY: MotionValue<string>;
}) {
  const on = hovered === index;
  // Kartadan cover'ga o'sish brauzerning View Transition'i bilan bo'ladi: nom
  // faqat shu kartaga o'tish paytida qo'yiladi, aks holda sahifada 4 ta bir xil
  // nom bo'lib qolardi (bitta hujjatda nom yagona bo'lishi shart).
  const morphing = useViewTransitionState(href);
  return (
    <Link
      to={href}
      viewTransition
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      style={{ viewTransitionName: morphing ? 'hero-cover' : undefined }}
      className="relative block min-w-0 h-full overflow-hidden rounded-[25px] bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div
        className="absolute inset-0 [backface-visibility:hidden]"
        style={{
          transform: on ? 'scale(1.05)' : 'scale(1)',
          transition: 'transform 1100ms cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <img
          src={col.img}
          alt=""
          aria-hidden
          fetchPriority={index === 0 ? 'high' : undefined}
          className="w-full h-full object-cover"
        />
      </div>

      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 z-[3] -ml-[34px] -mt-[34px] flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/30 bg-white/10 text-[24px] font-normal text-white backdrop-blur-[14px] pointer-events-none"
        style={{
          opacity: on ? 1 : 0,
          transform: `scale(${on ? 1 : 0.7})`,
          transition: 'opacity 420ms ease, transform 620ms cubic-bezier(.22,1.1,.32,1)',
        }}
      >
        →
      </div>

      <motion.img
        src={proMark}
        alt=""
        aria-hidden
        style={{ y: proY }}
        className="absolute left-[5%] bottom-[4%] w-[94%] h-auto select-none pointer-events-none"
      />

      <div
        className="absolute left-[5%] right-[5%] bottom-[22px] pb-[3.2%]"
        style={{
          transform: on ? 'translateY(-10px)' : 'translateY(0px)',
          transition: 'transform 600ms cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <div className="whitespace-pre-line text-[clamp(22px,2.6vw,40px)] font-medium leading-[1.16] tracking-[-1.2px] text-white">
          {col.label}
        </div>
      </div>
    </Link>
  );
}

export default function HeroColumns({ categories }: { categories: ApiCategory[] }) {
  const { locale } = useOutletContext<StoreContext>();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const reduced = useReducedMotion();

  // Hero bo'ylab scroll — panjara sekin yuqoriga suriladi, "PRO" yozuvi undan ham
  // tezroq: dizayndagi ikki qatlamli parallaks.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const gridY = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [0, -64]);
  const proY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '-24%']);

  return (
    <div
      ref={heroRef}
      className="relative h-screen min-h-[740px] overflow-hidden bg-black"
    >
      <motion.div
        style={{ y: gridY }}
        className="absolute inset-[14px] grid grid-cols-2 md:grid-cols-4 gap-2"
      >
        {HERO_COLUMNS.map((col, i) => (
          <motion.div
            key={col.key}
            initial={reduced ? false : { opacity: 0, y: 46, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.05, delay: i * 0.085, ease: GLIDE }}
            className="min-w-0 h-full"
          >
            <HeroCard
              col={col}
              href={localizedPath(locale, columnHref(col, categories))}
              index={i}
              hovered={hovered}
              onHover={setHovered}
              proY={proY}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
