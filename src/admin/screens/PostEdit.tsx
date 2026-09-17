import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import type { ApiPost } from '../../../shared/types';
import { createPost, deletePost, listPosts, updatePost } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import MarkdownHelp from '../MarkdownHelp';
import { Button, Card, Field, Input, LangPair, Page, Skeleton, SwitchRow } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/content/posts';

type Form = Omit<ApiPost, 'id'>;
const EMPTY: Form = {
  slug: '', title: '', titleRu: '', excerpt: '', excerptRu: '', content: '', contentRu: '',
  coverUrl: '', publishedAt: '', sortOrder: 0, isActive: true,
};

/** Brauzerning bugungi sanasi (YYYY-MM-DD) — yangi maqolaga. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Blog maqolasi tahriri. `id` = 'new' yoki maqola id'si. */
const PostEdit: FC<{ id: string }> = ({ id }) => {
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState((isNew ? { ...EMPTY, publishedAt: today() } : EMPTY) as Form);
  const form = rawForm as Form;
  // "Saytda ko'rish" saqlangan slug bo'yicha — maydonda yozilayotgani hali saytda yo'q.
  const [savedSlug, setSavedSlug] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isNew) return;
    listPosts().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError('Maqola topilmadi'); return; }
      setForm(withoutId(p));
      setSavedSlug(p.slug);
      setLoaded(true);
    }).catch(() => setError('Yuklashda xatolik'));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createPost(form);
        setDirty(false);
        toast("Maqola qo'shildi");
        navigate(LIST, { state: { leave: true } });
      } else {
        // Server bo'sh slug'ni sarlavhadan yasaydi — forma saqlangan qiymatni oladi.
        const saved = await updatePost(id, form);
        setForm(withoutId(saved));
        setSavedSlug(saved.slug);
        setDirty(false);
        toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `«${form.title}» maqolasini o'chirish`,
      message: "Maqola blogdan olib tashlanadi. Faqat yashirish kerak bo'lsa «Saytda ko'rsatilsin»ni o'chiring.",
      confirmLabel: "O'chirish", destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(id);
      setDirty(false);
      toast("Maqola o'chirildi");
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';

  return (
    <Page
      title={isNew ? 'Yangi maqola' : form.title || 'Maqola'}
      back={LIST}
      dirty={dirty}
      actions={(
        <>
          {!isNew && form.isActive && savedSlug && <Button variant="quiet" href={`/blog/${savedSlug}`} external>Saytda ko'rish</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="flex flex-col gap-4">
          {error && <p className="text-para text-danger">{error}</p>}
          <Card title="Muqova" description="Blog ro'yxatidagi kartada va maqola tepasida chiqadi.">
            <ImageUploader label="Muqova rasmi" images={form.coverUrl ? [form.coverUrl] : []} onChange={(next) => set('coverUrl', next[0] ?? '')} normalize={PHOTO_UPLOAD} />
          </Card>
          <Card title="Sarlavha va qisqa matn">
            <div className="flex flex-col gap-4">
              <LangPair label="Sarlavha" required uz={form.title} ru={form.titleRu} onUz={(v) => set('title', v)} onRu={(v) => set('titleRu', v)} />
              <LangPair label="Qisqa matn" kind="textarea" rows={2} hint="Ro'yxatdagi kartada chiqadi" uz={form.excerpt} ru={form.excerptRu} onUz={(v) => set('excerpt', v)} onRu={(v) => set('excerptRu', v)} />
            </div>
          </Card>
          <Card title="Matn">
            <div className="flex flex-col gap-3">
              <LangPair label="Matn" kind="textarea" rows={14} mono uz={form.content} ru={form.contentRu} onUz={(v) => set('content', v)} onRu={(v) => set('contentRu', v)} />
              <MarkdownHelp />
            </div>
          </Card>
          <Card title="Manzil va ko'rinish">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug" hint="Saytdagi /blog/<slug> manzili; bo'sh qolsa sarlavhadan yasaladi">
                <Input value={form.slug} onChange={(v) => set('slug', v)} placeholder="montaj-uchun-pc" />
              </Field>
              <Field label="Sana" hint="Bo'sh bo'lsa sana ko'rsatilmaydi; blog yangisidan boshlanadi">
                <Input type="date" value={form.publishedAt} onChange={(v) => set('publishedAt', v)} />
              </Field>
              <Field label="Tartib" hint="Bir kundagi maqolalar orasida — kichiki oldin">
                <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
              </Field>
            </div>
            <div className="mt-2 divide-y divide-line">
              <SwitchRow label="Saytda ko'rsatilsin" on={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </Card>
          {!isNew && (
            <Card title="Xavfli zona">
              <Button variant="destructive" onClick={remove}>Maqolani o'chirish</Button>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
};

export default PostEdit;
