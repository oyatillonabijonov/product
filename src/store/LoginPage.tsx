import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import LoginPanel from './LoginPanel';

const LoginPage: FC<{ t: Translation; error?: string }> = ({ t, error }) => {
  const { config } = useOutletContext<StoreContext>();
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      {/* Panel modal'dagi kabi kartada turadi — fon ustida to'g'ridan-to'g'ri
          chizilganda ichki `bg-bg` bloklar (segment, input) fon bilan bir xil
          rangda bo'lib, elementlar chegarasi ko'rinmay qolardi. */}
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-7">
        <LoginPanel t={t} config={config} error={error} />
      </div>
    </div>
  );
};

export default LoginPage;
