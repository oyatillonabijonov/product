import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router';
import { BookOpen, FileText, Plus, Scales, WarningCircle } from '@phosphor-icons/react';
import type { Icon as PhIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiPage } from '../../../shared/types';
import { firstParagraph } from '../../lib/markdown';
import { LEGAL_LEDE_KEYS } from '../../lib/page-slugs';
import { listPages, updatePage } from '../api';
import { Button, EmptyState, Toggle } from '../ui';
import { useActiveToggle } from '../useActiveToggle';

const LIST = '/admin/content/pages';

/** Kontent sahifalari — kartochkalar, ikki guruh: sahifalar va huquqiy hujjatlar. Karta bosilsa tahrir, almashtirgich — saytda/yashirin. */
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
  if (!items) return <div className="skeleton h-80 rounded-surface" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title={t('pagesList.emptyTitle')}
        text={t('pagesList.emptyText')}
        action={<Button to={`${LIST}/new`}><Plus weight="bold" />{t('pagesList.addFirst')}</Button>}
      />
    );
  }

  const groups: { title: string; icon: PhIcon; rows: ApiPage[]; add?: boolean }[] = [
    { title: t('pagesList.groupPages'), icon: FileText, rows: items.filter((p) => !LEGAL_LEDE_KEYS[p.slug]), add: true },
    { title: t('pagesList.groupLegal'), icon: Scales, rows: items.filter((p) => LEGAL_LEDE_KEYS[p.slug]) },
  ];

  return (
    <div className="flex flex-col gap-10">
      <p className="max-w-[640px] text-base text-text-muted">{t('pagesList.description')}</p>

      {groups.filter((g) => g.rows.length > 0 || g.add).map((g) => (
        <section key={g.title} className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-text">
            {g.title} <span className="font-medium text-text-faint">{g.rows.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.rows.map((p) => {
              const excerpt = firstParagraph(p.content.uz);
              return (
                <li key={p.id} className="stagger group relative flex flex-col rounded-surface sm:min-h-[180px] border border-border bg-surface p-5 transition-colors duration-150 hover:bg-ghost-hover">
                  <div className="flex items-center justify-between gap-3">
                    <g.icon aria-hidden weight="fill" className={`size-6 ${p.isActive ? 'text-text-muted' : 'text-text-faint'}`} />
                    {/* Karta havolasi butun yuzani qoplaydi — almashtirgich undan ustida turadi. */}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <span className={`text-sm font-medium ${p.isActive ? 'text-success-strong' : 'text-text-faint'}`}>
                        {p.isActive ? t('shared.onSiteColumn') : t('shared.statusHidden')}
                      </span>
                      <Toggle on={p.isActive} onChange={(v) => toggle(p, v)} label={t('shared.toggleAria', { name: p.title.uz })} />
                    </span>
                  </div>
                  <Link
                    to={`${LIST}/${p.id}`}
                    className={`mt-5 text-lg font-semibold leading-snug outline-none after:absolute after:inset-0 after:rounded-surface focus-visible:after:outline-2 focus-visible:after:outline-border-focus ${p.isActive ? 'text-text' : 'text-text-muted'}`}
                  >
                    {p.title.uz}
                  </Link>
                  {excerpt && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-text-muted">{excerpt}</p>}
                  <p className="mt-auto truncate pt-4 font-mono text-xs text-text-faint">/page/{p.slug}</p>
                </li>
              );
            })}
            {g.add && (
              <li>
                <Link
                  to={`${LIST}/new`}
                  className="flex h-full min-h-24 flex-col items-center justify-center sm:min-h-[180px] gap-2 rounded-surface border border-border bg-surface p-5 text-base font-semibold text-text-muted transition-colors duration-150 hover:bg-ghost-hover hover:text-text"
                >
                  <Plus weight="bold" className="size-6" />
                  {t('pagesList.new')}
                </Link>
              </li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default PagesList;
