import { motion } from 'motion/react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, formatUzs, priceView } from '../lib/installment';
import LocaleLink from './LocaleLink';
import type { StoreContext } from './StoreLayout';

const ProductCard: FC<{
  t: Translation;
  product: Product;
  config: InstallmentConfig;
  /** Fold ustidagi kartalar uchun — LCP rasmi lazy bo'lmasin. */
  eager?: boolean;
}> = ({ t, product, config, eager }) => {
  // Chegirma faqat ko'rsatilayotgan narx bazaviy narx bilan bir xil bo'lganda —
  // aks holda badge/eski narx arzonroq variant narxi yonida boshqa narxga taalluqli bo'lardi.
  const showsBasePrice = product.minPriceUzs === product.cashPriceUzs;
  const disc = showsBasePrice ? discountPercent(product.cashPriceUzs, product.oldPriceUzs ?? null) : null;
  const isNew = product.condition === 'yangi';
  const { config: site } = useOutletContext<StoreContext>();
  const pv = priceView(product, config, site.paymentMode);
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group w-full bg-white border border-divider rounded-[24px] overflow-hidden flex flex-col shadow-apple hover:shadow-apple-hover hover:border-line-2 transition-shadow duration-300"
    >
      <LocaleLink
        to={`/product/${product.id}`}
        className="aspect-square w-full flex items-center justify-center relative overflow-hidden bg-white"
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
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-1 rounded-full bg-sale text-white">
            -{disc}%
          </span>
        )}
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain"
            loading={eager ? 'eager' : 'lazy'}
            fetchPriority={eager ? 'high' : undefined}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-muted-2 text-[13px]">{product.name}</div>
        )}
      </LocaleLink>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <LocaleLink
          to={`/product/${product.id}`}
          className="text-[15px] md:text-[16.5px] font-semibold tracking-[-0.01em] leading-snug hover:text-accent transition-colors line-clamp-2"
        >
          {product.name}
        </LocaleLink>

        <div className="mt-auto pt-4">
          {pv.monthlyPrimary ? (
            <>
              <div className="text-[11px] uppercase tracking-wide text-muted-2 font-medium">{t.catalogMonthlyLabel}</div>
              <div className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-primary leading-tight">
                {formatUzs(pv.monthlyUzs, t.sum)}
              </div>
              <div className="text-[12px] text-muted mt-1 mb-4 flex items-center gap-2 flex-wrap">
                {disc !== null && product.oldPriceUzs && (
                  <span className="line-through text-disabled-2">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
                <span className="text-muted">{formatUzs(pv.cashUzs, t.sum)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[20px] md:text-[23px] font-semibold tracking-[-0.01em] text-primary leading-tight tabular-nums">
                  {formatUzs(pv.cashUzs, t.sum)}
                </span>
                {disc !== null && product.oldPriceUzs && (
                  <span className="text-[12px] line-through text-disabled-2 tabular-nums">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
              </div>
              {pv.showMonthly && (
                <div className="text-[12px] text-muted mt-1 mb-4">
                  {t.cardMonthlyFrom.replace('{v}', formatUzs(pv.monthlyUzs, t.sum))}
                </div>
              )}
              {!pv.showMonthly && <div className="mb-4" />}
            </>
          )}
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
