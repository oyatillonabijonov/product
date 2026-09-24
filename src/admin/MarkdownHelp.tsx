import type { FC } from 'react';
import type { ParseKeys } from 'i18next';
import { useTranslation } from 'react-i18next';

/** `src/lib/markdown.ts` tushunadigan 6 sintaksis. */
const ROWS: { sampleKey: ParseKeys<'common'>; labelKey: ParseKeys<'common'> }[] = [
  { sampleKey: 'markdownHelp.sample.heading', labelKey: 'markdownHelp.heading' },
  { sampleKey: 'markdownHelp.sample.subheading', labelKey: 'markdownHelp.subheading' },
  { sampleKey: 'markdownHelp.sample.list', labelKey: 'markdownHelp.list' },
  { sampleKey: 'markdownHelp.sample.orderedList', labelKey: 'markdownHelp.orderedList' },
  { sampleKey: 'markdownHelp.sample.bold', labelKey: 'markdownHelp.bold' },
  { sampleKey: 'markdownHelp.sample.link', labelKey: 'markdownHelp.link' },
];

/** Markdown maydoni ostidagi yig'ma yordam. */
const MarkdownHelp: FC = () => {
  const { t } = useTranslation('common');
  return (
    <details className="text-label text-muted">
      <summary className="press w-fit cursor-pointer text-link">{t('markdownHelp.toggle')}</summary>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {ROWS.map((row) => (
          <div key={row.sampleKey} className="contents">
            <dt><code className="font-mono text-primary">{t(row.sampleKey)}</code></dt>
            <dd>{t(row.labelKey)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2">{t('markdownHelp.note')}</p>
    </details>
  );
};

export default MarkdownHelp;
