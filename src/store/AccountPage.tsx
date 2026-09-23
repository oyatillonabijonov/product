import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { FC } from 'react';
import { BotAvatar } from 'bot-avatars';
import { User, Package, Heart, MapPin, LogOut } from 'lucide-react';
import { parseAvatar } from '../../shared/avatar';
import type { Translation } from '../locales';
import type { ApiCustomer, ApiOrder } from '../../shared/types';
import { useFavorites } from './FavoritesContext';
import ProfileForm from './account/ProfileForm';
import OrdersList from './account/OrdersList';
import FavoritesList from './account/FavoritesList';
import AddressList from './account/AddressList';
import type { ApiAddress } from '../../shared/address';

type TabKey = 'profile' | 'orders' | 'addresses' | 'favorites';

function isTabKey(v: string | null): v is TabKey {
  return v === 'profile' || v === 'orders' || v === 'addresses' || v === 'favorites';
}

const AccountPage: FC<{ t: Translation; customer: ApiCustomer; orders: ApiOrder[]; itemImages: Record<string, string>; addresses: ApiAddress[] }> = ({
  t, customer, orders, itemImages, addresses,
}) => {
  // Saqlangandan keyin yon panel ham yangilansin — server qaytargan mijoz shu yerda turadi.
  const [rawCust, setCust] = useState(customer);
  const [rawAddrs, setAddrs] = useState(addresses);
  const addrs = rawAddrs as ApiAddress[];
  const cust = rawCust as ApiCustomer;
  const avatar = parseAvatar(cust.avatar, cust.id);
  const [sp, setSp] = useSearchParams();
  const tabParam = sp.get('tab');
  const tab: TabKey = isTabKey(tabParam) ? tabParam : 'profile';
  const { count: favCount } = useFavorites();

  const nav = [
    { key: 'profile', label: t.accountTabProfile, Icon: User, badge: 0 },
    { key: 'orders', label: t.accountOrders, Icon: Package, badge: orders.length },
    { key: 'addresses', label: t.accountTabAddresses, Icon: MapPin, badge: addrs.length },
    { key: 'favorites', label: t.accountTabFavorites, Icon: Heart, badge: favCount },
  ] as const;
  const active = nav.find((n) => n.key === tab) ?? nav[0];
  const ActiveIcon = active.Icon;

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(sp);
    if (key === 'profile') next.delete('tab');
    else next.set('tab', key);
    setSp(next, { preventScrollReset: true });
  };

  return (
    <div className="bg-bg min-h-[70vh]">
      <div className="max-w-[1080px] mx-auto px-4 py-8 md:py-10">
        <div className="grid md:grid-cols-[270px_1fr] gap-5 items-start">
          {/* Sidebar */}
          <aside className=" rounded-lg bg-surface overflow-hidden md:sticky md:top-24">
            <div className="flex items-center gap-3 p-5 border-b border-line/60">
              <BotAvatar type={avatar.type} face={avatar.face} size={48} />
              <div className="min-w-0">
                <div className="font-semibold text-para text-primary truncate">{cust.name || '—'}</div>
                {cust.email && <div className="text-label text-muted truncate">{cust.email}</div>}
              </div>
            </div>
            <nav className="p-2">
              {nav.map(({ key, label, Icon, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-current={tab === key || undefined}
                  className={`rounded-sm press w-full flex items-center gap-3 px-3.5 py-2.5 text-label font-medium ${
                    tab === key ? 'bg-accent-soft text-accent' : 'text-body hover:bg-bg'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {badge > 0 && (
                    <span className={`text-label font-semibold rounded-full px-1.5 min-w-[20px] text-center ${tab === key ? 'bg-accent text-bg' : 'bg-bg text-muted-2'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div className="p-2 border-t border-line/60">
              <a
                href="/auth/logout"
                className="rounded-sm w-full flex items-center gap-3 px-3.5 py-2.5 text-label font-medium text-muted hover:bg-bg hover:text-sale transition-colors"
              >
                <LogOut className="w-[18px] h-[18px] shrink-0" /> {t.accountLogout}
              </a>
            </div>
          </aside>

          {/* Content */}
          <section className=" rounded-lg bg-surface p-5 md:p-7 min-h-[360px]">
            <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-line/60">
              <ActiveIcon className="w-5 h-5 text-accent" />
              <h1 className="text-lede font-semibold text-primary">{active.label}</h1>
            </div>
            {tab === 'profile' && <ProfileForm t={t} customer={cust} onSaved={setCust} />}
            {tab === 'orders' && <OrdersList t={t} orders={orders} itemImages={itemImages} />}
            {tab === 'addresses' && <AddressList t={t} addresses={addrs} onChange={setAddrs} />}
            {tab === 'favorites' && <FavoritesList t={t} />}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
