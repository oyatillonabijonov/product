import { motion } from 'motion/react';
import { IdCard, Wallet, CalendarClock, UserCheck } from 'lucide-react';
import type { Translation } from '../locales';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Conditions({ t }: { t: Translation }) {
  const items = [
    { Icon: IdCard, title: t.cond1Title, desc: t.cond1Desc },
    { Icon: Wallet, title: t.cond2Title, desc: t.cond2Desc },
    { Icon: CalendarClock, title: t.cond3Title, desc: t.cond3Desc },
    { Icon: UserCheck, title: t.cond4Title, desc: t.cond4Desc },
  ];

  return (
    <section className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-2">
        {t.conditionsTitle}
      </h2>
      <p className="text-[17px] text-[#6E6E73] text-center mb-8 md:mb-10">{t.conditionsSubtitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {items.map((item, index) => (
          <motion.div
            key={index}
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="bg-[#F5F5F7] rounded-[22px] p-6 flex items-start gap-4"
          >
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-white flex items-center justify-center shadow-[--shadow-apple]">
              <item.Icon className="w-6 h-6 text-[#0071E3]" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] mb-1">{item.title}</h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
