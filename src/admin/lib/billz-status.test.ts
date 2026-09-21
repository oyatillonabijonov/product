import { describe, it, expect } from 'vitest';
import { billzStatusText } from './billz-status';
import type { BillzSyncStatus } from '../../../shared/billz';

const ok = (over: Partial<NonNullable<BillzSyncStatus['last']>> = {}): BillzSyncStatus => ({
  configured: true,
  running: false,
  last: {
    at: '2026-09-21T08:58:39.443Z', mode: 'full', ok: true,
    count: 1596, seen: 1593, inserted: 0, updated: 1198, hidden: 398, photos: 0, skipped: 0,
    ...over,
  },
});

describe('billzStatusText', () => {
  it('sozlanmagan va ishlayotgan holat', () => {
    expect(billzStatusText({ configured: false, running: false, last: null }).error).toBe(true);
    expect(billzStatusText({ configured: true, running: true, last: null }).text).toBe('Hozir yangilanmoqda…');
    expect(billzStatusText({ configured: true, running: false, last: null }).text).toBe('Hali bir marta ham yangilanmagan.');
  });

  it('muvaffaqiyatli run — faqat bo\'lgan o\'zgarishlar sanaladi', () => {
    const t = billzStatusText(ok()).text;
    expect(t).toContain("Billz'dan 1596 ta tovar o'qildi");
    expect(t).toContain("1198 tasining ma'lumoti yangilandi");
    expect(t).toContain('398 tasi saytdan yashirildi');
    expect(t).not.toContain('yangi qo');
  });

  it("o'zgarishsiz run ham gap bo'lib chiqadi", () => {
    expect(billzStatusText(ok({ inserted: 0, updated: 0, hidden: 0 })).text).toContain("o'zgarish bo'lmadi");
  });

  it('xato run qizil', () => {
    const r = billzStatusText(ok({ ok: false, error: 'billz_auth' }));
    expect(r.error).toBe(true);
    expect(r.text).toContain('kalitni tekshiring');
  });
});
