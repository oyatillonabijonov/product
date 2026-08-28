import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';

const GLIDE = [0.16, 1, 0.3, 1] as const;

/** Kategoriya sahifasining tepasidagi cover. */
export default function CategoryCover({ img, tag, lede, title, total, t }: {
  img: string; tag?: string; lede?: string; title: string; total: number; t: Translation;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '12%']);

  return (
    <div
      ref={ref}
      className="relative mx-[14px] mt-[14px] h-[min(76vh,700px)] overflow-hidden rounded-[24px] bg-black"
    >
      <motion.img
        src={img}
        alt=""
        aria-hidden
        style={{ y: imgY }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.78) 82%, rgba(0,0,0,0.94) 100%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0) 62%)' }}
      />

      <div className="absolute left-6 right-6 bottom-7 md:left-8 md:right-8">
        {tag && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: GLIDE }}
            className="mb-4 text-[15px] font-normal tracking-[-0.01em] text-[#C7C7CC]"
          >
            {tag}
          </motion.div>
        )}
        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: GLIDE }}
          className="text-[clamp(32px,4.4vw,56px)] font-medium leading-[1.06] tracking-[-2px] text-white"
        >
          {title}
        </motion.h1>
        {lede && (
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.03, ease: GLIDE }}
            className="mt-5 max-w-[560px] text-[17px] font-light leading-[1.42] tracking-[-0.016em] text-[#D6D6DB] text-pretty"
          >
            {lede}
          </motion.p>
        )}
      </div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.2, ease: GLIDE }}
        className="absolute left-6 top-6 z-[4] md:left-8"
      >
        <LocaleLink
          to="/"
          className="flex h-9 items-center gap-2 rounded-full bg-black/[0.42] pl-[13px] pr-[18px] text-[14px] font-normal tracking-[-0.01em] text-[#F5F5F7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] backdrop-blur-[14px] transition-colors duration-200 hover:bg-black/[0.62]"
        >
          <span aria-hidden className="text-[16px] text-[#A1A1A6]">‹</span>
          <span>{t.homeCategories}</span>
        </LocaleLink>
      </motion.div>

      <motion.div
        aria-hidden
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.24, ease: GLIDE }}
        className="absolute right-6 bottom-7 hidden items-center gap-2.5 text-[14px] font-normal tracking-[-0.01em] text-[#A1A1A6] md:right-8 md:flex"
      >
        <span>{total} {t.resultsCount}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full text-[14px] text-[#F5F5F7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)]">↓</span>
      </motion.div>
    </div>
  );
}
