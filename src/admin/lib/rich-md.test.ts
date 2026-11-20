import { describe, expect, it } from 'vitest';
import { mdToHtml, richToMd, type RichNode } from './rich-md';

const txt = (s: string): RichNode => ({ nodeName: '#text', textContent: s, childNodes: [] });
const el = (name: string, children: RichNode[] = [], attrs: Record<string, string> = {}): RichNode => ({
  nodeName: name, textContent: null, childNodes: children, getAttribute: (a) => attrs[a] ?? null,
});

describe('rich-md', () => {
  it('mdToHtml: saytdagi bloklar, matn ekranlanadi', () => {
    expect(mdToHtml('## Sar\n\nOddiy **qalin** [h](/katalog) <b>\n\n![izoh](/a.webp)\n\n- bir\n- ikki\n\n1. a\n2. b')).toBe(
      '<h2>Sar</h2><p>Oddiy <strong>qalin</strong> <a href="/katalog">h</a> &lt;b&gt;</p><p><img src="/a.webp" alt="izoh"></p>'
      + '<ul><li>bir</li><li>ikki</li></ul><ol><li>a</li><li>b</li></ol>',
    );
    expect(mdToHtml('')).toBe('<p><br></p>');
  });

  it("richToMd: muharrir DOM'i markdown'ga, rasm alohida qatorga chiqadi", () => {
    const root = el('DIV', [
      el('H2', [txt('Protsessor')]),
      el('P', [txt('Oling '), el('STRONG', [txt('12 yadro ')]), txt('— '), el('A', [txt('katalog')], { href: '/katalog' })]),
      el('P', [txt('Rasm oldidan'), el('IMG', [], { src: '/a.webp', alt: '' }), txt('keyin')]),
      el('UL', [el('LI', [txt('bir')]), el('LI', [txt('ikki')])]),
      el('OL', [el('LI', [txt('a')]), el('LI', [txt('b')])]),
      el('P', [el('BR')]),
      el('DIV', [txt('div ham xat boshi')]),
    ]);
    expect(richToMd(root)).toBe(
      '## Protsessor\n\nOling **12 yadro** — [katalog](/katalog)\n\nRasm oldidan\n\n![](/a.webp)\n\nkeyin\n\n- bir\n- ikki\n\n1. a\n2. b\n\ndiv ham xat boshi',
    );
  });
});
