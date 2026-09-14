import { describe, expect, it } from 'vitest';
import { parseCbuUsd, storeRate } from './usd-rate';

describe('parseCbuUsd', () => {
  it('MB javobidan kurs va sanani oladi', () => {
    expect(parseCbuUsd([{ id: 1, Ccy: 'USD', Nominal: '1', Rate: '11765.76', Date: '14.09.2026' }]))
      .toEqual({ rate: 11765.76, date: '14.09.2026' });
  });
  it('Nominal hisobga olinadi', () => {
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '10', Rate: '117657.6', Date: '14.09.2026' }])?.rate).toBeCloseTo(11765.76);
  });
  it("buzuq javobda null qaytaradi", () => {
    expect(parseCbuUsd(null)).toBeNull();
    expect(parseCbuUsd({ Ccy: 'USD', Nominal: '1', Rate: '11765.76' })).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'EUR', Nominal: '1', Rate: '13000' }])).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '1', Rate: 'abc' }])).toBeNull();
    expect(parseCbuUsd([{ Ccy: 'USD', Nominal: '1', Rate: '0' }])).toBeNull();
  });
});

describe('storeRate', () => {
  it("ustamani qo'shib butun so'mga yaxlitlaydi", () => {
    expect(storeRate(11765.76, 7)).toBe(12589);
    expect(storeRate(11765.76, 0)).toBe(11766);
  });
});
