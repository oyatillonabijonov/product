import { useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, PcDimensionInput } from '../../shared/types';
import { PC_SLOTS } from '../../shared/pc-compat';
import Modal from '../store/Modal';
import { createPcDimension, deletePcDimension, updatePcDimension } from './api';
import { errText } from './errText';
import { addValue, dimToForm } from './lib/pc-parts';
import { Button, Field, Input } from './ui';
import { useGuardedConfirm } from './ui/confirm';
import { useToast } from './ui/toast';

/**
 * Moslik turi tahriri / yaratish. Yangi tur nofaol yaratiladi (server ham shunday qiladi) — faolligi ro'yxatdagi
 * almashtirgichda. Ota komponent `key` bilan qayta yaratadi, shuning uchun forma holati har ochilishda yangi.
 * Chip guruhlari `Field` ichida emas — `Field` `<label>` chizadi, ichidagi tugma label bosilganda "bosilib" ketardi.
 */
const PcDimensionModal: FC<{
  open: boolean;
  dim: ApiPcDimension | null;
  onClose: () => void;
  onExited: () => void;
  onSaved: (list: ApiPcDimension[]) => void;
}> = ({ open, dim, onClose, onExited, onSaved }) => {
  const { t } = useTranslation(['products', 'common']);
  const toast = useToast();
  const { confirm, confirming } = useGuardedConfirm();
  const [rawForm, setForm] = useState(dimToForm(dim));
  const [rawLabel, setLabel] = useState('');
  const [rawBusy, setBusy] = useState(false);
  const form = rawForm as PcDimensionInput;
  const label = rawLabel as string;
  const busy = rawBusy as boolean;

  const toggleSlot = (key: PcDimensionInput['slots'][number]) =>
    setForm({ ...form, slots: form.slots.includes(key) ? form.slots.filter((s) => s !== key) : [...form.slots, key] });
  const add = () => { setForm({ ...form, values: addValue(form.values, label) }); setLabel(''); };
  const removeValue = async (i: number) => {
    const v = form.values[i];
    if (v.id !== null && !(await confirm({ title: t('configurator.removeUsedTitle'), message: t('configurator.removeUsedMessage'), destructive: true, confirmLabel: t('shared.delete') }))) return;
    setForm({ ...form, values: form.values.filter((_, j) => j !== i) });
  };

  const save = async () => {
    // Faol turga bo'g'in qo'shilsa, yangi bo'g'indagi qismlarda qiymat yo'q — ular darhol konfiguratordan chiqib ketadi.
    if (dim?.active && form.slots.some((s) => !dim.slots.includes(s))
      && !(await confirm({ title: t('configurator.addSlotTitle'), message: t('configurator.addSlotMessage'), confirmLabel: t('shared.save') }))) return;
    setBusy(true);
    try {
      // Yozilib qolgan, lekin «Qo'shish» bosilmagan qiymat ham saqlanadi.
      const input: PcDimensionInput = { ...form, values: addValue(form.values, label) };
      onSaved(dim ? await updatePcDimension(dim.id, input) : await createPcDimension(input));
      toast(t('configurator.saved'));
      onClose();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!dim || !(await confirm({ title: t('configurator.deleteTitle'), message: t('configurator.deleteMessage'), destructive: true, confirmLabel: t('shared.delete') }))) return;
    setBusy(true);
    try {
      onSaved(await deletePcDimension(dim.id));
      onClose();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} label={t('configurator.editTitle')} onClose={() => { if (!confirming.current) onClose(); }} onExited={onExited} panelClass="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <div className="flex flex-col gap-5 p-6">
        <h2 className="text-copy font-semibold text-primary">{t('configurator.editTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('configurator.nameLabel')} required>
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label={t('configurator.nameRuLabel')}>
            <Input value={form.nameRu} onChange={(v) => setForm({ ...form, nameRu: v })} />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-label font-medium text-muted">{t('configurator.slotsLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {PC_SLOTS.map(({ key }) => {
              const on = form.slots.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSlot(key)}
                  className={`press h-11 rounded-full border px-4 text-para ${on ? 'border-accent bg-accent text-bg' : 'border-line text-muted'}`}
                >
                  {t(`configurator.slots.${key}`)}
                </button>
              );
            })}
          </div>
          <span className="mt-1 block text-label text-muted-2">{t('configurator.slotsHint')}</span>
        </div>

        <div>
          <span className="mb-1.5 block text-label font-medium text-muted">{t('configurator.valuesLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {form.values.map((v, i) => (
              <span key={`${v.id ?? 'new'}-${v.label}`} className="inline-flex h-9 items-center gap-1 rounded-full bg-fill-2 pl-3 pr-1 text-para text-primary">
                {v.label}
                <button
                  type="button"
                  aria-label={t('configurator.removeValue', { label: v.label })}
                  onClick={() => removeValue(i)}
                  className="press relative grid size-7 place-items-center rounded-full text-muted-2 after:absolute after:-inset-2 hover:text-danger"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={label} onChange={setLabel} placeholder={t('configurator.valuePlaceholder')} />
            <Button variant="secondary" onClick={add} disabled={!label.trim()}>{t('configurator.addValue')}</Button>
          </div>
        </div>

        {!dim && <p className="text-label text-muted-2">{t('configurator.newDimHint')}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {dim && dim.key === null
            ? <Button variant="destructive" onClick={remove} disabled={busy}>{t('configurator.deleteDim')}</Button>
            : <span className="text-label text-muted-2">{dim ? t('configurator.protectedHint') : ''}</span>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>{t('common:cancel')}</Button>
            <Button onClick={save} disabled={busy}>{t('shared.save')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PcDimensionModal;
