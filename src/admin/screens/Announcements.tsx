import { useState } from 'react';
import type { FC } from 'react';
import { ArrowRight, Eye, Info, Megaphone, PencilSimpleLine } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { safeHref } from '../../../shared/safe-href';
import { sendAnnouncement } from '../api';
import { errText } from '../errText';
import { formatDateTime } from '../lib/format';
import { Button, Card, Field, IconTile, Input, Page, Segmented, Textarea } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

const at = (i: number) => ({ ['--i' as string]: i }) as Record<string, number>;

/**
 * Kontent → E'lonlar (v2): chapda forma (uz/ru juftliklari yonma-yon, havola), o'ngda jonli ko'rinish — mijoz
 * kabinetidagi bildirishnoma kartasi (o'qilmagan: chap chetida urg'u chizig'i), tanlangan tilda.
 *
 * Yuborilgach **qaytarib bo'lmaydi** (har mijozga alohida qator yoziladi), shuning
 * uchun tasdiq so'raladi. Ruscha maydonlar bo'sh qolsa o'zbekchasi ko'rsatiladi.
 */
const Announcements: FC = () => {
  const { t, i18n } = useTranslation('orders');
  const toast = useToast();
  const confirm = useConfirm();
  const [rawF, setF] = useState({ titleUz: '', titleRu: '', bodyUz: '', bodyRu: '', link: '' });
  const [rawBusy, setBusy] = useState(false);
  const [rawLang, setLang] = useState('uz');
  const f = rawF as { titleUz: string; titleRu: string; bodyUz: string; bodyRu: string; link: string };
  const lang = rawLang as string;
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  async function send() {
    const ok = await confirm({
      title: t('announcements.confirmTitle'),
      message: t('announcements.confirmMessage'),
      confirmLabel: t('announcements.confirmSend'),
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await sendAnnouncement(f);
      toast(t('announcements.sentToast', { count: res.sent }));
      setF({ titleUz: '', titleRu: '', bodyUz: '', bodyRu: '', link: '' });
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const ru = lang === 'ru';
  const title = (ru && f.titleRu.trim()) || f.titleUz.trim();
  const body = (ru && f.bodyRu.trim()) || f.bodyUz.trim();
  const link = safeHref(f.link.trim());

  return (
    <Page
      title={t('announcements.title')}
      description={t('announcements.description')}
      actions={<Button onClick={send} disabled={(rawBusy as boolean) || f.titleUz.trim() === ''}>
        <Megaphone weight="fill" /> {t('announcements.send')}
      </Button>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="stagger" style={at(0)}>
          <Card icon={PencilSimpleLine} hue="orange" title={t('announcements.textCard')} description={t('announcements.textCardHint')}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('announcements.titleUzLabel')} hint={t('announcements.titleUzHint')}>
                <Input value={f.titleUz} onChange={(v: string) => set('titleUz', v)} />
              </Field>
              <Field label={t('announcements.titleRuLabel')} hint={t('announcements.titleRuHint')}>
                <Input value={f.titleRu} onChange={(v: string) => set('titleRu', v)} />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t('announcements.bodyUzLabel')}>
                <Textarea value={f.bodyUz} onChange={(v: string) => set('bodyUz', v)} rows={4} />
              </Field>
              <Field label={t('announcements.bodyRuLabel')}>
                <Textarea value={f.bodyRu} onChange={(v: string) => set('bodyRu', v)} rows={4} />
              </Field>
            </div>
            <Field label={t('announcements.linkLabel')} hint={t('announcements.linkHint')}>
              <Input value={f.link} onChange={(v: string) => set('link', v)} />
            </Field>
          </Card>
        </div>

        <div className="stagger lg:sticky lg:top-28" style={at(1)}>
          <Card
            icon={Eye} hue="violet" title={t('announcements.previewTitle')} description={t('announcements.previewDescription')}
            actions={<Segmented label={t('announcements.previewLang')} size="sm" value={lang} onChange={setLang} options={[{ id: 'uz', label: 'UZ' }, { id: 'ru', label: 'RU' }]} />}
          >
            <div className="rounded-control bg-surface-sunken p-4">
              <article className="relative flex gap-3 overflow-hidden rounded-control bg-surface-sunken p-4 pl-5">
                <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
                <span className="flex h-[1lh] shrink-0 items-center text-base"><IconTile icon={Megaphone} hue="orange" soft /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className={`min-w-0 break-words text-base ${title ? 'font-semibold text-text' : 'text-text-faint'}`}>{title || t('announcements.previewEmpty')}</p>
                    <span className="text-sm tabular-nums text-text-faint">{formatDateTime(Date.now() / 1000)}</span>
                  </div>
                  {body && <p className="mt-1 whitespace-pre-line break-words text-sm text-text-muted">{body}</p>}
                  {link && (
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-text">
                      {i18n.getFixedT(lang, 'orders')('announcements.previewOpen')}
                      <ArrowRight weight="bold" className="size-3.5" />
                    </span>
                  )}
                </div>
              </article>
            </div>
            <p className="flex items-start gap-2 text-sm text-text-muted">
              <Info weight="fill" className="mt-[calc(0.5lh-8px)] size-4 shrink-0 text-text-faint" />
              {t('announcements.confirmMessage')}
            </p>
          </Card>
        </div>
      </div>
    </Page>
  );
};

export default Announcements;
