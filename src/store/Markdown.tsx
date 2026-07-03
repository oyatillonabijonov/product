import type { FC } from 'react';
import { renderMarkdown, type MdInline } from '../lib/markdown';

const Inlines: FC<{ inlines: MdInline[] }> = ({ inlines }) => (
  <>
    {inlines.map((seg, i) => {
      if (seg.href) {
        const external = !seg.href.startsWith('/');
        return (
          <a key={i} href={seg.href} className="text-[#0071E3] hover:underline"
            target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            {seg.text}
          </a>
        );
      }
      if (seg.bold) return <strong key={i} className="font-semibold text-[#1D1D1F]">{seg.text}</strong>;
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

const Markdown: FC<{ source: string }> = ({ source }) => (
  <div className="flex flex-col gap-4">
    {renderMarkdown(source).map((b, i) => {
      if (b.type === 'h2') return <h2 key={i} className="text-[24px] font-semibold text-[#1D1D1F] tracking-[-0.02em] mt-4"><Inlines inlines={b.inlines} /></h2>;
      if (b.type === 'h3') return <h3 key={i} className="text-[18px] font-semibold text-[#1D1D1F] mt-2"><Inlines inlines={b.inlines} /></h3>;
      if (b.type === 'ul') {
        return (
          <ul key={i} className="list-disc pl-6 flex flex-col gap-1.5 text-[15px] text-[#3A3A3C]">
            {b.items.map((item, j) => <li key={j}><Inlines inlines={item} /></li>)}
          </ul>
        );
      }
      return <p key={i} className="text-[15px] text-[#3A3A3C] leading-relaxed"><Inlines inlines={b.inlines} /></p>;
    })}
  </div>
);

export default Markdown;
