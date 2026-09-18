import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

const AccountEmptyState: FC<{ icon: LucideIcon; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 gap-3">
    <div className="w-14 h-14 rounded-full bg-bg flex items-center justify-center">
      <Icon className="w-7 h-7 text-muted-2" />
    </div>
    <p className="text-muted text-label">{text}</p>
  </div>
);

export default AccountEmptyState;
