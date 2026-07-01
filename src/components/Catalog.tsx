import { motion } from 'motion/react';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { formatUzs, lowestMonthly } from '../lib/installment';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
};

export default function Catalog({
  t,
  items,
  title,
  subtitle,
  config,
  onSelect,
}: {
  t: Translation;
  items: Product[];
  title: string;
  subtitle: string;
  config: InstallmentConfig;
  onSelect: (productId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section id={`catalog-${items[0].condition}`} className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-2">
        {title}
      </h2>
      <p className="text-[17px] text-[#6E6E73] text-center mb-8 md:mb-10">{subtitle}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {items.map((product) => (
          <motion.div
            key={product.id}
            variants={fadeIn}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            whileHover={{ y: -6 }}
            className="group bg-white border border-[#E8E8ED] rounded-[22px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] hover:border-[#DADADF] transition-all duration-500"
          >
            <div className="h-[150px] md:h-[190px] w-full flex items-center justify-center p-5 relative bg-[#F5F5F7]">
              <span
                className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                  product.condition === 'yangi'
                    ? 'bg-[#EAF3FF] text-[#0071E3]'
                    : 'bg-[#E8F5E9] text-[#1B7A34]'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    product.condition === 'yangi' ? 'bg-[#0071E3]' : 'bg-[#1B7A34]'
                  }`}
                />
                {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
              </span>
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.05]"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="text-[#C7C7CC] text-[13px]">{product.name}</div>
              )}
            </div>
            <div className="p-4 md:p-5 flex flex-col flex-1">
              <h3 className="text-[15px] md:text-[17px] font-semibold tracking-[-0.01em] mb-0.5">
                {product.name}
              </h3>
              {product.conditionNote && (
                <div className="text-[12px] text-[#6E6E73]">{product.conditionNote}</div>
              )}
              <div className="mt-auto pt-4">
                <div className="text-[19px] md:text-[22px] font-semibold tracking-[-0.01em] text-[#0071E3] leading-tight">
                  {formatUzs(lowestMonthly(product, config))}
                </div>
                <div className="text-[12px] text-[#6E6E73] mb-2">{t.catalogMonthlyLabel}</div>
                <div className="text-[12px] text-[#6E6E73] mb-4">
                  {t.catalogCashLabel}:{' '}
                  <span className="text-[#1D1D1F] font-medium">{formatUzs(product.cashPriceUzs)}</span>
                </div>
                <button
                  onClick={() => onSelect(product.id)}
                  className="w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors"
                >
                  {t.catalogSelect}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
