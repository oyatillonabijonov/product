-- Mahsulot reytingi: yulduzcha o'rtachasi va sharhlar soni.
-- Ikkalasi ham admin qo'lda kiritadigan qiymat — sayt o'z sharh tizimini
-- yuritmaydi, do'kon egasi tashqi manbadan (marketplace, ijtimoiy tarmoq)
-- ko'chiradi. `rating_avg` NULL = hali baholanmagan.
ALTER TABLE products ADD COLUMN rating_avg REAL;
ALTER TABLE products ADD COLUMN review_count INTEGER NOT NULL DEFAULT 0;
