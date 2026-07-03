import {
  DeviceMobile,
  FileText,
  Gear,
  type Icon,
  ImageSquare,
  Package,
  SignOut,
  SquaresFour,
  Tag,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { getMe, logout } from './api';
import BannerList from './BannerList';
import BrandList from './BrandList';
import CategoryList from './CategoryList';
import Login from './Login';
import PageList from './PageList';
import ProductList from './ProductList';
import SettingsForm from './SettingsForm';
import SiteConfigForm from './SiteConfigForm';

type Tab = 'products' | 'models' | 'settings' | 'categories' | 'brands' | 'banners' | 'pages';

type NavItem = { id: Tab; label: string; Icon: Icon };

const NAV: NavItem[] = [
  { id: 'products', label: 'Mahsulotlar', Icon: Package },
  { id: 'models', label: 'Modellar', Icon: DeviceMobile },
  { id: 'categories', label: 'Kategoriyalar', Icon: SquaresFour },
  { id: 'brands', label: 'Brendlar', Icon: Tag },
  { id: 'banners', label: 'Bannerlar', Icon: ImageSquare },
  { id: 'pages', label: 'Sahifalar', Icon: FileText },
  { id: 'settings', label: 'Sozlamalar', Icon: Gear },
];

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('products');

  useEffect(() => {
    getMe()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="p-8 text-muted">Yuklanmoqda…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="hidden md:flex md:flex-col w-[230px] shrink-0 bg-white border-r border-line-2 sticky top-0 h-screen p-4">
        <div className="text-[17px] font-semibold text-primary px-4 pb-4">Admin</div>
        {NAV.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[14px] font-semibold text-left transition-colors ${
                active ? 'bg-accent text-white' : 'text-primary hover:bg-bg'
              }`}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              {label}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[14px] font-semibold text-left text-muted hover:text-primary"
        >
          <SignOut size={18} />
          Chiqish
        </button>
      </aside>
      <header className="md:hidden bg-white border-b border-line-2 px-3 py-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {NAV.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold whitespace-nowrap ${
                active ? 'bg-accent text-white' : 'text-primary'
              }`}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'} />
              {label}
            </button>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold whitespace-nowrap text-muted hover:text-primary"
        >
          <SignOut size={18} />
          Chiqish
        </button>
      </header>
      <main className="flex-1 min-w-0">
        <div className="max-w-[900px] mx-auto px-4 md:px-8 py-8">
          {tab === 'products' && <ProductList />}
          {tab === 'settings' && (
            <>
              <SettingsForm />
              <div className="mt-8">
                <SiteConfigForm />
              </div>
            </>
          )}
          {tab === 'categories' && <CategoryList />}
          {tab === 'brands' && <BrandList />}
          {tab === 'banners' && <BannerList />}
          {tab === 'pages' && <PageList />}
        </div>
      </main>
    </div>
  );
}
