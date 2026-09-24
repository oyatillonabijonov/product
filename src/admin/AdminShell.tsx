import { useEffect, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, ExternalLink, Languages, LogOut, Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import logo from '../assets/logo.svg';
import logoDark from '../assets/hero/wordmark.webp';
import { SPRING_UI } from '../lib/motion';
import { adminPath, type AdminRoute, type SectionId } from './lib/admin-path';
import { SECTIONS, activeTab } from './nav';
import { useAdminDark } from './theme';
import { Toggle } from './ui';
import LangSwitch from './LangSwitch';

/**
 * Qobiq: desktopda chap sidebar (5 bo'lim, har biri ochiladigan-yopiladigan guruh),
 * telefonda iOS pastki tab bar. App Store Connect / macOS Settings naqshi: sidebar `bg-surface`,
 * o'ng hairline. Sukut yorug'; qorong'i — admin'ning o'z almashtirgichi (sidebar pastida va
 * Akkaunt'da, `theme.ts`), tokenlar orqali — shuning uchun `bg-white` yo'q.
 *
 * Guruh (2026-09-16, egasining talabi): sukut bo'yicha faqat joriy bo'lim ochiq, qolganlari
 * yig'ilgan; chevron mustaqil ochadi/yopadi, bo'lim nomi esa bo'limga o'tadi va uni ochadi.
 * Ochiq guruh — bitta yaxlit blok (`bg-fill-2/40`): sub-bandlar ota qator bilan bir konteynerda,
 * joriy sub-band `bg-raised` pill + chap chetida `cta` chizig'i. Yopiq holat eslab qolinmaydi.
 */
const ITEM = 'press flex h-9 items-center gap-3 rounded-xs px-3 text-para';
const BADGE = 'rounded-full bg-new px-1.5 text-label leading-5 text-bg';

const AdminShell: FC<{ route: AdminRoute; badge: number; onLogout: () => void; children: ReactNode }> = ({ route, badge, onLogout, children }) => {
  const current = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const activeTabDef = activeTab(current, route);
  const reduced = useReducedMotion();
  const [dark, setDark] = useAdminDark();
  const { t } = useTranslation('shell');
  // Qo'lda ochib-yopilganlar; yozilmagan bo'lim faqat joriy bo'lsa ochiq.
  const [raw, setOpen] = useState({} as Partial<Record<SectionId, boolean>>);
  const open = raw as Partial<Record<SectionId, boolean>>;
  useEffect(() => {
    setOpen((o: Partial<Record<SectionId, boolean>>) => ({ ...o, [route.section]: true }));
  }, [route.section]);
  const isOpen = (id: SectionId) => open[id] ?? id === route.section;
  const toggle = (id: SectionId) => setOpen((o: Partial<Record<SectionId, boolean>>) => ({ ...o, [id]: !isOpen(id) }));

  const collapsed = reduced ? { opacity: 0 } : { height: 0, opacity: 0 };
  const expandedTo = reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 };

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-surface md:flex">
        <Link to="/admin" className="press flex h-16 items-center gap-2 px-5">
          <img src={logo} alt="ProDuct" className="logo-light h-6" />
          <img src={logoDark} alt="" aria-hidden className="logo-dark h-6" />
          <span className="text-label text-muted">{t('brand')}</span>
        </Link>
        <nav aria-label={t('nav.aria')} className="flex-1 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-1">
            {SECTIONS.map((s) => {
              const active = s.id === route.section;
              const hasTabs = s.tabs.length > 1;
              const expanded = hasTabs && isOpen(s.id);
              const Icon = s.Icon;
              return (
                <li key={s.id} className={`rounded-sm ${expanded ? 'bg-fill-2/40' : ''}`}>
                  <div className="flex items-center">
                    <Link
                      to={adminPath(s.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`${ITEM} min-w-0 flex-1 ${
                        active ? `text-primary font-medium ${hasTabs ? '' : 'bg-fill-2'}` : 'text-primary hover:bg-fill-2/60'
                      }`}
                    >
                      <Icon aria-hidden className="size-[18px] shrink-0 text-muted" strokeWidth={1.8} />
                      <span className="flex-1 truncate">{t(s.labelKey)}</span>
                      {s.id === 'orders' && badge > 0 && <span className={BADGE}>{badge}</span>}
                    </Link>
                    {hasTabs && (
                      <button
                        type="button"
                        onClick={() => toggle(s.id)}
                        aria-expanded={expanded}
                        aria-controls={`nav-${s.id}`}
                        aria-label={t(expanded ? 'nav.collapse' : 'nav.expand', { name: t(s.labelKey) })}
                        className="press flex size-9 shrink-0 items-center justify-center rounded-xs text-muted-2 hover:text-primary"
                      >
                        {/* Chevron ikonkasi buriladi — `press` tugmaning o'zida, ichki span'da emas. */}
                        <ChevronDown aria-hidden className={`size-4 transition-transform duration-200 ease-apple ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        key="tabs"
                        id={`nav-${s.id}`}
                        initial={collapsed}
                        animate={expandedTo}
                        exit={collapsed}
                        transition={SPRING_UI}
                        className="overflow-hidden"
                      >
                        <ul className="flex flex-col gap-0.5 px-1 pb-1.5">
                          {s.tabs.map((tab) => {
                            const on = active && activeTabDef?.id === tab.id;
                            const TabIcon = tab.Icon;
                            return (
                              <li key={tab.id}>
                                {/* Ikonka ota qatordagi ikonka ustunida (px-1 + pl-2 = 12px). */}
                                <Link
                                  to={adminPath(s.id, tab.segment)}
                                  aria-current={on ? 'page' : undefined}
                                  className={`press relative flex h-8 items-center gap-3 rounded-xs pl-2 pr-3 text-label ${
                                    on ? 'bg-raised text-primary' : 'text-muted hover:text-primary'
                                  }`}
                                >
                                  {on && <span aria-hidden className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cta" />}
                                  <TabIcon aria-hidden className={`size-4 shrink-0 ${on ? 'text-primary' : 'text-muted-2'}`} strokeWidth={1.8} />
                                  {t(tab.labelKey)}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
          <a href="/" target="_blank" rel="noopener noreferrer" className={`${ITEM} text-muted hover:text-primary`}>
            <ExternalLink aria-hidden className="size-[18px]" strokeWidth={1.8} /> {t('footer.openSite')}
          </a>
          <div className="flex h-9 items-center gap-3 px-3 text-para text-muted">
            <Moon aria-hidden className="size-[18px]" strokeWidth={1.8} />
            <span className="flex-1">{t('footer.darkTheme')}</span>
            <Toggle on={dark} onChange={setDark} label={t('footer.darkTheme')} />
          </div>
          <div className="flex h-9 items-center gap-3 px-3 text-para text-muted">
            <Languages aria-hidden className="size-[18px]" strokeWidth={1.8} />
            <span className="flex-1">{t('footer.language')}</span>
            <LangSwitch label={t('footer.language')} />
          </div>
          <button type="button" onClick={onLogout} className={`${ITEM} w-full text-left text-muted hover:text-primary`}>
            <LogOut aria-hidden className="size-[18px]" strokeWidth={1.8} /> {t('footer.logout')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        {/* pb-28 — mobil tab bar (52px + safe area) kontentni yopmasin. */}
        <div className="mx-auto max-w-[1100px] px-4 pb-28 md:px-8 md:pb-10">{children}</div>
      </main>

      <nav aria-label={t('nav.aria')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex">
          {SECTIONS.map((s) => {
            const active = s.id === route.section;
            const Icon = s.Icon;
            return (
              <li key={s.id} className="flex-1">
                <Link
                  to={adminPath(s.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`press relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 ${active ? 'text-link' : 'text-muted'}`}
                >
                  <Icon aria-hidden className="size-6" strokeWidth={active ? 2 : 1.8} />
                  <span className="text-label leading-none">{t(s.shortKey)}</span>
                  {s.id === 'orders' && badge > 0 && <span className={`absolute left-1/2 top-1 ml-1 ${BADGE}`}>{badge}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default AdminShell;
