import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { adminPath, type SectionId } from './lib/admin-path';
import { SECTIONS } from './nav';
import { Tabs } from './ui';

/**
 * Bo'lim tablari — sidebar bo'lmagan ekranlarda (`lg`gacha) sahifa tepasida, gorizontal suriladigan trek.
 * Sidebar `lg`dan chiqadi, shuning uchun tablar ham aynan `lg`da yashirinadi (ilgari `md`da yashirinib,
 * 768–1023px'da bo'lim ichida o'tish yo'li qolmasdi). Telefonda faol tab ekran chetida kesilib qolmasin —
 * ochilganda trek uni o'rtaga suradi.
 */
const SectionTabs: FC<{ section: SectionId; active: string }> = ({ section, active }) => {
  const { t } = useTranslation('shell');
  const box = useRef(null) as { current: HTMLDivElement | null };
  useEffect(() => {
    box.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);
  const def = SECTIONS.find((s) => s.id === section);
  if (!def || def.tabs.length < 2) return null;
  return (
    // Sozlamalar tablari sidebar'da yo'q (u yerda bitta «Sozlamalar» bandi) — ular desktopda ham sahifada turadi.
    <div ref={box} className={section === 'settings' ? 'mb-6' : 'mb-5 lg:hidden'}>
      <Tabs
        active={active}
        items={def.tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey), to: adminPath(def.id, tab.segment) }))}
      />
    </div>
  );
};

export default SectionTabs;
