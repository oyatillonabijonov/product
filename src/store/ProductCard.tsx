import { motion } from 'motion/react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, formatUzs, lowestMonthly } from '../lib/installment';
import LocaleLink from './LocaleLink';

const ProductCard: FC<{
  t: Translation;
  product: Product;
  config: InstallmentConfig;
}> = ({ t, product, config }) => {
  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs ?? null);
  const isNew = product.condition === 'yangi';
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group bg-white border border-[#F0F0F2] rounded-[24px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] hover:border-[#E5E5EA] transition-shadow duration-300"
    >
      <LocaleLink
        to={`/product/${product.id}`}
        className="h-[168px] md:h-[196px] w-full flex items-center justify-center p-6 relative bg-gradient-to-b from-[#FAFAFC] to-[#F0F0F3]"
      >
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur ${
            isNew ? 'bg-[#EAF3FF]/90 text-[#0071E3]' : 'bg-[#E8F5E9]/90 text-[#1B7A34]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-[#0071E3]' : 'bg-[#1B7A34]'}`} />
          {isNew ? t.badgeNew : t.badgeUsed}
        </span>
        {disc !== null && (
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-1 rounded-full bg-[#E8462D] text-white shadow-sm">
            -{disc}%
          </span>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-[#C7C7CC] text-[13px]">{product.name}</div>
        )}
      </LocaleLink>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <LocaleLink
          to={`/product/${product.id}`}
          className="text-[15px] md:text-[16.5px] font-semibold tracking-[-0.01em] leading-snug hover:text-[#0071E3] transition-colors"
        >
          {product.name}
        </LocaleLink>

        <div className="mt-auto pt-4">
          <div className="text-[11px] uppercase tracking-wide text-[#86868B] font-medium">{t.catalogMonthlyLabel}</div>
          <div className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-[#1D1D1F] leading-tight">
            {formatUzs(lowestMonthly(product, config))}
          </div>
          <div className="text-[12px] text-[#6E6E73] mt-1 mb-4 flex items-center gap-2 flex-wrap">
            {product.oldPriceUzs && product.oldPriceUzs > product.cashPriceUzs && (
              <span className="line-through text-[#B0B0B5]">{formatUzs(product.oldPriceUzs)}</span>
            )}
            <span className="text-[#6E6E73]">{formatUzs(product.cashPriceUzs)}</span>
          </div>
          <LocaleLink
            to={`/product/${product.id}`}
            className="block text-center w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full group-hover:bg-[#0071E3] transition-colors"
          >
            {t.catalogSelect}
          </LocaleLink>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
