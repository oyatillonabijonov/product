import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Lock, Moon, Palette, ShieldCheck, Sun, Translate, UserCircle, WarningCircle } from '@phosphor-icons/react';
import { GoogleLogo } from '../brand-logos';
import { useTranslation } from 'react-i18next';
import { getAccount, updateAccount } from '../api';
import { errText } from '../errText';
import { ADMIN_LANGS, LANG_NAMES, useAdminLang, type AdminLang } from '../i18n';
import SectionTabs from '../SectionTabs';
import { useAdminDark } from '../theme';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Page, Rows, Segmented, Skeleton, type Hue } from '../ui';
import { Meter } from '../ui/stats';
import { useToast } from '../ui/toast';

const st = (i: number) => ({ ['--i' as string]: i } as Record<string, number>);

/** Parol kuchi 0–4: 1 — 8 dan qisqa, 2 — kuchsiz, 3 — uch xil belgi turi, 4 — yana 12+ belgi. Faqat ko'rsatkich, tekshiruv serverda. */
function strength(pw: string): number {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return 2 + (kinds >= 3 ? 1 : 0) + (pw.length >= 12 && kinds >= 2 ? 1 : 0);
}
const STRENGTH: { key: 'short' | 'weak' | 'medium' | 'strong'; hue: Hue; text: string }[] = [
  { key: 'short', hue: 'pink', text: 'text-danger-text' },
  { key: 'short', hue: 'pink', text: 'text-danger-text' },
  { key: 'weak', hue: 'orange', text: 'text-warning-text' },
  { key: 'medium', hue: 'amber', text: 'text-warning-text' },
  { key: 'strong', hue: 'green', text: 'text-success-text' },
];

/**
 * Sozlamalar → Akkaunt: admin login/paroli va Google bilan kirish. Har o'zgarish joriy parol bilan tasdiqlanadi.
 * «Ko'rinish» kartasi formaga kirmaydi — darhol qo'llanadi (telefonda sidebar yo'q, almashtirgich shu yerda).
 */
const SettingsAccount: FC<{ defaultPw: boolean; onPasswordChanged: () => void }> = ({ defaultPw, onPasswordChanged }) => {
  const toast = useToast();
  const [dark, setDark] = useAdminDark();
  const { lang, setLang } = useAdminLang();
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
  const score = strength(newPassword as string);
  const level = STRENGTH[score];

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
              <div className="stagger flex items-start gap-4 rounded-surface bg-danger-soft p-5" style={st(0)}>
                <WarningCircle weight="fill" className="size-6 shrink-0 text-danger" />
                <div className="min-w-0 text-danger-strong">
                  <p className="text-base font-bold">{t('account.defaultPw.title')}</p>
                  <p className="mt-0.5 text-base">{t('account.defaultPw.description')}</p>
                  <p className="mt-1 text-sm opacity-80">{t('account.defaultPw.warning')}</p>
                </div>
              </div>
            )}

            <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="flex flex-col gap-4">
                <div className="stagger" style={st(1)}>
                  <Card>
                    <div className="flex flex-col items-center gap-3 pt-1 text-center">
                      <Avatar name={base.username || 'Admin'} size="xl" />
                      <div className="min-w-0">
                        <p className="truncate text-lg font-bold text-text">{base.username}</p>
                        <p className="text-sm text-text-muted">{t('account.profile.role')}</p>
                      </div>
                    </div>
                    <div className="rounded-control bg-surface-sunken px-4 py-3">
                      <Rows rows={[
                        { k: t('account.credentials.loginLabel'), v: base.username },
                        {
                          k: 'Google',
                          v: base.googleEmail
                            ? <span className="inline-flex items-center gap-1.5"><GoogleLogo weight="bold" className="size-3.5 shrink-0 text-text-muted" />{base.googleEmail}</span>
                            : <span className="font-normal text-text-faint">{t('account.profile.off')}</span>,
                        },
                        // Standart parol faqat kirishda aniqlanadi (`defaultPw`) — aks holda holatni bilmaymiz, qator chiqmaydi.
                        ...(defaultPw ? [{ k: t('account.profile.password'), v: <Badge tone="danger" dot>{t('account.profile.passwordDefault')}</Badge> }] : []),
                      ]} />
                    </div>
                  </Card>
                </div>

                <div className="stagger" style={st(2)}>
                  <Card icon={Palette} hue="pink" title={t('account.appearance.title')} description={t('account.darkThemeHint')}>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-text">{t('account.theme.label')}</p>
                        <Segmented
                          label={t('account.theme.label')}
                          value={dark ? 'dark' : 'light'}
                          onChange={(v) => setDark(v === 'dark')}
                          options={[{ id: 'light', label: t('account.theme.light'), icon: Sun }, { id: 'dark', label: t('account.theme.dark'), icon: Moon }]}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-text"><Translate className="size-4 text-text-muted" />{t('account.language')}</p>
                        <Segmented
                          label={t('account.language')}
                          value={lang}
                          onChange={(v) => setLang(v as AdminLang)}
                          options={ADMIN_LANGS.map((l) => ({ id: l, label: LANG_NAMES[l] }))}
                        />
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <div className="stagger" style={st(3)}>
                  <Card icon={UserCircle} hue="violet" title={t('account.credentials.title')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('account.credentials.loginLabel')} hint={t('account.credentials.loginHint')}>
                        <Input value={username as string} onChange={setUsername} autoComplete="username" />
                      </Field>
                      <Field label={t('account.credentials.googleEmailLabel')} hint={t('account.credentials.googleEmailHint')}>
                        <Input type="email" value={googleEmail as string} onChange={setGoogleEmail} placeholder={t('account.credentials.googleEmailPlaceholder')} />
                      </Field>
                    </div>
                  </Card>
                </div>

                <div className="stagger" style={st(4)}>
                  <Card icon={Lock} hue="orange" title={t('account.password.title')} description={t('account.password.description')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('account.credentials.newPasswordLabel')} hint={t('account.credentials.newPasswordHint')}>
                        <Input type="password" value={newPassword as string} onChange={setNewPassword} autoComplete="new-password" placeholder="••••••" />
                      </Field>
                      <div className="flex flex-col gap-2.5 rounded-control bg-surface-sunken p-4 sm:self-start">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-text-muted">{t('account.strength.label')}</span>
                          <span className={`font-semibold ${score === 0 ? 'text-text-faint' : level.text}`}>{score === 0 ? '—' : t(`account.strength.${level.key}`)}</span>
                        </div>
                        <Meter value={score} max={4} hue={level.hue} />
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="stagger" style={st(5)}>
                  <Card icon={ShieldCheck} hue="green" title={t('account.confirm.title')} description={t('account.confirm.description')}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={t('account.credentials.currentPasswordLabel')} required hint={t('account.credentials.currentPasswordHint')}>
                        <Input type="password" value={currentPassword as string} onChange={setCurrentPassword} autoComplete="current-password" />
                      </Field>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
    </Page>
  );
};

export default SettingsAccount;
