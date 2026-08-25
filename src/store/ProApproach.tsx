import type { FC } from 'react';
import { motion } from 'motion/react';
import type { Translation } from '../locales';
import approachImg from '../assets/images/business.webp';

const GLIDE = [0.16, 1, 0.3, 1] as const;

/**
 * Landingning asosiy bloki — do'kon nima qilishini tushuntiradi. Mahsulot
 * ko'rsatmaydi: landing sotmaydi, yo'naltiradi.
 *
 * Ikki ustun: chapda rasm, o'ngda sarlavha va to'rtta qadam. Tor ekranda rasm
 * tepaga chiqib, matn ostiga tushadi.
 */
const ProApproach: FC<{ t: Translation }> = ({ t }) => {
  const points = [
    { title: t.proPoint1Title, desc: t.proPoint1Desc },
    { title: t.proPoint2Title, desc: t.proPoint2Desc },
    { title: t.proPoint3Title, desc: t.proPoint3Desc },
    { title: t.proPoint4Title, desc: t.proPoint4Desc },
  ];
  return (
    <section className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.985 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: GLIDE }}
        className="relative min-h-[320px] overflow-hidden rounded-[24px] bg-surface lg:min-h-[600px]"
      >
        <img
          src={approachImg}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Rasm sovuq ohangda — yengil qatlam uni landingning to'q foniga bog'laydi. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.28) 100%)' }}
        />
      </motion.div>

      <div className="flex flex-col justify-center">
        <h2 className="text-[30px] md:text-[42px] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
          {t.proTitle}
        </h2>
        <p className="mt-4 text-[16px] md:text-[18px] font-light leading-[1.5] tracking-[-0.01em] text-muted text-pretty">
          {t.proLead}
        </p>

        <div className="mt-9 flex flex-col">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: GLIDE }}
              className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 border-t border-line py-5 last:border-b md:py-6"
            >
              <span aria-hidden className="text-[17px] font-semibold tabular-nums text-primary/30">
                0{i + 1}
              </span>
              <div>
                <h3 className="text-[17px] md:text-[19px] font-semibold leading-snug tracking-[-0.01em]">
                  {p.title}
                </h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted text-pretty">{p.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProApproach;
