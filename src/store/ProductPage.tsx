import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Send, ShieldCheck, BadgeCheck, ChevronRight, Truck, ShoppingCart } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, type VariantSelection } from '../lib/variants';
import { useCart } from './CartContext';
import Gallery from './Gallery';
import LocaleLink from './LocaleLink';
import ProductGrid from './ProductGrid';
import TermSegments from './TermSegments';

const ProductPage: FC<{
  t: Translation; product: ProductDetail; config: InstallmentConfig; similar: Product[]; site: ApiSiteConfig;
  /** Ko'rinadigan breadcrumb JSON-LD BreadcrumbList bilan mos bo'lishi uchun. */
  categoryName?: string | null;
}> = ({ t, product, config, similar, site, categoryName }) => {
  // Default — sozlamalardagi eng uzun muddat (qattiq 12 emas: admin muddatlarni o'zgartirsa
  // tanlanmagan segment + noto'g'ri yorliq chiqib qolardi).
  const [months, setMonths] = useState(() => config.terms[config.terms.length - 1]?.months ?? 12);
  const [selection, setSelection] = useState<VariantSelection | null>(
    () => defaultSelection(product.options, product.variants),
  );
  const variant = useMemo(
    () => (selection ? resolveVariant(product.options, product.variants, selection) : null),
    [product, selection],
  );
  const displayCash = variant?.cashPriceUzs ?? product.cashPriceUzs;
  const displayOld = variant ? variant.oldPriceUzs : product.oldPriceUzs;
  const outOfStock = variant !== null && !variant.inStock;
  const disc = discountPercent(displayCash, displayOld);
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return calcInstallment({ ...product, cashPriceUzs: displayCash }, term, config);
  }, [product, config, months, displayCash]);

  const galleryImages = variant?.imageUrl
    ? [variant.imageUrl, ...product.images.filter((i) => i !== variant.imageUrl)]
    : product.images;

  function order(channel: 'telegram' | 'whatsapp') {
    if (!result || outOfStock) return;
    const label = selection ? selectionLabel(product.options, selection) : '';
    const productName = label ? `${product.name} (${label})` : product.name;
    const msg = composeLeadMessage({
      name: '', phone: '', product: productName, months,
      monthly: formatUzs(result.monthly, t.sum), brand: site.name,
    });
    const url = channel === 'telegram' ? telegramShareUrl(msg, site.telegram) : whatsappUrl(msg, site.whatsapp);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const cart = useCart();
  const [added, setAdded] = useState(false);
  function addToCart() {
    if (outOfStock) return;
    const label = selection ? selectionLabel(product.options, selection) : '';
    cart.add({
      productId: product.id, name: product.name,
      image: galleryImages[0] ?? product.image,
      priceUzs: displayCash,
      variantId: variant?.id ?? null, variantLabel: label, qty: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <nav aria-label="breadcrumb" className="flex items-center gap-1 text-[13px] text-muted-2 mb-5">
        <LocaleLink to="/" className="hover:text-primary transition-colors">{t.breadcrumbHome}</LocaleLink>
        {categoryName && product.categoryId && (
          <>
            <ChevronRight className="w-3.5 h-3.5" />
            <LocaleLink to={`/category/${product.categoryId}`} className="hover:text-primary transition-colors">
              {categoryName}
            </LocaleLink>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-primary truncate max-w-[220px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <Gallery key={variant?.id ?? 'base'} images={galleryImages} name={product.name} />
        <div className="md:sticky md:top-24 md:self-start">
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-accent-soft text-accent' : 'bg-trust-soft text-trust'}`}>
            {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
          </span>
          <h1 className="text-[32px] md:text-[46px] font-semibold text-primary tracking-[-0.035em] mt-3 leading-[1.0]">{product.name}</h1>
          {product.conditionNote && <p className="text-[14px] text-muted mt-2.5">{product.conditionNote}</p>}

          <div className="flex items-baseline gap-2.5 mt-4 flex-wrap">
            <span className="text-[28px] md:text-[34px] font-semibold text-primary tracking-[-0.025em] tabular-nums">{formatUzs(displayCash, t.sum)}</span>
            {displayOld && disc !== null && (
              <>
                <span className="text-[16px] md:text-[18px] line-through text-disabled-2 tabular-nums">{formatUzs(displayOld, t.sum)}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-sale text-white">-{disc}%</span>
              </>
            )}
          </div>

          {variant && (
            <div className={`mt-1.5 text-[13px] font-semibold ${outOfStock ? 'text-sale' : 'text-trust'}`}>
              {outOfStock ? t.outOfStock : t.inStock}
            </div>
          )}

          {product.options.length > 0 && selection && (
            <div className="mt-5 flex flex-col gap-4">
              {product.options.map((o) => (
                <div key={o.id}>
                  <div className="text-[13px] font-semibold text-muted mb-2">{o.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {o.values.map((v) => {
                      const active = selection[o.name] === v.value;
                      const available = isValueAvailable(product.options, product.variants, selection, o.name, v.value);
                      return (
                        <button
                          key={v.id}
                          disabled={!available}
                          onClick={() => setSelection({ ...selection, [o.name]: v.value })}
                          className={`px-4 py-2 rounded-xl text-[14px] font-semibold border transition-colors ${
                            active
                              ? 'border-accent bg-accent-soft text-accent'
                              : available
                                ? 'border-line bg-white text-primary hover:border-accent'
                                : 'border-divider bg-row-alt text-disabled cursor-not-allowed line-through'
                          }`}
                        >
                          {v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {config && result && (
            <div className="mt-5 bg-white border border-line-3 rounded-[24px] p-5 shadow-apple">
              <div className="text-[13px] font-semibold text-muted mb-3">{t.calcTerm}</div>
              <TermSegments t={t} terms={config.terms} months={months} onChange={setMonths} />

              <div className="flex items-end justify-between mt-5">
                <div>
                  <div className="text-[13px] text-muted">{t.calcMonthly}</div>
                  <div className="text-[32px] md:text-[34px] font-semibold text-accent tracking-[-0.02em] leading-none mt-1">
                    {formatUzs(result.monthly, t.sum)}
                  </div>
                </div>
                <span className="text-[12px] text-muted-2 pb-1">× {months} {t.calcMonths}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-divider space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-muted">{t.calcDownPayment}</span>
                  <span className="font-medium text-primary">{formatUzs(result.downPaymentUzs, t.sum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">{t.calcTotal}</span>
                  <span className="font-medium text-primary">{formatUzs(result.total, t.sum)}</span>
                </div>
              </div>
            </div>
          )}

          <button onClick={addToCart} disabled={outOfStock}
            className={`w-full py-3.5 mb-3 mt-4 font-semibold rounded-full border-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              added ? 'border-trust text-trust bg-trust-soft' : 'border-accent text-accent hover:bg-accent-soft'
            }`}>
            <ShoppingCart className="w-5 h-5" /> {added ? t.cartAdded : t.cartAdd}
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => order('telegram')} disabled={outOfStock} className="flex-1 py-3.5 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)] disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-5 h-5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} disabled={outOfStock} className="flex-1 py-3.5 bg-primary text-white font-semibold rounded-full hover:bg-[#25D366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t.formSendWhatsapp}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-5 border-t border-divider text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-trust" /> {t.trustShort}</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-accent" /> {t.feature2}</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-accent" /> {t.feature3}</span>
          </div>
        </div>
      </div>

      {product.specs.length > 0 && (
        <div className="mt-12 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-4">{t.specsTitle}</h2>
          <dl className="bg-white border border-line-3 rounded-[20px] overflow-hidden shadow-apple">
            {product.specs.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-5 py-3.5 text-[14px] ${
                  i % 2 === 1 ? 'bg-row-alt' : 'bg-white'
                }`}
              >
                <dt className="text-muted w-2/5 shrink-0">{s.label}</dt>
                <dd className="text-primary font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {product.description && (
        <div className="mt-8 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.descTitle}</h2>
          <p className="text-[15px] text-body whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>
      )}

      {similar.length > 0 && (
        <div className="mt-12">
          <h2 className="text-[20px] font-semibold mb-4">{t.similarProducts}</h2>
          <ProductGrid t={t} items={similar} config={config} />
        </div>
      )}
    </div>
  );
};

export default ProductPage;
