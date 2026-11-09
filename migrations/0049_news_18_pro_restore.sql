-- 18 Pro kartasi jonli saytda yo'qolgan edi: MacBook bir o'zi keng karta bo'lib qolgan. Qatorni qaytaradi yoki yoqadi.
INSERT INTO news (id, badge, badge_ru, tag, tag_ru, title, title_ru, text, text_ru, cta, cta_ru, link_url, image_url, sort_order, is_active)
VALUES ('iphone-18-pro', 'Yangi', 'Новинка', 'Sotuvda', 'В продаже', 'iPhone 18 Pro', 'iPhone 18 Pro',
  '{narx} dan. To''rt rangda, 2TB gacha.', 'От {narx}. Четыре цвета, до 2 ТБ.',
  'Xarid qilish', 'Купить', '/product/iphone-18-pro', '/products/iphone/18-pro.webp', -10, 1)
ON CONFLICT(id) DO UPDATE SET is_active = 1;
