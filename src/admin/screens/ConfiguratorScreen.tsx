import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, ApiPcPart, PcPartWrite } from '../../../shared/types';
import { PC_SLOTS, type PcDimension, type SlotKey } from '../../../shared/pc-compat';
import Modal from '../../store/Modal';
import { listPcDimensions, listPcParts, setPcPartValues, updatePcDimension } from '../api';
import { errText } from '../errText';
import { acceptSuggestions, assignValues, dimsForSlot, filterParts, PART_FILTERS, toggleValue, type PartFilter } from '../lib/pc-parts';
import PcDimensionModal from '../PcDimensionModal';
import PcValueChips from '../PcValueChips';
import { Badge, Button, Card, DataTable, EmptyState, SearchInput, Segmented, Skeleton, Toggle, type Column } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

/** Ommaviy «Qiymat berish» oynasi: tur va qiymat(lar) tanlanadi — «Berish» yoki «Tozalash». */
const AssignForm: FC<{ dims: PcDimension[]; count: number; busy: boolean; onApply: (dim: PcDimension, valueIds: number[]) => void; onCancel: () => void }> = ({
  dims, count, busy, onApply, onCancel,
}) => {
  const { t } = useTranslation(['products', 'common']);
  const [rawDimId, setDimId] = useState(dims[0]?.id ?? 0);
  const [rawIds, setIds] = useState([] as number[]);
  const dimId = rawDimId as number;
  const ids = rawIds as number[];
  const dim = dims.find((d) => d.id === dimId) ?? dims[0];
  if (!dim) return null;
  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-copy font-semibold text-primary">{t('configurator.assignTitle')}</h2>
        <p className="mt-1 text-para text-muted">{t('configurator.assignHint', { count })}</p>
      </div>
      {dims.length > 1 && (
        <Segmented label={t('configurator.dimsTitle')} value={String(dim.id)} onChange={(v) => { setDimId(Number(v)); setIds([]); }}
          options={dims.map((d) => ({ id: String(d.id), label: d.name }))} />
      )}
      <PcValueChips dims={[dim]} values={{ [dim.id]: ids }} suggestionLabel="" onToggle={(_, v) => setIds(toggleValue(ids, v))} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="quiet" onClick={onCancel}>{t('common:cancel')}</Button>
        <Button variant="secondary" onClick={() => onApply(dim, [])} disabled={busy}>{t('configurator.assignClear')}</Button>
        <Button onClick={() => onApply(dim, ids)} disabled={busy || ids.length === 0}>{t('configurator.assignApply')}</Button>
      </div>
    </div>
  );
};

/**
 * Mahsulotlar → Konfigurator: moslik turlari (yaratish, qiymatlar, yoqish) va bo'g'in bo'yicha qismlar jadvali
 * (taklif, ommaviy tasdiqlash, qiymat berish). Filtrlar URL'da: `slot`, `f`, `q`.
 */
const ConfiguratorScreen: FC = () => {
  const { t } = useTranslation('products');
  const toast = useToast();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const [rawDims, setDims] = useState(null as ApiPcDimension[] | null);
  const [rawParts, setParts] = useState(null as ApiPcPart[] | null);
  const [rawSel, setSel] = useState([] as string[]);
  const [rawBusy, setBusy] = useState(false);
  const [rawError, setError] = useState('');
  const [rawDimModal, setDimModal] = useState({ open: false, dim: null as ApiPcDimension | null, n: 0 });
  const [rawPart, setPart] = useState(null as ApiPcPart | null);
  const [rawPartOpen, setPartOpen] = useState(false);
  const [rawAssignOpen, setAssignOpen] = useState(false);
  const dims = rawDims as ApiPcDimension[] | null;
  const parts = rawParts as ApiPcPart[] | null;
  const selected = rawSel as string[];
  const busy = rawBusy as boolean;
  const error = rawError as string;
  const dimModal = rawDimModal as { open: boolean; dim: ApiPcDimension | null; n: number };
  const editPart = rawPart as ApiPcPart | null;
  const partOpen = rawPartOpen as boolean;
  const assignOpen = rawAssignOpen as boolean;

  // Faqat biror turga kirgan bo'g'inlar — qolganlarida belgilaydigan narsa yo'q.
  const slots = PC_SLOTS.map((s) => s.key).filter((k) => (dims ?? []).some((d) => d.slots.includes(k)));
  const rawSlot = params.get('slot') as SlotKey | null;
  const slot: SlotKey | undefined = rawSlot && slots.includes(rawSlot) ? rawSlot : slots[0];
  const rawF = params.get('f') as PartFilter | null;
  const filter: PartFilter = rawF && PART_FILTERS.includes(rawF) ? rawF : 'all';
  const q = params.get('q') ?? '';
  const slotDims = slot && dims ? dimsForSlot(slot, dims) : [];
  const visible = parts && dims ? filterParts(parts, dims, filter, q) : [];

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const reloadDims = () => listPcDimensions().then(setDims).catch(() => setError(t('shared.loadError')));
  useEffect(() => { reloadDims(); }, []);
  useEffect(() => {
    if (!slot) return;
    setParts(null);
    setSel([]);
    listPcParts(slot).then(setParts).catch((e) => toast(errText(e), 'error'));
  }, [slot]);

  const write = async (items: PcPartWrite[], message: string) => {
    setBusy(true);
    try {
      await setPcPartValues(items);
      toast(message);
      setSel([]);
      if (slot) setParts(await listPcParts(slot));
      reloadDims();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const chosen = () => (parts ?? []).filter((p) => selected.includes(p.id));
  const accept = () => {
    const { items, confirmed, skipped } = acceptSuggestions(chosen(), dims ?? []);
    if (items.length === 0) { toast(t('configurator.nothingToAccept'), 'error'); return; }
    write(items, skipped > 0 ? t('configurator.acceptedSkipped', { done: confirmed, skipped }) : t('configurator.accepted', { done: confirmed }));
  };
  const assign = async (dim: PcDimension, valueIds: number[]) => {
    await write(assignValues(chosen(), dim, valueIds), t('configurator.saved'));
    setAssignOpen(false);
  };

  const toggleActive = async (d: ApiPcDimension, on: boolean) => {
    if (on && d.missing > 0 && !(await confirm({
      title: t('configurator.activateTitle'), message: t('configurator.activateMessage', { count: d.missing }), confirmLabel: t('configurator.activateConfirm'),
    }))) return;
    try {
      setDims(await updatePcDimension(d.id, { name: d.name, nameRu: d.nameRu, slots: d.slots, active: on, values: d.values.map((v) => ({ id: v.id, label: v.label })) }));
    } catch (e) {
      toast(errText(e), 'error');
    }
  };

  const togglePartValue = async (p: ApiPcPart, dimId: number, valueId: number) => {
    const next = toggleValue(p.values[dimId] ?? [], valueId);
    setBusy(true);
    try {
      await setPcPartValues([{ productId: p.id, dimensionId: dimId, valueIds: next }]);
      const updated: ApiPcPart = { ...p, values: { ...p.values, [dimId]: next } };
      setPart(updated);
      setParts((parts ?? []).map((x) => (x.id === p.id ? updated : x)));
      reloadDims();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <EmptyState title={t('shared.loadErrorTitle')} text={error} />;
  if (!dims) return <Skeleton rows={6} />;

  const valueCell = (d: PcDimension, p: ApiPcPart) => {
    const own = p.values[d.id] ?? [];
    const sug = p.suggested[d.id] ?? [];
    const labels = (ids: number[]) => d.values.filter((v) => ids.includes(v.id)).map((v) => v.label);
    if (own.length > 0) return <span className="flex flex-wrap gap-1">{labels(own).map((l) => <Badge key={l}>{l}</Badge>)}</span>;
    if (sug.length > 0) {
      return (
        <span className="inline-flex items-center rounded-full border border-dashed border-muted-3 px-2 py-0.5 text-label text-primary">
          {labels(sug).join(' / ')} <span className="ml-1 text-muted-2">· {t('configurator.suggestion')}</span>
        </span>
      );
    }
    return <span className="text-muted-2">—</span>;
  };

  const columns: Column<ApiPcPart>[] = [
    {
      id: 'sel', label: '', className: 'w-10',
      cell: (p) => (
        <label className="-m-3 inline-flex cursor-pointer p-3">
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => setSel(selected.includes(p.id) ? selected.filter((x) => x !== p.id) : [...selected, p.id])}
            aria-label={t('configurator.selectPart', { name: p.name })}
            className="size-5 accent-accent"
          />
        </label>
      ),
    },
    {
      id: 'img', label: '', className: 'w-14', mobile: 'hide',
      cell: (p) => (
        <span className="grid size-10 place-items-center overflow-hidden rounded-xs border border-line bg-white">
          {p.image && <img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain" />}
        </span>
      ),
    },
    {
      id: 'name', label: t('shared.name'), mobile: 'title',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="text-primary">{p.name}</span>
          <span className="text-label text-muted-2">{p.inStock ? t('configurator.inStock') : t('configurator.onOrder')}</span>
        </span>
      ),
    },
    ...slotDims.map((d): Column<ApiPcPart> => ({ id: `d${d.id}`, label: d.name, cell: (p) => valueCell(d, p) })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={t('configurator.dimsTitle')}
        description={t('configurator.dimsDesc')}
        actions={<Button variant="secondary" onClick={() => setDimModal({ open: true, dim: null, n: dimModal.n + 1 })}>{t('configurator.newDim')}</Button>}
      >
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
      </Card>

      {slot && (
        <Card title={t('configurator.partsTitle')} description={t('configurator.partsDesc')}>
          <div className="flex flex-col gap-4">
            <Segmented label={t('configurator.slotLabel')} value={slot} onChange={(v) => setParam('slot', v)}
              options={slots.map((s) => ({ id: s, label: t(`configurator.slots.${s}`) }))} />
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Segmented label={t('configurator.filterLabel')} value={filter} onChange={(v) => setParam('f', v === 'all' ? '' : v)}
                options={[{ id: 'all', label: t('configurator.filterAll') }, { id: 'untagged', label: t('configurator.filterUntagged') }, { id: 'tagged', label: t('configurator.filterTagged') }]} />
              <div className="md:ml-auto md:w-72"><SearchInput value={q} onChange={(v) => setParam('q', v)} placeholder={t('configurator.search')} /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selected.length === 0 ? (
                <Button variant="quiet" onClick={() => setSel(visible.map((p) => p.id))} disabled={visible.length === 0}>
                  {t('configurator.selectAll', { count: visible.length })}
                </Button>
              ) : (
                <>
                  <span className="text-para text-primary">{t('configurator.selected', { count: selected.length })}</span>
                  <Button onClick={accept} disabled={busy}>{t('configurator.acceptSuggestions')}</Button>
                  <Button variant="secondary" onClick={() => setAssignOpen(true)} disabled={busy}>{t('configurator.assign')}</Button>
                  <Button variant="quiet" onClick={() => setSel([])}>{t('configurator.clearSelection')}</Button>
                </>
              )}
            </div>
            {parts === null ? <Skeleton rows={6} /> : (
              <DataTable
                columns={columns}
                rows={visible}
                rowKey={(p) => p.id}
                onRowClick={(p) => { setPart(p); setPartOpen(true); }}
                empty={<EmptyState title={parts.length === 0 ? t('configurator.emptyParts') : t('configurator.emptyFiltered')} />}
              />
            )}
          </div>
        </Card>
      )}

      <PcDimensionModal
        key={dimModal.n}
        open={dimModal.open}
        dim={dimModal.dim}
        onClose={() => setDimModal({ ...dimModal, open: false })}
        onExited={() => {}}
        onSaved={(list) => { setDims(list); if (slot) listPcParts(slot).then(setParts).catch(() => {}); }}
      />

      <Modal open={partOpen} label={t('configurator.partTitle')} onClose={() => setPartOpen(false)} onExited={() => setPart(null)} panelClass="max-w-lg">
        {editPart && (
          <div className="flex flex-col gap-5 p-6">
            <div>
              <h2 className="text-copy font-semibold text-primary">{editPart.name}</h2>
              <p className="mt-1 text-para text-muted">{t('configurator.partHint')}</p>
            </div>
            <PcValueChips dims={slotDims} values={editPart.values} suggested={editPart.suggested} disabled={busy}
              suggestionLabel={t('configurator.suggestion')} onToggle={(dimId, valueId) => togglePartValue(editPart, dimId, valueId)} />
            <div className="flex justify-end"><Button variant="secondary" onClick={() => setPartOpen(false)}>{t('configurator.done')}</Button></div>
          </div>
        )}
      </Modal>

      <Modal open={assignOpen} label={t('configurator.assignTitle')} onClose={() => setAssignOpen(false)} panelClass="max-w-lg">
        <AssignForm dims={slotDims} count={selected.length} busy={busy} onApply={assign} onCancel={() => setAssignOpen(false)} />
      </Modal>
    </div>
  );
};

export default ConfiguratorScreen;
