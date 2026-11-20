import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { ArrowSquareOut, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiPage } from '../../../shared/types';
import type { Locale } from '../../../app/lib/i18n';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { createPage, deletePage, listPages, updatePage } from '../api';
import { ContentFields, FormError, LiveSwitch, useSiteContent } from '../ContentFields';
import { errText } from '../errText';
import RichEditor from '../RichEditor';
import { Button, Card, Page, Segmented, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';
import { AutoText } from './PostEdit';

const LIST = '/admin/content/pages';

interface Form { slug: string; titleUz: string; titleRu: string; contentUz: string; contentRu: string; sortOrder: number; isActive: boolean }
const EMPTY: Form = { slug: '', titleUz: '', titleRu: '', contentUz: '', contentRu: '', sortOrder: 0, isActive: true };

/** Sarlavhadan manzil: tutuq belgisi tushadi («To'lov» → «tolov»), qolgani kichik lotin, raqam va «-». */
const slugFrom = (title: string) => title.toLowerCase().replace(/[ʻʼ'`‘’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function toForm(p: ApiPage): Form {
  return { slug: p.slug, titleUz: p.title.uz, titleRu: p.title.ru, contentUz: p.content.uz, contentRu: p.content.ru, sortOrder: p.sortOrder, isActive: p.isActive };
}

/**
 * Sahifa — chapda hujjat varag'i (sarlavha, huquqiy sahifada izoh, vizual matn), o'ngda holat, manzil va mundarija.
 * `biz-haqimizda` matn o'rniga o'z bloklari va fotolari bilan. Maxsus sahifaning manzili o'zgarmaydi, o'chirilmaydi.
 * ponytail: tartib raqami UI'dan olib tashlandi — qiymati saqlanib qaytariladi.
 */
const PageEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation('content');
  const isNew = id === 'new';
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawInitial, setInitial] = useState(null as ApiPage | null);
  const initial = rawInitial as ApiPage | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rawLang, setLang] = useState('uz');
  const lang = rawLang as Locale;
  // Yangi sahifada manzil sarlavhadan yoziladi, foydalanuvchi o'zi o'zgartirguncha.
  const [slugTouched, setSlugTouched] = useState(false);

  const savedSlug = initial?.slug ?? '';
  const isAbout = savedSlug === ABOUT_SLUG;
  const ledeKey = LEGAL_LEDE_KEYS[savedSlug];
  const special = isAbout || Boolean(ledeKey);
  // Oddiy sahifada kalit ro'yxati bo'sh — sayt matni yuklanadi, lekin hech narsa chizilmaydi.
  const content = useSiteContent(isAbout ? 'about' : 'legal', isAbout ? undefined : ledeKey ? [ledeKey] : []);

  useEffect(() => {
    if (isNew) return;
    listPages().then((all) => {
      const p = all.find((x) => x.id === id);
      if (!p) { setError(t('pageEdit.notFound')); return; }
      setInitial(p);
      setForm(toForm(p));
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [id, isNew]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };
  const ru = lang === 'ru';
  const titleKey = ru ? 'titleRu' : 'titleUz';
  const contentKey = ru ? 'contentRu' : 'contentUz';

  async function save() {
    setBusy(true); setError('');
    // Ruscha sarlavha serverda majburiy: bo'sh qolsa o'zbekchasi yoziladi (saytdagi "ruscha bo'lmasa o'zbekchasi" qoidasi).
    const payload: Partial<ApiPage> = {
      slug: form.slug.trim(),
      title: { uz: form.titleUz, ru: form.titleRu.trim() || form.titleUz },
      content: { uz: form.contentUz, ru: form.contentRu },
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };
    try {
      if (isNew) {
        await createPage(payload);
        setDirty(false);
        toast(t('pageEdit.toastCreated'));
        navigate(LIST, { state: { leave: true } });
        return;
      }
      if (dirty) {
        const saved = await updatePage(id, payload);
        setInitial(saved);
        setForm(toForm(saved));
        setDirty(false);
      }
      if (content.dirty) await content.save();
      toast(t('shared.savedLive'));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: t('pageEdit.confirmDelete', { name: initial.title.uz }),
      message: t('pageEdit.confirmDeleteMessage'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deletePage(id);
      setDirty(false);
      toast(t('pageEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const canSave = (dirty || content.dirty) && !busy && form.titleUz.trim() !== '' && form.slug.trim() !== '';
  const siteHref = initial?.isActive ? `/page/${savedSlug}` : undefined;
  const langSwitch = (className: string) => (
    <Segmented
      label={t('newsEdit.lang.title')}
      value={lang}
      onChange={setLang}
      options={[{ id: 'uz', label: t('newsEdit.lang.uz') }, { id: 'ru', label: t('newsEdit.lang.ru') }]}
      className={className}
    />
  );
  const lede = ledeKey ? content.texts[ledeKey] : undefined;
  // Mundarija — matndagi `##` sarlavhalar; bosilsa muharrirdagi o'sha sarlavhaga suriladi.
  const outline = form[contentKey].split('\n').filter((l) => /^##\s/.test(l)).map((l) => l.replace(/^##\s+/, '').replace(/\*\*/g, ''));
  const jumpTo = (i: number) => document.querySelectorAll('[role="textbox"] h2')[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const titleField = (
    <AutoText
      value={form[titleKey]}
      onChange={(v) => { set(titleKey, v); if (isNew && !ru && !slugTouched) set('slug', slugFrom(v)); }}
      placeholder={ru ? form.titleUz || t('pageEdit.titlePlaceholder') : t('pageEdit.titlePlaceholder')}
      className="text-[36px] font-semibold leading-[1.15] tracking-tight text-text"
    />
  );

  return (
    <Page
      title={isNew ? t('pageEdit.newTitle') : t('pageEdit.untitled')}
      back={LIST}
      dirty={dirty || content.dirty}
      actions={(
        <>
          {langSwitch('max-sm:hidden')}
          <Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>
        </>
      )}
    >
      {!loaded && !error ? <Skeleton rows={6} /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {error && <FormError text={error} />}
            {langSwitch('sm:hidden')}

            {isAbout ? titleField : (
              /* Hujjat: kulrang stol ustida oq varaq — sahifa saytda qanday o'qilsa, shunday yoziladi. */
              <article className="rounded-surface bg-surface-sunken p-2">
                <div className="rounded-control-lg bg-surface px-5 py-6 sm:px-12 sm:py-10">
                  <div className="mx-auto max-w-[720px]">
                    <RichEditor
                      value={form[contentKey]}
                      onChange={(v) => set(contentKey, v)}
                      resetKey={`${lang}-${loaded}`}
                      placeholder={ru && form.contentUz ? t('pageEdit.ruFallback') : t('pageEdit.bodyPlaceholder')}
                      stickyTop="top-[108px]"
                      header={(
                        <div className="mt-8 border-b border-border pb-6">
                          {titleField}
                          {ledeKey && lede && (
                            <AutoText
                              value={lede[lang]}
                              onChange={(v) => content.setText(ledeKey, lang, v)}
                              placeholder={t('pageEdit.ledePlaceholder')}
                              className="mt-3 text-lg leading-relaxed text-text-muted"
                            />
                          )}
                        </div>
                      )}
                    />
                  </div>
                </div>
              </article>
            )}

            {isAbout && <ContentFields content={content} lang={lang} />}
          </div>

          <aside className="flex flex-col gap-4 xl:sticky xl:top-[108px]">
            <Card title={t('publish.title')}>
              <LiveSwitch on={form.isActive} onChange={(v) => set('isActive', v)} />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-text">{t('publish.address')}</span>
                {special ? (
                  <>
                    <span className="truncate font-mono text-sm text-text-muted">/page/{form.slug}</span>
                    <span className="text-sm text-text-faint">{t('pageEdit.slugFixed')}</span>
                  </>
                ) : (
                  <label className="flex h-control-md items-center rounded-control bg-surface-sunken px-3 font-mono text-sm transition-colors focus-within:bg-surface focus-within:ring-2 focus-within:ring-accent/40 hover:bg-surface-sunken-hover">
                    <span className="text-text-faint">/page/</span>
                    <input
                      value={form.slug}
                      onChange={(e: { target: HTMLInputElement }) => { setSlugTouched(true); set('slug', e.target.value.toLowerCase()); }}
                      placeholder={t('pageEdit.slugPlaceholder')}
                      aria-label={t('shared.slug')}
                      className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-faint"
                    />
                  </label>
                )}
              </div>
              {siteHref && (
                <Button variant="secondary" href={siteHref} external className="w-full"><ArrowSquareOut />{t('shared.viewOnSite')}</Button>
              )}
            </Card>

            {!isAbout && (
              <Card title={t('pageEdit.outline')} className="max-xl:hidden">
                {outline.length === 0 ? (
                  <p className="text-sm leading-relaxed text-text-muted">{t('pageEdit.outlineEmpty')}</p>
                ) : (
                  <ol className="-mx-2 -my-1 flex flex-col">
                    {outline.map((h, i) => (
                      <li key={`${i}-${h}`}>
                        <button
                          type="button"
                          onClick={() => jumpTo(i)}
                          className="flex w-full items-baseline gap-2.5 rounded-full px-2 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-surface-sunken-hover hover:text-text"
                        >
                          <span className="w-4 shrink-0 text-right tabular-nums text-text-faint">{i + 1}</span>
                          <span className="min-w-0 truncate">{h}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            )}

            {!isNew && !special && (
              <Button variant="dangerSoft" onClick={remove} className="w-full"><Trash />{t('pageEdit.deleteButton')}</Button>
            )}
          </aside>
        </div>
      )}
    </Page>
  );
};

export default PageEdit;
