import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { getAccount, updateAccount } from '../api';
import { errText } from '../errText';
import SectionTabs from '../SectionTabs';
import { useAdminDark } from '../theme';
import { Button, Card, EmptyState, Field, Input, Page, Skeleton, SwitchRow } from '../ui';
import { useToast } from '../ui/toast';
import LangSwitch from '../LangSwitch';

/**
 * Sozlamalar → Akkaunt: admin login/paroli va Google bilan kirish. Har o'zgarish joriy parol bilan tasdiqlanadi.
 * «Ko'rinish» kartasi formaga kirmaydi — darhol qo'llanadi (telefonda sidebar yo'q, almashtirgich shu yerda).
 */
const SettingsAccount: FC<{ defaultPw: boolean; onPasswordChanged: () => void }> = ({ defaultPw, onPasswordChanged }) => {
  const toast = useToast();
  const [dark, setDark] = useAdminDark();
  const { t } = useTranslation('settings');
  const [username, setUsername] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rawBase, setBase] = useState({ username: '', googleEmail: '' });
  const base = rawBase as { username: string; googleEmail: string };

  useEffect(() => {
    getAccount()
      .then((a) => {
        setUsername(a.username);
        setGoogleEmail(a.adminGoogleEmail);
        setBase({ username: a.username, googleEmail: a.adminGoogleEmail });
        setLoaded(true);
      })
      .catch(() => setError(t('shared.retryLoad')));
  }, []);

  async function save() {
    setBusy(true);
    const changedPassword = (newPassword as string) !== '';
    try {
      await updateAccount({
        currentPassword: currentPassword as string,
        username: (username as string).trim() || undefined,
        newPassword: changedPassword ? (newPassword as string) : undefined,
        adminGoogleEmail: (googleEmail as string).trim(),
      });
      setCurrentPassword('');
      setNewPassword('');
      // Server bo'sh loginni o'tkazib yuboradi va emailni kichik harfga o'tkazadi — asl qiymat ham shunday bo'lsin.
      setBase({ username: (username as string).trim() || base.username, googleEmail: (googleEmail as string).trim().toLowerCase() });
      toast(t('account.saved'));
      if (changedPassword) onPasswordChanged();
    } catch (e) {
      toast(errText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const dirty = (username as string).trim() !== base.username
    || (googleEmail as string).trim() !== base.googleEmail
    || (newPassword as string) !== '';
  const canSave = !busy && dirty && (currentPassword as string) !== '';

  return (
    <Page
      title={t('account.title')}
      description={t('account.description')}
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? t('shared.saving') : t('shared.save')}</Button>}
    >
      <SectionTabs section="settings" active="account" />
      {error ? <EmptyState title={t('account.loadErrorTitle')} text={error} />
        : !loaded ? <Skeleton rows={5} />
        : (
          <div className="flex flex-col gap-4">
            {defaultPw && (
              <Card title={t('account.defaultPw.title')} description={t('account.defaultPw.description')}>
                <p className="text-para text-danger">{t('account.defaultPw.warning')}</p>
              </Card>
            )}
            <Card title={t('account.credentials.title')}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('account.credentials.loginLabel')} hint={t('account.credentials.loginHint')}>
                  <Input value={username as string} onChange={setUsername} autoComplete="username" />
                </Field>
                <Field label={t('account.credentials.newPasswordLabel')} hint={t('account.credentials.newPasswordHint')}>
                  <Input type="password" value={newPassword as string} onChange={setNewPassword} autoComplete="new-password" placeholder="••••••" />
                </Field>
                <Field label={t('account.credentials.googleEmailLabel')} hint={t('account.credentials.googleEmailHint')}>
                  <Input type="email" value={googleEmail as string} onChange={setGoogleEmail} placeholder={t('account.credentials.googleEmailPlaceholder')} />
                </Field>
                <Field label={t('account.credentials.currentPasswordLabel')} required hint={t('account.credentials.currentPasswordHint')}>
                  <Input type="password" value={currentPassword as string} onChange={setCurrentPassword} autoComplete="current-password" />
                </Field>
              </div>
            </Card>
            <Card title={t('account.appearance.title')}>
              <SwitchRow label={t('account.darkTheme')} hint={t('account.darkThemeHint')} on={dark} onChange={setDark} />
              <div className="flex items-center justify-between gap-4 py-3">
                <p className="text-para text-primary">{t('account.language')}</p>
                <LangSwitch label={t('account.language')} />
              </div>
            </Card>
          </div>
        )}
    </Page>
  );
};

export default SettingsAccount;
