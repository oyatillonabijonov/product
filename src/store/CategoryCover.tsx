import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';
import { EASE_GLIDE as GLIDE } from '../lib/motion';

/**
 * Kategoriya sahifasining tepasidagi cover.
 *
 * `videos` berilsa rasm o'rniga videolar **ketma-ket** aylanadi: biri tugagach
 * keyingisi, oxirgisidan keyin yana birinchisi. Ikkalasini bitta `<video>`da
 * `src` almashtirib chalamiz — ikkita element bo'lsa ular orasidagi almashinuvda
 * qora kadr ko'rinardi.
 *
 * Harakat kamaytirilganda video umuman yuklanmaydi — `poster` (yoki `img`)
 * statik holda qoladi.
 *
 * Cover ustida matn yo'q: rasm/videoning o'zi bo'lim haqida gapiradi, sarlavha
 * esa pastdagi katalog qismida `h1` sifatida turadi (bitta joyda, takrorsiz).
 */
export default function CategoryCover({ img, videos, poster, t }: {
  img: string; videos?: string[]; poster?: string; t: Translation;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const mediaY = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['0%', '12%']);
  const [clip, setClip] = useState(0);

  const playVideo = !reduced && videos !== undefined && videos.length > 0;
  const still = poster ?? img;

  return (
    <div
      ref={ref}
      className="rounded-xl shell-box relative mt-4 h-[min(76vh,700px)] overflow-hidden bg-black"
    >
      {playVideo ? (
        <motion.video
          // `key` — src almashganda brauzer yangi manbani qayta yuklashi uchun.
          key={clip}
          src={videos[clip]}
          poster={still}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => setClip((i: number) => (i + 1) % videos.length)}
          style={{ y: mediaY }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <motion.img
          src={still}
          alt=""
          aria-hidden
          style={{ y: mediaY }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <motion.div
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.2, ease: GLIDE }}
        className="absolute left-6 top-6 z-[4] md:left-8"
      >
        <LocaleLink
          to="/"
          className="press flex h-9 items-center gap-2 rounded-full bg-black/[0.42] pl-[13px] pr-[18px] text-label font-normal text-[#F5F5F7] backdrop-blur-[14px] hover:bg-black/[0.62]"
        >
          <span aria-hidden className="text-control text-[#A1A1A6]">‹</span>
          <span>{t.homeCategories}</span>
        </LocaleLink>
      </motion.div>
    </div>
  );
}
