import type { FC } from 'react';

/** `src/lib/markdown.ts` tushunadigan 6 sintaksis. */
const ROWS: [string, string][] = [
  ['## Sarlavha', "Bo'lim sarlavhasi"],
  ['### Kichik sarlavha', 'Kichik sarlavha'],
  ['- Band', "Ro'yxat"],
  ['1. Band', "Raqamli ro'yxat (raqamdan keyin nuqta va bo'shliq)"],
  ['**qalin**', 'Qalin matn'],
  ['[matn](/katalog)', "Havola — / yoki https:// bilan"],
];

/** Markdown maydoni ostidagi yig'ma yordam. */
const MarkdownHelp: FC = () => (
  <details className="text-label text-muted">
    <summary className="press w-fit cursor-pointer text-link">Matn qanday yoziladi</summary>
    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {ROWS.map(([code, text]) => (
        <div key={code} className="contents">
          <dt><code className="font-mono text-primary">{code}</code></dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
    <p className="mt-2">Ketma-ket qatorlar bitta xatboshi bo'ladi; yangi xatboshi — bo'sh qator.</p>
  </details>
);

export default MarkdownHelp;
