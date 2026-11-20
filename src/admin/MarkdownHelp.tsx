import type { FC, ReactNode } from 'react';
import { CaretDown, Info, MarkdownLogo } from '@phosphor-icons/react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';
import { IconTile } from './ui';

/**
 * `src/lib/markdown.ts` tushunadigan 6 sintaksis: namuna, saytdagi natija (namunadan belgilar olib tashlanadi) va izoh.
 */
const ROWS: { sampleKey: ParseKeys<'common'>; labelKey: ParseKeys<'common'>; render: (s: string) => ReactNode }[] = [
  { sampleKey: 'markdownHelp.sample.heading', labelKey: 'markdownHelp.heading', render: (s) => <span className="text-md font-semibold text-text">{s.replace(/^#+\s*/, '')}</span> },
  { sampleKey: 'markdownHelp.sample.subheading', labelKey: 'markdownHelp.subheading', render: (s) => <span className="font-semibold text-text">{s.replace(/^#+\s*/, '')}</span> },
  { sampleKey: 'markdownHelp.sample.list', labelKey: 'markdownHelp.list', render: (s) => <span className="text-text">• {s.replace(/^-\s*/, '')}</span> },
  { sampleKey: 'markdownHelp.sample.orderedList', labelKey: 'markdownHelp.orderedList', render: (s) => <span className="text-text">{s}</span> },
  { sampleKey: 'markdownHelp.sample.bold', labelKey: 'markdownHelp.bold', render: (s) => <b className="font-semibold text-text">{s.replace(/\*/g, '')}</b> },
  { sampleKey: 'markdownHelp.sample.link', labelKey: 'markdownHelp.link', render: (s) => <span className="text-accent-text underline underline-offset-2">{s.replace(/^\[([^\]]*)\].*$/, '$1')}</span> },
];

/** Markdown maydoni ostidagi yig'ma yordam: namunalar jadvali. */
const MarkdownHelp: FC = () => {
  const { t } = useTranslation(['common', 'content']);
  return (
    <details className="group rounded-control bg-surface-sunken">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-control px-3 py-2.5 text-base font-semibold text-text-muted transition-colors hover:text-text [&::-webkit-details-marker]:hidden">
        <IconTile icon={MarkdownLogo} hue="blue" soft size="sm" />
        {t('markdownHelp.toggle')}
        <CaretDown weight="bold" className="ml-auto size-3.5 text-text-faint transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-3 pb-3">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-text-faint">
              <th scope="col" className="w-1/2 py-2 pr-3 font-medium">{t('content:markdownHelp.write')}</th>
              <th scope="col" className="py-2 font-medium">{t('content:markdownHelp.result')}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const sample = t(row.sampleKey);
              return (
                <tr key={row.sampleKey} className="border-t border-border align-top">
                  <td className="py-2 pr-3">
                    <code className="inline-block rounded-tag bg-surface px-1.5 py-0.5 font-mono text-sm text-text">{sample}</code>
                  </td>
                  <td className="py-2">
                    <span className="block">{row.render(sample)}</span>
                    <span className="block text-text-muted">{t(row.labelKey)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-text-muted">
          <Info className="mt-px size-4 shrink-0 text-text-faint" />
          {t('markdownHelp.note')}
        </p>
      </div>
    </details>
  );
};

export default MarkdownHelp;
