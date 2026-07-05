export interface MdInline {
  text: string;
  bold?: boolean;
  href?: string;
}

export type MdBlock =
  | { type: 'h2' | 'h3' | 'p'; inlines: MdInline[] }
  | { type: 'ul'; items: MdInline[][] };

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
const SAFE_HREF_RE = /^(\/|https?:|mailto:|tel:)/i;

function parseInlines(src: string): MdInline[] {
  const out: MdInline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(src)) !== null) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else if (SAFE_HREF_RE.test(m[3])) out.push({ text: m[2], href: m[3] });
    else out.push({ text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export function renderMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  let list: MdInline[][] | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: 'p', inlines: parseInlines(para.join(' ')) });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length > 0) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') { flushPara(); flushList(); continue; }
    if (line.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', inlines: parseInlines(line.slice(4)) }); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', inlines: parseInlines(line.slice(3)) }); continue; }
    if (line.startsWith('- ')) { flushPara(); (list ??= []).push(parseInlines(line.slice(2))); continue; }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return blocks;
}

export function firstParagraph(src: string): string {
  const blocks = renderMarkdown(src);
  for (const b of blocks) {
    if (b.type === 'p') return b.inlines.map((s) => s.text).join('');
  }
  for (const b of blocks) {
    if (b.type === 'ul' && b.items.length > 0) return b.items[0].map((s) => s.text).join('');
  }
  return '';
}
