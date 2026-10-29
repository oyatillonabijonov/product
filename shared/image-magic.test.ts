import { describe, it, expect } from 'vitest';
import { sniffType } from './image-magic.ts';

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe('sniffType', () => {
  it('JPEG, PNG, WebP va MP4 ni birinchi baytlaridan taniydi', () => {
    expect(sniffType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]))).toBe('image/jpeg');
    expect(sniffType(bytes([0x89], 'PNG', [0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe('image/png');
    expect(sniffType(bytes('RIFF', [0x24, 0, 0, 0], 'WEBPVP8 '))).toBe('image/webp');
    expect(sniffType(bytes([0, 0, 0, 0x20], 'ftypisom'))).toBe('video/mp4');
  });

  it('HTML, matn, boshqa RIFF (WAV) va qisqa faylni rad etadi', () => {
    expect(sniffType(bytes('<html><script>alert(1)</script>'))).toBeNull();
    expect(sniffType(bytes('-----BEGIN OPENSSH PRIVATE KEY-----'))).toBeNull();
    expect(sniffType(bytes('RIFF', [0x24, 0, 0, 0], 'WAVEfmt '))).toBeNull();
    expect(sniffType(bytes([0xff, 0xd8]))).toBeNull();
    expect(sniffType(new Uint8Array())).toBeNull();
  });
});
