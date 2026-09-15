import type { FC } from 'react';
import { renderMarkdown, type MdBlock, type MdInline } from '../lib/markdown';
import LocaleLink from './LocaleLink';

export const Inlines: FC<{ inlines: MdInline[] }> = ({ inlines }) => (
  <>
    {inlines.map((seg, i) => {
      if (seg.href) {
        const external = !seg.href.startsWith('/');
        if (external) {
          return (
            <a key={i} href={seg.href} className="text-link hover:underline" target="_blank" rel="noopener noreferrer">
              {seg.text}
            </a>
          );
        }
        // Ichki link — locale prefiksini saqlaydi va to'liq reload qilmaydi.
        return (
          <LocaleLink key={i} to={seg.href} className="text-link hover:underline">
            {seg.text}
          </LocaleLink>
        );
      }
      if (seg.bold) return <strong key={i} className="font-semibold text-primary">{seg.text}</strong>;
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

/**
 * Bitta blok. Matn o'lchami ota konteynerdan meros olinadi (`Markdown` — `text-para`,
 * huquqiy hujjat `LegalPage` — `text-copy`); sarlavhalar o'z o'lchamida.
 */
export const MdBlockView: FC<{ block: MdBlock }> = ({ block: b }) => {
  if (b.type === 'h2') return <h2 className="mt-4 text-subhead font-semibold text-primary"><Inlines inlines={b.inlines} /></h2>;
  if (b.type === 'h3') return <h3 className="mt-2 text-copy font-semibold text-primary"><Inlines inlines={b.inlines} /></h3>;
  if (b.type === 'ul') {
    return (
      <ul className="flex list-disc flex-col gap-1.5 pl-6 text-body">
        {b.items.map((item, j) => <li key={j}><Inlines inlines={item} /></li>)}
      </ul>
    );
  }
  if (b.type === 'ol') {
    // Raqam alohida ustunda, matn uning o'ngida — ko'p qatorli band raqam ostiga oqib ketmaydi.
    return (
      <ol className="flex flex-col gap-2.5 text-body">
        {b.items.map((it, j) => (
          <li key={j} className="flex gap-3">
            <span className="min-w-8 shrink-0 tabular-nums text-muted-2">{it.num}.</span>
            <span><Inlines inlines={it.inlines} /></span>
          </li>
        ))}
      </ol>
    );
  }
  return <p className="leading-relaxed text-body"><Inlines inlines={b.inlines} /></p>;
};

const Markdown: FC<{ source: string }> = ({ source }) => (
  <div className="flex flex-col gap-4 text-para">
    {renderMarkdown(source).map((b, i) => <MdBlockView key={i} block={b} />)}
  </div>
);

export default Markdown;
