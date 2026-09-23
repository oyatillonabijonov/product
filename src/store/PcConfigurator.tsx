import { useState, type FC } from 'react';
import { Link, useNavigate } from 'react-router';
import { Cpu, CircuitBoard, MemoryStick, MonitorPlay, HardDrive, Zap, Box, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Translation } from '../locales';
import { localizedPath, type Locale } from '../../app/lib/i18n';
import {
  PC_SLOTS, REQUIRED_SLOTS, candidateState, hasMatch, issueFor, needsVerify, summaryIssues,
  type ConfigPart, type Issue, type Picked, type SlotKey,
} from '../../shared/pc-compat';
import { useCart } from './CartContext';
import { useCurrency } from './CurrencyContext';
import { SECTION_HEADING, BTN_LG, LINK_MORE } from './ui';

const SLOT_UI: Record<SlotKey, { icon: LucideIcon; label: (t: Translation) => string }> = {
  cpu: { icon: Cpu, label: (t) => t.cfgCpu },
  mb: { icon: CircuitBoard, label: (t) => t.cfgMb },
  ram: { icon: MemoryStick, label: (t) => t.cfgRam },
  gpu: { icon: MonitorPlay, label: (t) => t.cfgGpu },
  psu: { icon: Zap, label: (t) => t.cfgPsu },
  ssd: { icon: HardDrive, label: (t) => t.cfgSsd },
  case: { icon: Box, label: (t) => t.cfgCase },
};

/** Qadam o'qining chuqurligi, px. */
const ARROW = 12;

/**
 * Qadam shakli: o'ng cheti o'q, chap cheti o'yiq (oldingisining o'qi shunga kiradi).
 * Birinchisining chapi va oxirgisining o'ngi to'g'ri — ular `rounded-*-full` bilan yumaloqlanadi.
 */
const chevron = (first: boolean, last: boolean): string => {
  const right = last ? ['100% 0', '100% 100%'] : [`calc(100% - ${ARROW}px) 0`, '100% 50%', `calc(100% - ${ARROW}px) 100%`];
  const left = first ? [] : [`${ARROW}px 50%`];
  return `polygon(0 0, ${right.join(', ')}, 0 100%${left.length ? `, ${left.join(', ')}` : ''})`;
};

const reason = (t: Translation, i: Issue): string =>
  (i.code === 'socket' ? t.cfgNeedSocket : i.code === 'memory' ? t.cfgNeedMemory : t.cfgNeedPower).replace('{need}', i.need);

/**
 * Kompyuter konfiguratori — hamma Billz PC qismlari: omborda va "Buyurtma asosida" (qoldiq 0, narx taxminiy).
 * Moslik (soket, DDR, blok quvvati) `shared/pc-compat.ts`da; mos kelmaydigan nomzod yashirilmaydi —
 * kulrang va sababi bilan. Tanlov o'zgarib boshqa bo'g'indagi tanlov mos kelmay qolsa, u olib tashlanadi.
 * Yig'ma savatga tushadi (buyurtma asosidagisi `variantLabel` bilan — savat va Telegram'da ko'rinadi).
 */
const PcConfigurator: FC<{ t: Translation; locale: Locale; parts: Partial<Record<SlotKey, ConfigPart[]>> }> = ({ t, locale, parts }) => {
  const slots = PC_SLOTS.map((s) => s.key).filter((k) => (parts[k]?.length ?? 0) > 0);
  const [activeRaw, setActive] = useState(slots[0] ?? 'cpu');
  const [pickedRaw, setPicked] = useState({});
  const [removedRaw, setRemoved] = useState([]);
  const [stockOnlyRaw, setStockOnly] = useState(false);
  const stockOnly = stockOnlyRaw as boolean;
  const picked = pickedRaw as Partial<Record<SlotKey, ConfigPart>>;
  const removed = removedRaw as SlotKey[];
  const cart = useCart();
  const navigate = useNavigate();
  const { price } = useCurrency();

  if (!REQUIRED_SLOTS.every((k) => slots.includes(k))) return null;
  const active = (slots.includes(activeRaw as SlotKey) ? activeRaw : slots[0]) as SlotKey;
  const attrsOf = (p: Partial<Record<SlotKey, ConfigPart>>): Picked =>
    Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v?.attrs])) as Picked;
  const pickedAttrs = attrsOf(picked);
  const issues = summaryIssues(pickedAttrs);
  const blocked = issues.some((i) => i.level === 'block');
  const complete = REQUIRED_SLOTS.every((k) => picked[k]) && !blocked;
  const total = slots.reduce((sum, k) => sum + (picked[k]?.priceUzs ?? 0), 0);
  const anyOnOrder = slots.some((k) => picked[k] && !picked[k]?.inStock);
  const boards = (parts.mb ?? []).map((b) => b.attrs);

  const choose = (part: ConfigPart) => {
    const next: Partial<Record<SlotKey, ConfigPart>> = { ...picked, [active]: part };
    // Yangi tanlovga endi mos kelmay qolgan boshqa bo'g'inlar olib tashlanadi.
    const dropped: SlotKey[] = [];
    for (const k of slots) {
      const cur = next[k];
      if (k === active || !cur) continue;
      const i = issueFor(k, cur.attrs, attrsOf(next));
      if (i?.level === 'block') { delete next[k]; dropped.push(k); }
    }
    setPicked(next);
    setRemoved(dropped);
    const following = slots.find((k) => k !== active && !next[k]);
    if (following) setActive(following);
  };

  const unpick = (k: SlotKey) => {
    const next = { ...picked };
    delete next[k];
    setPicked(next);
    setRemoved([]);
  };

  const order = () => {
    for (const k of slots) {
      const p = picked[k];
      if (p) cart.add({ productId: p.id, name: p.name, image: p.image, priceUzs: p.priceUzs, variantId: null, variantLabel: p.inStock ? '' : t.cfgOnOrder, qty: 1 });
    }
    navigate(localizedPath(locale, '/savat'));
  };

  const Icon = SLOT_UI[active].icon;
  return (
    <section id="konfigurator" className="flex scroll-mt-28 flex-col gap-8 md:gap-10">
      <div className="max-w-[680px]">
        <h2 className={SECTION_HEADING}>{t.cfgTitle}</h2>
        <p className="mt-4 text-para text-muted text-pretty md:text-copy">{t.cfgLede}</p>
      </div>

      {/* Bo'g'inlar — o'q shaklidagi qadamlar (mijozning talabi: "keyingi bo'limga o'tgandek"):
          har birining o'ng cheti keyingisining o'yig'iga kirib turadi, oralig'i 5px. Chegara
          `clip-path` bilan chiziladi — tugmaning o'zi chegara rangida kesiladi, ichidagi qatlam
          1.5px ichkarida sahifa rangida, shuning uchun diagonal chetlarda ham chiziq ko'rinadi
          (oddiy `border` kesilgan shakl bo'ylab yurmaydi). Tugma ham kesilgani uchun bosish
          maydoni shaklga mos: qo'shni qadamning o'q uchi bosilganda aynan o'sha qadam ochiladi. */}
      <div className="-mx-4 flex overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slots.map((k, i) => {
          const S = SLOT_UI[k];
          const on = k === active;
          const first = i === 0;
          const last = i === slots.length - 1;
          const shape = chevron(first, last);
          const filled = on || !!picked[k];
          const round = `${first ? 'rounded-l-full' : ''} ${last ? 'rounded-r-full' : ''}`;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActive(k)}
              aria-pressed={on}
              style={{ clipPath: shape }}
              className={`press group/tab relative inline-flex h-11 shrink-0 items-center gap-2 text-copy outline-none ${round} ${
                first ? 'pl-5' : '-ml-[7px] pl-8'
              } ${last ? 'pr-5' : 'pr-8'} ${
                on ? 'bg-cta text-primary' : 'bg-line text-muted hover:bg-muted-3 focus-visible:bg-cta'
              }`}
            >
              {/* Ichki qatlam — sahifa rangida, hover'da `fill-2`. Uning ichida to'ldirma: ochiq va bajarilgan
                  tablarda to'la, yangi to'lganda chapdan o'ngga sirg'alib kiradi (loading kabi) — qism
                  tanlanganda keyingi tab ochiladi va progress unga "oqib" o'tadi. Bajarilgan tab to'la
                  qoladi, shuning uchun ochiqdan bajarilganga o'tishda miltillash yo'q. `press` faqat
                  tugmaning o'zini o'tkazadi, bu qatlamlarga vaqt alohida beriladi; harakat kamaytirilganda
                  sirg'alish o'rniga shaffoflik o'zgaradi (transform harakati vestibulyar). Tailwind v4
                  `scale-x-*` ni `transform` emas, alohida `scale` xususiyati bilan beradi — shuning uchun
                  `transition-[scale,…]`; `transform` yozilsa to'ldirma animatsiyasiz sakraydi. */}
              <span
                aria-hidden
                style={{ clipPath: shape }}
                className={`absolute inset-[1.5px] overflow-hidden bg-bg transition-colors duration-160 ease-apple ${round} ${filled ? '' : 'group-hover/tab:bg-fill-2'}`}
              >
                <span
                  className={`absolute inset-0 origin-left bg-fill-2 transition-[scale,opacity] duration-500 ease-apple ${
                    filled ? 'scale-x-100' : 'scale-x-0 motion-reduce:scale-x-100 motion-reduce:opacity-0'
                  }`}
                />
              </span>
              <S.icon aria-hidden className="relative h-[18px] w-[18px]" strokeWidth={1.6} />
              <span className="relative">{S.label(t)}</span>
              {picked[k] && <Check aria-hidden className="relative h-4 w-4 text-verified" strokeWidth={2.4} />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-xl bg-surface p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
            <h3 className="text-lede font-semibold">{SLOT_UI[active].label(t)}</h3>
            {/* Barcha pozitsiyalar ↔ faqat omborda — tanlangan yon qalin matn bilan ajraladi. */}
            <div className="flex items-center gap-2.5 text-label">
              <span className={stockOnly ? 'text-muted-2' : 'text-primary'}>{t.cfgAllItems}</span>
              <button
                type="button"
                role="switch"
                aria-checked={stockOnly}
                aria-label={t.cfgStockOnly}
                onClick={() => setStockOnly(!stockOnly)}
                className={`press relative h-7 w-12 shrink-0 rounded-full ${stockOnly ? 'bg-cta' : 'bg-fill-2'}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-[left] duration-200 ${stockOnly ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
              <span className={stockOnly ? 'text-primary' : 'text-muted-2'}>{t.cfgStockOnly}</span>
            </div>
          </div>
          {removed.length > 0 && (
            <p className="mt-3 px-1 text-label text-new">
              {t.cfgRemoved.replace('{slots}', removed.map((k) => SLOT_UI[k].label(t)).join(', '))}
            </p>
          )}
          <ul className="mt-4 flex max-h-[560px] flex-col gap-2 overflow-y-auto">
            {(parts[active] ?? []).filter((part) => !stockOnly || part.inStock).map((part) => {
              const on = picked[active]?.id === part.id;
              const state = candidateState(active, part.attrs, pickedAttrs);
              const disabled = !!state.block;
              const noBoard = active === 'cpu' && !hasMatch(part.attrs, boards);
              const dropsNote = state.drops.length > 0
                ? t.cfgWillDrop.replace('{slots}', state.drops.map((k) => SLOT_UI[k].label(t)).join(', '))
                : '';
              const note = state.block
                ? reason(t, state.block)
                : dropsNote
                  ? dropsNote
                  : state.warn
                    ? reason(t, state.warn)
                    : noBoard
                      ? t.cfgNoBoard
                      : needsVerify(active, part.attrs) ? t.cfgVerify : '';
              const attention = !state.block && (dropsNote !== '' || !!state.warn);
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onClick={() => choose(part)}
                    disabled={disabled}
                    aria-pressed={on}
                    className={`press flex w-full items-center gap-4 rounded-sm border-[1.5px] p-3 text-left ${
                      on ? 'border-cta' : 'border-transparent bg-bg hover:border-muted-3'
                    } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent`}
                  >
                    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xs border border-line bg-white">
                      {part.image
                        ? <img src={part.image} alt="" loading="lazy" className="h-full w-full object-contain" />
                        : <Icon aria-hidden className="h-6 w-6 text-muted-3" strokeWidth={1.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-para font-medium text-primary">{part.name}</span>
                      <span className={`block text-label ${part.inStock ? 'text-verified' : 'text-muted-2'}`}>
                        {part.inStock ? t.cfgInStock : t.cfgOnOrder}
                      </span>
                      {note && (
                        <span className={`block text-label ${attention ? 'text-new' : 'text-muted-2'}`}>{note}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-para font-semibold tabular-nums text-primary">
                      {price(part.priceUzs)}
                      {!part.inStock && <span className="block text-label font-normal text-muted-2">{t.cfgApprox}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Link to={`${localizedPath(locale, '/')}#konsultatsiya`} className={`${LINK_MORE} mt-4 px-1`}>
            {t.cfgMissing} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Yig'ma */}
        <div className="flex h-fit flex-col rounded-xl bg-surface p-6 lg:sticky lg:top-24">
          <h3 className="text-lede font-semibold">{t.cfgSummary}</h3>
          <dl className="mt-5 flex flex-col divide-y divide-divider">
            {slots.map((k) => {
              const p = picked[k];
              return (
                <div key={k} className="flex flex-col gap-1 py-3 first:pt-0">
                  <dt className="text-label text-muted-2">{SLOT_UI[k].label(t)}</dt>
                  <dd className="flex items-baseline justify-between gap-3 text-para">
                    <span className={p ? 'font-medium' : 'text-disabled-2'}>{p?.name ?? t.cfgNotChosen}</span>
                    {p && (
                      <span className="flex shrink-0 items-baseline gap-2">
                        <span className="tabular-nums text-muted">{price(p.priceUzs)}</span>
                        <button type="button" onClick={() => unpick(k)} className="press text-label text-link hover:underline">{t.cfgClear}</button>
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4">
            {issues.length === 0 && REQUIRED_SLOTS.every((k) => picked[k]) && (
              <p className="flex items-center gap-1.5 text-label font-medium text-verified"><Check className="h-4 w-4" strokeWidth={2.4} /> {t.cfgAllOk}</p>
            )}
            {issues.map((i) => (
              <p key={i.slot + i.code} className="flex items-center gap-1.5 text-label text-primary">
                <AlertTriangle className={`h-4 w-4 shrink-0 ${i.level === 'block' ? 'text-sale' : 'text-new'}`} /> {SLOT_UI[i.slot].label(t)}: {reason(t, i)}
              </p>
            ))}
            {anyOnOrder && <p className="text-label text-muted-2">{t.cfgOnOrderNote}</p>}
          </div>

          <div className="mt-4 flex items-baseline justify-between gap-3">
            <span className="text-para text-muted">{t.cfgTotal}</span>
            <span className="text-subhead font-semibold tabular-nums">{price(total)}</span>
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
