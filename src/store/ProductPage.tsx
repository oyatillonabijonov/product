import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { ShieldCheck, ChevronRight, Truck, ShoppingCart, MessageCircle, Wallet } from 'lucide-react';
import type { InstallmentConfig, Product } from '../data/products';
import type { ProductDetail } from '../../app/lib/loaders';
import type { ApiSiteConfig } from '../../shared/types';
import type { Translation } from '../locales';
import { calcInstallment, discountPercent, formatUzs } from '../lib/installment';
import { defaultSelection, resolveVariant, isValueAvailable, selectionLabel, valuePrice, type VariantSelection } from '../lib/variants';
import { safeHref } from '../lib/safe-href';
import { useCart } from './CartContext';
import Gallery from './Gallery';
import FavoriteButton from './FavoriteButton';
import LocaleLink from './LocaleLink';
import OrderForm, { type OrderDraft } from './OrderForm';
import ProductGrid from './ProductGrid';
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
  t: Translation; product: ProductDetail; config: InstallmentConfig; similar: Product[]; site: ApiSiteConfig;
  /** Ko'rinadigan breadcrumb JSON-LD BreadcrumbList bilan mos bo'lishi uchun. */
  categoryName?: string | null;
}> = ({ t, product, config, similar, site, categoryName }) => {
  // Default — sozlamalardagi eng uzun muddat (qattiq 12 emas: admin muddatlarni o'zgartirsa
  // tanlanmagan segment + noto'g'ri yorliq chiqib qolardi).
  const [months, setMonths] = useState(() => config.terms[config.terms.length - 1]?.months ?? 12);
  const showInstallment = site.paymentMode !== 'cash';
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

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 md:py-10">
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

      {/* Rasm kattaroq ustunni oladi va yopishib turadi; o'ng ustun (konfigurator,
          xususiyatlar, xarid) uning yonida suriladi — apple.com xarid sahifasi kabi. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7 lg:sticky lg:top-24 lg:self-start">
          <Gallery key={variant?.id ?? 'base'} images={galleryImages} name={product.name} />
        </div>

        <div className="flex flex-col gap-8 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {/* Badge faqat istisno holatda — "Yangi" axborot bermaydi. */}
                {product.condition !== 'yangi' && (
                  <span className="mb-3 inline-flex rounded-full bg-trust-soft px-2.5 py-1 text-label font-semibold text-trust">
                    {t.badgeUsed}
                  </span>
                )}
                <h1 className="text-heading md:text-title font-semibold text-primary">{product.name}</h1>
                <Stars t={t} rating={product.ratingAvg} count={product.reviewCount ?? 0} />
              </div>
              <FavoriteButton
                item={{ productId: product.id, name: product.name, image: product.image, priceUzs: product.minPriceUzs }}
                addLabel={t.favAdd}
                removeLabel={t.favRemove}
                className="h-10 w-10 shrink-0"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-baseline gap-2.5">
              <span className="text-subhead md:text-heading font-semibold tabular-nums text-primary">{formatUzs(displayCash, t.sum)}</span>
              {displayOld && disc !== null && (
                <>
                  <span className="text-control md:text-copy tabular-nums text-disabled-2 line-through">{formatUzs(displayOld, t.sum)}</span>
                  <span className="rounded-full bg-sale px-2 py-0.5 text-label font-bold text-white">-{disc}%</span>
                </>
              )}
            </div>
            {variant && (
              <div className={`mt-1.5 text-label font-semibold ${outOfStock ? 'text-sale' : 'text-trust'}`}>
                {outOfStock ? t.outOfStock : t.inStock}
              </div>
            )}
          </div>

          {/* Konfigurator — har bir qiymat o'z narxi bilan, bosishdan oldin ko'rinadi. */}
          {product.options.length > 0 && selection && product.options.map((o) => (
            <section key={o.id} className="flex flex-col gap-3">
              <SectionTitle name={o.name} prompt={t.optionPrompt} />
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
                    className={`press flex w-full items-center justify-between gap-4 rounded-sm border-2 px-5 py-4 text-left ${
                      active
                        ? 'border-accent bg-surface'
                        : available
                          ? 'border-line bg-surface hover:border-muted-3'
                          : 'cursor-not-allowed border-divider bg-row-alt opacity-50'
                    }`}
                  >
                    <span className={`text-lede font-medium ${available ? 'text-primary' : 'text-disabled line-through'}`}>
                      {v.value}
                    </span>
                    {cash !== null && (
                      <span className="shrink-0 text-right text-label leading-snug text-muted-2 tabular-nums">
                        <span className="block">{formatUzs(cash, t.sum)}</span>
                        {showInstallment && (
                          <span className="mt-1 block">{formatUzs(monthlyOf(cash), t.sum)} × {months} {t.calcMonths}</span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          ))}

          {showInstallment && (
            <section className="flex flex-col gap-3">
              <SectionTitle name={t.orderPaymentInstallment} prompt={t.installmentPrompt} />
              <div className="rounded-sm border border-line bg-surface p-5">
                <TermSegments t={t} terms={config.terms} months={months} onChange={setMonths} />

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-label">
                    <span className="font-semibold text-muted">{t.calcDownPayment}</span>
                    <span className="font-semibold tabular-nums text-primary">
                      {downPct}% · {formatUzs(result.downPaymentUzs, t.sum)}
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
                      {formatUzs(result.monthly, t.sum)}
                    </div>
                  </div>
                  <span className="pb-1 text-label text-muted-2">× {months} {t.calcMonths}</span>
                </div>

                <div className="mt-4 flex justify-between border-t border-divider pt-4 text-label">
                  <span className="text-muted">{t.calcTotal}</span>
                  <span className="font-medium text-primary">{formatUzs(result.total, t.sum)}</span>
                </div>
              </div>
            </section>
          )}

          {product.specs.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionTitle name={t.specsTitle} prompt={t.specsPrompt} />
              <dl className="rounded-sm border border-line bg-surface">
                {product.specs.map((s, i) => (
                  <div key={i} className={`flex gap-4 px-5 py-3.5 text-para ${i > 0 ? 'border-t border-divider' : ''}`}>
                    <dt className="w-2/5 shrink-0 text-muted">{s.label}</dt>
                    <dd className="min-w-0 font-medium text-primary">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <div className="flex flex-col gap-4">
            <InfoRow icon={Truck} label={t.svcDeliveryTitle} value={`${t.svcDeliveryFact} · ${t.feature3}`} />
            <InfoRow icon={ShieldCheck} label={t.svcWarrantyTitle} value={`${t.svcWarrantyFact} · ${t.feature2}`} />
            {showInstallment && <InfoRow icon={Wallet} label={t.orderPaymentInstallment} value={t.trustShort} />}
          </div>

          <div className="flex flex-col gap-3">
            {site.paymentMode !== 'installment' && (
              <button onClick={() => openOrder('cash')} disabled={outOfStock}
                className="press h-[52px] w-full rounded-full bg-cta text-copy font-normal text-white hover:bg-cta-hover disabled:cursor-not-allowed disabled:opacity-50">
                {t.orderBuyCash}
              </button>
            )}
            {showInstallment && (
              <button onClick={() => openOrder('installment')} disabled={outOfStock}
                className="press h-[52px] w-full rounded-full bg-accent text-copy font-normal text-bg hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
                {t.orderBuyInstallment}
              </button>
            )}
            <button onClick={addToCart} disabled={outOfStock}
              className={`press flex h-[52px] w-full items-center justify-center gap-2 rounded-full border text-copy font-normal disabled:cursor-not-allowed disabled:opacity-50 ${
                added ? 'border-trust text-trust' : 'border-line text-primary hover:border-primary'
              }`}>
              <ShoppingCart className="h-5 w-5" /> {added ? t.cartAdded : t.cartAdd}
            </button>
          </div>

          {helpHref && (
            <div className="flex items-center gap-2 border-t border-divider pt-6 text-para">
              <MessageCircle className="h-5 w-5 shrink-0 text-primary" />
              <span className="font-semibold text-primary">{t.helpTitle}</span>
              <a href={helpHref} target="_blank" rel="noopener noreferrer" className="press text-cta hover:underline">
                {t.helpContact}
              </a>
            </div>
          )}
        </div>
      </div>

      {draft && <OrderForm t={t} draft={draft} onClose={() => setDraft(null)} />}

      {/* Tavsif va izoh — xarid qarorini qabul qilgandan keyin o'qiladigan qism,
          shuning uchun ikki ustunning ostida va o'qish uchun tor konteynerda. */}
      {(product.description || product.conditionNote) && (
        <div className="mt-14 max-w-[760px] border-t border-divider pt-10">
          {product.description && (
            <>
              <h2 className="text-subhead font-semibold text-primary">{t.descTitle}</h2>
              <p className="mt-3 whitespace-pre-line text-copy text-body">{product.description}</p>
            </>
          )}
          {product.conditionNote && (
            <>
              <h2 className={`text-subhead font-semibold text-primary ${product.description ? 'mt-8' : ''}`}>{t.noteTitle}</h2>
              <p className="mt-3 whitespace-pre-line text-copy text-body">{product.conditionNote}</p>
            </>
          )}
        </div>
      )}

      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="mb-4 text-subhead font-semibold">{t.similarProducts}</h2>
          <ProductGrid t={t} items={similar} config={config} />
        </div>
      )}

      {/* Faqat Apple yo'nalishida: bepul sozlash — shu yo'nalishning o'ziga xos
          xizmati, boshqa bo'limlarda (PC, Audio, Video) bunday va'da yo'q. */}
      {product.categoryId === 'apple' && <SetupBand t={t} contactHref={helpHref} />}
    </div>
  );
};

export default ProductPage;
