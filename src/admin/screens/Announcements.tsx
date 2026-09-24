import { useState } from 'react';
import type { FC } from 'react';
import { Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { sendAnnouncement } from '../api';
import { errText } from '../errText';
import { Button, Card, Field, Input, Page, Textarea } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';

/**
 * Kontent → E'lonlar: hamma mijozga bildirishnoma.
 *
 * Yuborilgach **qaytarib bo'lmaydi** (har mijozga alohida qator yoziladi), shuning
 * uchun tasdiq so'raladi. Ruscha maydonlar bo'sh qolsa o'zbekchasi ko'rsatiladi.
 */
const Announcements: FC = () => {
  const { t } = useTranslation('orders');
  const toast = useToast();
  const confirm = useConfirm();
  const [rawF, setF] = useState({ titleUz: '', titleRu: '', bodyUz: '', bodyRu: '', link: '' });
  const [rawBusy, setBusy] = useState(false);
  const f = rawF as { titleUz: string; titleRu: string; bodyUz: string; bodyRu: string; link: string };
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

  return (
    <Page
      title={t('announcements.title')}
      description={t('announcements.description')}
      actions={<Button onClick={send} disabled={(rawBusy as boolean) || f.titleUz.trim() === ''}>
        <Megaphone aria-hidden className="size-4" /> {t('announcements.send')}
      </Button>}
    >
      <Card title={t('announcements.textCard')}>
        <Field label={t('announcements.titleUzLabel')} hint={t('announcements.titleUzHint')}>
          <Input value={f.titleUz} onChange={(v: string) => set('titleUz', v)} />
        </Field>
        <Field label={t('announcements.titleRuLabel')} hint={t('announcements.titleRuHint')}>
          <Input value={f.titleRu} onChange={(v: string) => set('titleRu', v)} />
        </Field>
        <Field label={t('announcements.bodyUzLabel')}>
          <Textarea value={f.bodyUz} onChange={(v: string) => set('bodyUz', v)} rows={3} />
        </Field>
        <Field label={t('announcements.bodyRuLabel')}>
          <Textarea value={f.bodyRu} onChange={(v: string) => set('bodyRu', v)} rows={3} />
        </Field>
        <Field label={t('announcements.linkLabel')} hint={t('announcements.linkHint')}>
          <Input value={f.link} onChange={(v: string) => set('link', v)} />
        </Field>
      </Card>
    </Page>
  );
};

export default Announcements;
