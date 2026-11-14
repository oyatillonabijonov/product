import { describe, expect, it } from 'vitest';
import { isOnOrder } from './on-order';

describe('isOnOrder — «buyurtma asosida» rejimi', () => {
  it("Billz tovari: faqat qoldiq hal qiladi (aynan 0), admin belgisi e'tiborga olinmaydi", () => {
    expect(isOnOrder({ billzId: 'b', billzStock: 0, onOrder: false })).toBe(true);
    expect(isOnOrder({ billzId: 'b', billzStock: 1, onOrder: false })).toBe(false);
    expect(isOnOrder({ billzId: 'b', billzStock: 1, onOrder: true })).toBe(false);
  });
  it("qo'lda kiritilgan tovar: faqat «Tovar qolmadi» belgisi", () => {
    expect(isOnOrder({ billzId: null, billzStock: null, onOrder: true })).toBe(true);
    expect(isOnOrder({ billzId: null, billzStock: null, onOrder: false })).toBe(false);
  });
});
