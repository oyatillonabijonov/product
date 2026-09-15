import { useEffect, useState } from 'react';
import type { FC } from 'react';
import type { ApiJobApplication, OrderStatus } from '../../shared/types';
import { listJobApplications, setJobApplicationStatus } from './api';
import { safeHref } from '../lib/safe-href';

const STATUS_LABEL: Record<OrderStatus, string> = { new: 'Yangi', contacted: "Bog'lanildi", done: 'Yopildi' };
const STATUS_STYLE: Record<OrderStatus, string> = {
  new: 'bg-accent-soft text-accent',
  contacted: 'bg-trust-soft text-trust',
  done: 'bg-row-alt text-muted',
};

/** Nomzodlar arizalari — OrdersPage naqshi; holat optimistik yangilanadi. */
const JobApplicationsList: FC = () => {
  const [items, setItems] = useState<ApiJobApplication[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    listJobApplications().then(setItems).catch(() => setErr('Yuklashda xatolik'));
  }, []);

  async function changeStatus(id: number, status: OrderStatus) {
    setItems((prev: ApiJobApplication[] | null) => prev?.map((a) => (a.id === id ? { ...a, status } : a)) ?? prev);
    try {
      await setJobApplicationStatus(id, status);
    } catch {
      setErr('Holatni saqlashda xatolik');
    }
  }

  const list = items as ApiJobApplication[] | null;
  if (err && !list) return <p className="text-danger">{err}</p>;
  if (!list) return <p className="text-muted">Yuklanmoqda…</p>;

  return (
    <div>
      {err && <p className="text-danger text-[13px] mb-3">{err}</p>}
      {list.length === 0 ? (
        <p className="text-muted">Hozircha ariza yo'q.</p>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const resume = safeHref(a.resumeUrl);
            return (
              <div key={a.id} className="rounded-md bg-white border border-line-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[15px]">{a.name}</span>
                    <a href={`tel:${a.phone}`} className="text-[13px] text-accent">{a.phone}</a>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent">{a.position}</span>
                    {!a.telegramSent && <span className="text-[11px] text-sale">TG yuborilmadi</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    <select
                      value={a.status}
                      onChange={(e) => changeStatus(a.id, e.target.value as OrderStatus)}
                      className="rounded-xs text-[13px] border border-line-2 px-2 py-1"
                    >
                      <option value="new">Yangi</option>
                      <option value="contacted">Bog'lanildi</option>
                      <option value="done">Yopildi</option>
                    </select>
                  </div>
                </div>
                {a.message && <p className="text-[13px] text-body whitespace-pre-line">{a.message}</p>}
                {resume && (
                  <a href={resume} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[13px] text-accent underline underline-offset-2 break-all">
                    Rezyume: {a.resumeUrl}
                  </a>
                )}
                <div className="text-[11px] text-muted-2 mt-2">{new Date(a.createdAt * 1000).toLocaleString('ru-RU')}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobApplicationsList;
