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
      className="group bg-white border border-divider rounded-[24px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] hover:border-line-2 transition-shadow duration-300"
    >
      <LocaleLink
        to={`/product/${product.id}`}
        className="h-[168px] md:h-[196px] w-full flex items-center justify-center p-6 relative bg-gradient-to-b from-row-alt to-segment"
      >
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur ${
            isNew ? 'bg-accent-soft/90 text-accent' : 'bg-trust-soft/90 text-trust'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-accent' : 'bg-trust'}`} />
          {isNew ? t.badgeNew : t.badgeUsed}
        </span>
        {disc !== null && (
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-1 rounded-full bg-sale text-white shadow-sm">
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
          <div className="text-disabled text-[13px]">{product.name}</div>
        )}
      </LocaleLink>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <LocaleLink
          to={`/product/${product.id}`}
          className="text-[15px] md:text-[16.5px] font-semibold tracking-[-0.01em] leading-snug hover:text-accent transition-colors"
        >
          {product.name}
        </LocaleLink>

        <div className="mt-auto pt-4">
          <div className="text-[11px] uppercase tracking-wide text-muted-2 font-medium">{t.catalogMonthlyLabel}</div>
          <div className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-primary leading-tight">
            {formatUzs(lowestMonthly({ ...product, cashPriceUzs: product.minPriceUzs }, config))}
          </div>
          <div className="text-[12px] text-muted mt-1 mb-4 flex items-center gap-2 flex-wrap">
            {product.oldPriceUzs && product.oldPriceUzs > product.cashPriceUzs && (
              <span className="line-through text-disabled-2">{formatUzs(product.oldPriceUzs)}</span>
            )}
            <span className="text-muted">{formatUzs(product.minPriceUzs)}</span>
          </div>
          <LocaleLink
            to={`/product/${product.id}`}
            className="block text-center w-full py-2.5 bg-primary text-white text-[14px] font-semibold rounded-full group-hover:bg-accent transition-colors"
          >
            {t.catalogSelect}
          </LocaleLink>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
