import type { FC } from 'react';
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
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
      <h2 className="text-subhead font-semibold text-primary">{t.reviewsTitle}</h2>
      <Stars t={t} rating={ratingAvg} count={reviewCount} />
    </div>

    {reviews.length === 0 ? (
      <p className="mt-4 text-copy text-muted">{t.reviewsEmpty}</p>
    ) : (
      <ul className="mt-6 flex flex-col gap-6">
        {reviews.map((r) => (
          <li key={r.id} className="border-t border-divider pt-6 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-copy font-medium text-primary">{r.author}</span>
              <span className="text-label text-muted-2">{dateFmt(r.createdAt)}</span>
            </div>
            <Stars t={t} rating={r.rating} count={0} compact />
            <p className="mt-2 max-w-[70ch] whitespace-pre-line text-copy text-body">{r.body}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default Reviews;
