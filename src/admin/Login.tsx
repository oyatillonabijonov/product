import { useState } from 'react';
import { login } from './api';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      onSuccess();
    } catch {
      setError("Login yoki parol noto'g'ri");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="bg-white rounded-[24px] p-8 w-full max-w-sm shadow-[--shadow-apple]">
        <h1 className="text-[24px] font-semibold mb-6 text-center">Admin panel</h1>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Foydalanuvchi"
          className="w-full border border-line rounded-2xl px-4 py-3 mb-3 focus:outline-none focus:border-accent"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Parol"
          className="w-full border border-line rounded-2xl px-4 py-3 mb-4 focus:outline-none focus:border-accent"
        />
        {error && <p className="text-[13px] text-danger mb-3">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? 'Kirilmoqda…' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
