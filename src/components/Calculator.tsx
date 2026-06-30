import { motion } from 'motion/react';
import { Calculator as CalcIcon } from 'lucide-react';
import type { Translation } from '../locales';
import { products, installmentConfig } from '../data/products';
import { calcInstallment, formatUzs } from '../lib/installment';

export default function Calculator({
  t,
  productId,
  months,
  setProductId,
  setMonths,
  onApply,
}: {
  t: Translation;
  productId: string;
  months: number;
  setProductId: (id: string) => void;
  setMonths: (m: number) => void;
  onApply: () => void;
}) {
  const product = products.find((p) => p.id === productId) ?? products[0];
  const term =
    installmentConfig.terms.find((x) => x.months === months) ??
    installmentConfig.terms[installmentConfig.terms.length - 1];
  const result = calcInstallment(product, term, installmentConfig);

  return (
    <section id="calculator" className="w-full max-w-[920px] mx-auto px-4 md:px-0 pb-12 md:pb-20 pt-8 md:pt-10">
      <h2 className="text-[32px] md:text-[40px] font-semibold tracking-[-0.015em] text-center mb-2">
        {t.calcTitle}
      </h2>
      <p className="text-[17px] text-[#6E6E73] text-center mb-8 md:mb-10">{t.calcSubtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Controls */}
        <div className="bg-[#F5F5F7] rounded-[30px] p-6 md:p-8 flex flex-col gap-6">
          <div>
            <label htmlFor="calc-product" className="block text-[13px] font-semibold text-[#6E6E73] mb-2">
              {t.calcProduct}
            </label>
            <select
              id="calc-product"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-white border border-[#D2D2D7] rounded-2xl px-4 py-3 text-[15px] font-medium text-[#1D1D1F] focus:outline-none focus:border-[#0071E3] transition-colors"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[13px] font-semibold text-[#6E6E73] mb-2">{t.calcTerm}</span>
            <div className="grid grid-cols-4 gap-2">
              {installmentConfig.terms.map((x) => (
                <button
                  key={x.months}
                  onClick={() => setMonths(x.months)}
                  className={`py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
                    x.months === months
                      ? 'bg-[#0071E3] text-white'
                      : 'bg-white text-[#1D1D1F] border border-[#D2D2D7] hover:border-[#0071E3]'
                  }`}
                >
                  {x.months} {t.calcMonths}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <motion.div
          key={`${productId}-${months}`}
          initial={{ opacity: 0.6, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-[#1D1D1F] text-white rounded-[30px] p-6 md:p-8 flex flex-col justify-between shadow-[--shadow-apple]"
        >
          <div>
            <div className="flex items-center gap-2 text-white/60 text-[13px] mb-1">
              <CalcIcon className="w-4 h-4" /> {t.calcMonthly}
            </div>
            <div className="text-[34px] md:text-[40px] font-semibold tracking-[-0.02em] mb-6">
              {formatUzs(result.monthly)}
            </div>
            <div className="flex justify-between py-3 border-t border-white/10 text-[15px]">
              <span className="text-white/60">{t.calcDownPayment}</span>
              <span className="font-semibold">{formatUzs(result.downPaymentUzs)}</span>
            </div>
            <div className="flex justify-between py-3 border-t border-white/10 text-[15px]">
              <span className="text-white/60">{t.calcTotal}</span>
              <span className="font-semibold">{formatUzs(result.total)}</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={onApply}
              className="w-full py-3.5 bg-[#0071E3] text-white text-[16px] font-semibold rounded-full hover:bg-[#0077ED] transition-colors"
            >
              {t.calcApply}
            </button>
            <p className="text-[11px] text-white/40 mt-3">{t.calcNote}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
