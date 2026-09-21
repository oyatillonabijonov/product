import { describe, it, expect } from 'vitest';
import { redirectUriAllowed, buildRedirect, parseConsentForm, ACCESS_TTL, CODE_TTL } from './oauth';

describe('redirectUriAllowed', () => {
  it('aniq mos kelgan manzilni qabul qiladi', () => {
    expect(redirectUriAllowed('https://claude.ai/api/mcp/auth_callback', ['https://claude.ai/api/mcp/auth_callback'])).toBe(true);
  });
  it("ro'yxatda yo'q manzilni rad etadi", () => {
    expect(redirectUriAllowed('https://evil.example/cb', ['https://claude.ai/api/mcp/auth_callback'])).toBe(false);
  });
  it('prefiks mosligi yetarli emas', () => {
    expect(redirectUriAllowed('https://claude.ai/api/mcp/auth_callback.evil', ['https://claude.ai/api/mcp/auth_callback'])).toBe(false);
  });
  it("bo'sh ro'yxat — hech narsa o'tmaydi", () => {
    expect(redirectUriAllowed('https://claude.ai/cb', [])).toBe(false);
  });
});

describe('buildRedirect', () => {
  it("mavjud query'ni saqlab code va state qo'shadi", () => {
    const u = buildRedirect('https://claude.ai/cb?x=1', { code: 'abc', state: 's1' });
    const url = new URL(u);
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.searchParams.get('code')).toBe('abc');
    expect(url.searchParams.get('state')).toBe('s1');
  });
  it("state yo'q bo'lsa qo'shilmaydi", () => {
    expect(new URL(buildRedirect('https://claude.ai/cb', { code: 'abc' })).searchParams.has('state')).toBe(false);
  });
  it('oldingi state o\'chiriladi', () => {
    const u = buildRedirect('https://claude.ai/cb?state=OLD&x=1', { code: 'c1' });
    const url = new URL(u);
    expect(url.searchParams.has('state')).toBe(false);
    expect(url.searchParams.get('x')).toBe('1');
    expect(url.searchParams.get('code')).toBe('c1');
  });
});

describe('parseConsentForm', () => {
  const ok = {
    client_id: 'c1', redirect_uri: 'https://claude.ai/cb', code_challenge: 'ch',
    state: 's', label: 'Javlonning telefoni', username: 'admin', password: 'x',
  };
  it("to'liq formani o'qiydi", () => {
    expect(parseConsentForm(ok)).toEqual({
      clientId: 'c1', redirectUri: 'https://claude.ai/cb', codeChallenge: 'ch',
      state: 's', label: 'Javlonning telefoni', username: 'admin', password: 'x',
    });
  });
  it("state bo'sh bo'lsa null", () => {
    expect(parseConsentForm({ ...ok, state: '' }).state).toBeNull();
  });
  it("nom bo'sh bo'lsa standart nom qo'yiladi", () => {
    expect(parseConsentForm({ ...ok, label: '  ' }).label).toBe('Konnektor');
  });
  it('majburiy maydon yetishmasa xato', () => {
    for (const k of ['client_id', 'redirect_uri', 'code_challenge', 'username', 'password']) {
      expect(() => parseConsentForm({ ...ok, [k]: '' })).toThrow();
    }
  });
  it('nom 60 belgigacha qisqaradi', () => {
    expect(parseConsentForm({ ...ok, label: 'a'.repeat(200) }).label).toHaveLength(60);
  });
});

describe('muddatlar', () => {
  it('access 30 kun, kod 10 daqiqa', () => {
    expect(ACCESS_TTL).toBe(2592000);
    expect(CODE_TTL).toBe(600);
  });
});
