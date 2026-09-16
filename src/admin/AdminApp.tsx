import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { ApiDashboard } from '../../shared/types';
import { getDashboard, getMe, logout } from './api';
import { adminPath, parseAdminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, SEGMENTS, activeTab, type SectionDef, type TabDef } from './nav';
import AdminShell from './AdminShell';
import Login from './Login';
import Dashboard from './screens/Dashboard';
import { Page, Tabs } from './ui';
import { ToastProvider } from './ui/toast';
import { ConfirmProvider } from './ui/confirm';
// Eski ekranlar — bosqichma-bosqich almashtiriladi (2–5-bosqichlar), shu jadval orqali ulanadi.
import ProductList from './ProductList';
import CategoryList from './CategoryList';
import BrandList from './BrandList';
import ModelList from './ModelList';
import OrdersPage from './OrdersPage';
import JobApplicationsList from './JobApplicationsList';
import BannerList from './BannerList';
import NewsList from './NewsList';
import PostList from './PostList';
import PageList from './PageList';
import VacancyList from './VacancyList';
import SiteConfigForm from './SiteConfigForm';
import SettingsForm from './SettingsForm';
import BillzPanel from './BillzPanel';
import AccountForm from './AccountForm';

const DEFAULT_PW_KEY = 'admin-default-pw';

/** Bo'lim + tab → ekran. Kalit `${section}/${tab.id}`. */
function screenFor(key: string, clearDefaultPw: () => void, defaultPw: boolean) {
  switch (key) {
    case 'products/list': return <ProductList />;
    case 'products/categories': return <CategoryList />;
    case 'products/brands': return <BrandList />;
    case 'products/models': return <ModelList />;
    case 'orders/list': return <OrdersPage />;
    case 'orders/applications': return <JobApplicationsList />;
    case 'content/banners': return <BannerList />;
    case 'content/news': return <NewsList />;
    case 'content/posts': return <PostList />;
    case 'content/pages': return <PageList />;
    case 'content/vacancies': return <VacancyList />;
    case 'settings/store': return <SiteConfigForm />;
    case 'settings/payment': return <SettingsForm />;
    case 'settings/integrations': return <BillzPanel />;
    case 'settings/account':
      return (
        <>
          {defaultPw && (
            <p className="mb-6 rounded-sm border border-danger/30 bg-danger/5 px-4 py-3 text-para text-danger">
              <b>Diqqat:</b> standart «admin» paroli ishlatilmoqda — quyida yangi parol qo'ying.
            </p>
          )}
          <AccountForm onPasswordChanged={clearDefaultPw} />
        </>
      );
    default: return null;
  }
}

/** Bo'lim sahifasi: sarlavha + (mobilda) tab segmenti + ekran. Desktopda tablar sidebar'da. */
function SectionPage({ section, tab, route, clearDefaultPw, defaultPw }: { section: SectionDef; tab: TabDef; route: AdminRoute; clearDefaultPw: () => void; defaultPw: boolean }) {
  return (
    <Page title={tab.label}>
      {section.tabs.length > 1 && (
        <Tabs
          className="mb-6 md:hidden"
          active={tab.id}
          items={section.tabs.map((t) => ({ id: t.id, label: t.label, to: adminPath(section.id, t.segment) }))}
        />
      )}
      {/* `key` — tab almashganda eski ekran holati (ochiq forma) qolib ketmasin. */}
      <div key={`${section.id}/${tab.id}/${route.id ?? ''}`}>{screenFor(`${section.id}/${tab.id}`, clearDefaultPw, defaultPw)}</div>
    </Page>
  );
}

export default function AdminApp() {
  const [authed, setAuthed] = useState(null as boolean | null);
  const [defaultPw, setDefaultPw] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(DEFAULT_PW_KEY) === '1',
  );
  const [rawDash, setDash] = useState(null as ApiDashboard | null);
  const dash = rawDash as ApiDashboard | null;
  const [dashError, setDashError] = useState(false);
  const location = useLocation();
  const route = parseAdminPath(location.pathname, SEGMENTS);

  useEffect(() => {
    getMe().then(() => setAuthed(true)).catch(() => setAuthed(false));
  }, []);

  // ponytail: sanoqlar har navigatsiyada qayta so'raladi (3 ta COUNT — arzon); real-time kerak emas.
  const refreshDash = useCallback(() => {
    getDashboard()
      .then((d) => { setDash(d); setDashError(false); })
      .catch(() => setDashError(true));
  }, []);
  useEffect(() => { if (authed) refreshDash(); }, [authed, location.pathname, refreshDash]);

  if (authed === null) return <div className="p-8 text-para text-muted">Yuklanmoqda…</div>;
  if (!authed) {
    return (
      <Login
        onSuccess={(defaultPassword) => {
          setAuthed(true);
          setDefaultPw(defaultPassword);
          if (defaultPassword) sessionStorage.setItem(DEFAULT_PW_KEY, '1');
          else sessionStorage.removeItem(DEFAULT_PW_KEY);
        }}
      />
    );
  }

  const clearDefaultPw = () => { setDefaultPw(false); sessionStorage.removeItem(DEFAULT_PW_KEY); };
  const handleLogout = async () => { await logout(); setAuthed(false); };
  const section = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const tab = activeTab(section, route);
  const badge = (dash?.newOrders ?? 0) + (dash?.newApplications ?? 0);

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminShell route={route} badge={badge} onLogout={handleLogout}>
          {tab === null
            ? <Dashboard data={dash} onRefresh={refreshDash} defaultPw={defaultPw as boolean} error={dashError as boolean} />
            : <SectionPage section={section} tab={tab} route={route} clearDefaultPw={clearDefaultPw} defaultPw={defaultPw as boolean} />}
        </AdminShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
