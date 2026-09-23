import { describe, expect, it } from 'vitest';
import type { ApiNotification } from './notification';
import { notificationText } from './notification';

const t = {
  notifOrderNew: 'Buyurtmangiz qabul qilindi',
  notifOrderContacted: "Buyurtmangiz bo'yicha bog'lanildi",
  notifOrderDone: 'Buyurtmangiz bajarildi',
  notifOrderBody: '№{n} buyurtma',
};
const n = (over: Partial<ApiNotification> = {}): ApiNotification => ({
  id: 1, kind: 'order_status', orderId: 10, status: 'contacted',
  title: '', body: '', link: '', read: false, createdAt: 0, ...over,
});

describe('notificationText — buyurtma holati', () => {
  it('holat bo\'yicha sarlavha', () => {
    expect(notificationText(n({ status: 'contacted' }), t).title).toBe(t.notifOrderContacted);
    expect(notificationText(n({ status: 'done' }), t).title).toBe(t.notifOrderDone);
    expect(notificationText(n({ status: 'new' }), t).title).toBe(t.notifOrderNew);
  });
  it('matnga buyurtma raqami qo\'yiladi', () => {
    expect(notificationText(n({ orderId: 42 }), t).body).toBe('№42 buyurtma');
  });
  it("noma'lum holat 'yangi'ga tushadi (baza keyin o'zgarsa yiqilmasin)", () => {
    expect(notificationText(n({ status: 'boshqa' }), t).title).toBe(t.notifOrderNew);
  });
});

describe("notificationText — e'lon", () => {
  it('saqlangan matnni qaytaradi, shablon ishlatilmaydi', () => {
    const a = n({ kind: 'announce', title: 'Chegirmalar', body: 'Apple 20%', orderId: null, status: null });
    expect(notificationText(a, t)).toEqual({ title: 'Chegirmalar', body: 'Apple 20%' });
  });
});
