import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import type { BillzShop, BillzSyncStatus } from '../../../shared/billz';
import type { ApiAdminToken } from '../../../shared/types';
import { createToken, getBillzShops, getBillzStatus, listTokens, revokeToken, runBillzSync } from '../api';
import { errText } from '../errText';
import { billzStatusText } from '../lib/billz-status';
import SectionTabs from '../SectionTabs';
import { useSiteConfig } from '../useSiteConfig';
import { Button, Card, EmptyState, Field, Input, Page, Select, Skeleton } from '../ui';
import { useConfirm } from '../ui/confirm';
import { useToast } from '../ui/toast';
import { formatDateTime } from '../lib/format';

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

  // Holat matni bosh sahifa bilan umumiy — egasi ikki ekranda bir xil gapni o'qiydi.
  const billzState = billzStatusText(status);

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
            <Card title={t('integrations.billz.title')} description={t('integrations.billz.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('integrations.billz.tokenLabel')} hint={t('integrations.billz.tokenHint')}>
                  <Input type="password" value={config.billzSecretToken} onChange={(v) => cfg.set('billzSecretToken', v)} />
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={loadShops} disabled={shopsBusy}>{shopsBusy ? t('common:loading') : t('integrations.billz.loadShops')}</Button>
                <Button variant="secondary" onClick={sync} disabled={!status?.configured || status.running || syncBusy}>{t('integrations.billz.syncButton')}</Button>
              </div>
              <p className={`mt-3 text-para ${statusError || billzState.error ? 'text-danger' : 'text-primary'}`}>
                {statusError ? t('integrations.billz.statusLoadError', { error: statusError }) : billzState.text}
              </p>
              <p className="mt-1 text-label text-muted-2">{t('integrations.billz.hint')}</p>
            </Card>

            <Card title={t('integrations.telegram.title')} description={t('integrations.telegram.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('integrations.telegram.tokenLabel')} hint={t('integrations.telegram.tokenHint')}>
                  <Input type="password" value={config.telegramBotToken} onChange={(v) => cfg.set('telegramBotToken', v)} />
                </Field>
                <Field label={t('integrations.telegram.chatLabel')} hint={t('integrations.telegram.chatHint')}>
                  <Input value={config.telegramOrderChatId} onChange={(v) => cfg.set('telegramOrderChatId', v)} placeholder="-1001234567890" />
                </Field>
              </div>
            </Card>

            <Card title={t('integrations.customerAuth.title')} description={t('integrations.customerAuth.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Google Client ID">
                  <Input value={config.googleClientId} onChange={(v) => cfg.set('googleClientId', v)} />
                </Field>
                <Field label="Google Client Secret">
                  <Input type="password" value={config.googleClientSecret} onChange={(v) => cfg.set('googleClientSecret', v)} />
                </Field>
                <Field label={t('integrations.customerAuth.telegramBotLabel')} hint={t('integrations.customerAuth.telegramBotHint')}>
                  <Input value={config.telegramLoginBot} onChange={(v) => cfg.set('telegramLoginBot', v)} placeholder="my_login_bot" />
                </Field>
              </div>
            </Card>

            <Card title={t('integrations.analytics.title')} description={t('integrations.analytics.description')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('integrations.analytics.idLabel')} hint={t('integrations.analytics.idHint')}>
                  <Input value={config.yandexMetricaId} onChange={(v) => cfg.set('yandexMetricaId', v)} placeholder="12345678" />
                </Field>
              </div>
            </Card>

            <Card
              title={t('integrations.tokens.title')}
              description={t('integrations.tokens.description')}
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <Field label={t('integrations.tokens.nameLabel')} hint={t('integrations.tokens.nameHint')} className="min-w-[220px] flex-1">
                    <Input value={tokenLabel as string} onChange={setTokenLabel} placeholder={t('integrations.tokens.namePlaceholder')} />
                  </Field>
                  <Button onClick={addToken} disabled={tokenBusy || (tokenLabel as string).trim().length < 2}>
                    {tokenBusy ? t('integrations.tokens.creating') : t('integrations.tokens.create')}
                  </Button>
                </div>

                {fresh !== '' && (
                  <div className="rounded-sm border border-line bg-bg p-3">
                    <p className="text-label text-muted-2">{t('integrations.tokens.freshHint')}</p>
                    <p className="mt-1 break-all text-para text-primary">{fresh}</p>
                  </div>
                )}

                {tokens.length === 0
                  ? <p className="text-para text-muted">{t('integrations.tokens.empty')}</p>
                  : (
                    <ul className="flex flex-col">
                      {tokens.map((tok) => (
                        <li key={tok.id} className="flex items-center justify-between gap-4 border-t border-line py-2.5">
                          <div className="min-w-0">
                            <p className="text-para text-primary">{tok.label}</p>
                            <p className="text-label text-muted-2">
                              {tok.kind === 'oauth' ? t('integrations.tokens.kindOauth') : t('integrations.tokens.kindManual')}
                              {' · '}
                              {tok.lastUsedAt === null ? t('integrations.tokens.neverUsed') : t('integrations.tokens.lastUsed', { when: formatDateTime(tok.lastUsedAt) })}
                            </p>
                          </div>
                          <Button variant="quiet" onClick={() => removeToken(tok)}>{t('integrations.tokens.revoke')}</Button>
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
