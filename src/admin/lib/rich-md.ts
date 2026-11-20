import { renderMarkdown, type MdInline } from '../../lib/markdown';

/**
 * Maqola muharriri (contenteditable) ↔ saqlanadigan markdown. Faqat sayt chiza oladigan qism:
 * `##`/`###` sarlavha, xat boshi, `-` va raqamli ro'yxat, `**qalin**`, `[havola](url)`, alohida qatordagi `![](rasm)`.
 */

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const inlineHtml = (xs: MdInline[]) => xs.map((x) => {
  if (x.href) return `<a href="${esc(x.href)}">${esc(x.text)}</a>`;
  if (x.bold) return `<strong>${esc(x.text)}</strong>`;
  return esc(x.text);
}).join('');

/** Markdown → muharrirga beriladigan HTML. Bo'sh matn — bitta bo'sh xat boshi (kursor turishi uchun). */
export function mdToHtml(md: string): string {
  const html = renderMarkdown(md).map((b) => {
    if (b.type === 'h2') return `<h2>${inlineHtml(b.inlines)}</h2>`;
    if (b.type === 'h3') return `<h3>${inlineHtml(b.inlines)}</h3>`;
    if (b.type === 'p') return `<p>${inlineHtml(b.inlines)}</p>`;
    if (b.type === 'img') return `<p><img src="${esc(b.src)}" alt="${esc(b.alt)}"></p>`;
    if (b.type === 'ul') return `<ul>${b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join('')}</ul>`;
    // Band raqami (oferta'dagi «1.1.») `data-num`da — saqlashda o'zi qaytadi, aks holda «1.», «2.» bo'lib ketardi.
    if (b.type === 'ol') return `<ol>${b.items.map((it) => `<li data-num="${esc(it.num)}">${inlineHtml(it.inlines)}</li>`).join('')}</ol>`;
    return '';
  }).join('');
  return html || '<p><br></p>';
}

/** DOM tugunining kerakli qismi — testda qo'lda yasaladi. */
export interface RichNode {
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<RichNode>;
  getAttribute?: (name: string) => string | null;
}

const kids = (n: RichNode) => Array.from(n.childNodes);
const tag = (n: RichNode) => n.nodeName.toUpperCase();

/** Ichki matn: qalin va havola belgisi bilan; qator uzilishi — bo'shliq (markdown xat boshini bitta qatorga yig'adi). */
function inlineMd(n: RichNode): string {
  const t = tag(n);
  if (t === '#TEXT') return (n.textContent ?? '').replace(/\s+/g, ' ');
  if (t === 'BR') return ' ';
  if (t === 'IMG') return '';
  const inner = kids(n).map(inlineMd).join('');
  if ((t === 'B' || t === 'STRONG') && inner.trim()) {
    // Belgi so'z ichida yopishsin: "** matn **" saytda qalin chiqmaydi.
    const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(inner) as RegExpExecArray;
    return `${lead}**${core}**${trail}`;
  }
  if (t === 'A') {
    const href = n.getAttribute?.('href') ?? '';
    return href && inner.trim() ? `[${inner.trim()}](${href})` : inner;
  }
  return inner;
}

/** Blok ichidagi rasmlar alohida qatorga chiqadi, atrofidagi matn o'z xat boshida qoladi. */
function paragraphMd(n: RichNode, out: string[]) {
  let buf: RichNode[] = [];
  const flush = () => {
    const text = buf.map(inlineMd).join('').trim();
    if (text) out.push(text);
    buf = [];
  };
  for (const c of kids(n)) {
    if (tag(c) === 'IMG') {
      flush();
      const src = c.getAttribute?.('src') ?? '';
      if (src) out.push(`![${c.getAttribute?.('alt') ?? ''}](${src})`);
    } else {
      buf.push(c);
    }
  }
  flush();
}

/** Muharrir ildizi → markdown. */
export function richToMd(root: RichNode): string {
  const out: string[] = [];
  for (const n of kids(root)) {
    const t = tag(n);
    if (t === 'H1' || t === 'H2') { const s = inlineMd(n).trim(); if (s) out.push(`## ${s}`); continue; }
    if (t === 'H3' || t === 'H4') { const s = inlineMd(n).trim(); if (s) out.push(`### ${s}`); continue; }
    if (t === 'UL' || t === 'OL') {
      const lis = kids(n).filter((c) => tag(c) === 'LI').map((c) => ({ text: inlineMd(c).trim(), num: c.getAttribute?.('data-num') ?? '' })).filter((x) => x.text);
      // Enter yangi bandga oldingisining `data-num`ini ko'chiradi — takrorlangan raqam o'rniga tartib raqami.
      const used = new Set<string>();
      const nums = lis.map((x, i) => {
        const num = /^\d+(?:\.\d+)*$/.test(x.num) && !used.has(x.num) ? x.num : String(i + 1);
        used.add(num);
        return num;
      });
      if (lis.length) out.push(lis.map((x, i) => (t === 'UL' ? `- ${x.text}` : `${nums[i]}. ${x.text}`)).join('\n'));
      continue;
    }
    if (t === '#TEXT' || t === 'B' || t === 'STRONG' || t === 'A' || t === 'SPAN') { const s = inlineMd(n).trim(); if (s) out.push(s); continue; }
    paragraphMd(n, out);
  }
  return out.join('\n\n');
}
