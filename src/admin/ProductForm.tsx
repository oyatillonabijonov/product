import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiBrand, ApiCategory, ApiProduct, ApiSpec, Category, Condition } from '../../shared/types';
import { createProduct, getProductDetail, listBrands, listCategories, updateProduct, uploadImage } from './api';
import VariantEditor from './VariantEditor';
import type { EditableVariant } from './VariantEditor';

const CATEGORIES: Category[] = ['iphone', 'mac', 'ipad', 'pc'];
const CONDITIONS: Condition[] = ['yangi', 'ishlatilgan'];

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { listCategories().then(setCategories); }, []);
  useEffect(() => { listBrands().then(setBrands); }, []);

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
  }

  async function uploadMain(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(file); set('imageUrl', imageUrl); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }

  async function uploadGallery(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(file); set('images', [...form.images, imageUrl]); }
    catch { setError('Rasm yuklanmadi'); } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        name: form.name, category: form.category, categoryId: form.categoryId, condition: form.condition,
        conditionNote: form.conditionNote || null, cashPriceUzs: form.cashPriceUzs,
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
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'xatolik');
    } finally {
      setBusy(false);
    }
  }

  const input = 'w-full border border-line rounded-xl px-3 py-2 focus:outline-none focus:border-accent';
  return (
    <div className="bg-white rounded-[20px] p-6 mb-6 shadow-[--shadow-apple]">
      <h3 className="font-semibold mb-4">{initial ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">Nomi
          <input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="text-[13px] text-muted">Slug (ixtiyoriy)
          <input className={input} value={form.slug} onChange={(e) => set('slug', e.target.value)} />
        </label>
        <label className="text-[13px] text-muted">Brend
          <select className={input} value={form.brandId ?? ''} onChange={(e) => set('brandId', e.target.value || null)}>
            <option value="">— tanlang —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Naqd narx (so'm)
          <input type="number" className={input} value={form.cashPriceUzs} onChange={(e) => set('cashPriceUzs', Number(e.target.value))} />
        </label>
        <label className="text-[13px] text-muted">Eski narx (chegirma uchun, ixtiyoriy)
          <input type="number" className={input} value={form.oldPriceUzs} onChange={(e) => set('oldPriceUzs', Number(e.target.value))} />
        </label>
        <label className="text-[13px] text-muted">Kategoriya (storefront)
          <select className={input} value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value || null)}>
            <option value="">— tanlang —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Tur (eski)
          <select className={input} value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Holati
          <select className={input} value={form.condition} onChange={(e) => set('condition', e.target.value as Condition)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-[13px] text-muted">Holat izohi (ixtiyoriy)
          <input className={input} value={form.conditionNote} onChange={(e) => set('conditionNote', e.target.value)} />
        </label>
        <label className="text-[13px] text-muted">Tartib raqami
          <input type="number" className={input} value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} />
        </label>
      </div>

      <label className="block text-[13px] text-muted mt-3">Tavsif
        <textarea className={`${input} min-h-[90px]`} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </label>

      <div className="mt-4">
        <div className="text-[13px] text-muted mb-2">Asosiy rasm</div>
        <div className="flex items-center gap-4">
          {form.imageUrl ? <img src={form.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg bg-bg" /> : <div className="w-16 h-16 rounded-lg bg-bg" />}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadMain} />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-muted mb-2">Galereya (qo'shimcha rasmlar)</div>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {form.images.map((img, i) => (
            <div key={i} className="relative">
              <img src={img} alt="" className="w-14 h-14 object-contain rounded-lg bg-bg" />
              <button onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger text-white text-[11px]">×</button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadGallery} />
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
        <button onClick={onCancel} className="px-6 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default ProductForm;
