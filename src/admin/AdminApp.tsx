import { useEffect, useState } from 'react';
import { getMe, logout } from './api';
import CategoryList from './CategoryList';
import Login from './Login';
import ProductList from './ProductList';
import SettingsForm from './SettingsForm';

type Tab = 'products' | 'settings' | 'categories';

export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('products');

  useEffect(() => {
    getMe()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) return <div className="p-8 text-[#6E6E73]">Yuklanmoqda…</div>;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-[#E5E5EA] px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('products')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'products' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'
            }`}
          >
            Mahsulotlar
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'settings' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'
            }`}
          >
            Sozlamalar
          </button>
          <button
            onClick={() => setTab('categories')}
            className={`px-4 py-2 rounded-full text-[14px] font-semibold ${
              tab === 'categories' ? 'bg-[#0071E3] text-white' : 'text-[#1D1D1F]'
            }`}
          >
            Kategoriyalar
          </button>
        </div>
        <button
          onClick={async () => {
            await logout();
            setAuthed(false);
          }}
          className="text-[14px] text-[#6E6E73] hover:text-[#1D1D1F]"
        >
          Chiqish
        </button>
      </header>
      <main className="max-w-[900px] mx-auto px-4 md:px-8 py-8">
        {tab === 'products' ? <ProductList /> : tab === 'settings' ? <SettingsForm /> : <CategoryList />}
      </main>
    </div>
  );
}
