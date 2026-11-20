import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import {
  ArrowsClockwise, ChartLineUp, CheckCircle, Copy, Key, PaperPlaneTilt, Plug, Robot, SignIn, Storefront, Trash, Warehouse, WarningCircle,
} from '@phosphor-icons/react';
import { GoogleLogo, TelegramLogo } from '../brand-logos';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { BillzShop, BillzSyncStatus } from '../../../shared/billz';
import type { ApiAdminToken, ApiSiteConfig } from '../../../shared/types';
import { createToken, getBillzShops, getBillzStatus, listTokens, revokeToken, runBillzSync } from '../api';
import { errText } from '../errText';
import { billzStatusText } from '../lib/billz-status';
import SectionTabs from '../SectionTabs';
import { SECRET_SET, useSiteConfig } from '../useSiteConfig';
import { Badge, Button, Card, EmptyState, Field, IconButton, IconTile, Input, Page, Select, Skeleton, type Tone } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';
import { formatDateTime } from '../lib/format';

const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Karta ichidagi kichik guruh sarlavhasi (Google / Telegram). */
const SubHead: FC<{ icon: PhIcon; children: ReactNode }> = ({ icon: I, children }) => (
  <p className="flex items-center gap-2 text-base font-bold text-text"><I weight="fill" className="size-4 text-text-muted" />{children}</p>
);

/** Sozlamalar → Integratsiyalar: Billz, buyurtma boti, mijoz kirishi va analitika — hammasi bir sahifada. */
const SettingsIntegrations: FC = () => {
  const { t } = useTranslation(['settings', 'common']);
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
    const timer = setInterval(loadStatus, 3000);
    return () => clearInterval(timer);
  }, [status?.running]);

  async function save() {
    setBusy(true);
    try {
      await cfg.save();
      toast(t('shared.savedLive'));
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
      toast(t('integrations.billz.syncStarted'));
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
      toast(t('integrations.tokens.created'));
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setTokenBusy(false);
    }
  }

  async function removeToken(tok: ApiAdminToken) {
    const ok = await confirm({
      title: t('integrations.tokens.confirmRevoke', { label: tok.label }),
      message: t('integrations.tokens.confirmRevokeMessage'),
      // Tasdiq oynasining bekor qilish tugmasi ham «Bekor qilish» — ikkita bir xil
      // tugma bo'lib qolmasligi uchun tasdiq tugmasi boshqacha yoziladi.
      confirmLabel: t('integrations.tokens.confirmRevokeYes'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await revokeToken(tok.id);
      setTokens(await listTokens());
      toast(t('integrations.tokens.revoked'));
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  async function copyFresh() {
    try {
      await navigator.clipboard.writeText(fresh);
      toast(t('integrations.tokens.copied'));
    } catch (e) {
      toast(errText(e), 'error');
    }
  }

  // Sirlar serverdan qaytmaydi: saqlangan bo'lsa maydon bo'sh, placeholder nuqtalar bilan. Yozilsa — yangi qiymat;
  // bo'shatilsa — belgi qaytadi va server saqlanganini qoldiradi.
  const secret = (key: 'billzSecretToken' | 'telegramBotToken' | 'googleClientSecret') => {
    const stored = cfg.saved?.[key] === SECRET_SET;
    return {
      value: config?.[key] === SECRET_SET ? '' : (config?.[key] ?? ''),
      placeholder: stored ? '••••••••' : undefined,
      onChange: (v: string) => cfg.set(key, v === '' && stored ? SECRET_SET : v),
    };
  };

  // Holat matni bosh sahifa bilan umumiy — egasi ikki ekranda bir xil gapni o'qiydi.
  const billzState = billzStatusText(status);
  // «Ulanmagan» ham `error: true` qaytaradi — qizil faqat haqiqiy xatoda, ulanmagan holat neytral.
  const billzError = Boolean(statusError) || Boolean(status?.configured && billzState.error);
  const running = status?.running ?? false;

  // «Ulangan» belgisi saqlangan holatdan — yozilgan, lekin saqlanmagan qiymat ulanish emas.
  const saved = cfg.saved as ApiSiteConfig | null;
  const has = (key: keyof ApiSiteConfig) => Boolean(saved?.[key]);
  const linked = (on: boolean) => (on
    ? <Badge tone="ok" dot>{t('integrations.status.connected')}</Badge>
    : <Badge tone="neutral" dot>{t('integrations.status.notConnected')}</Badge>);
  const billzBadge: { tone: Tone; label: string } = billzError
    ? { tone: 'danger', label: t('integrations.status.error') }
    : running ? { tone: 'info', label: t('integrations.status.running') }
    : status?.configured ? { tone: 'ok', label: t('integrations.status.connected') }
    : { tone: 'neutral', label: t('integrations.status.notConnected') };

  return (
    <Page
      title={t('integrations.title')}
      description={t('integrations.description')}
      dirty={cfg.dirty}
      actions={<Button onClick={save} disabled={!cfg.dirty || busy}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="integrations" />
      {cfg.error ? <EmptyState title={t('shared.loadErrorTitle')} text={cfg.error} />
        : !config ? <Skeleton rows={8} />
        : (
          <div className="flex flex-col gap-4">
            <div className="stagger" style={st(0)}>
              <Card
                icon={Warehouse} hue="blue" title={t('integrations.billz.title')} description={t('integrations.billz.description')}
                actions={<Badge tone={billzBadge.tone} dot>{billzBadge.label}</Badge>}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('integrations.billz.tokenLabel')} hint={t('integrations.billz.tokenHint')}>
                    <Input type="password" {...secret('billzSecretToken')} />
                  </Field>
                  <Field label={t('integrations.billz.shopLabel')} hint={t('integrations.billz.shopHint')}>
                    {shops.length > 0 ? (
                      <Select value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)}>
                        <option value="">{t('integrations.billz.shopPlaceholder')}</option>
                        {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                      </Select>
                    ) : (
                      <Input value={config.billzShopId} onChange={(v) => cfg.set('billzShopId', v)} placeholder="shop UUID" />
                    )}
                  </Field>
                </div>
                <div className={`flex flex-col gap-4 rounded-control p-5 sm:flex-row sm:items-center ${billzError ? 'bg-danger-soft' : 'bg-surface-sunken'}`}>
                  <span className="flex min-w-0 flex-1 items-start gap-3 text-base">
                    {running
                      ? <ArrowsClockwise weight="bold" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 animate-spin text-info" />
                      : billzError
                        ? <WarningCircle weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-danger" />
                        : status && !status.configured
                          ? <WarningCircle weight="fill" className="mt-[calc(0.5lh-9px)] size-[18px] shrink-0 text-text-faint" />
                          : <CheckCircle weight="fill" className={`mt-[calc(0.5lh-9px)] size-[18px] shrink-0 ${status?.last ? 'text-success' : 'text-text-faint'}`} />}
                    <span className={`min-w-0 text-base font-medium ${billzError ? 'text-danger-strong' : 'text-text'}`}>
                      {statusError ? t('integrations.billz.statusLoadError', { error: statusError }) : billzState.text}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={loadShops} disabled={shopsBusy}>
                      <Storefront />{shopsBusy ? t('common:loading') : t('integrations.billz.loadShops')}
                    </Button>
                    <Button size="sm" onClick={sync} disabled={!status?.configured || running || syncBusy}>
                      <ArrowsClockwise weight="bold" className={running || syncBusy ? 'animate-spin' : ''} />{t('integrations.billz.syncButton')}
                    </Button>
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-muted">{t('integrations.billz.hint')}</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="stagger" style={st(1)}>
                <Card
                  icon={PaperPlaneTilt} hue="teal" title={t('integrations.telegram.title')} description={t('integrations.telegram.description')} className="h-full"
                  actions={linked(has('telegramBotToken') && has('telegramOrderChatId'))}
                >
                  <div className="grid gap-4">
                    <Field label={t('integrations.telegram.tokenLabel')} hint={t('integrations.telegram.tokenHint')}>
                      <Input type="password" {...secret('telegramBotToken')} />
                    </Field>
                    <Field label={t('integrations.telegram.chatLabel')} hint={t('integrations.telegram.chatHint')}>
                      <Input value={config.telegramOrderChatId} onChange={(v) => cfg.set('telegramOrderChatId', v)} placeholder="-1001234567890" />
                    </Field>
                  </div>
                </Card>
              </div>

              <div className="stagger" style={st(2)}>
                <Card
                  icon={ChartLineUp} hue="amber" title={t('integrations.analytics.title')} description={t('integrations.analytics.description')} className="h-full"
                  actions={linked(has('yandexMetricaId'))}
                >
                  <Field label={t('integrations.analytics.idLabel')} hint={t('integrations.analytics.idHint')}>
                    <Input value={config.yandexMetricaId} onChange={(v) => cfg.set('yandexMetricaId', v)} placeholder="12345678" />
                  </Field>
                </Card>
              </div>
            </div>

            <div className="stagger" style={st(3)}>
              <Card
                icon={SignIn} hue="violet" title={t('integrations.customerAuth.title')} description={t('integrations.customerAuth.description')}
                actions={linked(has('googleClientId') || has('telegramLoginBot'))}
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="flex flex-col gap-4 rounded-control bg-surface p-5">
                    <SubHead icon={GoogleLogo}>Google</SubHead>
                    <Field label="Client ID">
                      <Input value={config.googleClientId} onChange={(v) => cfg.set('googleClientId', v)} />
                    </Field>
                    <Field label="Client Secret">
                      <Input type="password" {...secret('googleClientSecret')} />
                    </Field>
                  </div>
                  <div className="flex flex-col gap-4 rounded-control bg-surface p-5">
                    <SubHead icon={TelegramLogo}>Telegram</SubHead>
                    <Field label={t('integrations.customerAuth.telegramBotLabel')} hint={t('integrations.customerAuth.telegramBotHint')}>
                      <Input value={config.telegramLoginBot} onChange={(v) => cfg.set('telegramLoginBot', v)} placeholder="my_login_bot" />
                    </Field>
                  </div>
                </div>
              </Card>
            </div>

            <div className="stagger" style={st(4)}>
              <Card
                icon={Plug} hue="pink" title={t('integrations.tokens.title')} description={t('integrations.tokens.description')}
                actions={tokens.length > 0 ? <Badge tone="accent">{t('integrations.tokens.active', { n: tokens.length })}</Badge> : undefined}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <Field label={t('integrations.tokens.nameLabel')} className="min-w-0 flex-1">
                      <Input value={tokenLabel as string} onChange={setTokenLabel} placeholder={t('integrations.tokens.namePlaceholder')} />
                    </Field>
                    <Button onClick={addToken} disabled={tokenBusy || (tokenLabel as string).trim().length < 2}>
                      <Key />{tokenBusy ? t('integrations.tokens.creating') : t('integrations.tokens.create')}
                    </Button>
                  </div>
                  <p className="text-sm text-text-muted">{t('integrations.tokens.nameHint')}</p>
                </div>

                {fresh !== '' && (
                  <div className="animate-fade-in rounded-control bg-warning-soft p-4">
                    <p className="text-sm font-semibold text-warning-strong">{t('integrations.tokens.freshHint')}</p>
                    <div className="mt-3 flex items-center gap-2 rounded-item bg-surface px-3 py-2">
                      <code className="min-w-0 flex-1 break-all font-mono text-sm text-text">{fresh}</code>
                      <IconButton label={t('integrations.tokens.copy')} size="sm" onClick={copyFresh}><Copy /></IconButton>
                    </div>
                  </div>
                )}

                {tokens.length === 0
                  ? <p className="rounded-control bg-surface-sunken px-4 py-8 text-center text-base text-text-muted">{t('integrations.tokens.empty')}</p>
                  : (
                    <ul className="-mx-6 -mb-6 border-t border-border">
                      {tokens.map((tok) => (
                        <li key={tok.id} className="flex items-center gap-3 border-b border-border px-6 py-3 last:border-b-0">
                          <IconTile icon={tok.kind === 'oauth' ? Robot : Key} hue={tok.kind === 'oauth' ? 'violet' : 'slate'} soft size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-medium text-text">{tok.label}</p>
                            <p className="truncate text-sm text-text-muted">
                              {tok.kind === 'oauth' ? t('integrations.tokens.kindOauth') : t('integrations.tokens.kindManual')}
                              {' · '}
                              {tok.lastUsedAt === null ? t('integrations.tokens.neverUsed') : t('integrations.tokens.lastUsed', { when: formatDateTime(tok.lastUsedAt) })}
                            </p>
                          </div>
                          <Button variant="dangerSoft" size="sm" ariaLabel={t('integrations.tokens.revoke')} onClick={() => removeToken(tok)}>
                            <Trash /><span className="max-sm:hidden">{t('integrations.tokens.revoke')}</span>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
              </Card>
            </div>
          </div>
        )}
    </Page>
  );
};

export default SettingsIntegrations;
