import { useState } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiPcDimension, PcDimensionInput } from '../../shared/types';
import { PC_SLOTS } from '../../shared/pc-compat';
import Modal from '../store/Modal';
import { createPcDimension, deletePcDimension, updatePcDimension } from './api';
import { errText } from './errText';
import { addValue, dimLabel, dimToForm, listText, lowerFirst } from './lib/pc-parts';
import { Button, Field, Input } from './ui';
import { useGuardedConfirm } from './ui/confirm';
import { useToast } from './ui/toast';

/**
 * Tekshiruv (moslik turi) tahriri / yaratish — uchta savol va ostida jonli «Natija» jumlasi: egasi saqlashdan oldin
 * tekshiruv saytda nima qilishini o'qiydi. Yangi tur nofaol yaratiladi (server ham shunday qiladi) — faolligi ro'yxatdagi
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
  const { t, i18n } = useTranslation(['products', 'common']);
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

  // Jonli izoh: yozilib qolgan, lekin «Qo'shish» bosilmagan variant ham hisobga olinadi — saqlashda ham shunday.
  const lang = i18n.language;
  const preview = addValue(form.values, label);
  const slotNames = PC_SLOTS.filter((s) => form.slots.includes(s.key)).map((s) => lowerFirst(t(`configurator.slots.${s.key}`)));
  const result = slotNames.length >= 2 && preview.length > 0
    ? t('configurator.result', { slots: listText(slotNames, t('configurator.and')), values: listText(preview.map((v) => v.label), t('configurator.or')) })
    : t('configurator.resultEmpty');
  const step = 'text-para font-semibold text-primary';
  const hint = 'text-label text-muted-2';

  const save = async () => {
    // Faol turga bo'g'in qo'shilsa, yangi bo'g'indagi qismlarda qiymat yo'q — ular darhol konfiguratordan chiqib ketadi.
    if (dim?.active && form.slots.some((s) => !dim.slots.includes(s))
      && !(await confirm({ title: t('configurator.addSlotTitle'), message: t('configurator.addSlotMessage'), confirmLabel: t('shared.save') }))) return;
    setBusy(true);
    try {
      // Yozilib qolgan, lekin «Qo'shish» bosilmagan qiymat ham saqlanadi.
      const input: PcDimensionInput = { ...form, values: preview };
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
    <Modal open={open} label={dim ? t('configurator.editTitle') : t('configurator.newTitle')} onClose={() => { if (!confirming.current) onClose(); }} onExited={onExited} panelClass="max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lede font-semibold text-primary">{dim ? t('configurator.editTitle') : t('configurator.newTitle')}</h2>
          <p className="text-para text-muted">{t('configurator.intro')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <span className={step}>{t('configurator.nameStep')}</span>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('configurator.nameLabel')} required>
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={t('configurator.namePlaceholder')} />
            </Field>
            <Field label={t('configurator.nameRuLabel')}>
              <Input value={form.nameRu} onChange={(v) => setForm({ ...form, nameRu: v })} placeholder={t('configurator.namePlaceholderRu')} />
            </Field>
          </div>
          <span className={hint}>
            {t('configurator.nameHint', { name: dimLabel(form, lang) || t('configurator.nameExample'), value: preview[0]?.label ?? 'ATX' })}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className={step}>{t('configurator.slotsLabel')}</span>
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
          <span className={hint}>{t('configurator.slotsHint')}</span>
        </div>

        <div className="flex flex-col gap-2">
          <span className={step}>{t('configurator.valuesLabel')}</span>
          {form.values.length > 0 && (
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
          )}
          <div className="flex gap-2">
            <Input value={label} onChange={setLabel} placeholder={t('configurator.valuePlaceholder')} />
            <Button variant="secondary" onClick={add} disabled={!label.trim()}>{t('configurator.addValue')}</Button>
          </div>
          <span className={hint}>{t('configurator.valuesHint')}</span>
        </div>

        <p className="rounded-sm bg-fill-2 p-4 text-para text-primary">
          <span className="font-semibold">{t('configurator.resultLabel')}</span> {result}
        </p>

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
