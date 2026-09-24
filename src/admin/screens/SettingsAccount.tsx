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
      .catch(() => setError("Sahifani yangilab qayta urinib ko'ring"));
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
      toast('Saqlandi · keyingi kirishda yangi maʼlumotlardan foydalaning');
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
      title="Akkaunt"
      description="Admin panelga kirish maʼlumotlari. O'zgartirish uchun joriy parolni kiriting."
      dirty={dirty}
      actions={<Button onClick={save} disabled={!canSave}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>}
    >
      <SectionTabs section="settings" active="account" />
      {error ? <EmptyState title="Ma'lumot yuklanmadi" text={error} />
        : !loaded ? <Skeleton rows={5} />
        : (
          <div className="flex flex-col gap-4">
            {defaultPw && (
              <Card title="Standart parol ishlatilmoqda" description="Panelga «admin» paroli bilan kirilgan — hoziroq yangi parol qo'ying.">
                <p className="text-para text-danger">Parol o'zgartirilgach barcha ochiq sessiyalar bekor bo'ladi.</p>
              </Card>
            )}
            <Card title="Kirish maʼlumotlari">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Login" hint="Kamida 3 belgi">
                  <Input value={username as string} onChange={setUsername} autoComplete="username" />
                </Field>
                <Field label="Yangi parol" hint="Bo'sh qoldirsangiz parol o'zgarmaydi; kamida 8 belgi">
                  <Input type="password" value={newPassword as string} onChange={setNewPassword} autoComplete="new-password" placeholder="••••••" />
                </Field>
                <Field label="Google email" hint="Shu Google akkaunt «Google bilan kirish» orqali panelga kira oladi; bo'sh qolsa o'chiq">
                  <Input type="email" value={googleEmail as string} onChange={setGoogleEmail} placeholder="siz@gmail.com" />
                </Field>
                <Field label="Joriy parol" required hint="Har qanday o'zgarishni tasdiqlaydi">
                  <Input type="password" value={currentPassword as string} onChange={setCurrentPassword} autoComplete="current-password" />
                </Field>
              </div>
            </Card>
            <Card title="Ko'rinish">
              <SwitchRow label="Qorong'i mavzu" hint="Faqat admin panelda va faqat shu brauzerda — do'kon sahifalari o'zgarmaydi" on={dark} onChange={setDark} />
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
