import { useState, type FC } from 'react';
import { Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';
import { formatUzs } from '../lib/installment';
import { SECTION_HEADING, BTN_LG } from './ui';

interface Part { id: string; name: string; brand: string; priceUzs: number }
interface Slot { key: string; icon: LucideIcon; label: (t: Translation) => string; parts: Part[] }

// ponytail: qismlar ro'yxati kodda qotirilgan — hozircha faqat UI. Katalogga
// ulash kerak bo'lsa: `parts` o'rniga loader'dan kelgan mahsulotlar (kategoriya
// bo'yicha filtr) + moslik tekshiruvi (soket/chipset) qo'shiladi.
const SLOTS: Slot[] = [
  {
    key: 'cpu', icon: Cpu, label: (t) => t.cfgCpu,
    parts: [
      { id: 'r7-7700x', name: 'AMD Ryzen 7 7700X', brand: 'AMD', priceUzs: 2_541_000 },
      { id: 'r7-9800x3d', name: 'AMD Ryzen 7 9800X3D', brand: 'AMD', priceUzs: 4_658_500 },
      { id: 'i5-14600kf', name: 'Intel Core i5-14600KF', brand: 'Intel', priceUzs: 2_783_000 },
      { id: 'u7-270k', name: 'Intel Core Ultra 7 270K', brand: 'Intel', priceUzs: 3_751_000 },
    ],
  },
  {
    key: 'mb', icon: CircuitBoard, label: (t) => t.cfgMb,
    parts: [
      { id: 'b650m', name: 'MSI PRO B650M-A WiFi', brand: 'MSI', priceUzs: 2_100_000 },
      { id: 'x670e', name: 'ASUS ROG STRIX X670E-F', brand: 'ASUS', priceUzs: 5_450_000 },
      { id: 'b760', name: 'Gigabyte B760 AORUS Elite', brand: 'Gigabyte', priceUzs: 2_380_000 },
      { id: 'z790', name: 'ASUS TUF Gaming Z790-Plus', brand: 'ASUS', priceUzs: 4_120_000 },
    ],
  },
  {
    key: 'ram', icon: MemoryStick, label: (t) => t.cfgRam,
    parts: [
      { id: 'ddr5-32', name: 'Kingston Fury Beast 32GB DDR5 6000', brand: 'Kingston', priceUzs: 1_650_000 },
      { id: 'ddr5-64', name: 'Corsair Vengeance 64GB DDR5 6000', brand: 'Corsair', priceUzs: 3_290_000 },
      { id: 'ddr5-16', name: 'G.Skill Trident Z5 16GB DDR5 6400', brand: 'G.Skill', priceUzs: 980_000 },
    ],
  },
  {
    key: 'gpu', icon: MonitorPlay, label: (t) => t.cfgGpu,
    parts: [
      { id: 'rtx5070', name: 'NVIDIA GeForce RTX 5070 12GB', brand: 'NVIDIA', priceUzs: 8_900_000 },
      { id: 'rtx5080', name: 'NVIDIA GeForce RTX 5080 16GB', brand: 'NVIDIA', priceUzs: 16_400_000 },
      { id: 'rx9070', name: 'AMD Radeon RX 9070 XT 16GB', brand: 'AMD', priceUzs: 10_250_000 },
      { id: 'rtx4060', name: 'NVIDIA GeForce RTX 4060 8GB', brand: 'NVIDIA', priceUzs: 4_450_000 },
    ],
  },
  {
    key: 'ssd', icon: HardDrive, label: (t) => t.cfgSsd,
    parts: [
      { id: 'sn850-1', name: 'WD Black SN850X 1TB NVMe', brand: 'WD', priceUzs: 1_390_000 },
      { id: '990-2', name: 'Samsung 990 PRO 2TB NVMe', brand: 'Samsung', priceUzs: 2_780_000 },
      { id: 'p3-1', name: 'Crucial P3 Plus 1TB NVMe', brand: 'Crucial', priceUzs: 890_000 },
    ],
  },
];

/**
 * Kompyuter konfiguratori — foydalanuvchi 5 ta bo'g'inni tanlaydi, o'ng ustunda
 * yig'ma va jami narx yig'ilib boradi. Landing va PC kategoriyasi oxirida turadi.
 */
const PcConfigurator: FC<{ t: Translation }> = ({ t }) => {
  const [active, setActive] = useState(SLOTS[0].key);
  // @types/react yo'q — useState generigi yo'qoladi, shuning uchun tur cast bilan qaytariladi.
  const [pickedRaw, setPicked] = useState({});
  const picked = pickedRaw as Record<string, Part>;

  const slot = SLOTS.find((s) => s.key === active) ?? SLOTS[0];
  const total = Object.values(picked).reduce((sum, p) => sum + p.priceUzs, 0);
  const complete = SLOTS.every((s) => picked[s.key]);

  const choose = (part: Part) => {
    setPicked((prev) => ({ ...prev, [slot.key]: part }));
    const next = SLOTS.find((s) => s.key !== slot.key && !picked[s.key]);
    if (next) setActive(next.key);
  };

  return (
    <section className="flex flex-col gap-8 md:gap-10">
      <div className="max-w-[680px]">
        <h2 className={SECTION_HEADING}>{t.cfgTitle}</h2>
        <p className="mt-4 text-[15px] leading-[1.55] text-muted text-pretty md:text-[17px]">{t.cfgLede}</p>
      </div>

      {/* Bo'g'in tanlagichlari — gorizontal scroll (mobil), tanlangani belgili */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SLOTS.map((s) => {
          const on = s.key === active;
          const done = !!picked[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              aria-pressed={on}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-[15px] font-medium transition-colors ${
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
        <div className="rounded-[24px] border border-line-2 bg-surface p-4 md:p-6">
          <h3 className="px-1 text-[20px] font-semibold tracking-[-0.02em]">{slot.label(t)}</h3>
          <ul className="mt-4 flex flex-col gap-2">
            {slot.parts.map((part) => {
              const on = picked[slot.key]?.id === part.id;
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => choose(part)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                      on ? 'border-accent bg-accent-soft' : 'border-line-2 hover:border-line'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium">{part.name}</span>
                      <span className="mt-1 block text-[14px] text-muted-2">{part.brand}</span>
                      <span className="sr-only">{on ? t.cfgSelected : t.cfgSelect}</span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {formatUzs(part.priceUzs, t.sum)}
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
        <div className="flex h-fit flex-col rounded-[24px] border border-line-2 bg-surface p-6 lg:sticky lg:top-24">
          <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{t.cfgSummary}</h3>
          <dl className="mt-5 flex flex-col divide-y divide-divider">
            {SLOTS.map((s) => (
              <div key={s.key} className="flex flex-col gap-1 py-3 first:pt-0">
                <dt className="text-[14px] text-muted-2">{s.label(t)}</dt>
                <dd className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className={picked[s.key] ? 'font-medium' : 'text-disabled-2'}>
                    {picked[s.key]?.name ?? t.cfgNotChosen}
                  </span>
                  {picked[s.key] && (
                    <span className="shrink-0 tabular-nums text-muted">
                      {formatUzs(picked[s.key].priceUzs, t.sum)}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-4">
            <span className="text-[15px] text-muted">{t.cfgTotal}</span>
            <span className="text-[24px] font-semibold tabular-nums tracking-[-0.02em]">
              {formatUzs(total, t.sum)}
            </span>
          </div>

          {/* ponytail: tugma hali hech qayerga bormaydi — buyurtma oqimi (OrderForm) keyingi bosqichda ulanadi. */}
          <button
            type="button"
            disabled={!complete}
            className={`${BTN_LG} mt-5 w-full bg-cta text-white hover:bg-cta-hover disabled:cursor-not-allowed disabled:bg-fill-2 disabled:text-disabled`}
          >
            {t.cfgCta}
          </button>
          {!complete && <p className="mt-3 text-center text-[14px] text-muted-2">{t.cfgHint}</p>}
        </div>
      </div>
    </section>
  );
};

export default PcConfigurator;
