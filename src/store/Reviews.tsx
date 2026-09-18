import type { FC } from 'react';
import { MessageSquare } from 'lucide-react';
import type { ApiReview } from '../../shared/types';
import type { Translation } from '../locales';
import Stars from './Stars';

/**
 * Sana qo'lda yig'iladi (`Intl` emas): server UTC'da, brauzer o'z zonasida
 * hisoblaydi va `toLocaleDateString` ikkalasida boshqacha satr berib,
 * gidratatsiyani buzardi. Raqamli format ikkala tilda ham bir xil o'qiladi.
 */
const dateFmt = (unix: number): string => {
  const d = new Date(unix * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
};

/**
 * Sharhlar bo'limi. Ma'lumot `product_reviews` jadvalidan keladi — matnlar
 * o'ylab topilmaydi, sharh yo'q bo'lsa bo'sh holat ko'rsatiladi.
 *
 * O'rtacha baho `products.rating_avg` dan olinadi (admin qo'lda ham
 * to'g'rilashi mumkin), sharhlar soni esa ro'yxatning o'z uzunligi emas —
 * do'kon tashqi manbadagi sonni ham ko'rsatishi mumkin.
 */
const Reviews: FC<{
  t: Translation; reviews: ApiReview[];
  ratingAvg: number | null | undefined; reviewCount: number;
}> = ({ t, reviews, ratingAvg, reviewCount }) => (
  <section className="mt-14 border-t border-divider pt-10">
    {/* Sarlavha — mahsulot sahifasidagi `SectionTitle` naqshi: qalin nom, och savol. */}
    <h2 className="text-subhead md:text-heading text-muted-2">
      <span className="font-semibold text-primary">{t.reviewsTitle}.</span> {t.reviewsPrompt}
    </h2>

    {/* Chapda umumiy baho kartasi, o'ngda sharh kartalari — ikkalasi `surface` yuzada,
        sahifa fonidan ajralib turadi (ilgari oddiy matn qatori ko'zga tashlanmasdi). */}
    <div className={`mt-8 grid gap-4 ${ratingAvg ? 'lg:grid-cols-[300px_1fr]' : ''}`}>
      {ratingAvg ? (
        <div className="flex flex-col items-start rounded-lg border border-divider bg-surface p-6 lg:self-start">
          <span className="text-display font-semibold tabular-nums text-primary">{ratingAvg.toFixed(1)}</span>
          <Stars t={t} rating={ratingAvg} count={reviewCount} />
        </div>
      ) : null}

      {reviews.length === 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-dashed border-line bg-surface p-6">
          <MessageSquare className="h-8 w-8 shrink-0 text-muted-3" strokeWidth={1.5} />
          <p className="text-copy text-muted">{t.reviewsEmpty}</p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="flex flex-col rounded-lg border border-divider bg-surface p-6">
              <Stars t={t} rating={r.rating} count={0} compact />
              <p className="mt-3 whitespace-pre-line text-copy text-body">{r.body}</p>
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-label">
                <span className="font-semibold text-primary">{r.author}</span>
                <span className="text-muted-2">{dateFmt(r.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </section>
);

export default Reviews;
