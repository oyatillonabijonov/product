import { motion } from 'motion/react';
import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, formatUzs, priceView } from '../lib/installment';
import LocaleLink from './LocaleLink';
import FavoriteButton from './FavoriteButton';
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
      <div className="relative">
        <LocaleLink
          to={`/product/${product.id}`}
          className="aspect-square w-full flex items-center justify-center overflow-hidden bg-white p-2.5"
        >
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
        {/* Badge faqat istisno holatda: hamma mahsulot "Yangi" bo'lgani uchun u axborot bermaydi. */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {!isNew && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur bg-trust-soft/90 text-trust">
              <span className="h-1.5 w-1.5 rounded-full bg-trust" />
              {t.badgeUsed}
            </span>
          )}
          {disc !== null && (
            <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-sale text-white">-{disc}%</span>
          )}
        </div>
        <FavoriteButton
          item={{ productId: product.id, name: product.name, image: product.image, priceUzs: product.minPriceUzs }}
          addLabel={t.favAdd}
          removeLabel={t.favRemove}
          className="absolute top-3 right-3 w-9 h-9"
        />
      </div>

      {/* Info blok: hairline ajratgich rasmdan ajratadi; ierarxiya — nom (medium/body),
          narx (hero, primary), oylik to'lov (accent-soft chip). CTA tugmasi yo'q — butun karta bosiladi. */}
      <div className="px-4 pb-4 pt-3.5 md:px-5 md:pb-5 flex flex-col flex-1 border-t border-divider">
        <LocaleLink
          to={`/product/${product.id}`}
          className="text-[14px] md:text-[15px] font-medium text-body tracking-[-0.01em] leading-snug hover:text-accent transition-colors line-clamp-2"
        >
          {product.name}
        </LocaleLink>

        {/* Hamma qator chapdan bir tekis (chip/inset yo'q); oylik doim muddati bilan: "X so'm × 12 oy". */}
        <div className="mt-auto pt-3">
          {pv.monthlyPrimary ? (
            <>
              <div className="text-[17px] md:text-[22px] font-semibold tracking-[-0.02em] text-primary leading-tight tabular-nums">
                {formatUzs(pv.monthlyUzs, t.sum)}
                <span className="text-[12px] font-normal text-muted-2"> × {pv.months} {t.calcMonths}</span>
              </div>
              <div className="text-[12px] text-muted mt-1.5 flex items-center gap-2 flex-wrap tabular-nums">
                {disc !== null && product.oldPriceUzs && (
                  <span className="line-through text-disabled-2">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
                <span>{formatUzs(pv.cashUzs, t.sum)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[17px] md:text-[22px] font-semibold tracking-[-0.02em] text-primary leading-tight tabular-nums whitespace-nowrap">
                  {formatUzs(pv.cashUzs, t.sum)}
                </span>
                {disc !== null && product.oldPriceUzs && (
                  <span className="text-[12px] line-through text-disabled-2 tabular-nums">{formatUzs(product.oldPriceUzs, t.sum)}</span>
                )}
              </div>
              {pv.showMonthly && (
                <div className="text-[12px] mt-1.5 tabular-nums">
                  <span className="font-medium text-body">{formatUzs(pv.monthlyUzs, t.sum)}</span>
                  <span className="text-muted-2"> × {pv.months} {t.calcMonths}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
