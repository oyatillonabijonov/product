import type { FC } from 'react';
import { renderMarkdown, type MdInline } from '../lib/markdown';
import LocaleLink from './LocaleLink';

export const Inlines: FC<{ inlines: MdInline[] }> = ({ inlines }) => (
  <>
    {inlines.map((seg, i) => {
      if (seg.href) {
        const external = !seg.href.startsWith('/');
        if (external) {
          return (
            <a key={i} href={seg.href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
              {seg.text}
            </a>
          );
        }
        // Ichki link — locale prefiksini saqlaydi va to'liq reload qilmaydi.
        return (
          <LocaleLink key={i} to={seg.href} className="text-accent hover:underline">
            {seg.text}
          </LocaleLink>
        );
      }
      if (seg.bold) return <strong key={i} className="font-semibold text-primary">{seg.text}</strong>;
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

const Markdown: FC<{ source: string }> = ({ source }) => (
  <div className="flex flex-col gap-4">
    {renderMarkdown(source).map((b, i) => {
      if (b.type === 'h2') return <h2 key={i} className="text-[24px] font-semibold text-primary tracking-[-0.02em] mt-4"><Inlines inlines={b.inlines} /></h2>;
      if (b.type === 'h3') return <h3 key={i} className="text-[18px] font-semibold text-primary mt-2"><Inlines inlines={b.inlines} /></h3>;
      if (b.type === 'ul') {
        return (
          <ul key={i} className="list-disc pl-6 flex flex-col gap-1.5 text-[15px] text-body">
            {b.items.map((item, j) => <li key={j}><Inlines inlines={item} /></li>)}
          </ul>
        );
      }
      return <p key={i} className="text-[15px] text-body leading-relaxed"><Inlines inlines={b.inlines} /></p>;
    })}
  </div>
);

export default Markdown;
