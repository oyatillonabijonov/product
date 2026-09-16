import type { FC } from 'react';
import type { OrderStatus } from '../../shared/types';
import { STATUSES } from './lib/inbox';
import { Card, Dot, Segmented, Select, type Tone } from './ui';

/** Holat rangi (spec §4): yangi — e'tibor kerak, bog'lanildi — jarayonda, bajarildi/yopildi — tugagan. */
const TONE: Record<OrderStatus, Tone> = { new: 'attention', contacted: 'info', done: 'ok' };

/** Jadval qatoridagi holat: rang nuqtasi + select; o'zgarish darhol saqlanadi (`DataTable` select bosilganda qatorni ochmaydi). */
export const StatusSelect: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; ariaLabel: string }> = ({
  value, labels, onChange, ariaLabel,
}) => (
  <span className="flex items-center gap-2">
    <Dot tone={TONE[value]} />
    <span className="w-full md:w-36">
      <Select value={value} onChange={(v) => onChange(v as OrderStatus)} ariaLabel={ariaLabel}>
        {STATUSES.map((s) => <option key={s} value={s}>{labels[s]}</option>)}
      </Select>
    </span>
  </span>
);

/** Tafsilot sahifasidagi holat kartasi: segment darhol saqlanadi; Telegram'ga ketmagan bo'lsa ogohlantiradi. */
export const StatusCard: FC<{ value: OrderStatus; labels: Record<OrderStatus, string>; onChange: (s: OrderStatus) => void; telegramSent: boolean }> = ({
  value, labels, onChange, telegramSent,
}) => (
  <Card title="Holat">
    <Segmented
      label="Holat"
      value={value}
      onChange={(v) => onChange(v as OrderStatus)}
      options={STATUSES.map((s) => ({ id: s, label: labels[s] }))}
    />
    {!telegramSent && (
      <p className="mt-3 text-para text-danger">
        Telegram guruhiga yuborilmagan — Sozlamalar'da bot tokeni va guruh ID'sini tekshiring.
      </p>
    )}
  </Card>
);
