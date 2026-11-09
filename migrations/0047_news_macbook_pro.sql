-- Yangiliklar: iPhone Duo hozir pre-order'da emas — o'rnida do'konda bor eng yangi MacBook Pro.
UPDATE news SET
  id = 'macbook-pro-m5',
  badge = 'Yangi', badge_ru = 'Новинка',
  tag = 'Sotuvda', tag_ru = 'В продаже',
  title = 'MacBook Pro M5', title_ru = 'MacBook Pro M5',
  text = 'M5 Pro chipi, 24GB xotira, 1TB SSD. 14 dyuym, Space Black.',
  text_ru = 'Чип M5 Pro, 24 ГБ памяти, SSD 1 ТБ. 14 дюймов, Space Black.',
  cta = 'Xarid qilish', cta_ru = 'Купить',
  link_url = '/product/4570a835-ba6c-48e4-b276-d2d20675c321',
  image_url = '/products/mac1.webp'
WHERE id = 'iphone-duo' OR title = 'iPhone Duo';

-- 18 Pro kartasidagi narx mahsulot sahifasidagi narxga tenglashtirildi ($1 499 ≈ 18,1 mln edi, sahifada 21 mln).
UPDATE news SET
  text = '21 000 000 so''m dan. To''rt rangda, 2TB gacha.',
  text_ru = 'От 21 000 000 сум. Четыре цвета, до 2 ТБ.'
WHERE id = 'iphone-18-pro';
