import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import type { Translation } from '../locales';
import type { InstallmentConfig } from '../data/products';
import type { ApiSiteConfig } from '../../shared/types';
import { cartSum, cartInstallment } from '../lib/cart';
import { formatUzs } from '../lib/installment';
import { useCart } from './CartContext';
import LocaleLink from './LocaleLink';
import OrderForm, { type OrderDraft } from './OrderForm';
import TermSegments from './TermSegments';

const CartPage: FC<{ t: Translation; config: InstallmentConfig; site: ApiSiteConfig }> = ({ t, config, site }) => {
  const showInstallment = site.paymentMode !== 'cash';
  const { items, count, remove, changeQty, clear } = useCart();
  // Default — sozlamalardagi eng uzun muddat (qattiq 12 emas).
  const [months, setMonths] = useState(() => config.terms[config.terms.length - 1]?.months ?? 12);
  const sum = cartSum(items);
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return cartInstallment(sum, term, config);
  }, [sum, months, config]);

  const [draft, setDraft] = useState<OrderDraft | null>(null);
  function openOrder(paymentKind: 'cash' | 'installment') {
    if (items.length === 0) return;
    const installment = paymentKind === 'installment';
    setDraft({
      title: `${t.cartTitle} · ${count} ${t.cartItemsCount}`,
      paymentKind,
      termMonths: installment ? months : null,
      downPaymentUzs: installment ? Math.round(result.downPaymentUzs) : null,
      monthlyUzs: installment ? Math.round(result.monthly) : null,
      totalUzs: installment ? Math.round(result.total) : null,
      items: items.map((it) => ({ productId: it.productId, name: it.name, variantLabel: it.variantLabel, qty: it.qty, priceUzs: it.priceUzs })),
      source: 'cart',
    });
  }

  if (items.length === 0) {
    return (
      <div className="shell py-16 flex flex-col items-center gap-4 text-center">
        <ShoppingCart className="w-12 h-12 text-disabled" />
        <h1 className="text-subhead font-semibold">{t.cartEmpty}</h1>
        <LocaleLink to="/katalog" className="press inline-flex h-[52px] items-center justify-center rounded-full bg-accent px-7 font-semibold text-bg">
          {t.cartContinue}
        </LocaleLink>
      </div>
    );
  }

  return (
    <div className="shell py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-heading md:text-title font-semibold">{t.cartTitle}</h1>
        <span className="text-label text-muted-2">{count} {t.cartItemsCount}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={`${it.productId}-${it.variantId ?? ''}`} className=" rounded-lg bg-surface border border-divider p-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="rounded-sm w-16 h-16 bg-bg flex items-center justify-center overflow-hidden shrink-0">
                {it.image ? <img src={it.image} alt="" className="w-full h-full object-contain p-1.5" /> : null}
              </div>
              <div className="min-w-[45%] flex-1">
                <div className="font-semibold text-para line-clamp-2">{it.name}</div>
                {it.variantLabel && <div className="text-label text-muted">{it.variantLabel}</div>}
                <div className="text-label text-muted mt-0.5 tabular-nums">{formatUzs(it.priceUzs * it.qty, t.sum)}</div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty - 1)} aria-label={t.qtyDecrease} className="press w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-accent"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-7 text-center text-label font-semibold tabular-nums">{it.qty}</span>
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty + 1)} aria-label={t.qtyIncrease} className="press w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-accent"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(it.productId, it.variantId)} aria-label={t.cartRemoveItem} className="press shrink-0 p-2 -mr-1 text-muted-2 hover:text-sale"><Trash2 className="w-4.5 h-4.5" /></button>
              </div>
            </div>
          ))}
          <button onClick={clear} className="press self-start text-label text-muted hover:text-sale font-semibold mt-1">
            {t.cartClear}
          </button>
        </div>

        <div className=" rounded-xl bg-surface border border-line-3 p-5 lg:sticky lg:top-24">
          {showInstallment && (
            <>
              <div className="text-label font-semibold text-muted mb-3">{t.calcTerm}</div>
              <TermSegments t={t} terms={config.terms} months={months} onChange={setMonths} className="mb-5" />
            </>
          )}
          <div className="space-y-2 text-label">
            <div className="flex justify-between"><span className="text-muted">{t.cartTotalCash}</span><span className="font-medium tabular-nums">{formatUzs(sum, t.sum)}</span></div>
            {showInstallment && (
              <div className="flex justify-between"><span className="text-muted">{t.calcDownPayment}</span><span className="font-medium tabular-nums">{formatUzs(result.downPaymentUzs, t.sum)}</span></div>
            )}
          </div>
          {showInstallment && (
            <div className="mt-4 pt-4 border-t border-divider">
              <div className="text-label text-muted">{t.cartMonthlyTotal}</div>
              <div className="text-subhead font-semibold text-accent leading-none mt-1 tabular-nums">
                {formatUzs(result.monthly, t.sum)} <span className="text-label text-muted-2 font-normal">× {months} {t.calcMonths}</span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2.5 mt-5">
            {showInstallment && (
              <button onClick={() => openOrder('installment')} className="press h-[52px] bg-accent text-bg font-semibold rounded-full hover:bg-accent-hover">
                {t.orderBuyInstallment}
              </button>
            )}
            {site.paymentMode !== 'installment' && (
              <button onClick={() => openOrder('cash')} className="press h-[52px] bg-cta text-white font-semibold rounded-full hover:bg-cta-hover">
                {t.orderBuyCash}
              </button>
            )}
          </div>
        </div>
      </div>

      {draft && <OrderForm t={t} draft={draft} onClose={() => setDraft(null)} onDone={clear} />}
    </div>
  );
};

export default CartPage;
