import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiReview } from '../../shared/types';
import { createReview, deleteReview, listReviews } from './api';
import { errText } from './errText';
import IconAction from './IconAction';
import { Button, Field, Input, Select, Textarea } from './ui';
import { useConfirm } from './ui/confirm';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Mahsulot sharhlari (admin). Sayt o'z sharh tizimini yuritmaydi — egasi tashqi
 * manbadan (marketplace, Telegram) ko'chiradi. Har o'zgarishda server reytingni
 * qayta hisoblaydi; `onChanged` forma maydonlarini (reyting, soni) yangilaydi.
 */
const ReviewsEditor: FC<{ productId: string; onChanged: (avg: number, count: number) => void }> = ({ productId, onChanged }) => {
  const { t } = useTranslation('products');
  const confirm = useConfirm();
  const [rawItems, setItems] = useState([] as ApiReview[]);
  const items = rawItems as ApiReview[];
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
    const ok = await confirm({ title: t('reviewsEditor.confirmDeleteTitle'), message: `${r.author} · ${'★'.repeat(r.rating)}`, confirmLabel: t('shared.delete'), destructive: true });
    if (!ok) return;
    try { await deleteReview(r.id); publish(items.filter((x) => x.id !== r.id)); }
    catch (e) { setError(errText(e)); }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="mb-3 text-label font-medium text-muted">{t('reviewsEditor.title', { count: items.length })}</p>
      {items.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {items.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-xs border border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="text-para text-primary">
                  <span className="font-medium">{r.author}</span> · {'★'.repeat(r.rating)} ·{' '}
                  <span className="text-muted">{new Date(r.createdAt * 1000).toISOString().slice(0, 10)}</span>
                </p>
                <p className="whitespace-pre-line text-para text-body">{r.body}</p>
              </div>
              <IconAction Icon={Trash2} label={t('reviewsEditor.removeLabel')} onClick={() => remove(r)} danger />
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 md:grid-cols-[1fr_120px_170px]">
        <Field label={t('reviewsEditor.authorLabel')}><Input value={author} onChange={setAuthor} /></Field>
        <Field label={t('reviewsEditor.ratingLabel')}>
          <Select value={String(rating)} onChange={(v) => setRating(Number(v))}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
          </Select>
        </Field>
        <Field label={t('reviewsEditor.dateLabel')}><Input type="date" value={date} onChange={setDate} /></Field>
      </div>
      <div className="mt-3"><Field label={t('reviewsEditor.bodyLabel')}><Textarea value={body} onChange={setBody} rows={3} /></Field></div>
      {error && <p className="mt-2 text-label text-danger">{error}</p>}
      <div className="mt-3">
        <Button variant="secondary" onClick={add} disabled={busy || !author.trim() || !body.trim()}>{t('reviewsEditor.addButton')}</Button>
      </div>
    </div>
  );
};

export default ReviewsEditor;
