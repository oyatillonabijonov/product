import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { FC } from 'react';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, formatUzs, lowestMonthly } from '../lib/installment';

const ProductCard: FC<{
  t: Translation;
  product: Product;
  config: InstallmentConfig;
}> = ({ t, product, config }) => {
  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs ?? null);
  return (
    <motion.div whileHover={{ y: -6 }} className="group bg-white border border-[#E8E8ED] rounded-[22px] overflow-hidden flex flex-col shadow-[--shadow-apple] hover:shadow-[--shadow-apple-hover] hover:border-[#DADADF] transition-all duration-500">
      <Link to={`/product/${product.id}`} className="h-[160px] md:h-[190px] w-full flex items-center justify-center p-5 relative bg-[#F5F5F7]">
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-[#EAF3FF] text-[#0071E3]' : 'bg-[#E8F5E9] text-[#1B7A34]'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${product.condition === 'yangi' ? 'bg-[#0071E3]' : 'bg-[#1B7A34]'}`} />
          {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
        </span>
        {disc !== null && (
          <span className="absolute top-3 right-3 text-[11px] font-semibold px-2 py-1 rounded-full bg-[#E8462D] text-white">-{disc}%</span>
        )}
        {product.image ? (
          <img src={product.image} alt={product.name} className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.05]" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="text-[#C7C7CC] text-[13px]">{product.name}</div>
        )}
      </Link>
      <div className="p-4 md:p-5 flex flex-col flex-1">
        <Link to={`/product/${product.id}`} className="text-[15px] md:text-[17px] font-semibold tracking-[-0.01em] mb-0.5 hover:text-[#0071E3]">
          {product.name}
        </Link>
        <div className="mt-auto pt-4">
          <div className="text-[19px] md:text-[22px] font-semibold tracking-[-0.01em] text-[#0071E3] leading-tight">
            {formatUzs(lowestMonthly(product, config))}
          </div>
          <div className="text-[12px] text-[#6E6E73] mb-2">{t.catalogMonthlyLabel}</div>
          <div className="text-[12px] text-[#6E6E73] mb-4 flex items-center gap-2">
            {product.oldPriceUzs && product.oldPriceUzs > product.cashPriceUzs && (
              <span className="line-through text-[#B0B0B5]">{formatUzs(product.oldPriceUzs)}</span>
            )}
            <span className="text-[#1D1D1F] font-medium">{formatUzs(product.cashPriceUzs)}</span>
          </div>
          <Link to={`/product/${product.id}`} className="block text-center w-full py-2.5 bg-[#1D1D1F] text-white text-[14px] font-semibold rounded-full hover:bg-[#0071E3] transition-colors">
            {t.catalogSelect}
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
