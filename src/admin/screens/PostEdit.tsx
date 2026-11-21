import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { ArrowsClockwise, ImageSquare, Trash } from '../icons';
import { useTranslation } from 'react-i18next';
import type { ApiPost } from '../../../shared/types';
import type { Locale } from '../../../app/lib/i18n';
import { PostCard, postDate } from '../../store/BlogSection';
import Markdown from '../../store/Markdown';
import { createPost, deletePost, listPosts, updatePost, uploadImage } from '../api';
import { FormError, PublishCard } from '../ContentFields';
import { errText } from '../errText';
import { PHOTO_UPLOAD, withoutId } from '../lib/content-form';
import { normalizeImage } from '../lib/image-normalize';
import RichEditor from '../RichEditor';
import StorePreview from '../StorePreview';
import { Button, Card, Field, Input, Page, Segmented, Skeleton } from '../ui';
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

type TextArea = HTMLTextAreaElement;

/** Matniga qarab o'zi cho'ziladigan, hoshiyasiz matn maydoni — sarlavha va tavsif. */
export const AutoText: FC<{ value: string; onChange: (v: string) => void; placeholder?: string; className?: string }> = ({ value, onChange, placeholder, className = '' }) => {
  const ref = useRef(null as TextArea | null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(e: { target: TextArea }) => onChange(e.target.value)}
      className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-text-faint ${className}`}
    />
  );
};

/** Muqova: bo'lsa — keng rasm, ustida «Almashtirish» va «Olib tashlash»; yo'q bo'lsa — bitta yengil tugma (fayl tashlasa ham bo'ladi). */
const CoverPicker: FC<{ url: string; onChange: (url: string) => void }> = ({ url, onChange }) => {
  const { t } = useTranslation('content');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file || !file.type.startsWith('image/')) return;
    setBusy(true);
    try {
      const { imageUrl } = await uploadImage(await normalizeImage(file, PHOTO_UPLOAD));
      onChange(imageUrl);
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }
  function pick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => upload(input.files?.[0] ?? undefined);
    input.click();
  }
  const drop = {
    onDragOver: (e: { preventDefault: () => void }) => e.preventDefault(),
    onDrop: (e: { dataTransfer: DataTransfer; preventDefault: () => void }) => { e.preventDefault(); upload(e.dataTransfer.files[0] ?? undefined); },
  };
  const pill = 'inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-medium text-text transition-colors duration-150 hover:bg-bg-subtle';

  if (!url) {
    return (
      <button type="button" onClick={pick} disabled={busy} {...drop} className="inline-flex h-9 w-fit items-center gap-2 rounded-full bg-surface-sunken px-4 text-sm font-medium text-text-muted transition-colors duration-150 hover:bg-surface-sunken-hover hover:text-text disabled:opacity-60">
        <ImageSquare weight="bold" className="size-4" />{busy ? t('postEdit.cover.uploading') : t('postEdit.cover.add')}
      </button>
    );
  }
  return (
    <div {...drop} className="group relative overflow-hidden rounded-2xl bg-surface-sunken">
      <img src={url} alt="" className={`aspect-[16/9] w-full object-cover transition-opacity ${busy ? 'opacity-50' : ''}`} />
      <div className="absolute right-3 top-3 flex gap-2 transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <button type="button" onClick={pick} className={pill}><ArrowsClockwise weight="bold" className="size-4" />{busy ? t('postEdit.cover.uploading') : t('postEdit.cover.replace')}</button>
        <button type="button" onClick={() => onChange('')} className={pill}><Trash weight="bold" className="size-4" />{t('postEdit.cover.remove')}</button>
      </div>
    </div>
  );
};

/**
 * Blog maqolasi — Medium/Substack uslubidagi yozuvchi: muqova, katta sarlavha, tavsif, asboblar paneli va matn;
 * o'ngda saytdagi maqola (yoki ro'yxat kartasi) jonli. Bir vaqtda bitta til; matn markdown bo'lib saqlanadi.
 */
const PostEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('content');
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
  const [rawLang, setLang] = useState('uz');
  const lang = rawLang as Locale;
  const [rawView, setView] = useState('article');
  const view = rawView as string;

  useEffect(() => {
    if (isNew) return;
    listPosts().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError(t('postEdit.notFound')); return; }
      setForm(withoutId(p));
      setSavedSlug(p.slug);
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };
  const ru = lang === 'ru';
  const titleKey = ru ? 'titleRu' : 'title';
  const excerptKey = ru ? 'excerptRu' : 'excerpt';
  const contentKey = ru ? 'contentRu' : 'content';

  async function save() {
    setBusy(true); setError('');
    try {
      if (isNew) {
        await createPost(form);
        setDirty(false);
        toast(t('postEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
      } else {
        // Server bo'sh slug'ni sarlavhadan yasaydi — forma saqlangan qiymatni oladi.
        const saved = await updatePost(id, form);
        setForm(withoutId(saved));
        setSavedSlug(saved.slug);
        setDirty(false);
        toast(t('shared.savedLive'));
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: t('postEdit.confirmDelete', { name: form.title }),
      message: t('postEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deletePost(id);
      setDirty(false);
      toast(t('postEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = dirty && !busy && form.title.trim() !== '';
  const siteHref = !isNew && form.isActive && savedSlug ? `/blog/${savedSlug}` : undefined;
  // Saytdagidek: ruscha bo'sh bo'lsa o'zbekchasi.
  const pick = (uz: string, r: string) => (ru && r.trim() ? r : uz);
  const previewTitle = pick(form.title, form.titleRu) || t('postEdit.untitled');
  const previewPost: ApiPost = { ...form, id: 'preview', title: previewTitle, titleRu: previewTitle, slug: savedSlug || 'preview' };

  return (
    <Page
      title={isNew ? t('postEdit.newTitle') : t('postEdit.untitled')}
      back={LIST}
      dirty={dirty}
      actions={(
        <>
          <Segmented
            label={t('newsEdit.lang.title')}
            value={lang}
            onChange={setLang}
            options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
            className="max-sm:hidden"
          />
          {siteHref && <Button variant="outline" href={siteHref} external className="max-sm:hidden">{t('shared.viewOnSite')}</Button>}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-8">
            {error && <FormError text={error} />}

            {/* Yozuvchi: hamma narsa bitta oq varaqda, hoshiyasiz — faqat matn. */}
            <article className="flex w-full max-w-[720px] flex-col">
              <Segmented
                label={t('newsEdit.lang.title')}
                value={lang}
                onChange={setLang}
                options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
                className="mb-5 sm:hidden"
              />
              <CoverPicker url={form.coverUrl} onChange={(v) => set('coverUrl', v)} />

              <AutoText
                value={form[titleKey]}
                onChange={(v) => set(titleKey, v)}
                placeholder={ru ? form.title || t('postEdit.titlePlaceholder') : t('postEdit.titlePlaceholder')}
                className="mt-8 text-[34px] font-semibold leading-[1.15] tracking-tight text-text"
              />
              <AutoText
                value={form[excerptKey]}
                onChange={(v) => set(excerptKey, v)}
                placeholder={ru ? form.excerpt || t('postEdit.excerptPlaceholder') : t('postEdit.excerptPlaceholder')}
                className="mt-3 text-lg leading-relaxed text-text-muted"
              />

              <div className="mt-8">
                <RichEditor
                  value={form[contentKey]}
                  onChange={(v) => set(contentKey, v)}
                  resetKey={`${lang}-${loaded}`}
                  placeholder={ru && form.content ? t('postEdit.ruFallback') : t('postEdit.bodyPlaceholder')}
                  stickyTop="top-[108px]"
                />
              </div>
              <p className="mt-6 text-sm text-text-faint">{t('postEdit.hint')}</p>
            </article>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title={t('postEdit.addressTitle')}>
                <div className="flex flex-col gap-4">
                  <Field label={t('shared.slug')} hint={t('postEdit.slugHint')}>
                    <Input value={form.slug} onChange={(v) => set('slug', v)} placeholder={t('postEdit.slugPlaceholder')} />
                  </Field>
                  <Field label={t('shared.date')} hint={t('postEdit.dateHint')}>
                    <Input type="date" value={form.publishedAt} onChange={(v) => set('publishedAt', v)} />
                  </Field>
                </div>
              </Card>
              <PublishCard
                active={form.isActive}
                onActive={(v) => set('isActive', v)}
                sortOrder={form.sortOrder}
                onSort={(n) => set('sortOrder', n)}
                sortHint={t('postEdit.sortHint')}
                address={savedSlug ? `/blog/${savedSlug}` : ''}
                siteHref={siteHref}
                onDelete={isNew ? undefined : remove}
                deleteLabel={t('postEdit.deleteButton')}
              />
            </div>
          </div>

          {/* Jonli ko'rinish: saytning o'z komponentlari, o'z CSS'i bilan (Shadow DOM). */}
          <aside className="flex min-w-0 flex-col gap-3 rounded-surface bg-surface-sunken p-3 xl:sticky xl:top-28">
            <div className="flex items-center justify-between gap-3 pl-2">
              <span className="text-base font-semibold text-text">{t('shared.previewTitle')}</span>
              <Segmented
                size="sm"
                label={t('shared.previewTitle')}
                value={view}
                onChange={setView}
                options={[{ id: 'article', label: t('postEdit.preview.article') }, { id: 'card', label: t('postEdit.preview.card') }]}
              />
            </div>
            <div className="thin-scroll overflow-y-auto rounded-[14px] bg-surface xl:max-h-[calc(100dvh-13rem)]">
              <StorePreview className="pointer-events-none">
                {view === 'article' ? (
                  // Klasslar `blog.$slug.tsx`dagi bilan aynan bir xil — Shadow DOM'da faqat sayt CSS'idagi klasslar ishlaydi.
                  <div className="bg-bg" style={{ zoom: 0.72 }}>
                    <article className="mx-auto max-w-[760px] px-4 py-10 md:py-14">
                      {form.publishedAt && <div className="text-label text-muted-2">{postDate(form.publishedAt, lang)}</div>}
                      <h1 className="mt-2 mb-6 text-heading font-semibold text-primary md:text-title">{previewTitle}</h1>
                      {form.coverUrl && <img src={form.coverUrl} alt="" className="rounded-lg mb-8 w-full object-cover" />}
                      <Markdown source={pick(form.content, form.contentRu)} />
                    </article>
                  </div>
                ) : (
                  <div className="bg-bg px-4 py-10">
                    <PostCard post={previewPost} locale={lang} className="min-h-[260px]" />
                  </div>
                )}
              </StorePreview>
            </div>
          </aside>
        </div>
      )}
    </Page>
  );
};

export default PostEdit;
