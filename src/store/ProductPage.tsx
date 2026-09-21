import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { ShieldCheck, ChevronRight, Truck, ShoppingCart, Wallet } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { ApiReview, ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import { calcInstallment, discountPercent } from '../lib/installment';
import { SWATCHES } from '../lib/swatches';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, valuePrice, type VariantSelection } from '../lib/variants';
import { safeHref } from '../../shared/safe-href';
import { useCart } from './CartContext';
import { useCurrency } from './CurrencyContext';
import Expandable from './Expandable';
import Gallery from './Gallery';
import FavoriteButton from './FavoriteButton';
import LocaleLink from './LocaleLink';
import OrderForm, { type OrderDraft } from './OrderForm';
import ProductGrid from './ProductGrid';
import Reviews from './Reviews';
import SetupBand from './SetupBand';
import Stars from './Stars';
import TermSegments from './TermSegments';

/** Bo'lim sarlavhasi — apple.com uslubi: qalin nom, ortidan och rangli savol. */
const SectionTitle: FC<{ name: string; prompt: string }> = ({ name, prompt }) => (
  <h2 className="text-lede text-muted-2">
    <span className="font-semibold text-primary">{name}.</span> {prompt}
  </h2>
);

/** Yetkazish/kafolat qatori — ikonka, qalin yorliq, ostida qiymat. */
const InfoRow: FC<{ icon: FC<{ className?: string }>; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex gap-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
    <div className="min-w-0">
      <div className="text-para font-semibold text-primary">{label}:</div>
      <div className="text-para text-body">{value}</div>
    </div>
  </div>
);

const ProductPage: FC<{
  t: Translation; product: ProductDetail; config: InstallmentConfig;
  similar: Product[]; reviews: ApiReview[]; site: ApiSiteConfig;
  /** Ko'rinadigan breadcrumb JSON-LD BreadcrumbList bilan mos bo'lishi uchun. */
  categoryName?: string | null;
}> = ({ t, product, config, similar, reviews, site, categoryName }) => {
  // Default — sozlamalardagi eng uzun muddat (qattiq 12 emas: admin muddatlarni o'zgartirsa
  // tanlanmagan segment + noto'g'ri yorliq chiqib qolardi).
  const [months, setMonths] = useState(() => config.terms[config.terms.length - 1]?.months ?? 12);
  const showInstallment = site.paymentMode !== 'cash';
  const { price } = useCurrency();
  // Boshlang'ich to'lov foizi — min (config.downPaymentPercent) dan max (downPaymentMaxPercent) gacha slider.
  const [downPct, setDownPct] = useState(config.downPaymentPercent);
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
  const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
  const result = useMemo(
    () => calcInstallment({ ...product, cashPriceUzs: displayCash }, term, config, displayCash * (downPct / 100)),
    [product, config, term, displayCash, downPct],
  );

  /** Konfigurator kartasidagi oylik to'lov — o'sha variant narxidan, joriy shartlar bilan. */
  const monthlyOf = (cash: number): number =>
    calcInstallment({ ...product, cashPriceUzs: cash }, term, config, cash * (downPct / 100)).monthly;

  const galleryImages = variant?.imageUrl
    ? [variant.imageUrl, ...product.images.filter((i) => i !== variant.imageUrl)]
    : product.images;

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  function openOrder(paymentKind: 'cash' | 'installment') {
    if (outOfStock) return;
    const label = selection ? selectionLabel(product.options, selection) : '';
    const installment = paymentKind === 'installment';
    setDraft({
      title: label ? `${product.name} (${label})` : product.name,
      paymentKind,
      termMonths: installment ? months : null,
      downPaymentUzs: installment ? Math.round(result.downPaymentUzs) : null,
      monthlyUzs: installment ? Math.round(result.monthly) : null,
      totalUzs: installment ? Math.round(result.total) : null,
      items: [{ productId: product.id, name: product.name, variantLabel: label, qty: 1, priceUzs: displayCash }],
      source: 'product',
    });
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

  const helpHref = safeHref(site.telegram) ?? (site.phone ? `tel:${site.phone}` : null);
  const isNew = product.condition === 'yangi';

  return (
    <div className="shell py-6 md:py-10">
      <nav aria-label="breadcrumb" className="mb-5 flex items-center gap-1 text-label text-muted-2">
        <LocaleLink to="/" className="hover:text-primary transition-colors">{t.breadcrumbHome}</LocaleLink>
        {categoryName && product.categoryId && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <LocaleLink to={`/category/${product.categoryId}`} className="hover:text-primary transition-colors">
              {categoryName}
            </LocaleLink>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="max-w-[220px] truncate text-primary">{product.name}</span>
      </nav>

      {/* Yuqori blok: chapda rasm, o'ngda xarid ustuni. Ketma-ketlik har bir
          mahsulotda bir xil — yorliq · nom · sharh · narx · versiyalar ·
          yetkazish/kafolat · tugmalar. Mijoz bir marta o'rgansa, keyingi
          mahsulotda ham xuddi shu joyda topadi. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <Gallery key={galleryImages[0] ?? 'base'} images={galleryImages} name={product.name} />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Apple uslubidagi matn-yorliq: pill emas, sarlavha ustidagi
                    kichik qalin yozuv. Yangi va pre-order — to'q sariq, ishlatilgan — neytral. */}
                <div className={`text-label font-semibold ${isNew ? 'text-new' : 'text-trust'}`}>
                  {product.preorder ? t.badgePreorder : isNew ? t.badgeNew : t.badgeUsed}
                </div>
                <h1 className="mt-1.5 text-subhead md:text-heading font-normal text-balance text-primary">{product.name}</h1>
                {(product.reviewCount ?? 0) > 0 && <Stars t={t} rating={product.ratingAvg} count={product.reviewCount ?? 0} />}
              </div>
              <FavoriteButton
                item={{ productId: product.id, name: product.name, image: product.image, priceUzs: product.minPriceUzs }}
                addLabel={t.favAdd}
                removeLabel={t.favRemove}
                className="h-10 w-10 shrink-0"
              />
            </div>

            {/* Narx ustidagi haqiqiylik belgisi — rasmiy import va kafolat
                va'dasi xarid qarorining bir qismi, shuning uchun narxdan
                oldin turadi. `verified` — palitradagi yagona yashil. */}
            <div className="mt-4 inline-flex items-center gap-1.5 text-label font-medium text-verified">
              <ShieldCheck className="h-4 w-4" /> {t.badgeOriginal}
            </div>

            <div className="mt-1.5 flex flex-wrap items-baseline gap-2.5">
              <span className="text-heading md:text-title font-semibold tabular-nums text-primary">{price(displayCash)}</span>
              {displayOld && disc !== null && (
                <>
                  <span className="text-control md:text-copy tabular-nums text-disabled-2 line-through">{price(displayOld)}</span>
                  <span className="rounded-full bg-sale px-2 py-0.5 text-label font-bold text-white">-{disc}%</span>
                </>
              )}
            </div>
            {/* Qoldiq yozuvi faqat istisnoda — "Sotuvda bor" axborot bermaydi. */}
            {(outOfStock || product.preorder) && (
              <div className={`mt-1.5 text-label font-semibold ${outOfStock ? 'text-sale' : 'text-trust'}`}>
                {outOfStock ? t.outOfStock : t.preorderStock}
              </div>
            )}
          </div>

          {/* Versiyalar (xotira, rang, …). Rang — Apple nomi bilan doiralar, qolgani ixcham kartalar
              (qiymat + narx); tanlangani ko'k (`cta`) chiziq bilan, qalinligi doim `border-2` — siljimasin. */}
          {product.options.length > 0 && selection && product.options.map((o) => {
            const swatches = o.values.every((v) => SWATCHES[v.value]);
            return (
              <section key={o.id} className="flex flex-col gap-3">
                <SectionTitle name={o.name} prompt={t.optionPrompt} />
                {swatches ? (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {o.values.map((v) => {
                        const active = selection[o.name] === v.value;
                        const available = isValueAvailable(product.options, product.variants, selection, o.name, v.value);
                        return (
                          <button
                            key={v.id}
                            disabled={!available}
                            onClick={() => setSelection({ ...selection, [o.name]: v.value })}
                            aria-pressed={active}
                            aria-label={v.value}
                            title={v.value}
                            className={`press grid h-11 w-11 place-items-center rounded-full border-2 ${
                              active ? 'border-cta' : 'border-transparent hover:border-muted-3'
                            } disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <span className="h-8 w-8 rounded-full border border-line" style={{ backgroundColor: SWATCHES[v.value] }} />
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-para text-body">{selection[o.name]}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {o.values.map((v) => {
                      const active = selection[o.name] === v.value;
                      const available = isValueAvailable(product.options, product.variants, selection, o.name, v.value);
                      const cash = valuePrice(product.options, product.variants, selection, o.name, v.value);
                      return (
                        <button
                          key={v.id}
                          disabled={!available}
                          onClick={() => setSelection({ ...selection, [o.name]: v.value })}
                          aria-pressed={active}
                          className={`press flex flex-col items-start gap-0.5 rounded-sm border-[1.5px] bg-surface px-4 py-3 text-left ${
                            active
                              ? 'border-cta'
                              : available
                                ? 'border-transparent hover:border-cta'
                                : 'cursor-not-allowed border-transparent opacity-50'
                          }`}
                        >
                          <span className={`text-copy font-semibold ${available ? 'text-primary' : 'text-disabled line-through'}`}>
                            {v.value}
                          </span>
                          {cash !== null && (
                            <span className="text-label text-muted-2 tabular-nums">
                              {price(cash)}
                              {showInstallment && <span className="block">{price(monthlyOf(cash))} × {months} {t.calcMonths}</span>}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {showInstallment && (
            <section className="flex flex-col gap-3">
              <SectionTitle name={t.orderPaymentInstallment} prompt={t.installmentPrompt} />
              <div className="rounded-sm bg-surface p-5">
                <TermSegments t={t} terms={config.terms} months={months} onChange={setMonths} />

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-label">
                    <span className="font-semibold text-muted">{t.calcDownPayment}</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {downPct}% · {price(result.downPaymentUzs)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={config.downPaymentPercent}
                    max={config.downPaymentMaxPercent}
                    step={1}
                    value={downPct}
                    onChange={(e) => setDownPct(Number(e.target.value))}
                    aria-label={t.calcDownPayment}
                    className="w-full accent-accent"
                  />
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <div className="text-label text-muted">{t.calcMonthly}</div>
                    <div className="mt-1 text-subhead md:text-heading font-semibold leading-none text-accent">
                      {price(result.monthly)}
                    </div>
                  </div>
                  <span className="pb-1 text-label text-muted-2">× {months} {t.calcMonths}</span>
                </div>

                <div className="mt-4 flex justify-between border-t border-divider pt-4 text-label">
                  <span className="text-muted">{t.calcTotal}</span>
                  <span className="font-medium text-primary">{price(result.total)}</span>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Truck} label={t.svcDeliveryTitle} value={`${t.svcDeliveryFact} · ${t.feature3}`} />
            <InfoRow icon={ShieldCheck} label={t.svcWarrantyTitle} value={`${t.svcWarrantyFact} · ${t.feature2}`} />
            {showInstallment && <InfoRow icon={Wallet} label={t.orderPaymentInstallment} value={t.trustShort} />}
          </div>

          {/* sm'dan tugmalar yonma-yon; muddatli to'lov tugmasi (bo'lsa) tepada, to'liq enda. */}
          <div className="grid gap-3 sm:grid-cols-2">
            {site.paymentMode !== 'installment' && (
              <button onClick={() => openOrder('cash')} disabled={outOfStock}
                className="press h-[52px] w-full rounded-full bg-cta text-copy font-normal text-white hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50">
                {product.preorder ? t.orderPreorder : t.orderBuyCash}
              </button>
            )}
            {showInstallment && (
              <button onClick={() => openOrder('installment')} disabled={outOfStock}
                className="press h-[52px] w-full rounded-full bg-accent text-copy font-normal sm:order-first sm:col-span-2 text-bg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
                {t.orderBuyInstallment}
              </button>
            )}
            <button onClick={addToCart} disabled={outOfStock}
              className={`press flex h-[52px] w-full items-center justify-center gap-2 rounded-full text-copy font-normal text-bg disabled:cursor-not-allowed disabled:opacity-50 ${
                added ? 'bg-trust' : 'bg-primary hover:bg-body'
              }`}>
              <ShoppingCart className="h-5 w-5" /> {added ? t.cartAdded : t.cartAdd}
            </button>
          </div>

        </div>
      </div>

      {draft && <OrderForm t={t} draft={draft} onClose={() => setDraft(null)} />}

      {/* Rasmdan pastda — xarid qarori qabul qilingandan keyin o'qiladigan qism:
          xususiyatlar | tavsif (lg'da yonma-yon) → sharhlar → sozlash bo'limi → o'xshashlar. */}
      {(product.specs.length > 0 || product.description || product.conditionNote) && (
        <section className={`mt-14 grid gap-14 border-t border-divider pt-10 ${
          product.specs.length > 0 && (product.description || product.conditionNote) ? 'lg:grid-cols-2 lg:gap-16' : ''
        }`}>
          {product.specs.length > 0 && (
            <div>
              <h2 className="text-subhead font-semibold text-primary">{t.specsTitle}</h2>
              <dl className="mt-6 max-w-[860px]">
                {product.specs.map((s, i) => (
                  <div key={i} className="flex flex-wrap gap-x-4 gap-y-1 border-t border-divider py-3.5 first:border-t-0 sm:flex-nowrap">
                    <dt className="w-full shrink-0 text-para text-muted sm:w-[200px]">{s.label}</dt>
                    <dd className="min-w-0 text-para font-medium text-primary">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {(product.description || product.conditionNote) && (
            <div>
              <h2 className="text-subhead font-semibold text-primary">{t.descTitle}</h2>
              <div className="mt-6 max-w-[760px]">
                <Expandable moreLabel={t.showMore} lessLabel={t.showLess}>
                  {product.description && (
                    <p className="whitespace-pre-line text-copy text-body">{product.description}</p>
                  )}
                  {product.conditionNote && (
                    <>
                      <h3 className={`text-copy font-semibold text-primary ${product.description ? 'mt-6' : ''}`}>{t.noteTitle}</h3>
                      <p className="mt-2 whitespace-pre-line text-copy text-body">{product.conditionNote}</p>
                    </>
                  )}
                </Expandable>
              </div>
            </div>
          )}
        </section>
      )}

      <Reviews t={t} reviews={reviews} ratingAvg={product.ratingAvg} reviewCount={product.reviewCount ?? 0} />

      <SetupBand t={t} contactHref={helpHref} />

      {similar.length > 0 && (
        <section className="mt-14 border-t border-divider pt-10">
          <h2 className="mb-6 text-subhead font-semibold text-primary">{t.similarProducts}</h2>
          <ProductGrid t={t} items={similar} config={config} />
        </section>
      )}

    </div>
  );
};

export default ProductPage;
