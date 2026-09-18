import type { FC } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Translation } from '../locales';
import { useAssets } from './SiteAssets';
import { BTN_MD } from './ui';

/**
 * PC bo'limidagi mahsulot to'ri ichidagi reklama kartasi — yig'ish xizmati va konfigurator.
 * To'rdagi joyi CSS grid bilan: xl'da 2-qatorning o'ngdagi 3 katagi, lg'da ham o'ngdagi 3 tasi,
 * mobilda 4 ta kartadan keyin to'liq enda. Aniq joylashgan element avval o'rnashadi, qolgan
 * kartalar atrofidan oqib o'tadi — shuning uchun DOM'dagi o'rni ahamiyatsiz.
 * Fon qora: PC landing rasmi (qizil yorug'likdagi korpus) chap chetidan qoraga so'nadi.
 */
const PcBuildPromo: FC<{ t: Translation }> = ({ t }) => {
  const asset = useAssets();
  return (
    <a
      href="#konfigurator"
      className="press-surface group relative col-span-2 row-start-3 flex overflow-hidden rounded-md bg-black text-white lg:col-span-3 lg:col-start-2 lg:row-start-2 xl:col-start-3"
    >
      <img
        src={asset('hero.pc.image')}
        alt=""
        loading="lazy"
        className="absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover [mask-image:linear-gradient(to_right,transparent,black_45%)] sm:block"
      />
      <div className="relative flex max-w-[460px] flex-col justify-center gap-3 p-8 md:p-10">
        <p className="text-label font-semibold text-new">{t.pcPromoEyebrow}</p>
        <h3 className="text-heading font-semibold text-balance md:text-title">{t.pcPromoTitle}</h3>
        <p className="text-copy text-pretty text-white/70">{t.pcPromoText}</p>
        <span className={`${BTN_MD} mt-3 self-start bg-cta text-white group-hover:bg-cta-hover`}>
          {t.pcPromoCta} <ChevronRight className="-mr-1 h-4 w-4" />
        </span>
      </div>
    </a>
  );
};

export default PcBuildPromo;
