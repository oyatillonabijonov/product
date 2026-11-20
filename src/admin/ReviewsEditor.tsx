import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { ChatCircleText, Plus, Star, Trash } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import type { ApiReview } from '../../shared/types';
import { createReview, deleteReview, listReviews } from './api';
import { errText } from './errText';
import { Avatar, Button, Field, IconButton, Input, Select, Textarea } from './ui';
import { Meter } from './ui/stats';
import { useConfirm } from './ui/confirm';

const today = () => new Date().toISOString().slice(0, 10);

/** 5 ta yulduzcha: to'ldirilgani amber, qolgani kulrang (baho butun songa yaxlitlanadi). */
const Stars: FC<{ value: number; size?: string }> = ({ value, size = 'size-3.5' }) => {
  const full = Math.round(value);
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} weight="fill" className={`${size} ${n <= full ? 'text-c-amber' : 'text-border-strong'}`} />
      ))}
    </span>
  );
};

/**
 * Mahsulot sharhlari (admin). Sayt o'z sharh tizimini yuritmaydi — egasi tashqi
 * manbadan (marketplace, Telegram) ko'chiradi. Har o'zgarishda server reytingni
 * qayta hisoblaydi; `onChanged` forma maydonlarini (reyting, soni) yangilaydi.
 * Ko'rinishi (kulrang karta ichida oq orolchalar, hoshiyasiz): o'rtacha baho (5→1 taqsimot), sharhlar ro'yxati
 * (qatorlar orasida hairline), ostida ixcham qo'shish formasi.
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

  const count = items.length;
  const avg = count ? items.reduce((s, r) => s + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: items.filter((r) => r.rating === n).length }));

  return (
    <div className="flex flex-col gap-4">
      {count > 0 ? (
        <>
          <div className="grid gap-5 rounded-control-lg bg-surface p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div className="flex items-center gap-4 sm:flex-col sm:items-start sm:gap-1 sm:pr-5">
              <span className="text-3xl font-bold tabular-nums text-text">{avg.toFixed(1).replace('.', ',')}</span>
              <span className="flex flex-col gap-1">
                <Stars value={avg} size="size-4" />
                <span className="text-sm text-text-muted">{t('reviewsEditor.basedOn', { n: count })}</span>
              </span>
            </div>
            <ul aria-label={t('reviewsEditor.avgLabel')} className="flex flex-col gap-1.5">
              {dist.map(({ n, c }) => (
                <li key={n} className="grid grid-cols-[2.25rem_minmax(0,1fr)_2rem] items-center gap-2.5 text-sm">
                  <span className="inline-flex items-center gap-1 tabular-nums text-text-muted">{n}<Star weight="fill" className="size-3 text-c-amber" /></span>
                  <Meter value={c} max={count} hue="amber" />
                  <span className="text-right tabular-nums text-text-muted">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-text">{t('reviewsEditor.title', { count })}</p>
            <ul className="divide-y divide-border rounded-control-lg bg-surface px-4">
              {items.map((r, i) => (
                <li
                  key={r.id}
                  className="stagger group flex items-start gap-3 py-3"
                  style={{ ['--i' as string]: Math.min(i, 8) } as Record<string, number>}
                >
                  <Avatar name={r.author} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <span className="text-base font-medium text-text">{r.author}</span>
                      <Stars value={r.rating} />
                      <span className="text-sm tabular-nums text-text-faint">{new Date(r.createdAt * 1000).toISOString().slice(0, 10)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-base text-text-muted">{r.body}</p>
                  </div>
                  <IconButton label={t('reviewsEditor.removeLabel')} onClick={() => remove(r)} danger size="sm"><Trash /></IconButton>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-control-lg bg-surface-sunken px-4 py-3.5">
          <ChatCircleText className="size-6 shrink-0 text-text-faint" />
          <span className="min-w-0">
            <span className="block text-base font-semibold text-text">{t('reviewsEditor.empty')}</span>
            <span className="block text-sm text-text-muted">{t('reviewsEditor.emptyText')}</span>
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-control-lg bg-surface p-5">
        <p className="text-sm font-semibold text-text">{t('reviewsEditor.addTitle')}</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_160px]">
          <Field label={t('reviewsEditor.authorLabel')}><Input value={author} onChange={setAuthor}/></Field>
          <Field label={t('reviewsEditor.ratingLabel')}>
            <Select value={String(rating)} onChange={(v) => setRating(Number(v))}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </Select>
          </Field>
          <Field label={t('reviewsEditor.dateLabel')}><Input type="date" value={date} onChange={setDate}/></Field>
        </div>
        <Field label={t('reviewsEditor.bodyLabel')}><Textarea value={body} onChange={setBody} rows={3} /></Field>
        {error && <p role="alert" className="text-sm text-danger-text">{error}</p>}
        <div>
          <Button variant="secondary" size="sm" onClick={add} disabled={busy || !author.trim() || !body.trim()}><Plus weight="bold" />{t('reviewsEditor.add')}</Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewsEditor;
