import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowSquareOut, CaretUpDown, Gear, MagnifyingGlass, Moon, SignOut, Sun, Translate, UserCircle } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { adminPath, type AdminRoute, type SectionId } from './lib/admin-path';
import { SECTIONS, activeTab } from './nav';
import { useAdminDark } from './theme';
import { ADMIN_LANGS, LANG_NAMES, useAdminLang } from './i18n';
import { CountBadge, IconButton } from './ui';
import { CrumbsContext, type Crumb } from './ui/layout';
import CommandPalette from './CommandPalette';

/**
 * Qobiq — Astryx `AppShell` (elevated) + `SideNav`: body fonida 260px sidebar — logo, qidiruv (⌘K), guruhlangan
 * menyu (Savdo · Katalog · Kontent · Tizim; band 32px, radius 12, faol band — neytral fon + 500, silliq suriladi),
 * pastda profil menyusi (Astryx dropdown: popover, `shadow-med`). Kontent yuza varag'ida, faqat chap-yuqori burchagi
 * 32px yumaloq — sidebar'dan fon bilan ajraladi. <1024px: yuqorida ixcham panel, pastda tab bar.
 */
interface NavItem { key: string; label: string; to: string; icon: PhIcon; active: boolean; badge?: number }

const PILL = { type: 'spring', stiffness: 520, damping: 42 } as const;

/** Profil menyusidagi ikki-uch variantli tanlov — Astryx segment-kontroli, to'liq enli (silliq suriladi). */
const MenuSeg: FC<{ label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string; icon: PhIcon }[] }> = ({ label, value, onChange, options }) => (
  <div role="radiogroup" aria-label={label}>
    <p className="px-1 pb-1 text-xs font-semibold text-text-muted">{label}</p>
    <div className="grid rounded-control bg-neutral p-0.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.id === value;
        const I = o.icon;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => { if (!on) onChange(o.id); }}
            className={`relative isolate flex h-7 items-center justify-center gap-1.5 rounded-[10px] text-base transition-colors duration-[175ms] ${on ? 'font-semibold text-text' : 'font-medium text-text-muted hover:text-text'}`}
          >
            {on && <motion.span layoutId={`menuseg-${label}`} transition={PILL} className="absolute inset-0 -z-10 rounded-[10px] bg-elevated shadow-low" />}
            <I weight={on ? 'fill' : 'regular'} className="size-3.5" />
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  </div>
);

const AdminShell: FC<{ route: AdminRoute; badge: number; onLogout: () => void; children: ReactNode }> = ({ route, badge, onLogout, children }) => {
  const current = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const activeTabDef = activeTab(current, route);
  const reduced = useReducedMotion();
  const [dark, setDark] = useAdminDark();
  const { lang, setLang } = useAdminLang();
  const { t } = useTranslation('shell');
  const { pathname } = useLocation();
  const main = useRef(null) as { current: HTMLElement | null };
  const [rawSearch, setSearch] = useState(false);
  const search = rawSearch as boolean;
  const [rawMenu, setMenu] = useState(false);
  const menu = rawMenu as boolean;
  const menuBox = useRef(null) as { current: HTMLDivElement | null };
  useEffect(() => { main.current?.scrollTo(0, 0); setMenu(false); }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); setSearch(true); }
      if (e.key === 'Escape') setMenu(false);
    };
    const onDown = (e: MouseEvent) => { if (menuBox.current && !menuBox.current.contains(e.target as Node)) setMenu(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, []);

  const section = (id: SectionId) => SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
  const tabsOf = (id: SectionId): NavItem[] => section(id).tabs.map((tab) => ({
    key: `${id}:${tab.id}`,
    label: t(tab.labelKey),
    to: adminPath(id, tab.segment),
    icon: tab.Icon,
    active: route.section === id && activeTabDef?.id === tab.id,
    badge: id === 'orders' && tab.id === 'list' ? badge : undefined,
  }));
  const home = section('home');
  const settings = section('settings');
  const groups: { id: string; label?: string; items: NavItem[] }[] = [
    { id: 'main', items: [{ key: 'home', label: t(home.labelKey), to: adminPath('home'), icon: home.Icon, active: route.section === 'home' }] },
    { id: 'sales', label: t('nav.groups.sales'), items: tabsOf('orders') },
    { id: 'catalog', label: t('nav.groups.catalog'), items: tabsOf('products') },
    { id: 'content', label: t('nav.groups.content'), items: tabsOf('content') },
    { id: 'system', label: t('nav.groups.system'), items: [{ key: 'settings', label: t(settings.labelKey), to: adminPath('settings', settings.tabs[0].segment), icon: Gear, active: route.section === 'settings' }] },
  ];
  const badgeLabel = t('nav.ordersBadge', { count: badge });

  const crumbs: Crumb[] = [{ label: t(current.labelKey), to: adminPath(current.id) }];
  if (activeTabDef && current.tabs.length > 1 && activeTabDef.segment) crumbs.push({ label: t(activeTabDef.labelKey), to: adminPath(current.id, activeTabDef.segment) });

  const item = (it: NavItem) => {
    const I = it.icon;
    return (
      <li key={it.key}>
        <Link
          to={it.to}
          aria-current={it.active ? 'page' : undefined}
          className={`relative isolate flex h-8 items-center gap-2 rounded-item px-2 text-base text-text transition-colors duration-[175ms] ${
            it.active ? 'font-medium' : 'font-normal hover:bg-neutral'
          }`}
        >
          {it.active && <motion.span layoutId="nav-pill" transition={PILL} className="absolute inset-0 -z-10 rounded-item bg-neutral" />}
          <I weight={it.active ? 'fill' : 'regular'} className={`size-4 shrink-0 ${it.active ? 'text-text' : 'text-text-muted'}`} />
          <span className="min-w-0 flex-1 truncate">{it.label}</span>
          {it.badge !== undefined && <CountBadge count={it.badge} label={badgeLabel} />}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside className="hidden w-[260px] shrink-0 flex-col px-2 pb-2 pt-3 lg:flex">
        <Link to="/admin" className="flex h-9 items-center px-2" aria-label="ProDuct">
          <img src={logo} alt="ProDuct" className="logo-light h-[22px]" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-[22px]" />
        </Link>
        <button
          type="button"
          onClick={() => setSearch(true)}
          className="mt-3 flex h-8 items-center gap-2 rounded-control border border-border-strong bg-surface pl-2.5 pr-1.5 text-left text-base text-text-muted transition-shadow duration-[175ms] hover:ring-2 hover:ring-inset hover:ring-border-strong/30"
        >
          <MagnifyingGlass className="size-4 shrink-0" />
          <span className="flex-1">{t('search.placeholder')}</span>
          <kbd className="rounded-tag bg-neutral px-1.5 py-px font-sans text-xs font-medium text-text-muted">⌘K</kbd>
        </button>

        <nav aria-label={t('nav.aria')} className="no-scrollbar -mx-1 mt-2 flex-1 overflow-y-auto px-1 pb-2">
          {groups.map((g) => (
            <div key={g.id} className="pt-3 first:pt-1">
              {g.label && <p className="flex h-6 items-center px-2 text-xs font-semibold text-text-muted">{g.label}</p>}
              <ul className="flex flex-col gap-0.5">{g.items.map(item)}</ul>
            </div>
          ))}
        </nav>

        <div ref={menuBox} className="relative mt-2">
          <AnimatePresence>
            {menu && (
              <motion.div
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                role="menu"
                className="absolute inset-x-0 bottom-full mb-2 origin-bottom rounded-menu bg-surface-raised p-1 shadow-med"
              >
                <div className="flex items-center gap-2.5 px-2 pb-2 pt-1.5">
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral text-base font-semibold text-text">P</span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-text">{t('profile.name')}</span>
                    <span className="block truncate text-sm text-text-muted">{t('profile.store')}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 border-y border-border px-2 py-2.5">
                  <MenuSeg
                    label={t('profile.theme')}
                    value={dark ? 'dark' : 'light'}
                    onChange={(v) => setDark(v === 'dark')}
                    options={[{ id: 'light', label: t('profile.light'), icon: Sun }, { id: 'dark', label: t('profile.dark'), icon: Moon }]}
                  />
                  <MenuSeg
                    label={t('footer.language')}
                    value={lang}
                    onChange={(v) => setLang(v as typeof lang)}
                    options={ADMIN_LANGS.map((l) => ({ id: l, label: LANG_NAMES[l], icon: Translate }))}
                  />
                </div>
                <div className="mt-1 flex flex-col">
                  <Link to={adminPath('settings', 'account')} className="flex h-8 items-center gap-2 rounded-item px-2 text-base text-text transition-colors hover:bg-ghost-hover">
                    <UserCircle className="size-4 text-text-muted" />{t('nav.settings.account')}
                  </Link>
                  <a href="/" target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-2 rounded-item px-2 text-base text-text transition-colors hover:bg-ghost-hover">
                    <ArrowSquareOut className="size-4 text-text-muted" />{t('footer.openSite')}
                  </a>
                  <button type="button" onClick={onLogout} className="flex h-8 w-full items-center gap-2 rounded-item px-2 text-base text-danger-text transition-colors hover:bg-danger-soft">
                    <SignOut className="size-4" />{t('footer.logout')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
            className={`group flex w-full items-center gap-2.5 rounded-item p-1.5 pr-2 text-left transition-colors duration-[175ms] hover:bg-neutral ${menu ? 'bg-neutral' : ''}`}
          >
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral text-base font-semibold text-text">P</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-text">{t('profile.name')}</span>
              <span className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                {dark ? <Moon weight="fill" className="size-3" /> : <Sun weight="fill" className="size-3" />}
                {LANG_NAMES[lang]}
              </span>
            </span>
            <CaretUpDown className="size-4 shrink-0 text-text-muted" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pt-2">
        <header className="flex h-14 shrink-0 items-center justify-between bg-bg px-4 lg:hidden">
          <Link to="/admin" aria-label="ProDuct">
            <img src={logo} alt="ProDuct" className="logo-light h-5" />
            <img src={logoDark} alt="" aria-hidden className="logo-dark h-5" />
          </Link>
          <div className="flex items-center gap-1">
            <IconButton label={t('search.open')} onClick={() => setSearch(true)}><MagnifyingGlass /></IconButton>
            <IconButton label={t('footer.darkTheme')} onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</IconButton>
          </div>
        </header>
        <main ref={main} className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-surface lg:rounded-tl-sheet">
          <div className="mx-auto max-w-[1400px] px-4 pb-[calc(var(--tabbar-h)+32px)] sm:px-6 lg:px-10 lg:pb-14">
            <CrumbsContext.Provider value={crumbs}>
              <motion.div
                key={pathname}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
              >
                {children}
              </motion.div>
            </CrumbsContext.Provider>
          </div>
        </main>
      </div>

      <nav aria-label={t('nav.aria')} className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid h-[60px] grid-cols-5">
          {SECTIONS.map((s) => {
            const active = s.id === route.section;
            const Icon = s.Icon;
            return (
              <li key={s.id}>
                <Link
                  to={adminPath(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1 transition-colors duration-[175ms] ${active ? 'text-text' : 'text-text-muted'}`}
                >
                  {active && <motion.span layoutId="tab-dot" transition={PILL} className="absolute top-0 h-0.5 w-8 rounded-full bg-text" />}
                  <Icon weight={active ? 'fill' : 'regular'} className="size-6" />
                  <span className="max-w-full truncate px-1 text-xs font-medium leading-none">{t(s.shortKey)}</span>
                  {s.id === 'orders' && <CountBadge count={badge} label={badgeLabel} className="absolute left-1/2 top-1.5 ml-1.5" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </div>
  );
};

export default AdminShell;
