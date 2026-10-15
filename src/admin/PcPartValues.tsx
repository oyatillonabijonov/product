import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, ApiPcPart } from '../../shared/types';
import { getPcPart, listPcDimensions, setPcPartValues } from './api';
import { errText } from './errText';
import { dimsForSlot, toggleValue } from './lib/pc-parts';
import PcValueChips from './PcValueChips';
import { useToast } from './ui/toast';

/**
 * Mahsulot tahriridagi moslik chiplari — Konfigurator tabidagi bilan bir xil; bosish darhol saqlaydi
 * (mahsulot formasining "Saqlash"iga bog'liq emas). Yozuv mahsulotning hamma dublikat qatorlariga tushadi (server).
 */
const PcPartValues: FC<{ productId: string }> = ({ productId }) => {
  const { t } = useTranslation('products');
  const toast = useToast();
  const [rawPart, setPart] = useState(null as ApiPcPart | null);
  const [rawDims, setDims] = useState([] as ApiPcDimension[]);
  const [rawState, setState] = useState('loading' as 'loading' | 'ready' | 'none' | 'error');
  const [rawBusy, setBusy] = useState(false);
  const part = rawPart as ApiPcPart | null;
  const dims = rawDims as ApiPcDimension[];
  const state = rawState as 'loading' | 'ready' | 'none' | 'error';
  const busy = rawBusy as boolean;

  useEffect(() => {
    Promise.all([getPcPart(productId), listPcDimensions()])
      .then(([p, d]) => { setPart(p); setDims(d); setState('ready'); })
      // Faqat 404 «konfiguratorda yo'q» degani; tarmoq/server xatosi uni yashirmasin.
      .catch((e) => setState(e instanceof Error && e.message === 'part_not_found' ? 'none' : 'error'));
  }, [productId]);

  if (state === 'loading') return null;
  if (state === 'error') return <p className="py-3 text-para text-muted-2">{t('shared.loadError')}</p>;
  if (state === 'none' || !part) return <p className="py-3 text-para text-muted-2">{t('productEdit.pc.valuesNone')}</p>;
  const slotDims = dimsForSlot(part.slot, dims);
  if (slotDims.length === 0) return null;

  const toggle = async (dimId: number, valueId: number) => {
    const next = toggleValue(part.values[dimId] ?? [], valueId);
    setBusy(true);
    try {
      await setPcPartValues([{ productId: part.id, dimensionId: dimId, valueIds: next }]);
      setPart({ ...part, values: { ...part.values, [dimId]: next } });
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 py-3">
      <p className="text-para text-muted">{t('productEdit.pc.valuesHint')}</p>
      <PcValueChips dims={slotDims} values={part.values} suggested={part.suggested} disabled={busy} onToggle={toggle} />
    </div>
  );
};

export default PcPartValues;
