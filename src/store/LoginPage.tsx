import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import LoginPanel from './LoginPanel';

const LoginPage: FC<{ t: Translation; error?: string }> = ({ t, error }) => {
  const { config } = useOutletContext<StoreContext>();
  return (
    <div className="max-w-md mx-auto px-4 py-20">
      {/* Panel modal'dagi kabi kartada turadi — fon ustida to'g'ridan-to'g'ri
          chizilganda ichki `bg-bg` bloklar (segment, input) fon bilan bir xil
          rangda bo'lib, elementlar chegarasi ko'rinmay qolardi. */}
      <div className="rounded-[24px] border border-line bg-surface p-7">
        <LoginPanel t={t} config={config} error={error} />
      </div>
    </div>
  );
};

export default LoginPage;
