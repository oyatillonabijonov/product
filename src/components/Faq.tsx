import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import type { Translation } from '../locales';

export default function Faq({ t }: { t: Translation }) {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
    { q: t.faq5Q, a: t.faq5A },
  ];

  return (
    <section className="w-full max-w-[760px] mx-auto px-4 md:px-0 pb-12 md:pb-24 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-8 md:mb-10">
        {t.faqTitle}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item, index) => {
          const isOpen = open === index;
          return (
            <div
              key={index}
              className="bg-[#F5F5F7] rounded-[18px] overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[16px] font-semibold text-[#1D1D1F]">{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 shrink-0 text-[#6E6E73] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <p className="px-5 pb-4 text-[15px] text-[#6E6E73] leading-relaxed">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
