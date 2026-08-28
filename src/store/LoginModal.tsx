import { useEffect } from 'react';
import type { FC } from 'react';
import { X } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiSiteConfig } from '../../shared/types';
import LoginPanel from './LoginPanel';

// Sayt ustida markazda ochiladigan kirish oynasi (OrderForm uslubida). Tashqariga bosish / Escape yopadi.
const LoginModal: FC<{ t: Translation; config: ApiSiteConfig; open: boolean; onClose: () => void }> = ({
  t, config, open, onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.loginTitle}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-surface border border-line rounded-[24px] shadow-apple-hover p-7 relative"
      >
        <button
          onClick={onClose}
          aria-label={t.orderClose}
          className="absolute top-4 right-4 text-muted-2 hover:text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <LoginPanel t={t} config={config} active={open} />
      </div>
    </div>
  );
};

export default LoginModal;
