import { useState } from 'react';
import type { FC } from 'react';
import { User, Package, Heart, ShieldCheck, LogOut } from 'lucide-react';
import type { Translation } from '../locales';
import type { ApiCustomer, ApiOrder } from '../../shared/types';
import { useFavorites } from './FavoritesContext';
import ProfileForm from './account/ProfileForm';
import OrdersList from './account/OrdersList';
import FavoritesList from './account/FavoritesList';
import PasswordForm from './account/PasswordForm';

type TabKey = 'profile' | 'orders' | 'favorites' | 'security';

function initials(name: string, email: string): string {
  const src = (name || '').trim() || email || '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const AccountPage: FC<{ t: Translation; customer: ApiCustomer; orders: ApiOrder[]; hasPassword: boolean }> = ({
  t, customer, orders, hasPassword,
}) => {
  const [tab, setTab] = useState<TabKey>('profile');
  const { count: favCount } = useFavorites();

  const nav = [
    { key: 'profile', label: t.accountTabProfile, Icon: User, badge: 0 },
    { key: 'orders', label: t.accountOrders, Icon: Package, badge: orders.length },
    { key: 'favorites', label: t.accountTabFavorites, Icon: Heart, badge: favCount },
    { key: 'security', label: t.accountTabSecurity, Icon: ShieldCheck, badge: 0 },
  ] as const;
  const active = nav.find((n) => n.key === tab) ?? nav[0];
  const ActiveIcon = active.Icon;

  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-[1080px] mx-auto px-4 py-8 md:py-10">
        <div className="grid md:grid-cols-[270px_1fr] gap-5 items-start">
          {/* Sidebar */}
          <aside className="bg-white border border-line-2 rounded-2xl shadow-apple overflow-hidden md:sticky md:top-24">
            <div className="flex items-center gap-3 p-5 border-b border-line/60">
              <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center font-semibold text-[17px] shrink-0">
                {initials(customer.name, customer.email ?? '')}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-[15px] text-primary truncate">{customer.name || '—'}</div>
                {customer.email && <div className="text-[14px] text-muted truncate">{customer.email}</div>}
              </div>
            </div>
            <nav className="p-2">
              {nav.map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-current={tab === key || undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    tab === key ? 'bg-accent-soft text-accent' : 'text-body hover:bg-bg'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && (
                    <span className={`text-[14px] font-semibold rounded-full px-1.5 min-w-[20px] text-center ${tab === key ? 'bg-accent text-white' : 'bg-bg text-muted-2'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="p-2 border-t border-line/60">
              <a
                href="/auth/logout"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-muted hover:bg-bg hover:text-sale transition-colors"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" /> {t.accountLogout}
              </a>
            </div>
          </aside>

          {/* Content */}
          <section className="bg-white border border-line-2 rounded-2xl shadow-apple p-5 md:p-7 min-h-[360px]">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-line/60">
              <ActiveIcon className="w-5 h-5 text-accent" />
              <h1 className="text-[19px] font-semibold text-primary tracking-[-0.01em]">{active.label}</h1>
            </div>
            {tab === 'profile' && <ProfileForm t={t} customer={customer} />}
            {tab === 'orders' && <OrdersList t={t} orders={orders} />}
            {tab === 'favorites' && <FavoritesList t={t} />}
            {tab === 'security' && <PasswordForm t={t} hasEmail={Boolean(customer.email)} hasPassword={hasPassword} />}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
