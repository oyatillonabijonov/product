import { useState } from 'react';
import type { FC } from 'react';
import type { ApiPage } from '../../shared/types';
import { createPage, updatePage } from './api';
import { errText } from './errText';

const input = 'rounded-sm w-full border border-line-2 px-3 py-2 text-[14px]';
const area = `${input} min-h-[220px] font-mono text-[13px]`;

/** Sahifa matni markdown-lite: `## sarlavha`, `### kichik sarlavha`, `- ro'yxat`, **qalin**, [havola](url). */
const PageForm: FC<{ initial: ApiPage | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState({
    slug: initial?.slug ?? '',
    titleUz: initial?.title.uz ?? '',
    titleRu: initial?.title.ru ?? '',
    contentUz: initial?.content.uz ?? '',
    contentRu: initial?.content.ru ?? '',
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  async function save() {
    setBusy(true); setError('');
    // en/uzCyrl ustunlari saytda chiqmaydi — eski qiymat saqlanadi, yangi sahifada bo'sh.
    const payload: Partial<ApiPage> = {
      slug: form.slug.trim(),
      title: { uz: form.titleUz, ru: form.titleRu, en: initial?.title.en ?? '', uzCyrl: initial?.title.uzCyrl ?? '' },
      content: { uz: form.contentUz, ru: form.contentRu, en: initial?.content.en ?? '', uzCyrl: initial?.content.uzCyrl ?? '' },
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (initial) await updatePage(initial.id, payload);
      else await createPage(payload);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="rounded-md bg-white p-5 mb-4 space-y-3">
      <h3 className="font-semibold">{initial ? 'Sahifani tahrirlash' : 'Yangi sahifa'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">Sarlavha (uz)
          <input value={form.titleUz} onChange={(e) => set('titleUz', e.target.value)} className={input} />
        </label>
        <label className="text-[13px] text-muted">Заголовок (ru)
          <input value={form.titleRu} onChange={(e) => set('titleRu', e.target.value)} className={input} />
        </label>
      </div>
      <label className="block text-[13px] text-muted">Matn (uz) — markdown
        <textarea value={form.contentUz} onChange={(e) => set('contentUz', e.target.value)} className={area} />
      </label>
      <label className="block text-[13px] text-muted">Текст (ru) — markdown
        <textarea value={form.contentRu} onChange={(e) => set('contentRu', e.target.value)} className={area} />
      </label>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-[13px] text-muted">Slug (manzil: /page/slug)
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="masalan: qaytarish" className={input} />
        </label>
        <label className="text-[13px] text-muted">Tartib
          <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="rounded-sm ml-2 w-20 border border-line-2 px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-muted flex items-center gap-2 pb-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Faol (footer'da ko'rinadi)
        </label>
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="press px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="press px-5 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default PageForm;
