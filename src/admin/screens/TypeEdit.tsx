import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router';
import { FloppyDisk, Image as ImageIcon, Plus, Tag, TextAa, Trash, Warning, WarningCircle, X } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiCategory, ApiProductType } from '../../../shared/types';
import { createType, deleteType, listCategories, listTypes, updateType, type AdminTypeInput } from '../api';
import { errText } from '../errText';
import ImageUploader from '../ImageUploader';
import { Button, Card, Field, INPUT_CLS, Input, Page, Select } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const LIST = '/admin/products/types';

const stagger = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Nomdan id — serverdagi `slugify` bilan bir xil qoida (kichik lotin, raqam, `-`). */
function slugId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

interface Form { categoryId: string; id: string; label: string; labelRu: string; iconUrl: string; billzAliases: string[]; sortOrder: number }
const EMPTY: Form = { categoryId: '', id: '', label: '', labelRu: '', iconUrl: '', billzAliases: [], sortOrder: 0 };

/**
 * Tur tahriri. `id` = 'new' yoki `${categoryId}/${typeId}` (yaratilgandan keyin id/yo'nalish o'zgarmaydi).
 * Kartalar: Asosiy · Ikonka (yuklagich + saytdagidek katta ko'rinishi) · Billz aliaslari · Xavfli zona.
 */
const TypeEdit: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation(['products', 'common']);
  const isNew = id === 'new';
  const [catParam, typeParam] = isNew ? ['', ''] : id.split('/');
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [rawForm, setForm] = useState(EMPTY as Form);
  const form = rawForm as Form;
  const [rawCats, setCats] = useState([] as ApiCategory[]);
  const cats = rawCats as ApiCategory[];
  const [rawCurrent, setCurrent] = useState(null as ApiProductType | null);
  const current = rawCurrent as ApiProductType | null;
  const [loaded, setLoaded] = useState(isNew);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [alias, setAlias] = useState('');

  useEffect(() => {
    listCategories().then(setCats).catch(() => setError(t('typeEdit.categoriesLoadError')));
    if (isNew) return;
    listTypes().then((all) => {
      const found = all.find((x) => x.categoryId === catParam && x.id === typeParam);
      if (!found) { setError(t('typeEdit.notFound')); return; }
      setCurrent(found);
      setForm({ categoryId: found.categoryId, id: found.id, label: found.label, labelRu: found.labelRu, iconUrl: found.iconUrl, billzAliases: found.billzAliases, sortOrder: found.sortOrder });
      setLoaded(true);
    }).catch(() => setError(t('shared.loadError')));
  }, [isNew, catParam, typeParam]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f: Form) => ({ ...f, [k]: v })); setDirty(true); };

  function addAlias() {
    const a = alias.trim();
    setAlias('');
    if (!a || form.billzAliases.some((x) => x.toLowerCase() === a.toLowerCase())) return;
    set('billzAliases', [...form.billzAliases, a]);
  }

  async function save() {
    setBusy(true); setError('');
    const body: AdminTypeInput = {
      id: form.id || undefined, categoryId: form.categoryId, label: form.label, labelRu: form.labelRu,
      iconUrl: form.iconUrl, billzAliases: form.billzAliases, sortOrder: form.sortOrder,
    };
    try {
      if (isNew) {
        const created = await createType(body);
        setDirty(false);
        toast(t('typeEdit.toastCreated'));
        navigate(`${LIST}/${created.categoryId}/${created.id}`, { replace: true, state: { leave: true } });
      } else {
        const saved = await updateType(catParam, typeParam, body);
        setCurrent(saved);
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
    if (!current) return;
    const n = current.productCount;
    const ok = await confirm({
      title: t('typeEdit.confirmDelete', { name: current.label }),
      message: n > 0 ? t('typeEdit.confirmDeleteWithProducts', { count: n }) : t('typeEdit.confirmDeleteEmpty'),
      confirmLabel: t('shared.delete'), destructive: true,
    });
    if (!ok) return;
    try {
      await deleteType(catParam, typeParam);
      setDirty(false);
      toast(t('typeEdit.toastDeleted'));
      navigate(LIST, { state: { leave: true } });
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const title = isNew ? t('typeEdit.newType') : current?.label ?? t('typeEdit.fallbackTitle');
  const canSave = dirty && !busy && form.label.trim() !== '' && form.categoryId !== '' && form.iconUrl !== '';

  return (
    <Page
      title={title}
      back={LIST}
      dirty={dirty}
      description={current ? t('typeEdit.productCount', { n: current.productCount }) : undefined}
      actions={<Button onClick={save} disabled={!canSave}><FloppyDisk weight="fill" />{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      {!loaded && !error ? (
        <div aria-busy="true" aria-label={t('common:loading')} className="flex max-w-4xl flex-col gap-4">
          <div className="skeleton h-[260px] rounded-surface" />
          <div className="skeleton h-[300px] rounded-surface" />
        </div>
      ) : (
        // Bitta ustunli forma — keng ekranda cho'zilmaydi (o'qish qulay kenglik).
        <div className="flex max-w-4xl flex-col gap-4">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-surface bg-danger-soft px-5 py-4 text-base text-danger-strong">
              <WarningCircle weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-danger" />
              <span className="min-w-0">{error}</span>
            </div>
          )}

          <div className="stagger" style={stagger(0)}>
            <Card icon={TextAa} hue="blue" title={t('shared.basicInfo')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('typeEdit.categoryFieldLabel')} required>
                  <Select value={form.categoryId} onChange={(v) => set('categoryId', v)} disabled={!isNew}>
                    <option value="">{t('shared.selectPlaceholder')}</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="ID" hint={isNew ? t('typeEdit.idHintNew') : t('typeEdit.idHintExisting')} required>
                  <Input value={form.id} onChange={(v) => set('id', v)} placeholder={slugId(form.label)} disabled={!isNew} />
                </Field>
                <Field label={t('shared.name')} required>
                  <Input value={form.label} onChange={(v) => set('label', v)} />
                </Field>
                <Field label={t('typeEdit.nameRuLabel')} hint={t('common:ruHint')}>
                  <Input value={form.labelRu} onChange={(v) => set('labelRu', v)} />
                </Field>
                <Field label={t('shared.sortOrder')} hint={t('typeEdit.sortHint')}>
                  <Input type="number" value={String(form.sortOrder)} onChange={(v) => set('sortOrder', Number(v) || 0)} />
                </Field>
              </div>
            </Card>
          </div>

          <div className="stagger" style={stagger(1)}>
            <Card icon={ImageIcon} hue="violet" title={t('typeEdit.icon.title')} description={t('typeEdit.icon.desc')}>
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
                <ImageUploader
                  label=""
                  images={form.iconUrl ? [form.iconUrl] : []}
                  onChange={(next) => set('iconUrl', next[0] ?? '')}
                  normalize={{ maxSize: 220, maxHeight: 136, quality: 0.8 }}
                  accept="image/png,image/webp"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-text">{t('typeEdit.previewTitle')}</p>
                  {/* Saytdagi tur qatori: karta yo'q, ikonka sahifa fonida (bu yerda oq orolcha), ostida qalin nom; pastki chetlar bir chiziqda. */}
                  <div className="flex aspect-[220/150] flex-col items-center justify-end gap-2 rounded-control-lg bg-surface p-4">
                    {form.iconUrl ? (
                      <img src={form.iconUrl} alt="" className="max-h-[78%] max-w-full animate-fade-in object-contain object-bottom" />
                    ) : (
                      <span className="grid flex-1 place-items-center text-sm text-text-faint">{t('typeEdit.previewEmpty')}</span>
                    )}
                    <span className="max-w-full truncate text-sm font-semibold text-text">{form.label || t('typeEdit.fallbackTitle')}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div className="stagger" style={stagger(2)}>
            <Card icon={Tag} hue="orange" title={t('shared.billzAliases')} description={t('typeEdit.aliasesDesc')}>
              {form.billzAliases.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.billzAliases.map((a) => (
                    <span key={a} className="inline-flex h-8 animate-fade-in items-center gap-1 rounded-full bg-surface-sunken pl-3 pr-1 text-base font-medium text-text">
                      {a}
                      <button
                        type="button"
                        aria-label={t('typeEdit.aliasRemoveLabel', { alias: a })}
                        title={t('typeEdit.aliasRemoveLabel', { alias: a })}
                        onClick={() => set('billzAliases', form.billzAliases.filter((x) => x !== a))}
                        className="grid size-6 place-items-center rounded-full text-text-muted transition-colors hover:bg-danger-soft hover:text-danger-text"
                      >
                        <X weight="bold" aria-hidden className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                {/* Kit `Input`i onKeyDown bermaydi — native input o'sha `INPUT_CLS` bilan (Enter alias qo'shadi). */}
                <input
                  value={alias}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAlias(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); addAlias(); } }}
                  placeholder={t('typeEdit.aliasPlaceholder')}
                  className={INPUT_CLS}
                />
                <Button variant="secondary" onClick={addAlias}><Plus weight="bold" />{t('typeEdit.addAliasButton')}</Button>
              </div>
            </Card>
          </div>

          {!isNew && current && (
            <div className="stagger" style={stagger(3)}>
              <Card icon={Warning} hue="slate" title={t('shared.dangerZone')} description={t('typeEdit.dangerDesc')}>
                <div>
                  <Button variant="dangerSoft" onClick={remove}><Trash />{t('typeEdit.deleteButton')}</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Page>
  );
};

export default TypeEdit;
