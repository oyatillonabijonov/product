import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Translation } from '../locales';
import { LINK_MORE } from './ui';

/**
 * Mahsulot sahifasida sharhlardan keyingi bo'lim (apple.com Personal Setup naqshi):
 * sarlavha, chiziqli illyustratsiya, va'da matni va havola.
 *
 * Illyustratsiya — shaffof fonli ko'k chiziqli rasm (`public/sections/personal-setup.webp`),
 * shuning uchun ikkala temada ham o'zgarishsiz turadi. Dekor — `alt` bo'sh.
 */
const SetupBand: FC<{ t: Translation; contactHref: string | null }> = ({ t, contactHref }) => (
  <section className="mt-14 border-t border-divider pt-14 text-center md:pt-20">
    <h2 className="mx-auto max-w-[900px] text-heading md:text-title font-semibold text-balance text-primary">
      {t.setupTitle}
    </h2>

    <img
      src="/sections/personal-setup.webp"
      alt=""
      width={1416}
      height={304}
      loading="lazy"
      className="mx-auto mt-10 h-auto w-full max-w-[1000px] md:mt-14"
    />

    <p className="mx-auto mt-10 max-w-[640px] text-copy text-body text-pretty md:mt-14">
      {t.setupText}
    </p>

    {contactHref && (
      <a href={contactHref} target="_blank" rel="noopener noreferrer" className={`${LINK_MORE} mt-6`}>
        {t.setupCta} <ChevronRight className="h-4 w-4" />
      </a>
    )}
  </section>
);

export default SetupBand;
