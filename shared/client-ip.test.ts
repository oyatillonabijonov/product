import { describe, expect, it } from 'vitest';
import { cloudflareClientIp } from './client-ip';

describe('cloudflareClientIp', () => {
  it('Cloudflare orqali kelganda haqiqiy mijoz IP', () => {
    expect(cloudflareClientIp('172.64.198.140', '195.158.4.23')).toBe('195.158.4.23');
    expect(cloudflareClientIp('2606:4700::1', '2a00:1450::1')).toBe('2a00:1450::1');
  });
  it("to'g'ridan-to'g'ri kelgan so'rovning soxta sarlavhasi e'tiborsiz", () => {
    expect(cloudflareClientIp('203.0.113.9', '1.1.1.1')).toBeNull();
  });
  it('sarlavha yo\'q yoki yaroqsiz', () => {
    expect(cloudflareClientIp('172.64.198.140', undefined)).toBeNull();
    expect(cloudflareClientIp('172.64.198.140', 'not-an-ip')).toBeNull();
    expect(cloudflareClientIp(undefined, '1.1.1.1')).toBeNull();
    expect(cloudflareClientIp('garbage', '1.1.1.1')).toBeNull();
  });
});
