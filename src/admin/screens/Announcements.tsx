import { useState } from 'react';
import type { FC } from 'react';
import { Megaphone } from 'lucide-react';
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
  const toast = useToast();
  const confirm = useConfirm();
  const [rawF, setF] = useState({ titleUz: '', titleRu: '', bodyUz: '', bodyRu: '', link: '' });
  const [rawBusy, setBusy] = useState(false);
  const f = rawF as { titleUz: string; titleRu: string; bodyUz: string; bodyRu: string; link: string };
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  async function send() {
    const ok = await confirm({
      title: 'Hamma mijozga yuborilsinmi?',
      message: "Bildirishnoma barcha ro'yxatdan o'tgan mijozlarga tushadi va qaytarib olinmaydi.",
      confirmLabel: 'Ha, yuborilsin',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await sendAnnouncement(f);
      toast(`${res.sent} ta mijozga yuborildi`);
      setF({ titleUz: '', titleRu: '', bodyUz: '', bodyRu: '', link: '' });
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      title="E'lonlar"
      description="Ro'yxatdan o'tgan mijozlarning kabinetiga bildirishnoma yuboradi."
      actions={<Button onClick={send} disabled={(rawBusy as boolean) || f.titleUz.trim() === ''}>
        <Megaphone aria-hidden className="size-4" /> Yuborish
      </Button>}
    >
      <Card title="Matn">
        <Field label="Sarlavha (o'zbekcha)" hint="Majburiy">
          <Input value={f.titleUz} onChange={(v: string) => set('titleUz', v)} />
        </Field>
        <Field label="Sarlavha (ruscha)" hint="Bo'sh qolsa o'zbekchasi ko'rsatiladi">
          <Input value={f.titleRu} onChange={(v: string) => set('titleRu', v)} />
        </Field>
        <Field label="Matn (o'zbekcha)">
          <Textarea value={f.bodyUz} onChange={(v: string) => set('bodyUz', v)} rows={3} />
        </Field>
        <Field label="Matn (ruscha)">
          <Textarea value={f.bodyRu} onChange={(v: string) => set('bodyRu', v)} rows={3} />
        </Field>
        <Field label="Havola" hint="Ixtiyoriy — ichki yo'l (/chegirmalar) yoki https://">
          <Input value={f.link} onChange={(v: string) => set('link', v)} />
        </Field>
      </Card>
    </Page>
  );
};

export default Announcements;
