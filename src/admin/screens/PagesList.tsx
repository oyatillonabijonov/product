import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { ArrowSquareOut, BookOpen, FileText, Hash, Plus, Scales, Storefront, WarningCircle } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import type { ApiPage } from '../../../shared/types';
import { ABOUT_SLUG, LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { listPages, updatePage } from '../api';
import { delay } from '../ContentFields';
import { Badge, Button, Dot, EmptyState, IconButton, IconTile, Toggle, type Hue, type Tone } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/pages';

/** Sahifa shabloni: maxsuslarining tahririda qo'shimcha maydonlar bor; yorliq, uning rangi, ikonka. */
function pageKind(slug: string): { label: ParseKeys<'content'>; tone: Tone; icon: PhIcon; hue: Hue } {
  if (slug === ABOUT_SLUG) return { label: 'pagesList.templateAbout', tone: 'accent', icon: Storefront, hue: 'violet' };
  if (LEGAL_LEDE_KEYS[slug]) return { label: 'pagesList.templateLegal', tone: 'info', icon: Scales, hue: 'slate' };
  return { label: 'shared.text', tone: 'neutral', icon: FileText, hue: 'blue' };
}

/** Kontent sahifalari — faollari saytda ochiladi va footer'da chiqadi. Karta bosilsa tahrir. */
const PagesList: FC = () => {
  const { t } = useTranslation('content');
  const [rawItems, setItems] = useState(null as ApiPage[] | null);
  const items = rawItems as ApiPage[] | null;
  const [error, setError] = useState('');
  const toggle = useActiveToggle(setItems, (p: ApiPage) => updatePage(p.id, p));

  useEffect(() => {
    listPages().then(setItems).catch(() => setError(t('shared.loadError')));
  }, []);

  if (error) return <EmptyState icon={<WarningCircle />} title={t('shared.loadErrorTitle')} text={error} />;
  if (!items) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-32 rounded-surface" />)}
      </div>
    );
  }

  const live = items.filter((p) => p.isActive).length;
  const addButton = (label: string) => <Button to={`${LIST}/new`} className="max-sm:w-full"><Plus weight="bold" />{label}</Button>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="max-w-2xl text-base text-text-muted">{t('pagesList.description')}</p>
          {items.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <Dot tone="ok">{t('shared.onSiteCount', { n: live })}</Dot>
              {items.length > live && <Dot tone="neutral">{t('shared.hiddenCount', { n: items.length - live })}</Dot>}
            </p>
          )}
        </div>
        {items.length > 0 && addButton(t('pagesList.new'))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<BookOpen />} title={t('pagesList.emptyTitle')} text={t('pagesList.emptyText')} action={addButton(t('pagesList.addFirst'))} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p, i) => {
            const kind = pageKind(p.slug);
            return (
              <article
                key={p.id}
                style={delay(i)}
                className="stagger group relative flex flex-col gap-4 rounded-surface bg-surface-sunken p-5 transition-colors duration-200 hover:bg-surface-sunken-hover has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-accent/20"
              >
                <div className="flex items-start gap-3">
                  <IconTile icon={kind.icon} hue={kind.hue} soft size="lg" className={p.isActive ? '' : 'opacity-60'} />
                  <div className="min-w-0 flex-1">
                    <Link to={`${LIST}/${p.id}`} className="block truncate text-md font-bold text-text outline-none after:absolute after:inset-0">{p.title.uz}</Link>
                    <p className="mt-0.5 truncate font-mono text-sm text-text-muted">/page/{p.slug}</p>
                  </div>
                  <span className="relative z-10 pt-1">
                    <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('shared.toggleAria', { name: p.title.uz })} />
                  </span>
                </div>
                <div className="flex items-center gap-2 border-t border-border pt-4">
                  <Badge tone={kind.tone}>{t(kind.label)}</Badge>
                  <Dot tone={p.isActive ? 'ok' : 'neutral'}>{p.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}</Dot>
                  <span className="flex-1" />
                  <span className="inline-flex items-center gap-1 text-sm tabular-nums text-text-muted" title={t('shared.sortOrder')}>
                    <Hash weight="bold" className="size-3 text-text-faint" />{p.sortOrder}
                  </span>
                  <span className="relative z-10">
                    <IconButton size="sm" href={`/page/${p.slug}`} label={t('pagesList.openAria', { name: p.title.uz })}>
                      <ArrowSquareOut />
                    </IconButton>
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PagesList;
