import { useState } from 'react';
import type { FC } from 'react';
import { uploadImage } from './api';
import type { AdminVariantInput } from './api';
import { generateVariants, type OptionDraft } from './lib/variant-gen';

export type EditableVariant = AdminVariantInput;

const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';

const VariantEditor: FC<{
  options: OptionDraft[];
  variants: EditableVariant[];
  onOptionsChange: (next: OptionDraft[]) => void;
  onVariantsChange: (next: EditableVariant[]) => void;
}> = ({ options, variants, onOptionsChange, onVariantsChange }) => {
  const [valueDrafts, setValueDrafts] = useState<Record<number, string>>({});
  const [busyRow, setBusyRow] = useState<number | null>(null);

  function addOption() {
    onOptionsChange([...options, { name: '', values: [] }]);
  }

  function removeOption(i: number) {
    onOptionsChange(options.filter((_, j) => j !== i));
  }

  function setOptionName(i: number, name: string) {
    onOptionsChange(options.map((o, j) => (j === i ? { ...o, name } : o)));
  }

  function addOptionValue(i: number) {
    const draft = (valueDrafts[i] ?? '').trim();
    if (!draft) return;
    onOptionsChange(options.map((o, j) => (j === i && !o.values.includes(draft) ? { ...o, values: [...o.values, draft] } : o)));
    setValueDrafts((d) => ({ ...d, [i]: '' }));
  }

  function removeOptionValue(i: number, value: string) {
    onOptionsChange(options.map((o, j) => (j === i ? { ...o, values: o.values.filter((v) => v !== value) } : o)));
  }

  function generateCombinations() {
    onVariantsChange(generateVariants(options, variants));
  }

  function addEmptyVariant() {
    onVariantsChange([...variants, { sku: null, cashPriceUzs: 0, oldPriceUzs: null, imageUrl: null, inStock: true, optionValues: [] }]);
  }

  function removeVariant(i: number) {
    onVariantsChange(variants.filter((_, j) => j !== i));
  }

  function updateVariant(i: number, patch: Partial<EditableVariant>) {
    onVariantsChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  function updateVariantOption(i: number, optionName: string, value: string) {
    const v = variants[i];
    const rest = v.optionValues.filter((ov) => ov.optionName !== optionName);
    updateVariant(i, { optionValues: [...rest, { optionName, value }] });
  }

  async function uploadVariantImage(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyRow(i);
    try {
      const { imageUrl } = await uploadImage(file);
      updateVariant(i, { imageUrl });
    } finally {
      setBusyRow(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="text-[13px] text-muted mb-2">Option'lar</div>
      <div className="space-y-3">
        {options.map((opt, i) => (
          <div key={i} className="border border-line rounded-xl p-3">
            <div className="flex gap-2 items-center">
              <input
                placeholder="Nomi (Xotira)"
                className={input}
                value={opt.name}
                onChange={(e) => setOptionName(i, e.target.value)}
              />
              <button onClick={() => removeOption(i)} className="text-danger px-2">×</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {opt.values.map((v) => (
                <span key={v} className="flex items-center gap-1 bg-bg rounded-full px-3 py-1 text-[13px]">
                  {v}
                  <button onClick={() => removeOptionValue(i, v)} className="text-danger">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                placeholder="Qiymat (256GB)"
                className={input}
                value={valueDrafts[i] ?? ''}
                onChange={(e) => setValueDrafts((d) => ({ ...d, [i]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addOptionValue(i);
                  }
                }}
              />
              <button onClick={() => addOptionValue(i)} className="px-3 text-accent font-semibold">+</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addOption} className="text-[13px] text-accent font-semibold mt-2">+ option qo'shish</button>

      <div className="mt-4 flex items-center gap-3">
        <div className="text-[13px] text-muted">Variantlar</div>
        <button
          onClick={generateCombinations}
          disabled={options.length === 0 || options.some((o) => !o.name.trim() || o.values.length === 0)}
          className="text-[13px] text-accent font-semibold disabled:opacity-40"
        >
          Kombinatsiyalarni generatsiya
        </button>
      </div>

      <div className="space-y-2 mt-2">
        {variants.map((v, i) => (
          <div key={i} className="border border-line rounded-xl p-3">
            <div className="flex flex-wrap gap-2 items-center">
              {options.map((opt) => (
                <select
                  key={opt.name}
                  className={`${input} w-auto`}
                  value={v.optionValues.find((ov) => ov.optionName === opt.name)?.value ?? ''}
                  onChange={(e) => updateVariantOption(i, opt.name, e.target.value)}
                >
                  <option value="">{opt.name}</option>
                  {opt.values.map((val) => <option key={val} value={val}>{val}</option>)}
                </select>
              ))}
              <input
                type="number"
                placeholder="Narx"
                className={`${input} w-32`}
                value={v.cashPriceUzs}
                onChange={(e) => updateVariant(i, { cashPriceUzs: Number(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Eski narx"
                className={`${input} w-32`}
                value={v.oldPriceUzs ?? ''}
                onChange={(e) => updateVariant(i, { oldPriceUzs: e.target.value ? Number(e.target.value) : null })}
              />
              <input
                placeholder="SKU"
                className={`${input} w-32`}
                value={v.sku ?? ''}
                onChange={(e) => updateVariant(i, { sku: e.target.value || null })}
              />
              <label className="flex items-center gap-1 text-[13px]">
                <input type="checkbox" checked={v.inStock} onChange={(e) => updateVariant(i, { inStock: e.target.checked })} />
                Mavjud
              </label>
              {v.imageUrl ? <img src={v.imageUrl} alt="" className="w-10 h-10 object-contain rounded-lg bg-bg" /> : null}
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busyRow === i} onChange={(e) => uploadVariantImage(i, e)} />
              <button onClick={() => removeVariant(i)} className="text-danger px-2 ml-auto">×</button>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addEmptyVariant} className="text-[13px] text-accent font-semibold mt-2">+ variant qo'shish</button>
    </div>
  );
};

export default VariantEditor;
