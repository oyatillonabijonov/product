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
 * Qobiq (v3, SortUI sidebar'i asosida): kulrang kanvasda 256px sidebar — logo, qidiruv (⌘K), guruhlangan
 * ixcham menyu (Savdo · Katalog · Kontent · Tizim; har band 32px, faol band — oq tabletka, silliq suriladi),
 * pastda profil menyusi. Kontent alohida OQ VARAQDA (radius 20, kanvasdan 8px) — sidebar'dan fon bilan ajraladi.
 * Soya va hoshiya yo'q. <1024px: yuqorida ixcham panel, pastda tab bar.
 */
interface NavItem { key: string; label: string; to: string; icon: PhIcon; active: boolean; badge?: number }

const PILL = { type: 'spring', stiffness: 520, damping: 42 } as const;

/** Profil menyusidagi ikki-uch variantli tanlov: to'liq enli, tanlangani oq tabletka (silliq suriladi). */
const MenuSeg: FC<{ label: string; value: string; onChange: (v: string) => void; options: { id: string; label: string; icon: PhIcon }[] }> = ({ label, value, onChange, options }) => (
  <div role="radiogroup" aria-label={label}>
    <p className="px-1 pb-1.5 text-xs font-semibold text-text-faint">{label}</p>
    <div className="grid gap-0.5 rounded-full bg-surface-sunken p-[3px]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
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
            className={`relative isolate flex h-8 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors duration-200 ${on ? 'text-text' : 'text-text-muted hover:text-text'}`}
          >
            {on && <motion.span layoutId={`menuseg-${label}`} transition={PILL} className="absolute inset-0 -z-10 rounded-full bg-elevated" />}
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
          className={`relative isolate flex h-8 items-center gap-2.5 rounded-full px-3 text-base transition-colors duration-150 ${
            it.active ? 'font-semibold text-text' : 'font-medium text-text-muted hover:bg-ghost-hover hover:text-text'
          }`}
        >
          {it.active && <motion.span layoutId="nav-pill" transition={PILL} className="absolute inset-0 -z-10 rounded-full bg-surface" />}
          <I weight={it.active ? 'fill' : 'regular'} className={`size-[17px] shrink-0 ${it.active ? 'text-text' : 'text-text-faint'}`} />
          <span className="min-w-0 flex-1 truncate">{it.label}</span>
          {it.badge !== undefined && <CountBadge count={it.badge} label={badgeLabel} />}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside className="hidden w-64 shrink-0 flex-col px-3 pb-3 pt-4 lg:flex">
        <Link to="/admin" className="flex h-9 items-center px-3" aria-label="ProDuct">
          <img src={logo} alt="ProDuct" className="logo-light h-[22px]" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-[22px]" />
        </Link>
        <button
          type="button"
          onClick={() => setSearch(true)}
          className="mt-4 flex h-9 items-center gap-2 rounded-full bg-surface pl-3 pr-1.5 text-left text-base text-text-faint transition-colors duration-150 hover:text-text-muted"
        >
          <MagnifyingGlass className="size-4 shrink-0" />
          <span className="flex-1">{t('search.placeholder')}</span>
          <kbd className="rounded-full bg-surface-sunken px-2 py-0.5 font-sans text-xs font-medium text-text-muted">⌘K</kbd>
        </button>

        <nav aria-label={t('nav.aria')} className="no-scrollbar -mx-1 mt-3 flex-1 overflow-y-auto px-1 pb-2">
          {groups.map((g) => (
            <div key={g.id} className="pt-3 first:pt-1">
              {g.label && <p className="flex h-7 items-center px-3 text-xs font-semibold text-text-faint">{g.label}</p>}
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
                className="absolute inset-x-0 bottom-full mb-2 origin-bottom rounded-[22px] bg-surface p-2"
              >
                <div className="flex items-center gap-3 px-2 pb-3 pt-2">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-md font-semibold text-text-on-primary">P</span>
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-text">{t('profile.name')}</span>
                    <span className="block truncate text-sm text-text-muted">{t('profile.store')}</span>
                  </span>
                </div>
                <div className="flex flex-col gap-3 rounded-[16px] bg-surface-sunken p-2.5">
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
                <div className="mt-2 flex flex-col">
                  <Link to={adminPath('settings', 'account')} className="flex h-9 items-center gap-2.5 rounded-full px-3 text-base font-medium text-text transition-colors hover:bg-ghost-hover">
                    <UserCircle className="size-[18px] text-text-muted" />{t('nav.settings.account')}
                  </Link>
                  <a href="/" target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-2.5 rounded-full px-3 text-base font-medium text-text transition-colors hover:bg-ghost-hover">
                    <ArrowSquareOut className="size-[18px] text-text-muted" />{t('footer.openSite')}
                  </a>
                  <button type="button" onClick={onLogout} className="flex h-9 w-full items-center gap-2.5 rounded-full px-3 text-base font-medium text-danger-text transition-colors hover:bg-danger-soft">
                    <SignOut className="size-[18px]" />{t('footer.logout')}
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
            className="group flex w-full items-center gap-3 rounded-full bg-surface p-1.5 pr-3 text-left transition-colors duration-150 hover:bg-surface/70"
          >
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-base font-semibold text-text-on-primary">P</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-text">{t('profile.name')}</span>
              <span className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                {dark ? <Moon weight="fill" className="size-3" /> : <Sun weight="fill" className="size-3" />}
                {LANG_NAMES[lang]}
              </span>
            </span>
            <CaretUpDown className={`size-4 shrink-0 text-text-faint transition-transform duration-200 ${menu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
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
        <main ref={main} className="thin-scroll min-h-0 flex-1 overflow-y-auto bg-surface lg:rounded-[20px]">
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

      <nav aria-label={t('nav.aria')} className="fixed inset-x-0 bottom-0 z-40 bg-surface/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid h-[60px] grid-cols-5">
          {SECTIONS.map((s) => {
            const active = s.id === route.section;
            const Icon = s.Icon;
            return (
              <li key={s.id}>
                <Link
                  to={adminPath(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-full flex-col items-center justify-center gap-1 transition-colors duration-200 ${active ? 'text-text' : 'text-text-faint'}`}
                >
                  {active && <motion.span layoutId="tab-dot" transition={PILL} className="absolute top-0 h-0.5 w-8 rounded-full bg-text" />}
                  <Icon weight={active ? 'fill' : 'regular'} className="size-6" />
                  <span className="max-w-full truncate px-1 text-xs font-semibold leading-none">{t(s.shortKey)}</span>
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
