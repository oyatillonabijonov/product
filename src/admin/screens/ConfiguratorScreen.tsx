import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDown, ChartBar, Check, CheckCircle, Clock, Eye, HandPointing, Info, MagicWand, PencilSimple, Plus, ShieldCheck, ShieldSlash, WarningCircle,
} from '../icons';
import type { Icon as PhIcon } from '../icons';
import type { ApiPcDimension, ApiPcPart } from '../../../shared/types';
import { PC_SLOTS } from '../../../shared/pc-compat';
import { listPcDimensions, listPcParts, setPcPartValues, updatePcDimension } from '../api';
import { errText } from '../errText';
import { acceptSuggestions, chunk, dimLabel, dimsForSlot, filterParts, isUntagged, listText, lowerFirst, needsManual, partSummary, toggleValue } from '../lib/pc-parts';
import PcDimensionModal from '../PcDimensionModal';
import PcValueChips, { SLOT_HUE, SLOT_ICON } from '../PcValueChips';
import { Badge, Button, Card, EmptyState, IconTile, SearchInput, Toggle, type Hue } from '../ui';
import { Kpi, KpiStrip } from '../ui/stats';
import { ChartLegend, SegmentBar } from '../charts';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

/** Server bitta so'rovda shuncha yozuv qabul qiladi (`parsePcPartsInput`). */
const MAX_WRITE = 500;

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Yig'iladigan bo'lim sarlavhasi — butun qator bosiladi (44px), ikonka plitkasi, o'q holatni ko'rsatadi. */
const Disclosure: FC<{ open: boolean; onToggle: () => void; title: string; hint: string; icon: PhIcon; hue: Hue }> = ({ open, onToggle, title, hint, icon, hue }) => (
  <button type="button" onClick={onToggle} aria-expanded={open} className="group flex min-h-11 w-full items-center gap-3 text-left">
    <IconTile icon={icon} hue={hue} soft />
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-md font-bold text-text">{title}</span>
      <span className="text-sm text-text-muted">{hint}</span>
    </span>
    <span className="grid size-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors duration-150 group-hover:bg-ghost-hover group-hover:text-text">
      <CaretDown aria-hidden weight="bold" className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
    </span>
  </button>
);

/**
 * Mahsulotlar → Konfigurator — egasi uchun eng sodda oqim (mantiq o'zgarmagan, faqat ko'rinish):
 * tepada raqamlar (tasdiqlangan, kutayotgan, faol tekshiruvlar, saytda ochiq bo'g'inlar);
 * 1) bitta tugma — tizim nomdan aniqlagan hamma takliflarni tasdiqlaydi (hamma bo'g'in bir yo'la);
 * bo'g'inlar bo'yicha holat chizig'i; 2) tizim aniqlay olmaganlari — kartochkalar, chip bosilsa darhol saqlanadi;
 * 3) tasdiqlanganlar — yig'ilgan, tuzatish uchun; 4) tekshiruvlar (moslik turlari) — pastda, yig'ilgan (kamdan-kam kerak).
 * Har amal yonida uning oqibati sodda tilda yoziladi — egasi bosishdan oldin nima bo'lishini bilsin.
 */
const ConfiguratorScreen: FC = () => {
  const { t, i18n } = useTranslation(['products', 'common']);
  const toast = useToast();
  const confirm = useConfirm();
  const [rawDims, setDims] = useState(null as ApiPcDimension[] | null);
  const [rawParts, setParts] = useState(null as ApiPcPart[] | null);
  const [rawManualIds, setManualIds] = useState([] as string[]);
  const [rawBusy, setBusy] = useState(false);
  const [rawError, setError] = useState('');
  const [rawEditId, setEditId] = useState(null as string | null);
  const [rawShowDone, setShowDone] = useState(false);
  const [rawShowAdvanced, setShowAdvanced] = useState(false);
  const [rawQuery, setQuery] = useState('');
  const [rawSavedIds, setSavedIds] = useState([] as string[]);
  const [rawDimModal, setDimModal] = useState({ open: false, dim: null as ApiPcDimension | null, n: 0 });
  const dims = rawDims as ApiPcDimension[] | null;
  const parts = rawParts as ApiPcPart[] | null;
  const manualIds = rawManualIds as string[];
  const busy = rawBusy as boolean;
  const error = rawError as string;
  const editId = rawEditId as string | null;
  const showDone = rawShowDone as boolean;
  const showAdvanced = rawShowAdvanced as boolean;
  const query = rawQuery as string;
  const savedIds = rawSavedIds as string[];
  const dimModal = rawDimModal as { open: boolean; dim: ApiPcDimension | null; n: number };

  /**
   * Turlar va biror turga kirgan hamma bo'g'inning qismlari. «Qo'lda tanlang» ro'yxati shu yuklashda qotiriladi —
   * chip bosilganda qism ro'yxatdan sakrab yo'qolmasin (LGA1700 platada ikkinchi DDR ham tanlanishi mumkin).
   */
  const load = async () => {
    try {
      const d = await listPcDimensions();
      const slots = PC_SLOTS.map((s) => s.key).filter((k) => d.some((x) => x.slots.includes(k)));
      const all = (await Promise.all(slots.map((s) => listPcParts(s)))).flat();
      setDims(d);
      setParts(all);
      setManualIds(all.filter((p) => isUntagged(p, d) && needsManual(p, d)).map((p) => p.id));
    } catch {
      setError(t('shared.loadError'));
    }
  };
  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <EmptyState
        icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error}
        action={<Button variant="secondary" onClick={() => { setError(''); load(); }}>{t('common:retry')}</Button>}
      />
    );
  }
  if (!dims || !parts) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        <div className="skeleton h-[150px] rounded-surface" />
        <div className="skeleton h-40 rounded-surface" />
        <div className="skeleton h-56 rounded-surface" />
      </div>
    );
  }

  const pending = parts.filter((p) => isUntagged(p, dims));
  const auto = acceptSuggestions(pending, dims);
  const autoParts = pending.filter((p) => auto.items.some((i) => i.productId === p.id));
  const manual = parts.filter((p) => manualIds.includes(p.id));
  const done = filterParts(parts, dims, 'tagged', query);
  const doneCount = parts.length - pending.length;
  const activeDims = dims.filter((d) => d.active);
  // Tasdiqlangach saytda chiqadiganlar: har faol turda qiymati yoki taklifi bor (nofaol tur saytda tekshirilmaydi).
  const willShow = autoParts.filter((p) => !needsManual(p, activeDims)).length;
  // Tekshiriladigan bo'g'inlar (faol tekshiruvi bor) va ulardan saytda ochig'i — kamida bitta qismi hamma faol tekshiruvdan o'tgan.
  const checkedSlots = PC_SLOTS.map((s) => s.key).filter((k) => activeDims.some((d) => d.slots.includes(k)));
  const openSlots = checkedSlots.filter((k) =>
    parts.some((p) => p.slot === k && activeDims.every((d) => !d.slots.includes(k) || (p.values[d.id]?.length ?? 0) > 0))).length;
  // Bo'g'inlar bo'yicha holat: tasdiqlangan · tizim aniqlay oladigan · qo'lda tanlanadigan (uchalasi bir-birini takrorlamaydi).
  const slotRows = PC_SLOTS.map(({ key }) => {
    const own = parts.filter((p) => p.slot === key);
    const waiting = own.filter((p) => isUntagged(p, dims));
    const hand = waiting.filter((p) => needsManual(p, dims)).length;
    return { key, total: own.length, done: own.length - waiting.length, auto: waiting.length - hand, hand };
  }).filter((r) => r.total > 0);
  const handTotal = slotRows.reduce((s, r) => s + r.hand, 0);

  const slotLabel = (p: ApiPcPart) => t(`configurator.slots.${p.slot}`);
  const suggestionText = (p: ApiPcPart) => dimsForSlot(p.slot, dims)
    .map((d) => d.values.filter((v) => (p.suggested[d.id] ?? []).includes(v.id)).map((v) => v.label).join(' / '))
    .filter(Boolean)
    .join(' · ');

  const acceptAll = async () => {
    setBusy(true);
    try {
      for (const batch of chunk(auto.items, MAX_WRITE)) await setPcPartValues(batch);
      toast(t('configurator.acceptedAll', { done: auto.confirmed }));
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      await load();
      setBusy(false);
    }
  };

  const toggle = async (p: ApiPcPart, dimId: number, valueId: number) => {
    const next = toggleValue(p.values[dimId] ?? [], valueId);
    setBusy(true);
    try {
      await setPcPartValues([{ productId: p.id, dimensionId: dimId, valueIds: next }]);
      setParts(parts.map((x) => (x.id === p.id ? { ...x, values: { ...x.values, [dimId]: next } } : x)));
      if (!savedIds.includes(p.id)) setSavedIds([...savedIds, p.id]);
      listPcDimensions().then(setDims).catch(() => {});
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (d: ApiPcDimension, on: boolean) => {
    if (on && d.missing > 0 && !(await confirm({
      title: t('configurator.activateTitle'), message: t('configurator.activateMessage', { count: d.missing }), confirmLabel: t('configurator.activateConfirm'),
    }))) return;
    try {
      setDims(await updatePcDimension(d.id, { name: d.name, nameRu: d.nameRu, slots: d.slots, active: on, values: d.values.map((v) => ({ id: v.id, label: v.label })) }));
      await load();
    } catch (e) {
      toast(errText(e), 'error');
    }
  };

  const chips = (p: ApiPcPart) => (
    <PcValueChips dims={dimsForSlot(p.slot, dims)} values={p.values} suggested={p.suggested} disabled={busy}
      onToggle={(dimId, valueId) => toggle(p, dimId, valueId)} />
  );
  /** Qism sarlavhasi: bo'g'in ikonkasi, nom, bo'g'in nomi; chip bosilgan bo'lsa «✓ Saqlandi». */
  const partHead = (p: ApiPcPart, sub?: string) => (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex h-[1lh] shrink-0 items-center text-base"><IconTile icon={SLOT_ICON[p.slot]} hue={SLOT_HUE[p.slot]} soft size="sm" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-medium text-text">{p.name}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
          {slotLabel(p)}
          {sub && <span className="text-text-faint">·</span>}
          {sub && <span className="font-medium text-text">{sub}</span>}
          {savedIds.includes(p.id) && (
            <span className="inline-flex animate-fade-in items-center gap-1 font-medium text-success-text"><Check aria-hidden weight="bold" className="size-3.5" />{t('configurator.saved')}</span>
          )}
        </span>
      </span>
    </div>
  );
  const slotList = (d: ApiPcDimension) => listText(d.slots.map((s) => lowerFirst(t(`configurator.slots.${s}`))), t('configurator.and'));

  return (
    <div className="flex flex-col gap-6">
      <div className="stagger flex items-start gap-3 rounded-surface bg-accent-soft px-5 py-4 text-base" style={stagger(0)}>
        <Info weight="fill" aria-hidden className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-base font-semibold text-accent-text">{t('configurator.aboutTitle')}</p>
          <p className="mt-0.5 text-base text-text-muted">{t('configurator.aboutText')}</p>
        </div>
      </div>

      <div className="stagger" style={stagger(1)}>
        <KpiStrip>
          <Kpi icon={CheckCircle} hue="green" label={t('configurator.kpi.done')} value={doneCount} note={t('configurator.kpi.doneNote', { n: parts.length })} />
          <Kpi icon={Clock} hue="orange" label={t('configurator.kpi.pending')} value={pending.length} note={t('configurator.kpi.pendingNote', { n: auto.confirmed })} />
          <Kpi icon={ShieldCheck} hue="violet" label={t('configurator.kpi.checks')} value={activeDims.length} note={t('configurator.kpi.checksNote', { n: dims.length })} />
          <Kpi icon={Eye} hue="blue" label={t('configurator.kpi.slots')} value={openSlots} note={t('configurator.kpi.slotsNote', { n: checkedSlots.length })} />
        </KpiStrip>
      </div>

      {/* 1-qadam: holat va bitta tugma. */}
      <div className="stagger" style={stagger(2)}>
        {pending.length === 0 ? (
          <section className="flex items-start gap-4 rounded-surface bg-success-soft p-6">
            <IconTile icon={CheckCircle} hue="green" size="lg" />
            <div className="min-w-0">
              <h2 className="text-md font-bold text-success-strong">{t('configurator.allDoneTitle')}</h2>
              <p className="mt-1 text-base text-success-strong/80">{t('configurator.allDoneText')}</p>
            </div>
          </section>
        ) : (
          <Card>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <IconTile icon={auto.confirmed > 0 ? MagicWand : HandPointing} hue={auto.confirmed > 0 ? 'violet' : 'orange'} size="lg" />
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-text">{t('configurator.pendingTitle', { count: pending.length })}</h2>
                  <p className="mt-1 text-base text-text-muted">
                    {auto.confirmed > 0 ? t('configurator.pendingAuto', { count: auto.confirmed }) : t('configurator.pendingNone')}
                  </p>
                </div>
              </div>
              {auto.confirmed > 0 && (
                <div className="flex flex-col gap-2 lg:w-80">
                  <Button size="lg" onClick={acceptAll} disabled={busy} className="w-full"><CheckCircle weight="fill" />{t('configurator.acceptAll', { count: auto.confirmed })}</Button>
                  <p className="text-sm text-text-muted lg:text-center">
                    {willShow > 0 ? t('configurator.acceptHint', { count: willShow }) : t('configurator.acceptHintNone')}
                  </p>
                </div>
              )}
            </div>
            {auto.confirmed > 0 && (
              <details className="group/prev overflow-hidden rounded-control-lg bg-surface-sunken">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-base font-semibold text-text transition-colors hover:bg-surface-sunken [&::-webkit-details-marker]:hidden">
                  <CaretDown aria-hidden weight="bold" className="size-4 text-text-muted transition-transform duration-200 group-open/prev:rotate-180" />
                  {t('configurator.preview')}
                  <span className="text-sm tabular-nums text-text-faint">{autoParts.length}</span>
                </summary>
                <ul className="max-h-80 divide-y divide-border overflow-y-auto px-4">
                  {autoParts.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-3">
                      <IconTile icon={SLOT_ICON[p.slot]} hue={SLOT_HUE[p.slot]} soft size="sm" />
                      <span className="min-w-0 flex-1 truncate text-base text-text">{p.name}</span>
                      <Badge tone="accent" className="shrink-0">{suggestionText(p)}</Badge>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        )}
      </div>

      {/* Bo'g'inlar bo'yicha holat — har bo'g'inda nechta qism tayyor, nechtasini tizim aniqlaydi, nechtasi qo'lda. */}
      {slotRows.length > 0 && (
        <div className="stagger" style={stagger(3)}>
          <Card icon={ChartBar} hue="blue" title={t('configurator.progressTitle')} description={t('configurator.progressDesc')}>
            <ChartLegend items={[
              { label: t('configurator.legendDone'), hue: 'violet', value: String(doneCount) },
              { label: t('configurator.legendAuto'), hue: 'blue', value: String(pending.length - handTotal) },
              { label: t('configurator.legendManual'), hue: 'orange', value: String(handTotal) },
            ]} />
            <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {slotRows.map((r) => (
                <li key={r.key} className="flex items-center gap-3">
                  <IconTile icon={SLOT_ICON[r.key]} hue={SLOT_HUE[r.key]} soft size="sm" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-base font-medium text-text">{t(`configurator.slots.${r.key}`)}</span>
                      <span className="shrink-0 text-sm tabular-nums text-text-muted"><span className="font-semibold text-text">{r.done}</span> / {r.total}</span>
                    </div>
                    <SegmentBar showLegend={false} items={[
                      { label: t('configurator.legendDone'), value: r.done, hue: 'violet' },
                      { label: t('configurator.legendAuto'), value: r.auto, hue: 'blue' },
                      { label: t('configurator.legendManual'), value: r.hand, hue: 'orange' },
                    ]} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* 2-qadam: tizim aniqlay olmaganlari — chip bosilsa darhol saqlanadi. */}
      {manual.length > 0 && (
        <div className="stagger" style={stagger(4)}>
          <Card icon={HandPointing} hue="orange" title={t('configurator.manualTitle', { count: manual.length })} description={t('configurator.manualHint')}>
            <ul className="grid gap-3 lg:grid-cols-2">
              {manual.map((p) => (
                <li
                  key={p.id}
                  className={`flex flex-col gap-4 rounded-control-lg p-4 transition-colors duration-200 ${savedIds.includes(p.id) ? 'bg-success-soft' : 'bg-surface-sunken'}`}
                >
                  {partHead(p)}
                  {chips(p)}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Tasdiqlanganlar — tuzatish uchun, yig'ilgan. */}
      {doneCount > 0 && (
        <div className="stagger" style={stagger(5)}>
          <Card>
            <Disclosure open={showDone} onToggle={() => setShowDone(!showDone)} icon={CheckCircle} hue="green"
              title={t('configurator.doneTitle', { count: doneCount })} hint={t('configurator.doneHint')} />
            {showDone && (
              <div className="flex animate-fade-in flex-col gap-4">
                <SearchInput value={query} onChange={setQuery} placeholder={t('configurator.search')} />
                {done.length === 0 ? <p className="py-3 text-center text-base text-text-muted">{t('configurator.notFound')}</p> : (
                  <ul className="divide-y divide-border">
                    {done.map((p) => (
                      <li key={p.id} className="flex flex-col gap-3 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {partHead(p, partSummary(p, dims))}
                          <Button variant={editId === p.id ? 'secondary' : 'outline'} size="sm" onClick={() => setEditId(editId === p.id ? null : p.id)} className="max-sm:w-full">
                            {editId !== p.id && <PencilSimple />}
                            {editId === p.id ? t('configurator.collapse') : t('configurator.edit')}
                          </Button>
                        </div>
                        {editId === p.id && <div className="animate-fade-in rounded-control-lg bg-surface-sunken p-4">{chips(p)}</div>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Moslik turlarini sozlash — kamdan-kam kerak, shuning uchun pastda va yig'ilgan. */}
      <div className="stagger" style={stagger(6)}>
        <Card>
          <Disclosure open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)} icon={ShieldCheck} hue="violet"
            title={t('configurator.advancedTitle')} hint={t('configurator.advancedHint')} />
          {showAdvanced && (
            <div className="flex animate-fade-in flex-col gap-4">
              <p className="text-base text-text-muted">{t('configurator.dimsDesc')}</p>
              {dims.length === 0 && <p className="text-base text-text-muted">{t('configurator.noDims')}</p>}
              <ul className="grid gap-3 md:grid-cols-2">
                {dims.map((d) => (
                  <li key={d.id} className="flex flex-col gap-4 rounded-control-lg bg-surface-sunken p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-[1lh] shrink-0 items-center text-base"><IconTile icon={d.active ? ShieldCheck : ShieldSlash} hue={d.active ? 'green' : 'slate'} soft /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-text">{t('configurator.checkRule', { name: dimLabel(d, i18n.language), slots: slotList(d) })}</p>
                        <p className={`mt-0.5 text-sm ${d.missing > 0 ? 'font-medium text-warning-text' : 'text-text-muted'}`}>
                          {d.missing > 0 ? t('configurator.missing', { count: d.missing }) : t('configurator.missingNone')}
                        </p>
                      </div>
                    </div>
                    {d.values.length > 0 && <div className="flex flex-wrap gap-1">{d.values.map((v) => <Badge key={v.id}>{v.label}</Badge>)}</div>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5">
                        <Toggle on={d.active} onChange={(v) => toggleActive(d, v)} label={t('configurator.activeLabel')} />
                        <Badge tone={d.active ? 'ok' : 'neutral'} dot>{d.active ? t('configurator.stateOn') : t('configurator.stateOff')}</Badge>
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setDimModal({ open: true, dim: d, n: dimModal.n + 1 })}>
                        <PencilSimple />{t('configurator.edit')}
                      </Button>
                    </div>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setDimModal({ open: true, dim: null, n: dimModal.n + 1 })}
                    className="flex size-full min-h-32 flex-col items-center justify-center gap-2 rounded-control-lg bg-surface-sunken px-4 py-6 text-base font-semibold text-text-muted transition-colors duration-150 hover:bg-surface-sunken-hover hover:text-text"
                  >
                    <Plus weight="bold" className="size-5" />
                    {t('configurator.newDim')}
                  </button>
                </li>
              </ul>
            </div>
          )}
        </Card>
      </div>

      <PcDimensionModal
        key={dimModal.n}
        open={dimModal.open}
        dim={dimModal.dim}
        onClose={() => setDimModal({ ...dimModal, open: false })}
        onExited={() => {}}
        onSaved={(list) => { setDims(list); load(); }}
      />
    </div>
  );
};

export default ConfiguratorScreen;
