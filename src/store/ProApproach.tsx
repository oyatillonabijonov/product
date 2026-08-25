import type { FC } from 'react';
import { motion } from 'motion/react';
import type { Translation } from '../locales';

const GLIDE = [0.16, 1, 0.3, 1] as const;

/**
 * Landingning asosiy bloki — do'kon nima qilishini bitta gapda va to'rtta
 * qadamda tushuntiradi. Mahsulot ko'rsatmaydi: landing sotmaydi, yo'naltiradi.
 */
const ProApproach: FC<{ t: Translation }> = ({ t }) => {
  const points = [
    { title: t.proPoint1Title, desc: t.proPoint1Desc },
    { title: t.proPoint2Title, desc: t.proPoint2Desc },
    { title: t.proPoint3Title, desc: t.proPoint3Desc },
    { title: t.proPoint4Title, desc: t.proPoint4Desc },
  ];
  return (
    <section className="flex flex-col gap-9">
      <div className="max-w-[760px]">
        <h2 className="text-[30px] md:text-[44px] font-semibold leading-[1.1] tracking-[-0.03em]">
          {t.proTitle}
        </h2>
        <p className="mt-5 text-[17px] md:text-[19px] font-light leading-[1.5] tracking-[-0.01em] text-muted text-pretty">
          {t.proLead}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[24px] bg-line-3 sm:grid-cols-2">
        {points.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.6, delay: i * 0.06, ease: GLIDE }}
            className="bg-surface px-6 py-7 md:px-8 md:py-9"
          >
            <span className="text-[13px] font-semibold text-muted-3">0{i + 1}</span>
            <h3 className="mt-3 text-[18px] md:text-[20px] font-semibold tracking-[-0.01em]">{p.title}</h3>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">{p.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ProApproach;
