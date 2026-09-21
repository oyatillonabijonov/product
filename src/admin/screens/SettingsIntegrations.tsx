import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { BillzShop, BillzSyncStatus } from '../../../shared/billz';
import type { ApiAdminToken } from '../../../shared/types';
import { createToken, getBillzShops, getBillzStatus, listTokens, revokeToken, runBillzSync } from '../api';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';
import { formatDateTime } from '../lib/format';

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
  const [rawStatusError, setStatusError] = useState('');
  const statusError = rawStatusError as string;
  const [syncBusy, setSyncBusy] = useState(false);
  const config = cfg.config;

  function loadStatus() {
    return getBillzStatus()
      .then((s) => { setStatus(s); setStatusError(''); })
      .catch((e) => setStatusError(errText(e)));
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
      toast("Saqlandi · saytda 1–5 daqiqada ko'rinadi");
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
    setSyncBusy(true);
    try {
      await runBillzSync();
      toast('Sinxronizatsiya boshlandi');
      await loadStatus();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setSyncBusy(false);
    }
  }

  const confirm = useConfirm();
  const [rawTokens, setTokens] = useState([] as ApiAdminToken[]);
  const tokens = rawTokens as ApiAdminToken[];
  const [tokenLabel, setTokenLabel] = useState('');
  const [rawFresh, setFresh] = useState('');
  const fresh = rawFresh as string;
  const [tokenBusy, setTokenBusy] = useState(false);

  useEffect(() => { listTokens().then(setTokens).catch(() => undefined); }, []);

  async function addToken() {
    setTokenBusy(true);
    try {
      const { token } = await createToken(tokenLabel as string);
      setFresh(token);
      setTokenLabel('');
      setTokens(await listTokens());
      toast('Token yaratildi — nusxa oling, u boshqa ko\'rsatilmaydi');
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setTokenBusy(false);
    }
  }

  async function removeToken(t: ApiAdminToken) {
    const ok = await confirm({
      title: `«${t.label}» tokenini bekor qilish`,
      message: 'Shu token bilan ulangan Claude darhol kirolmay qoladi. Qaytarib bo\'lmaydi.',
      // Tasdiq oynasining bekor qilish tugmasi ham «Bekor qilish» — ikkita bir xil
      // tugma bo'lib qolmasligi uchun tasdiq tugmasi boshqacha yoziladi.
      confirmLabel: "Ha, o'chirilsin",
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeToken(t.id);
      setTokens(await listTokens());
      toast('Token bekor qilindi');
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
                <Button variant="secondary" onClick={sync} disabled={!status?.configured || status.running || syncBusy}>Sinxronlash</Button>
              </div>
              <p className="mt-3 text-label text-muted-2">
                {statusError ? `Holat o'qilmadi: ${statusError}`
                  : !status ? 'Holat yuklanmoqda…'
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

            <Card
              title="MCP tokenlari"
              description="Claude shu token bilan admin API'ga ulanadi va sizning nomingizdan tovar qo'sha oladi. Har odamga alohida token bering."
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Nomi" hint="Jurnalda shu nom ko'rinadi" className="min-w-[220px] flex-1">
                    <Input value={tokenLabel as string} onChange={setTokenLabel} placeholder="Javlon aka" />
                  </Field>
                  <Button onClick={addToken} disabled={tokenBusy || (tokenLabel as string).trim().length < 2}>
                    {tokenBusy ? 'Yaratilmoqda…' : 'Token yaratish'}
                  </Button>
                </div>

                {fresh !== '' && (
                  <div className="rounded-sm border border-line bg-bg p-3">
                    <p className="text-label text-muted-2">Faqat hozir ko'rinadi — nusxa olib qo'ying:</p>
                    <p className="mt-1 break-all text-para text-primary">{fresh}</p>
                  </div>
                )}

                {tokens.length === 0
                  ? <p className="text-para text-muted">Hali token yaratilmagan.</p>
                  : (
                    <ul className="flex flex-col">
                      {tokens.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-4 border-t border-line py-2.5">
                          <div className="min-w-0">
                            <p className="text-para text-primary">{t.label}</p>
                            <p className="text-label text-muted-2">
                              {t.kind === 'oauth' ? 'Konnektor' : "Qo'lda"}
                              {' · '}
                              {t.lastUsedAt === null ? 'ishlatilmagan' : `oxirgi: ${formatDateTime(t.lastUsedAt)}`}
                            </p>
                          </div>
                          <Button variant="quiet" onClick={() => removeToken(t)}>Bekor qilish</Button>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsIntegrations;
