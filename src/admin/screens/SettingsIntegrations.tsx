import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { BillzShop, BillzSyncStatus } from '../../../shared/billz';
import { getBillzShops, getBillzStatus, runBillzSync } from '../api';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Select, Skeleton } from '../ui';
import { useToast } from '../ui/toast';

/** Sozlamalar → Integratsiyalar: Billz, buyurtma boti, mijoz kirishi va analitika — hammasi bir sahifada. */
const SettingsIntegrations: FC = () => {
  const cfg = useSiteConfig();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [rawStatus, setStatus] = useState(null as BillzSyncStatus | null);
  const status = rawStatus as BillzSyncStatus | null;
  const [rawShops, setShops] = useState([] as BillzShop[]);
  const shops = rawShops as BillzShop[];
  const [shopsBusy, setShopsBusy] = useState(false);
  const config = cfg.config;

  function loadStatus() {
    getBillzStatus().then(setStatus).catch(() => setStatus(null));
  }
  useEffect(() => { loadStatus(); }, []);
  // Sinxronizatsiya fon vazifasi — ishlayotganda 3 soniyada bir holat so'raladi.
  useEffect(() => {
    if (!status?.running) return;
    const t = setInterval(loadStatus, 3000);
    return () => clearInterval(t);
  }, [status?.running]);

  async function save() {
    setBusy(true);
    try {
      await cfg.save();
      toast('Saqlandi');
      loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadShops() {
    setShopsBusy(true);
    try {
      setShops(await getBillzShops());
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setShopsBusy(false);
    }
  }

  async function sync() {
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  const last = status?.last ?? null;
  const when = last ? new Date(last.at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : null;

  return (
    <Page
      title="Integratsiyalar"
      description="Billz ombori, buyurtma boti, mijoz kirishi va tashrif statistikasi."
      dirty={cfg.dirty}
      actions={<Button onClick={save} disabled={!cfg.dirty || busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="integrations" />
      {cfg.error ? <EmptyState title="Sozlamalar yuklanmadi" text={cfg.error} />
        : !config ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <Card title="Billz (ombor va narxlar)" description="Tovar, narx, qoldiq va rasmlar Billz'dan o'zi keladi; Billz'ga hech narsa yozilmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Integratsiya kaliti" hint="Billz → Sozlamalar → Integratsiya bo'limida yaratiladi">
                  <Input type="password" value={config.billzSecretToken} onChange={(v) => cfg.set('billzSecretToken', v)} />
                </Field>
                <Field label="Do'kon" hint="Narx va qoldiq shu do'kondan olinadi. Avval kalitni saqlang, keyin ro'yxatni yuklang.">
                  {shops.length > 0 ? (
                    <Select value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)}>
                      <option value="">— tanlang —</option>
                      {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                    </Select>
                  ) : (
                    <Input value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)} placeholder="shop UUID" />
                  )}
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={loadShops} disabled={shopsBusy}>{shopsBusy ? 'Yuklanmoqda…' : "Do'konlarni yuklash"}</Button>
                <Button variant="secondary" onClick={sync} disabled={!status?.configured || status.running}>Sinxronlash</Button>
              </div>
              <p className="mt-3 text-label text-muted-2">
                {!status ? 'Holat yuklanmoqda…'
                  : !status.configured ? "Sozlanmagan — kalit va do'konni saqlang."
                  : status.running ? 'Ishlayapti…'
                  : !last ? 'Hali sinxronlanmagan.'
                  : last.ok
                    ? `Oxirgi: ${when} · ko'rildi ${last.seen}/${last.count} · yangi ${last.inserted} · yangilandi ${last.updated} · yashirildi ${last.hidden} · rasm ${last.photos}`
                    : `Oxirgi urinish xato: ${errText(new Error(last.error ?? 'network'))} (${when})`}
              </p>
              <p className="mt-1 text-label text-muted-2">Har 30 daqiqada butun katalog qayta o'qiladi. Billz tovarining nomi, narxi, qoldig'i, turi va tavsifi har safar qayta yoziladi; reyting, sharhlar va tartib sizniki.</p>
            </Card>

            <Card title="Buyurtma xabarnomasi (Telegram bot)" description="Yangi buyurtma va ariza kelganda botga xabar boradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Bot tokeni" hint="@BotFather'da bot yarating va tokenni shu yerga qo'ying">
                  <Input type="password" value={config.telegramBotToken} onChange={(v) => cfg.set('telegramBotToken', v)} />
                </Field>
                <Field label="Chat yoki guruh ID" hint="Botni guruhga admin qilib qo'shing va guruh ID sini yozing">
                  <Input value={config.telegramOrderChatId} onChange={(v) => cfg.set('telegramOrderChatId', v)} placeholder="-1001234567890" />
                </Field>
              </div>
            </Card>

            <Card title="Mijoz kirishi" description="Mijoz Google yoki Telegram bilan kirib, buyurtma tarixini ko'ra oladi. Bo'sh qolsa kirish tugmasi ishlamaydi, mehmon buyurtmasi ishlayveradi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Google Client ID">
                  <Input value={config.googleClientId} onChange={(v) => cfg.set('googleClientId', v)} />
                </Field>
                <Field label="Google Client Secret">
                  <Input type="password" value={config.googleClientSecret} onChange={(v) => cfg.set('googleClientSecret', v)} />
                </Field>
                <Field label="Telegram login bot" hint="Bot username (@ siz); BotFather'da domen ko'rsatilgan bo'lsin">
                  <Input value={config.telegramLoginBot} onChange={(v) => cfg.set('telegramLoginBot', v)} placeholder="my_login_bot" />
                </Field>
              </div>
            </Card>

            <Card title="Analitika" description="Yandex Metrica hisoblagichi; bo'sh qolsa skript umuman yuklanmaydi.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Metrica raqami" hint="Faqat raqamlar">
                  <Input value={config.yandexMetricaId} onChange={(v) => cfg.set('yandexMetricaId', v)} placeholder="12345678" />
                </Field>
              </div>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsIntegrations;
