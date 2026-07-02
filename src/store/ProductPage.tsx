import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Send, ShieldCheck, BadgeCheck, ChevronRight, Truck } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { Translation } from '../locales';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, type VariantSelection } from '../lib/variants';
import Gallery from './Gallery';
import LocaleLink from './LocaleLink';
import ProductGrid from './ProductGrid';

const ProductPage: FC<{
  t: Translation; product: ProductDetail; config: InstallmentConfig; similar: Product[];
}> = ({ t, product, config, similar }) => {
  const [months, setMonths] = useState(12);
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
    const msg = composeLeadMessage({ name: '', phone: '', product: productName, months, monthly: formatUzs(result.monthly) });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <nav className="flex items-center gap-1 text-[13px] text-[#86868B] mb-5">
        <LocaleLink to="/" className="hover:text-[#1D1D1F] transition-colors">{t.navCatalog}</LocaleLink>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1D1D1F] truncate max-w-[220px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <Gallery key={variant?.id ?? 'base'} images={galleryImages} name={product.name} />
        <div className="md:sticky md:top-24 md:self-start">
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-[#EAF3FF] text-[#0071E3]' : 'bg-[#E8F5E9] text-[#1B7A34]'}`}>
            {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
          </span>
          <h1 className="text-[32px] md:text-[46px] font-semibold text-[#1D1D1F] tracking-[-0.035em] mt-3 leading-[1.0]">{product.name}</h1>
          {product.conditionNote && <p className="text-[14px] text-[#6E6E73] mt-2.5">{product.conditionNote}</p>}

          <div className="flex items-baseline gap-2.5 mt-4 flex-wrap">
            <span className="text-[28px] md:text-[34px] font-semibold text-[#1D1D1F] tracking-[-0.025em] tabular-nums">{formatUzs(displayCash)}</span>
            {displayOld && disc !== null && (
              <>
                <span className="text-[16px] md:text-[18px] line-through text-[#B0B0B5] tabular-nums">{formatUzs(displayOld)}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#E8462D] text-white">-{disc}%</span>
              </>
            )}
          </div>

          {variant && (
            <div className={`mt-1.5 text-[13px] font-semibold ${outOfStock ? 'text-[#E8462D]' : 'text-[#1B7A34]'}`}>
              {outOfStock ? t.outOfStock : t.inStock}
            </div>
          )}

          {product.options.length > 0 && selection && (
            <div className="mt-5 flex flex-col gap-4">
              {product.options.map((o) => (
                <div key={o.id}>
                  <div className="text-[13px] font-semibold text-[#6E6E73] mb-2">{o.name}</div>
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
                              ? 'border-[#0071E3] bg-[#EAF3FF] text-[#0071E3]'
                              : available
                                ? 'border-[#D2D2D7] bg-white text-[#1D1D1F] hover:border-[#0071E3]'
                                : 'border-[#F0F0F2] bg-[#FAFAFC] text-[#C7C7CC] cursor-not-allowed line-through'
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
            <div className="mt-5 bg-white border border-[#ECECEF] rounded-[24px] p-5 shadow-[--shadow-apple]">
              <div className="text-[13px] font-semibold text-[#6E6E73] mb-3">{t.calcTerm}</div>
              <div className="grid grid-cols-3 gap-1 bg-[#F0F0F3] rounded-full p-1">
                {config.terms.map((x) => (
                  <button
                    key={x.months}
                    onClick={() => setMonths(x.months)}
                    className={`py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                      x.months === months
                        ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.14)]'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {x.months} {t.calcMonths}
                  </button>
                ))}
              </div>

              <div className="flex items-end justify-between mt-5">
                <div>
                  <div className="text-[13px] text-[#6E6E73]">{t.calcMonthly}</div>
                  <div className="text-[32px] md:text-[34px] font-semibold text-[#0071E3] tracking-[-0.02em] leading-none mt-1">
                    {formatUzs(result.monthly)}
                  </div>
                </div>
                <span className="text-[12px] text-[#86868B] pb-1">× {months} {t.calcMonths}</span>
              </div>

              <div className="mt-4 pt-4 border-t border-[#F0F0F2] space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">{t.calcDownPayment}</span>
                  <span className="font-medium text-[#1D1D1F]">{formatUzs(result.downPaymentUzs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E73]">{t.calcTotal}</span>
                  <span className="font-medium text-[#1D1D1F]">{formatUzs(result.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button onClick={() => order('telegram')} disabled={outOfStock} className="flex-1 py-3.5 bg-[#0071E3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)] disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-5 h-5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} disabled={outOfStock} className="flex-1 py-3.5 bg-[#1D1D1F] text-white font-semibold rounded-full hover:bg-[#25D366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t.formSendWhatsapp}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5 pt-5 border-t border-[#F0F0F2] text-[13px] text-[#6E6E73]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#1B7A34]" /> {t.heroPill.split('•')[0].trim()}</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#0071E3]" /> {t.feature2}</span>
            <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-[#0071E3]" /> {t.feature3}</span>
          </div>
        </div>
      </div>

      {product.specs.length > 0 && (
        <div className="mt-12 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-4">{t.specsTitle}</h2>
          <dl className="bg-white border border-[#ECECEF] rounded-[20px] overflow-hidden shadow-[--shadow-apple]">
            {product.specs.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-5 py-3.5 text-[14px] ${
                  i % 2 === 1 ? 'bg-[#FAFAFC]' : 'bg-white'
                }`}
              >
                <dt className="text-[#6E6E73] w-2/5 shrink-0">{s.label}</dt>
                <dd className="text-[#1D1D1F] font-medium">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {product.description && (
        <div className="mt-8 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.descTitle}</h2>
          <p className="text-[15px] text-[#3A3A3C] whitespace-pre-line leading-relaxed">{product.description}</p>
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
