import type { FC } from 'react';
import type { Icon } from '@phosphor-icons/react';

// Ro'yxat qatorlaridagi ikonка-amal tugmasi (Tahrir/Ko'rsat/O'chir).
// aria-label + title bilan — ikonка-only tugmalar uchun kirish imkoniyati.
const IconAction: FC<{ Icon: Icon; label: string; onClick: () => void; danger?: boolean }> = ({
  Icon,
  label,
  onClick,
  danger,
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={`p-2 rounded-lg transition-colors hover:bg-bg ${danger ? 'text-danger' : 'text-muted hover:text-primary'}`}
  >
    <Icon size={18} />
  </button>
);

export default IconAction;
