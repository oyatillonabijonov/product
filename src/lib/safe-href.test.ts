import { describe, expect, it } from 'vitest';
import { safeHref } from './safe-href';

describe('safeHref', () => {
  it('accepts internal paths and http(s) URLs', () => {
    expect(safeHref('/chegirmalar')).toBe('/chegirmalar');
    expect(safeHref('https://t.me/store')).toBe('https://t.me/store');
    expect(safeHref('http://example.com')).toBe('http://example.com');
    expect(safeHref('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
    expect(safeHref('  /katalog  ')).toBe('/katalog');
  });
  it('rejects unsafe or empty values', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html,x')).toBeNull();
    expect(safeHref('mailto:a@b.c')).toBeNull();
    expect(safeHref('')).toBeNull();
    expect(safeHref('   ')).toBeNull();
    expect(safeHref('katalog')).toBeNull();
  });
});
