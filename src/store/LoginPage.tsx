import type { FC } from 'react';
import { useOutletContext } from 'react-router';
import type { Translation } from '../locales';
import type { StoreContext } from './StoreLayout';
import LoginPanel from './LoginPanel';

const LoginPage: FC<{ t: Translation; error?: string }> = ({ t, error }) => {
  const { config } = useOutletContext<StoreContext>();
  return (
    <div className="max-w-md mx-auto px-4 py-20">
      <LoginPanel t={t} config={config} error={error} />
    </div>
  );
};

export default LoginPage;
