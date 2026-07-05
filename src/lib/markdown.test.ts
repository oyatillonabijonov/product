import { describe, expect, it } from 'vitest';
import { renderMarkdown, firstParagraph } from './markdown';

describe('renderMarkdown', () => {
  it('parses headings, paragraphs and lists', () => {
    const blocks = renderMarkdown('## Sarlavha\n\nBirinchi xat boshi.\n\n- Bir\n- Ikki\n\n### Kichik');
    expect(blocks.map((b) => b.type)).toEqual(['h2', 'p', 'ul', 'h3']);
    const ul = blocks[2];
    if (ul.type !== 'ul') throw new Error('expected ul');
    expect(ul.items).toHaveLength(2);
    expect(ul.items[0][0].text).toBe('Bir');
  });

  it('joins consecutive lines into one paragraph', () => {
    const blocks = renderMarkdown('Birinchi qator\nikkinchi qator');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('p');
  });

  it('parses bold and link inlines', () => {
    const blocks = renderMarkdown('Oddiy **qalin** va [link](/katalog) matn');
    if (blocks[0].type === 'ul') throw new Error('expected inline block');
    const inl = blocks[0].inlines;
    expect(inl.find((s) => s.bold)?.text).toBe('qalin');
    expect(inl.find((s) => s.href)?.href).toBe('/katalog');
    expect(inl[inl.length - 1].text).toBe(' matn');
  });

  it('returns [] for empty/whitespace input', () => {
    expect(renderMarkdown('')).toEqual([]);
    expect(renderMarkdown('  \n\n  ')).toEqual([]);
  });

  it('never emits HTML — raw tags stay as plain text', () => {
    const blocks = renderMarkdown('<script>alert(1)</script>');
    if (blocks[0].type === 'ul') throw new Error('expected p');
    expect(blocks[0].inlines[0].text).toBe('<script>alert(1)</script>');
  });

  it('drops unsafe URL schemes from links, keeping the link text', () => {
    const blocks = renderMarkdown('[bosish](javascript:alert(1))');
    if (blocks[0].type === 'ul') throw new Error('expected p');
    const inl = blocks[0].inlines;
    expect(inl.some((s) => s.href)).toBe(false);
    expect(inl.map((s) => s.text).join('')).toContain('bosish');
  });

  it("drops protocol-relative '//' links (would leave the site styled as internal)", () => {
    const blocks = renderMarkdown('[evil](//evil.com)');
    if (blocks[0].type === 'ul') throw new Error('expected p');
    expect(blocks[0].inlines.some((s) => s.href)).toBe(false);
    expect(blocks[0].inlines.map((s) => s.text).join('')).toContain('evil');
  });

  it('preserves links with allowlisted schemes', () => {
    const httpsBlocks = renderMarkdown('[ok](https://example.com)');
    if (httpsBlocks[0].type === 'ul') throw new Error('expected p');
    expect(httpsBlocks[0].inlines.find((s) => s.href)?.href).toBe('https://example.com');

    const internalBlocks = renderMarkdown('[ichki](/katalog)');
    if (internalBlocks[0].type === 'ul') throw new Error('expected p');
    expect(internalBlocks[0].inlines.find((s) => s.href)?.href).toBe('/katalog');

    const telBlocks = renderMarkdown('[tel](tel:+998901234567)');
    if (telBlocks[0].type === 'ul') throw new Error('expected p');
    expect(telBlocks[0].inlines.find((s) => s.href)?.href).toBe('tel:+998901234567');
  });
});

describe('firstParagraph', () => {
  it('returns the first paragraph text without markup', () => {
    expect(firstParagraph('## H\n\nSalom **dunyo**.\n\nIkkinchi.')).toBe('Salom dunyo.');
  });
  it('returns empty string when there is no paragraph', () => {
    expect(firstParagraph('## Faqat sarlavha')).toBe('');
  });
  it('falls back to the first list item when there is no paragraph', () => {
    expect(firstParagraph('- Birinchi **shart**\n- Ikkinchi')).toBe('Birinchi shart');
  });
});
