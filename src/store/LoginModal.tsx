import type { FC } from 'react';
import { X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import LoginPanel from './LoginPanel';
import Modal from './Modal';

// Sayt ustida markazda ochiladigan kirish oynasi (OrderForm uslubida).
// Ochilish/yopilish xulqi `Modal`da — Escape, scrim, fokus va materiallashuv shu yerda takrorlanmaydi.
const LoginModal: FC<{ t: Translation; config: ApiSiteConfig; open: boolean; onClose: () => void }> = ({
  t, config, open, onClose,
}) => (
  <Modal open={open} label={t.loginTitle} onClose={onClose}>
    <div className="p-7">
      <button
        onClick={onClose}
        aria-label={t.orderClose}
        className="press absolute top-4 right-4 text-muted-2 hover:text-primary"
      >
        <X className="w-5 h-5" />
      </button>
      <LoginPanel t={t} config={config} active={open} />
    </div>
  </Modal>
);

export default LoginModal;
