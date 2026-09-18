import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import LoginPanel from './LoginPanel';

const LoginPage: FC<{ t: Translation; error?: string }> = ({ t, error }) => {
  const { config } = useOutletContext<StoreContext>();
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      {/* Karta `LoginModal` panelining aynan o'zi (kenglik, radius, chegara, ichki
          bo'shliq) — egasining talabi: kirish ikki joyda bir xil ko'rinsin. `Modal`
          ham `rounded-xl bg-surface border border-line` beradi. */}
      <div className="w-full max-w-[360px] rounded-xl border border-line bg-surface p-7">
        <LoginPanel t={t} config={config} error={error} />
      </div>
    </div>
  );
};

export default LoginPage;
