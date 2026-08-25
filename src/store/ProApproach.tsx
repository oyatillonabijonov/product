import type { FC } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Translation } from '../locales';
import approachImg from '../assets/images/product-3d.webp';
import appleImg from '../assets/hero/apple.webp';
import pcImg from '../assets/hero/pc.webp';
import audioImg from '../assets/hero/audio.webp';
import videoImg from '../assets/hero/video.webp';

/**
 * Landingning asosiy bloki — do'kon nima qilishini to'rtta bosqichda tushuntiradi.
 *
 * Ikki ustun: chapda bosqichlar ro'yxati, o'ngda alohida rasm (hoverga bog'liq emas).
 * Qatorga sichqoncha kelganda (yoki klaviatura fokusida) o'sha bosqichning rasmi
 * matn ortida paydo bo'ladi va yozuvlar oqqa aylanadi. Qator balandligi
 * o'zgarmaydi — pastdagilar sakramaydi.
 *
 * Sensorli ekranda hover yo'q: u yerda fon rasmlari chiqmaydi, ro'yxat oddiy
 * ko'rinishda o'qiladi.
 */
const ProApproach: FC<{ t: Translation }> = ({ t }) => {
  const points = [
    { step: '01', title: t.proPoint1Title, desc: t.proPoint1Desc, img: appleImg },
    { step: '02', title: t.proPoint2Title, desc: t.proPoint2Desc, img: pcImg },
    { step: '03', title: t.proPoint3Title, desc: t.proPoint3Desc, img: audioImg },
    { step: '04', title: t.proPoint4Title, desc: t.proPoint4Desc, img: videoImg },
  ];

  return (
    <section className="flex flex-col gap-10">
      <div className="max-w-[760px]">
        <h2 className="text-[30px] md:text-[44px] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
          {t.proTitle}
        </h2>
        <p className="mt-4 text-[16px] md:text-[18px] font-light leading-[1.5] tracking-[-0.01em] text-muted text-pretty">
          {t.proLead}
        </p>
      </div>

      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-14">
        <div className="order-2 flex flex-col lg:order-1">
          {points.map((p) => (
            <div
              key={p.step}
              tabIndex={0}
              className="group relative isolate grid grid-cols-[40px_minmax(0,1fr)_44px] items-start gap-x-4 border-t border-line py-6 outline-none first:border-t-0 md:py-7"
            >
              {/* Fon qator matnining ortida; chekkalari ajratuvchi chiziqlar bilan
                  bir tekisda turadi. Scrim matn o'qilishini kafolatlaydi. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 lg:block"
              >
                <img src={p.img} alt="" loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/55" />
              </div>

              <span
                aria-hidden
                className="text-[15px] font-medium tabular-nums text-muted-3 transition-colors duration-300 group-hover:text-white group-focus-visible:text-white"
              >
                {p.step}
              </span>

              <div>
                <h3 className="text-[19px] md:text-[22px] font-semibold leading-snug tracking-[-0.015em] transition-colors duration-300 group-hover:text-white group-focus-visible:text-white">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-muted text-pretty transition-colors duration-300 group-hover:text-white/80 group-focus-visible:text-white/80">
                  {p.desc}
                </p>
              </div>

              <span
                aria-hidden
                className="mt-0.5 hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cta text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 lg:flex"
              >
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </div>
          ))}
        </div>

        {/* O'ng ustun — alohida rasm (3D brend renderi), qatorlar hoveridan mustaqil.
            Rasm o'zi qora fonda, shuning uchun qo'shimcha qoraytiruvchi qatlam yo'q. */}
        <div className="relative order-1 min-h-[260px] overflow-hidden rounded-[24px] bg-surface lg:order-2 lg:min-h-0">
          <img src={approachImg} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
};

export default ProApproach;
