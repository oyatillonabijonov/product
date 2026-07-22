import { useEffect, useState } from 'react';
import { getAccount, updateAccount } from './api';
import { errText } from './errText';

export default function AccountForm({ onPasswordChanged }: { onPasswordChanged?: () => void }) {
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getAccount()
      .then((a) => { setUsername(a.username); setGoogleEmail(a.adminGoogleEmail); setLoaded(true); })
      .catch(() => setMsg("Yuklashda xatolik (migratsiya qo'llanganmi?)"));
  }, []);

  async function save() {
    if (!currentPassword) { setMsg(errText(new Error('current_password_required'))); return; }
    setBusy(true); setMsg('');
    const changedPassword = Boolean(newPassword);
    try {
      await updateAccount({
        currentPassword,
        username: username.trim() || undefined,
        newPassword: newPassword || undefined,
        adminGoogleEmail: googleEmail.trim(),
      });
      setMsg('Saqlandi ✓ — keyingi kirishда yangi maʼlumotlardan foydalaning');
      setCurrentPassword('');
      setNewPassword('');
      if (changedPassword) onPasswordChanged?.();
    } catch (e) {
      setMsg(errText(e));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded && !msg) return <p className="text-muted">Yuklanmoqda…</p>;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-apple space-y-3 max-w-xl">
      <h3 className="font-semibold text-[17px]">Kirish maʼlumotlari</h3>
      <p className="text-[13px] text-muted">Login va parolni oʻzgartirish. Tasdiqlash uchun joriy parolni kiriting.</p>

      <label className="block text-[13px] text-muted">
        Login
        <input
          value={username}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        />
      </label>

      <label className="block text-[13px] text-muted">
        Yangi parol <span className="text-muted-3">(boʻsh qoldirsangiz oʻzgarmaydi)</span>
        <input
          type="password"
          value={newPassword}
          autoComplete="new-password"
          placeholder="••••••"
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        />
      </label>

      <label className="block text-[13px] text-muted">
        Google email (Google bilan kirish uchun)
        <input
          type="email"
          value={googleEmail}
          autoComplete="off"
          placeholder="siz@gmail.com"
          onChange={(e) => setGoogleEmail(e.target.value)}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        />
        <span className="block text-[11.5px] text-muted-2 mt-1">
          Shu Google akkaunt admin panelga «Google bilan kirish» orqali kira oladi. Bo'sh qoldirsangiz — o'chiq.
          (Mijoz kirishi uchun Google OAuth «Sayt ma'lumotlari»da sozlangan bo'lishi kerak.)
        </span>
      </label>

      <label className="block text-[13px] text-muted">
        Joriy parol <span className="text-danger">*</span>
        <input
          type="password"
          value={currentPassword}
          autoComplete="current-password"
          placeholder="Tasdiqlash uchun joriy parol"
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full border border-line-2 rounded-xl px-3 py-2 text-[14px] text-primary"
        />
      </label>

      {msg && <p className={`text-[13px] ${msg.includes('✓') ? 'text-trust' : 'text-danger'}`}>{msg}</p>}
      <button
        onClick={save}
        disabled={busy}
        className="px-5 py-2.5 bg-accent text-white font-semibold rounded-full disabled:opacity-50"
      >
        Saqlash
      </button>
    </div>
  );
}
