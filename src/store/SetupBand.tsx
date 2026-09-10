import type { FC } from 'react';
import {
  Battery, Camera, Cloud, Fingerprint, Laptop, MessageCircle,
  Package, ScanFace, Settings, Smartphone, Tablet, Watch,
} from 'lucide-react';
import type { Translation } from '../locales';

/**
 * Apple yo'nalishidagi mahsulot sahifasining oxiridagi bo'lim: sarlavha,
 * chiziqli illyustratsiya va va'da matni.
 *
 * Illyustratsiya alohida rasm emas — lucide ikonkalari. Ular bir xil qalinlikdagi
 * chiziq bilan chizilgani uchun qator yaxlit bir kompozitsiya bo'lib ko'rinadi va
 * temaga qarab qayta ranglanadi (statik SVG buni qila olmasdi).
 *
 * Qator pastdan tekislanadi — qurilmalar bir sathda "turadi", kichik ikonkalar
 * esa `mb-*` bilan tepaga suzib chiqadi; shu ritm kompozitsiyani jonlantiradi.
 * Ikonkalar dekorativ, shuning uchun butun qator `aria-hidden`.
 */
const SetupBand: FC<{ t: Translation; contactHref: string | null }> = ({ t, contactHref }) => (
  <section className="mt-14 border-t border-divider pt-14 text-center md:pt-20">
    <h2 className="mx-auto max-w-[900px] text-heading md:text-title font-semibold text-balance text-primary">
      {t.setupTitle}
    </h2>

    <div
      aria-hidden
      className="mt-10 flex items-end justify-center gap-3 text-cta md:mt-14 md:gap-5"
    >
      <Settings className="mb-14 hidden h-9 w-9 md:block lg:mb-20 lg:h-11 lg:w-11" strokeWidth={1.5} />
      <Package className="hidden h-10 w-10 sm:block lg:h-12 lg:w-12" strokeWidth={1.5} />
      <MessageCircle className="mb-16 hidden h-11 w-11 md:block lg:mb-24 lg:h-14 lg:w-14" strokeWidth={1.5} />
      <Smartphone className="h-16 w-16 md:h-24 md:w-24 lg:h-32 lg:w-32" strokeWidth={1.5} />
      <Laptop className="h-20 w-20 md:h-32 md:w-32 lg:h-44 lg:w-44" strokeWidth={1.5} />
      <Fingerprint className="mb-10 hidden h-12 w-12 sm:block md:h-16 md:w-16 lg:mb-14 lg:h-20 lg:w-20" strokeWidth={1.5} />
      <Watch className="hidden h-11 w-11 md:block lg:h-14 lg:w-14" strokeWidth={1.5} />
      <ScanFace className="mb-6 hidden h-16 w-16 lg:block" strokeWidth={1.5} />
      <Tablet className="h-16 w-16 md:h-24 md:w-24 lg:h-32 lg:w-32" strokeWidth={1.5} />
      <Cloud className="mb-16 hidden h-11 w-11 sm:block lg:mb-24 lg:h-14 lg:w-14" strokeWidth={1.5} />
      <Camera className="mb-12 hidden h-10 w-10 md:block lg:mb-16 lg:h-12 lg:w-12" strokeWidth={1.5} />
      <Battery className="mb-2 hidden h-10 w-10 lg:block lg:h-12 lg:w-12" strokeWidth={1.5} />
    </div>

    <p className="mx-auto mt-10 max-w-[640px] text-copy text-body text-pretty md:mt-14">
      {t.setupText}
    </p>

    {contactHref && (
      <a
        href={contactHref}
        target="_blank"
        rel="noopener noreferrer"
        className="press mt-6 inline-flex text-copy text-cta hover:underline"
      >
        {t.setupCta}
      </a>
    )}
  </section>
);

export default SetupBand;
