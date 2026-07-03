import { useState, type FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { renderMarkdown, type MdBlock, type MdInline } from '../lib/markdown';

interface FaqItem {
  question: MdInline[];
  answer: MdBlock[];
}

/** Group markdown blocks into Q&A pairs: each heading starts a question, following blocks are its answer. */
function toFaqItems(source: string): FaqItem[] {
  const items: FaqItem[] = [];
  for (const block of renderMarkdown(source)) {
    if (block.type === 'h2' || block.type === 'h3') {
      items.push({ question: block.inlines, answer: [] });
    } else if (items.length > 0) {
      items[items.length - 1].answer.push(block);
    }
  }
  return items;
}

const Inlines: FC<{ inlines: MdInline[] }> = ({ inlines }) => (
  <>
    {inlines.map((seg, i) => {
      if (seg.href) {
        const external = !seg.href.startsWith('/');
        return (
          <a key={i} href={seg.href} className="text-accent hover:underline"
            target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
            {seg.text}
          </a>
        );
      }
      if (seg.bold) return <strong key={i} className="font-semibold text-primary">{seg.text}</strong>;
      return <span key={i}>{seg.text}</span>;
    })}
  </>
);

const AnswerBody: FC<{ blocks: MdBlock[] }> = ({ blocks }) => (
  <div className="flex flex-col gap-3 text-[15px] text-muted leading-relaxed">
    {blocks.map((b, i) => {
      if (b.type === 'ul') {
        return (
          <ul key={i} className="list-disc pl-6 flex flex-col gap-1.5">
            {b.items.map((item, j) => <li key={j}><Inlines inlines={item} /></li>)}
          </ul>
        );
      }
      return <p key={i}><Inlines inlines={b.inlines} /></p>;
    })}
  </div>
);

const FaqRow: FC<{ item: FaqItem; isOpen: boolean; onToggle: () => void }> = ({ item, isOpen, onToggle }) => (
  <div
    className={`rounded-[20px] border bg-white transition-colors ${
      isOpen ? 'border-accent/40 shadow-[--shadow-apple]' : 'border-line/60 hover:border-line-2'
    }`}
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-[18px] text-left"
    >
      <span className="text-[15px] md:text-[17px] font-semibold text-primary">
        <Inlines inlines={item.question} />
      </span>
      <motion.span
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isOpen ? 'bg-accent text-white' : 'bg-bg text-muted'
        }`}
      >
        <Plus className="w-4 h-4" />
      </motion.span>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && item.answer.length > 0 && (
        <motion.div
          key="body"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-5 md:px-6 pb-5 pt-0.5">
            <AnswerBody blocks={item.answer} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const FaqSection: FC<{ title: string; content: string }> = ({ title, content }) => {
  const items = toFaqItems(content);
  const [open, setOpen] = useState<number | null>(0);
  if (items.length === 0) return null;

  return (
    <section id="faq" className="flex flex-col items-center gap-8 py-2 scroll-mt-28">
      <h2 className="text-[26px] md:text-[34px] font-semibold tracking-[-0.02em] text-center">{title}</h2>
      <div className="w-full max-w-[760px] flex flex-col gap-3">
        {items.map((item, i) => (
          <FaqRow key={i} item={item} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
        ))}
      </div>
    </section>
  );
};

export default FaqSection;
