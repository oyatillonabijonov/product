import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { Send, Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import type { Translation } from '../locales';
import type { InstallmentConfig } from '../data/products';
import { cartSum, cartInstallment, composeCartLeadMessage } from '../lib/cart';
import { formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import { useCart } from './CartContext';
import LocaleLink from './LocaleLink';

const CartPage: FC<{ t: Translation; config: InstallmentConfig }> = ({ t, config }) => {
  const { items, count, remove, changeQty, clear } = useCart();
  const [months, setMonths] = useState(12);
  const sum = cartSum(items);
  const result = useMemo(() => {
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return cartInstallment(sum, term, config);
  }, [sum, months, config]);

  function order(channel: 'telegram' | 'whatsapp') {
    if (items.length === 0) return;
    const msg = composeCartLeadMessage({
      items, months,
      monthly: formatUzs(result.monthly),
      downPayment: formatUzs(result.downPaymentUzs),
      totalCash: formatUzs(sum),
    });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (items.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-16 flex flex-col items-center gap-4 text-center">
        <ShoppingCart className="w-12 h-12 text-[#C7C7CC]" />
        <h1 className="text-[24px] font-semibold">{t.cartEmpty}</h1>
        <LocaleLink to="/katalog" className="px-6 py-3 bg-[#0071E3] text-white font-semibold rounded-full">
          {t.cartContinue}
        </LocaleLink>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="text-[24px] md:text-[32px] font-semibold tracking-[-0.02em]">{t.cartTitle}</h1>
        <span className="text-[14px] text-[#86868B]">{count} {t.cartItemsCount}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <div key={`${it.productId}-${it.variantId ?? ''}`} className="bg-white border border-[#F0F0F2] rounded-2xl p-4 flex items-center gap-4 shadow-[--shadow-apple]">
              <div className="w-16 h-16 rounded-xl bg-[#F5F5F7] flex items-center justify-center p-2 shrink-0">
                {it.image ? <img src={it.image} alt="" className="max-w-full max-h-full object-contain" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] truncate">{it.name}</div>
                {it.variantLabel && <div className="text-[12px] text-[#6E6E73]">{it.variantLabel}</div>}
                <div className="text-[13px] text-[#6E6E73] mt-0.5 tabular-nums">{formatUzs(it.priceUzs * it.qty)}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty - 1)} aria-label="-" className="w-8 h-8 rounded-full border border-[#D2D2D7] flex items-center justify-center hover:border-[#0071E3]"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-7 text-center text-[14px] font-semibold tabular-nums">{it.qty}</span>
                <button onClick={() => changeQty(it.productId, it.variantId, it.qty + 1)} aria-label="+" className="w-8 h-8 rounded-full border border-[#D2D2D7] flex items-center justify-center hover:border-[#0071E3]"><Plus className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={() => remove(it.productId, it.variantId)} aria-label={t.cartClear} className="text-[#86868B] hover:text-[#E8462D] transition-colors"><Trash2 className="w-4.5 h-4.5" /></button>
            </div>
          ))}
          <button onClick={clear} className="self-start text-[13px] text-[#6E6E73] hover:text-[#E8462D] font-semibold mt-1">
            {t.cartClear}
          </button>
        </div>

        <div className="bg-white border border-[#ECECEF] rounded-[24px] p-5 shadow-[--shadow-apple] lg:sticky lg:top-24">
          <div className="text-[13px] font-semibold text-[#6E6E73] mb-3">{t.calcTerm}</div>
          <div className="grid grid-cols-3 gap-1 bg-[#F0F0F3] rounded-full p-1 mb-5">
            {config.terms.map((x) => (
              <button key={x.months} onClick={() => setMonths(x.months)}
                className={`py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                  x.months === months ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.14)]' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}>
                {x.months} {t.calcMonths}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-[13px]">
            <div className="flex justify-between"><span className="text-[#6E6E73]">{t.cartTotalCash}</span><span className="font-medium tabular-nums">{formatUzs(sum)}</span></div>
            <div className="flex justify-between"><span className="text-[#6E6E73]">{t.calcDownPayment}</span><span className="font-medium tabular-nums">{formatUzs(result.downPaymentUzs)}</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#F0F0F2]">
            <div className="text-[13px] text-[#6E6E73]">{t.cartMonthlyTotal}</div>
            <div className="text-[28px] font-semibold text-[#0071E3] tracking-[-0.02em] leading-none mt-1 tabular-nums">
              {formatUzs(result.monthly)} <span className="text-[13px] text-[#86868B] font-normal">× {months} {t.calcMonths}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 mt-5">
            <button onClick={() => order('telegram')} className="py-3 bg-[#0071E3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2">
              <Send className="w-4.5 h-4.5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} className="py-3 bg-[#1D1D1F] text-white font-semibold rounded-full hover:bg-[#25D366] transition-colors">
              {t.formSendWhatsapp}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
