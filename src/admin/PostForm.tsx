import { useState } from 'react';
import type { FC } from 'react';
import type { ApiPost } from '../../shared/types';
import { createPost, updatePost, uploadImage } from './api';
import { errText } from './errText';

const input = 'w-full border border-line-2 rounded-xl px-3 py-2 text-[14px]';
const area = `${input} min-h-[160px] font-mono text-[13px]`;

const PostForm: FC<{ initial: ApiPost | null; onSaved: () => void; onCancel: () => void }> = ({ initial, onSaved, onCancel }) => {
  const [form, setForm] = useState({
    slug: initial?.slug ?? '',
    title: initial?.title ?? '',
    titleRu: initial?.titleRu ?? '',
    excerpt: initial?.excerpt ?? '',
    excerptRu: initial?.excerptRu ?? '',
    content: initial?.content ?? '',
    contentRu: initial?.contentRu ?? '',
    coverUrl: initial?.coverUrl ?? '',
    publishedAt: initial?.publishedAt ?? '',
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { const { imageUrl } = await uploadImage(file); set('coverUrl', imageUrl); }
    catch { setError('Rasm yuklashda xatolik'); }
    finally { setBusy(false); }
  }

  async function save() {
    if (!form.title.trim()) { setError('Sarlavha majburiy'); return; }
    setBusy(true); setError('');
    try {
      if (initial) await updatePost(initial.id, form);
      else await createPost(form);
      onSaved();
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-2xl p-5 mb-4 shadow-apple space-y-3">
      <h3 className="font-semibold">{initial ? 'Maqolani tahrirlash' : 'Yangi maqola'}</h3>

      <div className="flex items-center gap-3">
        {form.coverUrl
          ? <img src={form.coverUrl} alt="" className="h-20 w-32 rounded-xl object-cover bg-bg" />
          : <div className="h-20 w-32 rounded-xl bg-bg" />}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[13px] text-muted">Sarlavha (uz)
          <input value={form.title} onChange={(e) => set('title', e.target.value)} className={input} />
        </label>
        <label className="text-[13px] text-muted">Заголовок (ru)
          <input value={form.titleRu} onChange={(e) => set('titleRu', e.target.value)} className={input} />
        </label>
        <label className="text-[13px] text-muted">Qisqa matn (uz)
          <input value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} className={input} />
        </label>
        <label className="text-[13px] text-muted">Краткий текст (ru)
          <input value={form.excerptRu} onChange={(e) => set('excerptRu', e.target.value)} className={input} />
        </label>
      </div>

      <label className="block text-[13px] text-muted">Matn (uz) — markdown
        <textarea value={form.content} onChange={(e) => set('content', e.target.value)} className={area} />
      </label>
      <label className="block text-[13px] text-muted">Текст (ru) — markdown
        <textarea value={form.contentRu} onChange={(e) => set('contentRu', e.target.value)} className={area} />
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-[13px] text-muted">Slug (bo'sh qoldirsangiz sarlavhadan yasaladi)
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="masalan: montaj-uchun-pc" className={input} />
        </label>
        <label className="text-[13px] text-muted">Sana
          <input type="date" value={form.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} className={input} />
        </label>
        <label className="text-[13px] text-muted">Tartib
          <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} className="ml-2 w-20 border border-line-2 rounded-xl px-2 py-1.5" />
        </label>
        <label className="text-[13px] text-muted flex items-center gap-2 pb-2">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Faol
        </label>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50">Saqlash</button>
        <button onClick={onCancel} className="px-5 py-2.5 text-muted font-semibold rounded-full">Bekor qilish</button>
      </div>
    </div>
  );
};

export default PostForm;
