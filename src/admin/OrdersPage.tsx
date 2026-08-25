import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiOrder, OrderStatus } from '../../shared/types';
import { listOrders, setOrderStatus } from './api';

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'Yangi',
  contacted: "Bog'lanildi",
  done: 'Yakunlandi',
};
const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/[, ]/g, ' ');
}

const OrdersPage: FC = () => {
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    listOrders().then(setOrders).catch(() => setErr('Yuklashda xatolik'));
  }, []);

  async function changeStatus(id: number, status: OrderStatus) {
    setOrders((prev) => prev?.map((o) => (o.id === id ? { ...o, status } : o)) ?? prev);
    try {
      await setOrderStatus(id, status);
    } catch {
      setErr('Holatni saqlashda xatolik');
    }
  }

  if (err && !orders) return <p className="text-danger">{err}</p>;
  if (!orders) return <p className="text-muted">Yuklanmoqda…</p>;

  return (
    <div>
      <h2 className="text-[22px] font-semibold mb-5">Buyurtmalar</h2>
      {err && <p className="text-danger text-[13px] mb-3">{err}</p>}
      {orders.length === 0 ? (
        <p className="text-muted">Hozircha buyurtma yo'q.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-line-2 rounded-2xl p-4 shadow-apple">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px]">{o.name}</span>
                  <a href={`tel:${o.phone}`} className="text-[13px] text-accent">{o.phone}</a>
                  {/* Konsultatsiya arizasida mahsulot ham, narx ham yo'q — to'lov turi
                      o'rniga uni ajratib turuvchi belgi ko'rsatiladi. */}
                  {o.source === 'consult' ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                      Konsultatsiya
                    </span>
                  ) : (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${o.paymentKind === 'installment' ? 'bg-accent-soft text-accent' : 'bg-row-alt text-muted'}`}>
                      {o.paymentKind === 'installment' ? 'Muddatli' : 'Naqd'}
                    </span>
                  )}
                  {!o.telegramSent && <span className="text-[11px] text-sale">TG yuborilmadi</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                    className="text-[13px] border border-line-2 rounded-lg px-2 py-1"
                  >
                    <option value="new">Yangi</option>
                    <option value="contacted">Bog'lanildi</option>
                    <option value="done">Yakunlandi</option>
                  </select>
                </div>
              </div>
              <div className="text-[13px] text-body space-y-0.5">
                {o.items.map((it, i) => (
                  <div key={i}>
                    • {it.name}{it.variantLabel ? ` (${it.variantLabel})` : ''} ×{it.qty} — {fmt(it.priceUzs * it.qty)} so'm
                  </div>
                ))}
              </div>
              {o.paymentKind === 'installment' && (
                <div className="text-[12px] text-muted mt-2">
                  {o.termMonths} oy · boshlang'ich {o.downPaymentUzs != null ? fmt(o.downPaymentUzs) : '—'} · oylik {o.monthlyUzs != null ? fmt(o.monthlyUzs) : '—'} so'm
                </div>
              )}
              {o.note && <div className="text-[12px] text-muted mt-1">📝 {o.note}</div>}
              <div className="text-[11px] text-muted-2 mt-2">{new Date(o.createdAt * 1000).toLocaleString('ru-RU')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
