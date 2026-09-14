import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import type { ApiReview } from '../../shared/types';
import { createReview, deleteReview, listReviews } from './api';
import { errText } from './errText';
import IconAction from './IconAction';

const input = 'rounded-sm w-full border border-line-2 px-3 py-2 text-[14px]';
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Mahsulot sharhlari (admin). Sayt o'z sharh tizimini yuritmaydi — egasi tashqi
 * manbadan (marketplace, Telegram) ko'chiradi. Har o'zgarishda server reytingni
 * qayta hisoblaydi; `onChanged` forma maydonlarini (reyting, soni) yangilaydi.
 */
const ReviewsEditor: FC<{ productId: string; onChanged: (avg: number, count: number) => void }> = ({ productId, onChanged }) => {
  const [items, setItems] = useState<ApiReview[]>([]);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [date, setDate] = useState(today());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function publish(list: ApiReview[]) {
    setItems(list);
    const count = list.length;
    const avg = count ? Math.round((list.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    onChanged(avg, count);
  }
  useEffect(() => {
    listReviews(productId).then(setItems).catch((e) => setError(errText(e)));
  }, [productId]);

  async function add() {
    setBusy(true); setError('');
    try {
      const r = await createReview({ productId, author: author.trim(), rating, body: body.trim(), createdAt: date });
      publish([r, ...items]);
      setAuthor(''); setBody(''); setRating(5); setDate(today());
    } catch (e) { setError(errText(e)); }
    finally { setBusy(false); }
  }
  async function remove(r: ApiReview) {
    if (!window.confirm("Sharh o'chirilsinmi?")) return;
    try { await deleteReview(r.id); publish(items.filter((x) => x.id !== r.id)); }
    catch (e) { setError(errText(e)); }
  }

  return (
    <div className="mt-4">
      <div className="text-[13px] text-muted mb-2">Sharhlar ({items.length})</div>
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="rounded-sm border border-line-2 p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13px]"><span className="font-semibold">{r.author}</span> · {'★'.repeat(r.rating)} · {new Date(r.createdAt * 1000).toISOString().slice(0, 10)}</div>
              <div className="text-[13px] text-body whitespace-pre-line">{r.body}</div>
            </div>
            <IconAction Icon={Trash2} label="O'chir" onClick={() => remove(r)} danger />
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_110px_150px] gap-2">
        <input placeholder="Muallif" className={input} value={author} onChange={(e) => setAuthor(e.target.value)} />
        <select className={input} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
        <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <textarea placeholder="Sharh matni" className={`${input} mt-2 min-h-[80px]`} value={body} onChange={(e) => setBody(e.target.value)} />
      {error && <p className="text-[13px] text-danger mt-1">{error}</p>}
      <button type="button" onClick={add} disabled={busy || !author.trim() || !body.trim()} className="press text-[13px] text-accent font-semibold mt-2 disabled:opacity-50">+ sharh qo'shish</button>
    </div>
  );
};

export default ReviewsEditor;
