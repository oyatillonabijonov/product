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

type Tab = 'products' | 'settings' | 'categories' | 'brands' | 'banners' | 'pages';

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

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b border-line-2 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'products' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Mahsulotlar
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'settings' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Sozlamalar
          </button>
          <button
            onClick={() => setTab('categories')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'categories' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Kategoriyalar
          </button>
          <button
            onClick={() => setTab('brands')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'brands' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Brendlar
          </button>
          <button
            onClick={() => setTab('banners')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'banners' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Bannerlar
          </button>
          <button
            onClick={() => setTab('pages')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'pages' ? 'bg-accent text-white' : 'text-primary'
            }`}
          >
            Sahifalar
          </button>
        </div>
        <button
          onClick={async () => {
            await logout();
            setAuthed(false);
          }}
          className="text-[14px] text-muted hover:text-primary"
        >
          Chiqish
        </button>
      </header>
      <main className="max-w-[900px] mx-auto px-4 md:px-8 py-8">
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
      </main>
    </div>
  );
}
