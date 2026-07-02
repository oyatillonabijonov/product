import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Send, ShieldCheck, BadgeCheck, ChevronRight } from 'lucide-react';
import type { InstallmentConfig } from '../data/products';
import { fetchProductDetail, fetchStore, type ProductDetail } from '../api/store';
import { calcInstallment, composeLeadMessage, discountPercent, formatUzs, telegramShareUrl, whatsappUrl } from '../lib/installment';
import type { StoreContext } from './StoreLayout';
import Gallery from './Gallery';

export default function ProductPage() {
  const { t } = useOutletContext<StoreContext>();
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [config, setConfig] = useState<InstallmentConfig | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    if (!id) return;
    setProduct(null);
    fetchProductDetail(id).then(setProduct);
    fetchStore().then((s) => setConfig(s.config));
  }, [id]);

  const result = useMemo(() => {
    if (!product || !config) return null;
    const term = config.terms.find((x) => x.months === months) ?? config.terms[config.terms.length - 1];
    return calcInstallment(product, term, config);
  }, [product, config, months]);

  if (product === null) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="skeleton aspect-square rounded-[22px]" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-5 w-24 rounded-full" />
            <div className="skeleton h-9 w-3/4 rounded-lg" />
            <div className="skeleton h-6 w-1/3 rounded-md" />
            <div className="skeleton h-40 w-full rounded-[22px] mt-2" />
            <div className="skeleton h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const disc = discountPercent(product.cashPriceUzs, product.oldPriceUzs);

  function order(channel: 'telegram' | 'whatsapp') {
    if (!product || !result) return;
    const msg = composeLeadMessage({ name: '', phone: '', product: product.name, months, monthly: formatUzs(result.monthly) });
    const url = channel === 'telegram' ? telegramShareUrl(msg) : whatsappUrl(msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 md:py-10">
      <nav className="flex items-center gap-1 text-[13px] text-[#86868B] mb-5">
        <Link to="/" className="hover:text-[#1D1D1F] transition-colors">{t.navCatalog}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-[#1D1D1F] truncate max-w-[220px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <Gallery images={product.images} name={product.name} />
        <div>
          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full ${product.condition === 'yangi' ? 'bg-[#EAF3FF] text-[#0071E3]' : 'bg-[#E8F5E9] text-[#1B7A34]'}`}>
            {product.condition === 'yangi' ? t.badgeNew : t.badgeUsed}
          </span>
          <h1 className="text-[26px] md:text-[36px] font-semibold tracking-[-0.02em] mt-3 mb-2 leading-[1.08]">{product.name}</h1>
          {product.conditionNote && <p className="text-[14px] text-[#6E6E73] mb-3">{product.conditionNote}</p>}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {product.oldPriceUzs && disc !== null && (
              <>
                <span className="text-[16px] line-through text-[#B0B0B5]">{formatUzs(product.oldPriceUzs)}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#E8462D] text-white">-{disc}%</span>
              </>
            )}
            <span className="text-[24px] font-semibold">{formatUzs(product.cashPriceUzs)}</span>
          </div>

          {config && result && (
            <div className="bg-[#F5F5F7] border border-[#ECECEF] rounded-[22px] p-5 mb-4">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {config.terms.map((x) => (
                  <button
                    key={x.months}
                    onClick={() => setMonths(x.months)}
                    className={`py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                      x.months === months ? 'bg-[#0071E3] text-white shadow-[0_8px_18px_-10px_rgba(0,113,227,0.7)]' : 'bg-white border border-[#D2D2D7] hover:border-[#0071E3]'
                    }`}
                  >
                    {x.months} {t.calcMonths}
                  </button>
                ))}
              </div>
              <div className="text-[13px] text-[#6E6E73]">{t.calcMonthly}</div>
              <div className="text-[30px] font-semibold text-[#0071E3] tracking-[-0.01em]">{formatUzs(result.monthly)}</div>
              <div className="flex justify-between text-[13px] text-[#6E6E73] mt-3 pt-3 border-t border-[#E5E5EA]">
                <span>{t.calcDownPayment}</span><span className="font-medium text-[#1D1D1F]">{formatUzs(result.downPaymentUzs)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => order('telegram')} className="flex-1 py-3.5 bg-[#0071E3] text-white font-semibold rounded-full hover:bg-[#0077ED] transition-colors flex items-center justify-center gap-2 shadow-[0_10px_24px_-10px_rgba(0,113,227,0.7)]">
              <Send className="w-5 h-5" /> {t.formSendTelegram}
            </button>
            <button onClick={() => order('whatsapp')} className="flex-1 py-3.5 bg-[#1D1D1F] text-white font-semibold rounded-full hover:bg-[#25D366] transition-colors">
              {t.formSendWhatsapp}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[13px] text-[#6E6E73]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#1B7A34]" /> {t.heroPill.split('•')[0].trim()}</span>
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-[#0071E3]" /> {t.feature2}</span>
          </div>
        </div>
      </div>

      {product.specs.length > 0 && (
        <div className="mt-12 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.specsTitle}</h2>
          <table className="w-full text-[14px]">
            <tbody>
              {product.specs.map((s, i) => (
                <tr key={i} className="border-b border-[#F0F0F2]">
                  <td className="py-2.5 text-[#6E6E73] w-1/2">{s.label}</td>
                  <td className="py-2.5 text-[#1D1D1F] font-medium">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {product.description && (
        <div className="mt-8 max-w-2xl">
          <h2 className="text-[20px] font-semibold mb-3">{t.descTitle}</h2>
          <p className="text-[15px] text-[#3A3A3C] whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>
      )}
    </div>
  );
}
