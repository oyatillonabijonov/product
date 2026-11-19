import { describe, expect, it } from 'vitest';
import { isOnOrder, showsPreorder } from './on-order';

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

describe("showsPreorder — «Pre-order» faqat qo'lda kiritilgan tovarda", () => {
  it("Billz tovarida belgi o'qilmaydi: qoldiq bor tovar «sotuvga chiqishi bilan» deb chiqmasin", () => {
    expect(showsPreorder({ billzId: 'b', preorder: true })).toBe(false);
  });
  it("qo'lda kiritilgan tovarda belgi o'z holicha", () => {
    expect(showsPreorder({ billzId: null, preorder: true })).toBe(true);
    expect(showsPreorder({ billzId: null, preorder: false })).toBe(false);
  });
});
