import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiBrand, ApiCategory, ApiDeviceModel, ApiProduct, ApiSpec, Category, Condition } from '../../shared/types';
import { deriveLegacyCategory } from '../../shared/legacy-category';
import { createProduct, getProductDetail, listBrands, listCategories, listDeviceModels, updateProduct } from './api';
import VariantEditor from './VariantEditor';
import type { EditableVariant } from './VariantEditor';
import ModelCombobox from './ModelCombobox';
import PriceInput from './PriceInput';
import ImageUploader from './ImageUploader';
import { generateVariants } from './lib/variant-gen';
import { modelToSpecs, mergeSpecs } from './lib/models';
import { errText } from './errText';

const STORAGE_VALUES = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

interface FormState {
  name: string;
  category: Category;
  categoryId: string | null;
  condition: Condition;
  conditionNote: string;
  cashPriceUzs: number;
  oldPriceUzs: number;
  description: string;
  imageUrl: string;
  images: string[];
  specs: ApiSpec[];
  sortOrder: number;
  isActive: boolean;
  brandId: string | null;
  slug: string;
  options: { name: string; values: string[] }[];
  variants: EditableVariant[];
}

const empty: FormState = {
  name: '', category: 'iphone', categoryId: null, condition: 'yangi', conditionNote: '',
  cashPriceUzs: 0, oldPriceUzs: 0, description: '', imageUrl: '', images: [], specs: [], sortOrder: 0, isActive: true,
  brandId: null, slug: '', options: [], variants: [],
};

const ProductForm: FC<{
  initial: ApiProduct | null;
  onSaved: () => void;
  onCancel: () => void;
}> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState<FormState>(empty);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [brands, setBrands] = useState<ApiBrand[]>([]);
  const [models, setModels] = useState<ApiDeviceModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { listCategories().then(setCategories).catch(() => setError('Kategoriyalar yuklanmadi')); }, []);
  useEffect(() => { listBrands().then(setBrands).catch(() => setError('Brendlar yuklanmadi')); }, []);
  useEffect(() => { listDeviceModels().then(setModels).catch(() => {}); }, []);

  // Saqlanmagan o'zgarish bo'lsa sahifa yopilishi/yangilanishida ogohlantirish
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!initial) { setForm(empty); return; }
    getProductDetail(initial.id).then((d) => {
      const gallery = d.images.filter((u) => u !== d.imageUrl);
      const optionValueMap = new Map<string, { optionName: string; value: string }>();
      for (const o of d.options) {
        for (const v of o.values) optionValueMap.set(v.id, { optionName: o.name, value: v.value });
      }
      setForm({
        name: d.name, category: d.category, categoryId: d.categoryId, condition: d.condition,
        conditionNote: d.conditionNote ?? '', cashPriceUzs: d.cashPriceUzs, oldPriceUzs: d.oldPriceUzs ?? 0,
        description: d.description ?? '', imageUrl: d.imageUrl, images: gallery, specs: d.specs,
        sortOrder: d.sortOrder, isActive: d.isActive,
        brandId: d.brandId, slug: d.slug ?? '',
        options: d.options.map((o) => ({ name: o.name, values: o.values.map((v) => v.value) })),
        variants: d.variants.map((v) => ({
          sku: v.sku, cashPriceUzs: v.cashPriceUzs, oldPriceUzs: v.oldPriceUzs, imageUrl: v.imageUrl, inStock: v.inStock,
          optionValues: v.optionValueIds.map((id) => optionValueMap.get(id)).filter((x): x is { optionName: string; value: string } => x !== undefined),
        })),
      });
    });
  }, [initial]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }

  function pickModel(m: ApiDeviceModel) {
    setDirty(true);
    setForm((f) => ({
      ...f,
      name: m.name,
      brandId: m.brandId,
      categoryId: m.categoryId,
      category: m.legacyCategory,
      specs: mergeSpecs(f.specs, modelToSpecs(m)),
    }));
  }

  function toggleStorage(v: string) {
    setDirty(true);
    setForm((f) => {
      const current = f.options.find((o) => o.name === 'Xotira')?.values ?? [];
      const nextValues = (current.includes(v) ? current.filter((x) => x !== v) : [...current, v])
        .sort((a, b) => STORAGE_VALUES.indexOf(a) - STORAGE_VALUES.indexOf(b));
      const others = f.options.filter((o) => o.name !== 'Xotira');
      const options = nextValues.length ? [...others, { name: 'Xotira', values: nextValues }] : others;
      return { ...f, options, variants: generateVariants(options, f.variants) };
    });
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const pricedVariants = form.variants.filter((v) => v.cashPriceUzs > 0);
      const cashPriceUzs =
        form.cashPriceUzs > 0
          ? form.cashPriceUzs
          : pricedVariants.length
            ? Math.min(...pricedVariants.map((v) => v.cashPriceUzs))
            : 0;
      const payload = {
        name: form.name, category: form.category, categoryId: form.categoryId, condition: form.condition,
        conditionNote: form.conditionNote || null, cashPriceUzs,
        oldPriceUzs: form.oldPriceUzs > 0 ? form.oldPriceUzs : null, description: form.description || null,
        imageUrl: form.imageUrl, images: form.images,
        specs: form.specs.filter((s) => s.label.trim() !== '' && s.value.trim() !== ''),
        sortOrder: form.sortOrder, isActive: form.isActive,
        brandId: form.brandId, slug: form.slug || null,
        options: form.options.filter((o) => o.name.trim() && o.values.length),
        variants: form.variants.filter((v) => v.cashPriceUzs > 0),
      };
      if (initial) await updateProduct(initial.id, payload);
      else await createProduct(payload);
      setDirty(false);
      onSaved();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-apple">
      <h3 className="font-semibold mb-4">{initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">Nomi / Model qidirish
          <ModelCombobox
            models={models}
            value={form.name}
            onChange={(t) => set('name', t)}
            onPick={pickModel}
            className={input}
          />
        </label>
        <label className="text-[13px] text-muted">Brend
          <select className={input} value={form.brandId ?? ''} onChange={(e) => set('brandId', e.target.value || null)}>
            <option value="">— tanlang —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Kategoriya (storefront)
          <select
            className={input}
            value={form.categoryId ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoryId: e.target.value || null, category: deriveLegacyCategory(e.target.value || null) }))
            }
          >
            <option value="">— tanlang —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Naqd narx (so'm)
          <PriceInput className={input} value={form.cashPriceUzs} onChange={(v) => set('cashPriceUzs', v)} />
        </label>
        <label className="text-[13px] text-muted">Eski narx (ixtiyoriy)
          <PriceInput className={input} value={form.oldPriceUzs} onChange={(v) => set('oldPriceUzs', v)} />
        </label>
        <label className="flex items-center gap-2 text-[14px] text-primary">
          <input
            type="checkbox"
            checked={form.condition === 'ishlatilgan'}
            onChange={(e) => set('condition', e.target.checked ? 'ishlatilgan' : 'yangi')}
          />
          Ishlatilgan
        </label>
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-muted mb-2">Xotira (har biri alohida narxli variant bo'ladi)</div>
        <div className="flex flex-wrap gap-2">
          {STORAGE_VALUES.map((v) => {
            const selected = (form.options.find((o) => o.name === 'Xotira')?.values ?? []).includes(v);
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleStorage(v)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold border transition-colors ${
                  selected ? 'bg-accent text-white border-accent' : 'border-line text-primary hover:border-accent'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <ImageUploader
          label="Asosiy rasm"
          images={form.imageUrl ? [form.imageUrl] : []}
          onChange={(next) => set('imageUrl', next[0] ?? '')}
        />
      </div>

      <div className="mt-4">
        <ImageUploader
          label="Galereya (qo'shimcha rasmlar)"
          images={form.images}
          onChange={(next) => set('images', next)}
          multiple
          reorderable
        />
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-muted mb-2">Xususiyatlar</div>
        <div className="space-y-2">
          {form.specs.map((s, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Nomi (Xotira)" className={input} value={s.label} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
              <input placeholder="Qiymati (256GB)" className={input} value={s.value} onChange={(e) => set('specs', form.specs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
              <button onClick={() => set('specs', form.specs.filter((_, j) => j !== i))} className="text-danger px-2">×</button>
            </div>
          ))}
        </div>
        <button onClick={() => set('specs', [...form.specs, { label: '', value: '' }])} className="text-[13px] text-accent font-semibold mt-2">+ xususiyat qo'shish</button>
      </div>

      <VariantEditor
        options={form.options}
        variants={form.variants}
        onOptionsChange={(next) => set('options', next)}
        onVariantsChange={(next) => set('variants', next)}
      />

      <label className="mt-4 flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
        Saytda ko'rsatilsin
      </label>

      {error && <p className="text-[13px] text-danger mt-3">{error}</p>}

      <div className="flex gap-3 mt-5">
        <button onClick={save} disabled={busy} className="px-6 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-60">{busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>
        <button onClick={() => { if (!dirty || window.confirm("Saqlanmagan o'zgarishlar bor. Bekor qilinsinmi?")) onCancel(); }} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default ProductForm;
