-- 18 Pro kartasidagi narx endi qo'lda yozilmaydi: `{narx}` o'rniga mahsulotning joriy narxi chiqadi.
UPDATE news SET
  text = '{narx} dan. To''rt rangda, 2TB gacha.',
  text_ru = 'От {narx}. Четыре цвета, до 2 ТБ.'
WHERE id = 'iphone-18-pro';
