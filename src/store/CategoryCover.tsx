import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Translation } from '../locales';
import LocaleLink from './LocaleLink';
import { BTN_MD } from './ui';
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
        {/* Apple ko'k tugmasi — Yangiliklar CTA'si bilan bir xil (`BTN_MD` + `cta`). */}
        <LocaleLink to="/" className={`${BTN_MD} bg-cta text-white hover:bg-cta-hover`}>
          {/* Chevron qutisidagi ichki bo'shliq chap tomonni kengroq ko'rsatardi — optik tekislash. */}
          <ChevronLeft aria-hidden className="-ml-1.5 -mr-1 size-4.5" />
          <span>{t.homeCategories}</span>
        </LocaleLink>
      </motion.div>
    </div>
  );
}
