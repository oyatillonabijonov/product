import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { adminPath, type SectionId } from './lib/admin-path';
import { SECTIONS } from './nav';
import { Tabs } from './ui';

/** Bo'lim tablari — mobilda sahifa tepasida (desktopda tablar sidebar'da). */
const SectionTabs: FC<{ section: SectionId; active: string }> = ({ section, active }) => {
  const { t } = useTranslation('shell');
  const def = SECTIONS.find((s) => s.id === section);
  if (!def || def.tabs.length < 2) return null;
  return (
    <Tabs
      className="mb-6 md:hidden"
      active={active}
      items={def.tabs.map((tab) => ({ id: tab.id, label: t(tab.labelKey), to: adminPath(def.id, tab.segment) }))}
    />
  );
};

export default SectionTabs;
