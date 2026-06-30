import { motion } from 'motion/react';
import { Smartphone, ClipboardList, IdCard, PackageCheck } from 'lucide-react';
import type { Translation } from '../locales';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

const staggerContainer = {
  initial: {},
  animate: { transition: { staggerChildren: 0.15 } },
};

export default function HowItWorks({ t }: { t: Translation }) {
  const steps = [
    { Icon: Smartphone, title: t.step1Title, desc: t.step1Desc },
    { Icon: ClipboardList, title: t.step2Title, desc: t.step2Desc },
    { Icon: IdCard, title: t.step3Title, desc: t.step3Desc },
    { Icon: PackageCheck, title: t.step4Title, desc: t.step4Desc },
  ];

  return (
    <section className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-8 md:mb-10">
        {t.stepsTitle}
      </h2>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {steps.map((step, index) => (
          <motion.div
            key={index}
            variants={fadeIn}
            className="bg-[#F5F5F7] rounded-[22px] p-6 flex flex-col items-start gap-4 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#0071E3] flex items-center justify-center">
              <step.Icon className="w-6 h-6 text-white" strokeWidth={1.8} />
            </div>
            <span className="absolute top-6 right-6 text-[28px] font-semibold text-[#D2D2D7]">
              {index + 1}
            </span>
            <div>
              <h3 className="text-[17px] font-semibold tracking-[-0.01em] mb-1">{step.title}</h3>
              <p className="text-[14px] text-[#6E6E73] leading-relaxed">{step.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
