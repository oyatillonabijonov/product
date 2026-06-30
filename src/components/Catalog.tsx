import { motion } from 'motion/react';
import type { Translation } from '../locales';
import { products, installmentConfig } from '../data/products';
import { formatUzs, lowestMonthly } from '../lib/installment';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Catalog({
  t,
  onSelect,
}: {
  t: Translation;
  onSelect: (productId: string) => void;
}) {
  return (
    <section id="catalog" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-2">
        {t.catalogTitle}
      </h2>
      <p className="text-[17px] text-[#6E6E73] text-center mb-8 md:mb-10">{t.catalogSubtitle}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <motion.div
            key={product.id}
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="bg-[#F5F5F7] rounded-[22px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] transition-all duration-500"
          >
            <div className="h-[140px] md:h-[180px] w-full flex items-center justify-center p-4">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 md:p-5 flex flex-col flex-1">
              <h3 className="text-[15px] md:text-[17px] font-semibold tracking-[-0.01em] mb-2">
                {product.name}
              </h3>
              <div className="text-[13px] text-[#6E6E73] mb-1">
                {t.catalogCashLabel}: <span className="text-[#1D1D1F] font-medium">{formatUzs(product.cashPriceUzs)}</span>
              </div>
              <div className="text-[13px] text-[#6E6E73] mb-4">
                {t.catalogMonthlyLabel}:{' '}
                <span className="text-[#0071E3] font-semibold">
                  {formatUzs(lowestMonthly(product, installmentConfig))}
                </span>
              </div>
              <button
                onClick={() => onSelect(product.id)}
                className="mt-auto w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors"
              >
                {t.catalogSelect}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
