export interface MdInline {
  text: string;
  bold?: boolean;
  href?: string;
}

export type MdBlock =
  | { type: 'h2' | 'h3' | 'p'; inlines: MdInline[] }
  | { type: 'ul'; items: MdInline[][] }
  | { type: 'ol'; items: { num: string; inlines: MdInline[] }[] };

/**
 * Raqamli band yoki qadam: "1.1. Matn", "2. Matn". Raqamdan keyin nuqta va bo'shliq shart —
 * "12–24 oy" yoki "2024 yilda" bilan boshlangan oddiy gap band bo'lib qolmaydi.
 */
const NUMBERED_RE = /^(\d+(?:\.\d+)*)\.\s+(.+)$/;

const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
// `\/(?!\/)` — protokol-nisbiy `//evil.com` ichki link sifatida o'tib ketmasin (safe-href.ts bilan bir xil).
const SAFE_HREF_RE = /^(\/(?!\/)|https?:|mailto:|tel:)/i;

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
  let numbered: { num: string; inlines: MdInline[] }[] | null = null;

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push({ type: 'p', inlines: parseInlines(para.join(' ')) });
      para = [];
    }
  };
  const flushList = () => {
    if (list && list.length > 0) blocks.push({ type: 'ul', items: list });
    list = null;
    if (numbered && numbered.length > 0) blocks.push({ type: 'ol', items: numbered });
    numbered = null;
  };

  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '') { flushPara(); flushList(); continue; }
    if (line.startsWith('### ')) { flushPara(); flushList(); blocks.push({ type: 'h3', inlines: parseInlines(line.slice(4)) }); continue; }
    if (line.startsWith('## ')) { flushPara(); flushList(); blocks.push({ type: 'h2', inlines: parseInlines(line.slice(3)) }); continue; }
    if (line.startsWith('- ')) {
      flushPara();
      if (numbered) flushList();
      (list ??= []).push(parseInlines(line.slice(2)));
      continue;
    }
    const n = NUMBERED_RE.exec(line);
    if (n) {
      flushPara();
      if (list) flushList();
      (numbered ??= []).push({ num: n[1], inlines: parseInlines(n[2]) });
      continue;
    }
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
    if (b.type === 'ol' && b.items.length > 0) return b.items[0].inlines.map((s) => s.text).join('');
  }
  return '';
}
