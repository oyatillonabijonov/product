import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, Settings2 } from 'lucide-react';
import type { ApiPcDimension, ApiPcPart } from '../../../shared/types';
import { PC_SLOTS } from '../../../shared/pc-compat';
import { listPcDimensions, listPcParts, setPcPartValues, updatePcDimension } from '../api';
import { errText } from '../errText';
import { acceptSuggestions, chunk, dimsForSlot, filterParts, isUntagged, needsManual, partSummary, toggleValue } from '../lib/pc-parts';
import PcDimensionModal from '../PcDimensionModal';
import PcValueChips from '../PcValueChips';
import { Badge, Button, Card, EmptyState, SearchInput, Skeleton, Toggle } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

/** Server bitta so'rovda shuncha yozuv qabul qiladi (`parsePcPartsInput`). */
const MAX_WRITE = 500;

/** Yig'iladigan bo'lim sarlavhasi — butun qator bosiladi (44px), o'q holatni ko'rsatadi. */
const Disclosure: FC<{ open: boolean; onToggle: () => void; title: string; hint: string; icon?: ReactNode }> = ({ open, onToggle, title, hint, icon }) => (
  <button type="button" onClick={onToggle} aria-expanded={open} className="press flex min-h-11 w-full items-center gap-3 text-left">
    {icon}
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="text-copy text-primary">{title}</span>
      <span className="text-label text-muted-2">{hint}</span>
    </span>
    <ChevronDown aria-hidden className={`size-5 shrink-0 text-muted-2 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

/**
 * Mahsulotlar → Konfigurator — egasi uchun eng sodda oqim (mantiq o'zgarmagan, faqat ko'rinish):
 * 1) bitta tugma — tizim nomdan aniqlagan hamma takliflarni tasdiqlaydi (hamma bo'g'in bir yo'la);
 * 2) tizim aniqlay olmaganlari — oddiy ro'yxat, chip bosilsa darhol saqlanadi;
 * 3) tasdiqlanganlar — yig'ilgan, tuzatish uchun; 4) moslik turlarini sozlash — pastda, yig'ilgan (kamdan-kam kerak).
 */
const ConfiguratorScreen: FC = () => {
  const { t } = useTranslation('products');
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

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!dims || !parts) return <Skeleton rows={6} />;

  const pending = parts.filter((p) => isUntagged(p, dims));
  const auto = acceptSuggestions(pending, dims);
  const autoParts = pending.filter((p) => auto.items.some((i) => i.productId === p.id));
  const manual = parts.filter((p) => manualIds.includes(p.id));
  const done = filterParts(parts, dims, 'tagged', query);
  const doneCount = parts.length - pending.length;
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
      suggestionLabel={t('configurator.suggestion')} onToggle={(dimId, valueId) => toggle(p, dimId, valueId)} />
  );
  const partName = (p: ApiPcPart) => (
    <span className="text-copy text-primary">{p.name} <span className="text-label text-muted-2">· {slotLabel(p)}</span></span>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* 1-qadam: holat va bitta tugma. */}
      <Card>
        {pending.length === 0 ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden className="mt-0.5 size-6 shrink-0 text-verified" />
            <div>
              <h2 className="text-lede font-semibold text-primary">{t('configurator.allDoneTitle')}</h2>
              <p className="mt-1 text-para text-muted">{t('configurator.allDoneText')}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <h2 className="text-lede font-semibold text-primary">{t('configurator.pendingTitle', { count: pending.length })}</h2>
            <p className="text-para text-muted">
              {auto.confirmed > 0 ? t('configurator.pendingAuto', { count: auto.confirmed }) : t('configurator.pendingNone')}
            </p>
            {auto.confirmed > 0 && (
              <>
                <Button size="lg" onClick={acceptAll} disabled={busy}>{t('configurator.acceptAll', { count: auto.confirmed })}</Button>
                <details className="w-full">
                  <summary className="press min-h-11 cursor-pointer py-3 text-para text-link">{t('configurator.preview')}</summary>
                  <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                    {autoParts.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                        <span className="text-para text-primary">{p.name}</span>
                        <span className="text-label text-muted">{suggestionText(p)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </div>
        )}
      </Card>

      {/* 2-qadam: tizim aniqlay olmaganlari — chip bosilsa darhol saqlanadi. */}
      {manual.length > 0 && (
        <Card title={t('configurator.manualTitle', { count: manual.length })} description={t('configurator.manualHint')}>
          <ul className="divide-y divide-line">
            {manual.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 py-4">
                {partName(p)}
                {chips(p)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Tasdiqlanganlar — tuzatish uchun, yig'ilgan. */}
      {doneCount > 0 && (
        <Card>
          <Disclosure open={showDone} onToggle={() => setShowDone(!showDone)}
            title={t('configurator.doneTitle', { count: doneCount })} hint={t('configurator.doneHint')} />
          {showDone && (
            <div className="mt-4 flex flex-col gap-3">
              <SearchInput value={query} onChange={setQuery} placeholder={t('configurator.search')} />
              {done.length === 0 ? <p className="py-3 text-para text-muted-2">{t('configurator.notFound')}</p> : (
                <ul className="divide-y divide-line">
                  {done.map((p) => (
                    <li key={p.id} className="flex flex-col gap-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-col">
                          {partName(p)}
                          <span className="text-label text-muted">{partSummary(p, dims)}</span>
                        </span>
                        <Button variant="quiet" onClick={() => setEditId(editId === p.id ? null : p.id)}>
                          {editId === p.id ? t('configurator.collapse') : t('configurator.edit')}
                        </Button>
                      </div>
                      {editId === p.id && chips(p)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Moslik turlarini sozlash — kamdan-kam kerak, shuning uchun pastda va yig'ilgan. */}
      <Card>
        <Disclosure open={showAdvanced} onToggle={() => setShowAdvanced(!showAdvanced)}
          title={t('configurator.advancedTitle')} hint={t('configurator.advancedHint')}
          icon={<Settings2 aria-hidden className="size-5 shrink-0 text-muted-2" />} />
        {showAdvanced && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-para text-muted">{t('configurator.dimsDesc')}</p>
            {dims.length === 0 ? <p className="py-3 text-para text-muted-2">{t('configurator.noDims')}</p> : (
              <ul className="divide-y divide-line">
                {dims.map((d) => (
                  <li key={d.id} className="flex items-center gap-4 py-3">
                    <button type="button" onClick={() => setDimModal({ open: true, dim: d, n: dimModal.n + 1 })} className="press flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left">
                      <span className="text-copy text-primary">{d.name}</span>
                      <span className="text-label text-muted-2">{d.slots.map((s) => t(`configurator.slots.${s}`)).join(' ↔ ')}</span>
                      <span className="flex flex-wrap gap-1">{d.values.map((v) => <Badge key={v.id}>{v.label}</Badge>)}</span>
                      <span className={`text-label ${d.missing > 0 ? 'font-medium text-primary' : 'text-muted-2'}`}>
                        {d.missing > 0 ? t('configurator.missing', { count: d.missing }) : t('configurator.missingNone')}
                      </span>
                    </button>
                    <Toggle on={d.active} onChange={(v) => toggleActive(d, v)} label={t('configurator.activeLabel')} />
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Button variant="secondary" onClick={() => setDimModal({ open: true, dim: null, n: dimModal.n + 1 })}>{t('configurator.newDim')}</Button>
            </div>
          </div>
        )}
      </Card>

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
