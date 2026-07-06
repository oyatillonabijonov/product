import type { FC } from 'react';
import type { Translation } from '../locales';
import type { ApiCustomer, ApiOrder } from '../../shared/types';
import { formatUzs } from '../lib/installment';
import LocaleLink from './LocaleLink';

const AccountPage: FC<{ t: Translation; customer: ApiCustomer; orders: ApiOrder[] }> = ({ t, customer, orders }) => (
  <div className="max-w-[800px] mx-auto px-4 py-8">
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{t.accountTitle}</h1>
      <a href="/auth/logout" className="text-[13px] text-muted hover:text-sale font-semibold">{t.accountLogout}</a>
    </div>

    <div className="bg-white border border-line-2 rounded-2xl p-4 mb-8 shadow-apple">
      <div className="font-semibold text-[15px]">{customer.name || '—'}</div>
      {customer.email && <div className="text-[13px] text-muted">{customer.email}</div>}
      {customer.phone && <div className="text-[13px] text-muted">{customer.phone}</div>}
    </div>

    <h2 className="text-[18px] font-semibold mb-3">{t.accountOrders}</h2>
    {orders.length === 0 ? (
      <p className="text-muted">{t.accountNoOrders}</p>
    ) : (
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="bg-white border border-line-2 rounded-2xl p-4 shadow-apple">
            <div className="flex justify-between text-[13px] text-muted-2 mb-1.5">
              <span>{new Date(o.createdAt * 1000).toLocaleDateString('ru-RU')}</span>
              <span>{o.paymentKind === 'installment' ? t.orderBuyInstallment : t.orderBuyCash}</span>
            </div>
            {o.items.map((it, i) => (
              <div key={i} className="text-[14px]">
                • {it.name}{it.variantLabel ? ` (${it.variantLabel})` : ''} ×{it.qty} — {formatUzs(it.priceUzs * it.qty, t.sum)}
              </div>
            ))}
          </div>
        ))}
      </div>
    )}

    <LocaleLink to="/katalog" className="inline-block mt-6 text-accent font-semibold hover:underline">{t.cartContinue}</LocaleLink>
  </div>
);

export default AccountPage;
