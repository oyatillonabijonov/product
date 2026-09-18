import { motion } from 'motion/react';
import { useState } from 'react';
import type { FC } from 'react';
import { ShieldCheck, ShoppingCart } from 'lucide-react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { InstallmentConfig, Product } from '../data/products';
import { discountPercent, priceView } from '../lib/installment';
import LocaleLink from './LocaleLink';
import { useCart } from './CartContext';
import { useCurrency } from './CurrencyContext';
import { SPRING_UI } from '../lib/motion';
import Stars from './Stars';
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
  const cart = useCart();
  const { price } = useCurrency();
  const [added, setAdded] = useState(false);

  // ponytail: karta variantlarni bilmaydi — eng arzon variant narxi bilan variantsiz
  // qator qo'shiladi. Variant tanlash kerak bo'lsa mahsulot sahifasiga o'tiladi.
  function addToCart(): void {
    cart.add({
      productId: product.id, name: product.name, image: product.image,
      priceUzs: product.minPriceUzs, variantId: null, variantLabel: '', qty: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={SPRING_UI}
      className="group flex w-full flex-col rounded-md bg-surface p-2"
    >
      <div className="relative">
        <LocaleLink
          to={`/product/${product.id}`}
          className="rounded-sm aspect-square w-full flex items-center justify-center overflow-hidden bg-white p-2.5"
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
            <div className="text-muted-2 text-label">{product.name}</div>
          )}
        </LocaleLink>
        {/* Badge faqat istisno holatda: hamma mahsulot "Yangi" bo'lgani uchun u axborot bermaydi. */}
        <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5 pointer-events-none">
          {!isNew && (
            <span className="inline-flex items-center gap-1.5 text-label font-semibold px-2.5 py-1 rounded-full backdrop-blur bg-trust-soft/90 text-trust">
              <span className="h-1.5 w-1.5 rounded-full bg-trust" />
              {t.badgeUsed}
            </span>
          )}
          {product.preorder && (
            <span className="text-label font-semibold px-2.5 py-1 rounded-full backdrop-blur bg-surface/90 text-new">{t.badgePreorder}</span>
          )}
          {disc !== null && (
            <span className="text-label font-bold px-2 py-1 rounded-full bg-sale text-white">-{disc}%</span>
          )}
        </div>
        <FavoriteButton
          item={{ productId: product.id, name: product.name, image: product.image, priceUzs: product.minPriceUzs }}
          addLabel={t.favAdd}
          removeLabel={t.favRemove}
          className="absolute top-3 right-3 w-9 h-9"
        />
      </div>

      {/* Info blok: rasm ramkasi karta ichida alohida turgani uchun ajratgich chiziq
          kerak emas. Ierarxiya — nom (medium/body), narx (hero, primary), oylik to'lov.
          Pastda savatga qo'shish tugmasi. */}
      <div className="px-3 pb-3 pt-4 md:px-3.5 md:pb-3.5 flex flex-col flex-1">
        <LocaleLink
          to={`/product/${product.id}`}
          className="text-label md:text-para font-medium text-body leading-snug hover:text-accent transition-colors line-clamp-2"
        >
          {product.name}
        </LocaleLink>

        {/* Sharh bo'lmasa qator umuman chiqmaydi: butun katalogda bo'sh yulduzchalar
            "bu yerdan hech kim olmaydi" degan signal berardi. */}
        {(product.reviewCount ?? 0) > 0 && <Stars t={t} rating={product.ratingAvg} count={product.reviewCount ?? 0} compact />}

        {/* Hamma qator chapdan bir tekis (chip/inset yo'q); oylik doim muddati bilan: "X so'm × 12 oy". */}
        <div className="mt-auto pt-3">
          {/* Mahsulot sahifasidagi kabi — narx ustidagi haqiqiylik belgisi. */}
          <div className="mb-1.5 inline-flex items-center gap-1 text-label font-medium text-verified">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {t.badgeOriginal}
          </div>
          {pv.monthlyPrimary ? (
            <>
              <div className="text-copy md:text-lede font-semibold text-primary leading-tight tabular-nums">
                {price(pv.monthlyUzs)}
                <span className="text-label font-normal text-muted-2"> × {pv.months} {t.calcMonths}</span>
              </div>
              <div className="text-label text-muted mt-1.5 flex items-center gap-2 flex-wrap tabular-nums">
                {disc !== null && product.oldPriceUzs && (
                  <span className="line-through text-disabled-2">{price(product.oldPriceUzs)}</span>
                )}
                <span>{price(pv.cashUzs)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-copy md:text-lede font-semibold text-primary leading-tight tabular-nums whitespace-nowrap">
                  {price(pv.cashUzs)}
                </span>
                {disc !== null && product.oldPriceUzs && (
                  <span className="text-label line-through text-disabled-2 tabular-nums">{price(product.oldPriceUzs)}</span>
                )}
              </div>
              {pv.showMonthly && (
                <div className="text-label mt-1.5 tabular-nums">
                  <span className="font-medium text-body">{price(pv.monthlyUzs)}</span>
                  <span className="text-muted-2"> × {pv.months} {t.calcMonths}</span>
                </div>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={addToCart}
          className="press mt-3 inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-3 text-copy font-normal text-bg hover:opacity-85 md:text-copy"
        >
          {/* Ikonka tor mobil kartada matnni sig'maydigan qiladi — u yerda faqat yozuv qoladi. */}
          <ShoppingCart className="hidden h-4 w-4 md:block" /> {added ? t.cartAdded : t.cartAdd}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
