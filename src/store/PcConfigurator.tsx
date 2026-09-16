import { useState, type FC } from 'react';
import { useNavigate } from 'react-router';
import { Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';
import type { Product } from '../data/products';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import { useCart } from './CartContext';
import { useCurrency } from './CurrencyContext';
import { SECTION_HEADING, BTN_LG } from './ui';

interface Slot { key: string; type: string; icon: LucideIcon; label: (t: Translation) => string }

/** Bo'g'in → tovar turi (`product_types` jadvali, admin → Turlar, `pc` yo'nalishi). Loader shu turlardagi tovarlarni yuklaydi. */
export const PC_SLOTS: Slot[] = [
  { key: 'cpu', type: 'cpu', icon: Cpu, label: (t) => t.cfgCpu },
  { key: 'mb', type: 'motherboard', icon: CircuitBoard, label: (t) => t.cfgMb },
  { key: 'ram', type: 'ram', icon: MemoryStick, label: (t) => t.cfgRam },
  { key: 'gpu', type: 'gpu', icon: MonitorPlay, label: (t) => t.cfgGpu },
  { key: 'ssd', type: 'xotira', icon: HardDrive, label: (t) => t.cfgSsd },
];

/**
 * Kompyuter konfiguratori — bo'g'inlar katalogdagi haqiqiy tovarlar (narx va
 * qoldiq Billz'dan). Tanlangan yig'ma savatga tushadi va mijoz savat sahifasidan
 * odatdagi bir bosishli buyurtma beradi — alohida buyurtma oqimi yo'q.
 *
 * ponytail: moslik tekshiruvi (soket/chipset) yo'q — operator qo'ng'iroqda
 * tasdiqlaydi; kerak bo'lsa xususiyatlar (product_specs) bo'yicha filtr qo'shiladi.
 * Tovari yo'q bo'g'in ko'rinmaydi; ikkitadan kam bo'g'in qolsa bo'lim umuman chiqmaydi.
 */
const PcConfigurator: FC<{ t: Translation; locale: Locale; parts: Record<string, Product[]> }> = ({ t, locale, parts }) => {
  const slots = PC_SLOTS.filter((s) => (parts[s.key]?.length ?? 0) > 0);
  const [active, setActive] = useState(slots[0]?.key ?? '');
  // @types/react yo'q — useState generigi yo'qoladi, shuning uchun tur cast bilan qaytariladi.
  const [pickedRaw, setPicked] = useState({});
  const picked = pickedRaw as Record<string, Product>;
  const cart = useCart();
  const navigate = useNavigate();
  const { price } = useCurrency();

  if (slots.length < 2) return null;
  const slot = slots.find((s) => s.key === active) ?? slots[0];
  const total = slots.reduce((sum, s) => sum + (picked[s.key]?.minPriceUzs ?? 0), 0);
  const complete = slots.every((s) => picked[s.key]);

  const choose = (part: Product) => {
    setPicked((prev) => ({ ...prev, [slot.key]: part }));
    const next = slots.find((s) => s.key !== slot.key && !picked[s.key]);
    if (next) setActive(next.key);
  };

  const order = () => {
    for (const s of slots) {
      const p = picked[s.key];
      if (p) cart.add({ productId: p.id, name: p.name, image: p.image, priceUzs: p.minPriceUzs, variantId: null, variantLabel: '', qty: 1 });
    }
    navigate(localizedPath(locale, '/savat'));
  };

  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <div className="max-w-[680px]">
        <h2 className={SECTION_HEADING}>{t.cfgTitle}</h2>
        <p className="mt-4 text-para text-muted text-pretty md:text-copy">{t.cfgLede}</p>
      </div>

      {/* Bo'g'in tanlagichlari — gorizontal scroll (mobil), tanlangani belgili */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slots.map((s) => {
          const on = s.key === slot.key;
          const done = !!picked[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              aria-pressed={on}
              className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-copy font-normal ${
                on ? 'border-accent bg-accent-soft text-primary' : 'border-line-2 text-muted hover:border-line'
              }`}
            >
              <s.icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
              {s.label(t)}
              {done && <Check aria-hidden className="h-4 w-4 text-trust" strokeWidth={2.4} />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Tanlov ro'yxati */}
        <div className="rounded-xl border border-line-2 bg-surface p-4 md:p-6">
          <h3 className="px-1 text-lede font-semibold">{slot.label(t)}</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {(parts[slot.key] ?? []).map((part) => {
              const on = picked[slot.key]?.id === part.id;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => choose(part)}
                    aria-pressed={on}
                    className={`rounded-sm press flex w-full items-center gap-4 border p-3 text-left ${
                      on ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-line'
                    }`}
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xs bg-white">
                      <img src={part.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-para font-medium">{part.name}</span>
                      <span className="sr-only">{on ? t.cfgSelected : t.cfgSelect}</span>
                    </span>
                    <span className="shrink-0 text-para font-semibold tabular-nums">
                      {price(part.minPriceUzs)}
                    </span>
                    {/* Radio uslubidagi belgi — mobil kenglikda ham "bosiladi" degan ishora qoladi. */}
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                        on ? 'border-accent bg-accent text-bg' : 'border-line'
                      }`}
                    >
                      {on && <Check className="h-4 w-4" strokeWidth={2.6} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Yig'ma */}
        <div className="rounded-xl flex h-fit flex-col border border-line-2 bg-surface p-6 lg:sticky lg:top-24">
          <h3 className="text-lede font-semibold">{t.cfgSummary}</h3>
          <dl className="mt-5 flex flex-col divide-y divide-divider">
            {slots.map((s) => (
              <div key={s.key} className="flex flex-col gap-1 py-3 first:pt-0">
                <dt className="text-label text-muted-2">{s.label(t)}</dt>
                <dd className="flex items-baseline justify-between gap-3 text-para">
                  <span className={picked[s.key] ? 'font-medium' : 'text-disabled-2'}>
                    {picked[s.key]?.name ?? t.cfgNotChosen}
                  </span>
                  {picked[s.key] && (
                    <span className="shrink-0 tabular-nums text-muted">
                      {price(picked[s.key].minPriceUzs)}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-para text-muted">{t.cfgTotal}</span>
            <span className="text-subhead font-semibold tabular-nums">
              {price(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={order}
            disabled={!complete}
            className={`${BTN_LG} mt-5 w-full bg-cta text-white hover:bg-cta-hover disabled:cursor-not-allowed disabled:bg-fill-2 disabled:text-disabled`}
          >
            {t.cfgCta}
          </button>
          {!complete && <p className="mt-3 text-center text-label text-muted-2">{t.cfgHint}</p>}
        </div>
      </div>
    </section>
  );
};

export default PcConfigurator;
