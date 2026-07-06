import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Send, Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import type { Translation } from '../locales';
import type { InstallmentConfig } from '../data/products';
import type { ApiSiteConfig } from '../../shared/types';
import { cartSum, cartInstallment, composeCartLeadMessage } from '../lib/cart';
import { formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import { useCart } from './CartContext';
import LocaleLink from './LocaleLink';
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

  function order(channel: 'telegram' | 'whatsapp') {
    if (items.length === 0) return;
    const msg = composeCartLeadMessage({
      items, months,
      monthly: formatUzs(result.monthly, t.sum),
      downPayment: formatUzs(result.downPaymentUzs, t.sum),
      totalCash: formatUzs(sum, t.sum),
      brand: site.name,
      sum: t.sum,
    });
    const url = channel === 'telegram' ? telegramShareUrl(msg, site.telegram) : whatsappUrl(msg, site.whatsapp);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <ShoppingCart className="w-12 h-12 text-disabled" />
        <h1 className="text-[24px] font-semibold">{t.cartEmpty}</h1>
        <LocaleLink to="/katalog" className="px-6 py-3 bg-accent text-white font-semibold rounded-full">
          {t.cartContinue}
        </LocaleLink>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{t.cartTitle}</h1>
        <span className="text-[14px] text-muted-2">{count} {t.cartItemsCount}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={`${it.productId}-${it.variantId ?? ''}`} className="bg-white border border-divider rounded-2xl p-4 flex items-center gap-4 shadow-apple">
              <div className="w-16 h-16 rounded-xl bg-bg flex items-center justify-center overflow-hidden shrink-0">
                {it.image ? <img src={it.image} alt="" className="w-full h-full object-contain p-1.5" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] line-clamp-2">{it.name}</div>
                {it.variantLabel && <div className="text-[12px] text-muted">{it.variantLabel}</div>}
                <div className="text-[13px] text-muted mt-0.5 tabular-nums">{formatUzs(it.priceUzs * it.qty, t.sum)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty - 1)} aria-label={t.qtyDecrease} className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-accent"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-7 text-center text-[14px] font-semibold tabular-nums">{it.qty}</span>
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty + 1)} aria-label={t.qtyIncrease} className="w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-accent"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={() => remove(it.productId, it.variantId)} aria-label={t.cartRemoveItem} className="shrink-0 p-2 -mr-1 text-muted-2 hover:text-sale transition-colors"><Trash2 className="w-4.5 h-4.5" /></button>
            </div>
          ))}
          <button onClick={clear} className="self-start text-[13px] text-muted hover:text-sale font-semibold mt-1">
            {t.cartClear}
          </button>
        </div>

        <div className="bg-white border border-line-3 rounded-[24px] p-5 shadow-apple lg:sticky lg:top-24">
          {showInstallment && (
            <>
              <div className="text-[13px] font-semibold text-muted mb-3">{t.calcTerm}</div>
              <TermSegments t={t} terms={config.terms} months={months} onChange={setMonths} className="mb-5" />
            </>
          )}
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-muted">{t.cartTotalCash}</span><span className="font-medium tabular-nums">{formatUzs(sum, t.sum)}</span></div>
            {showInstallment && (
              <div className="flex justify-between"><span className="text-muted">{t.calcDownPayment}</span><span className="font-medium tabular-nums">{formatUzs(result.downPaymentUzs, t.sum)}</span></div>
            )}
          </div>
          {showInstallment && (
            <div className="mt-4 pt-4 border-t border-divider">
              <div className="text-[13px] text-muted">{t.cartMonthlyTotal}</div>
              <div className="text-[28px] font-semibold text-accent tracking-[-0.02em] leading-none mt-1 tabular-nums">
                {formatUzs(result.monthly, t.sum)} <span className="text-[13px] text-muted-2 font-normal">× {months} {t.calcMonths}</span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-2.5 mt-5">
            <button onClick={() => order('telegram')} className="py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover transition-colors flex items-center justify-center gap-2">
              <Send className="w-4.5 h-4.5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} className="py-3 bg-primary text-white font-semibold rounded-full hover:bg-[#25D366] transition-colors">
              {t.formSendWhatsapp}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
