import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import type { ApiDashboard } from '../../shared/types';
import { getDashboard, getMe, logout } from './api';
import { parseAdminPath, type AdminRoute } from './lib/admin-path';
import { SECTIONS, SEGMENTS, activeTab, type SectionDef, type TabDef } from './nav';
import AdminShell from './AdminShell';
import Login from './Login';
import SectionTabs from './SectionTabs';
import Dashboard from './screens/Dashboard';
import ContentHome from './screens/ContentHome';
import SettingsStore from './screens/SettingsStore';
import SettingsContact from './screens/SettingsContact';
import SettingsPayment from './screens/SettingsPayment';
import SettingsSeo from './screens/SettingsSeo';
import { Page } from './ui';
import { ToastProvider } from './ui/toast';
import { ConfirmProvider } from './ui/confirm';
// Ekranlar shu jadval orqali ulanadi; Sozlamalarning To'lov/Integratsiyalar/Akkaunt tablari hali eski komponentlar (5b).
import ProductsList from './screens/ProductsList';
import TypesList from './screens/TypesList';
import TypeEdit from './screens/TypeEdit';
import ProductEdit from './screens/ProductEdit';
import CategoriesList from './screens/CategoriesList';
import CategoryEdit from './screens/CategoryEdit';
import BrandsList from './screens/BrandsList';
import BrandEdit from './screens/BrandEdit';
import ModelsList from './screens/ModelsList';
import ModelEdit from './screens/ModelEdit';
import OrdersList from './screens/OrdersList';
import OrderDetail from './screens/OrderDetail';
import ApplicationsList from './screens/ApplicationsList';
import ApplicationDetail from './screens/ApplicationDetail';
import BannersList from './screens/BannersList';
import BannerEdit from './screens/BannerEdit';
import NewsList from './screens/NewsList';
import NewsEdit from './screens/NewsEdit';
import PostsList from './screens/PostsList';
import PostEdit from './screens/PostEdit';
import PagesList from './screens/PagesList';
import PageEdit from './screens/PageEdit';
import VacanciesList from './screens/VacanciesList';
import VacancyEdit from './screens/VacancyEdit';
import VacanciesText, { VACANCIES_TEXT_ID } from './screens/VacanciesText';
import SiteConfigForm from './SiteConfigForm';
import BillzPanel from './BillzPanel';
import AccountForm from './AccountForm';

const DEFAULT_PW_KEY = 'admin-default-pw';

/** Bo'lim + tab → ekran. Kalit `${section}/${tab.id}`; `refreshCounts` — holat o'zgarganda sidebar sanog'ini yangilaydi. */
function screenFor(key: string, clearDefaultPw: () => void, defaultPw: boolean, id: string | null, refreshCounts: () => void) {
  switch (key) {
    case 'products/list': return id ? <ProductEdit key={id} id={id} /> : <ProductsList />;
    case 'products/types': return id ? <TypeEdit key={id} id={id} /> : <TypesList />;
    case 'products/categories': return id ? <CategoryEdit key={id} id={id} /> : <CategoriesList />;
    case 'products/brands': return id ? <BrandEdit key={id} id={id} /> : <BrandsList />;
    case 'products/models': return id ? <ModelEdit key={id} id={id} /> : <ModelsList />;
    case 'orders/list': return id ? <OrderDetail key={id} id={id} onCountsChange={refreshCounts} /> : <OrdersList onCountsChange={refreshCounts} />;
    case 'orders/applications': return id ? <ApplicationDetail key={id} id={id} onCountsChange={refreshCounts} /> : <ApplicationsList onCountsChange={refreshCounts} />;
    case 'content/home': return <ContentHome />;
    case 'content/banners': return id ? <BannerEdit key={id} id={id} /> : <BannersList />;
    case 'content/news': return id ? <NewsEdit key={id} id={id} /> : <NewsList />;
    case 'content/posts': return id ? <PostEdit key={id} id={id} /> : <PostsList />;
    case 'content/pages': return id ? <PageEdit key={id} id={id} /> : <PagesList />;
    case 'content/vacancies':
      if (id === VACANCIES_TEXT_ID) return <VacanciesText />;
      return id ? <VacancyEdit key={id} id={id} /> : <VacanciesList />;
    case 'settings/store': return <SettingsStore />;
    case 'settings/contact': return <SettingsContact />;
    case 'settings/payment': return <SettingsPayment />;
    case 'settings/integrations':
      return (
        <>
          <SiteConfigForm />
          <div className="mt-4"><BillzPanel /></div>
        </>
      );
    case 'settings/seo': return <SettingsSeo />;
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
function SectionPage({ section, tab, route, clearDefaultPw, defaultPw, refreshCounts }: { section: SectionDef; tab: TabDef; route: AdminRoute; clearDefaultPw: () => void; defaultPw: boolean; refreshCounts: () => void }) {
  // `key` — tab almashganda eski ekran holati (ochiq forma) qolib ketmasin.
  const screen = <div key={`${section.id}/${tab.id}/${route.id ?? ''}`}>{screenFor(`${section.id}/${tab.id}`, clearDefaultPw, defaultPw, route.id, refreshCounts)}</div>;
  // Id ekranlari va forma-tablar (landing muharriri) o'z Page'ini chizadi — sarlavha ikki marta chiqmasin.
  if ((route.id !== null && tab.detail) || (route.id === null && tab.ownPage)) return screen;
  return (
    <Page title={tab.label}>
      <SectionTabs section={section.id} active={tab.id} />
      {screen}
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
            : <SectionPage section={section} tab={tab} route={route} clearDefaultPw={clearDefaultPw} defaultPw={defaultPw as boolean} refreshCounts={refreshDash} />}
        </AdminShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}
