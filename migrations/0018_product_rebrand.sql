-- 0018: rebrand default store Taqsit Store -> ProDuct (site_config + kontakt page)
-- map_ll ataylab o'zgartirilmadi: aniq koordinata Yandex "ProDuct"dan admin orqali kiritiladi.
UPDATE site_config SET
  name             = 'ProDuct',
  phone            = '+998884148888',
  phone_display    = '+998 (88) 414-88-88',
  telegram         = 'https://t.me/pro_duct_uz',
  instagram        = 'https://www.instagram.com/pro_duct.uz/',
  whatsapp         = 'https://wa.me/998884148888',
  map_label        = 'Tong Yulduzi MFY, ko''prik ko''chasi 30-uy, Toshkent',
  seo_title_suffix = 'ProDuct',
  seo_description  = 'Professional yondashuv — Toshkentda elektronika mahsulotlari.'
WHERE id = 1;

UPDATE pages SET
  content_uz   = '**Manzil:** Tong Yulduzi MFY, ko''prik ko''chasi 30-uy, Toshkent' || char(10) || char(10) || '**Telefon:** +998 (88) 414-88-88',
  content_ru   = '**Адрес:** МФЙ Тонг Юлдузи, ул. Купрук, дом 30, Ташкент' || char(10) || char(10) || '**Телефон:** +998 (88) 414-88-88',
  content_en   = '**Address:** Tong Yulduzi MFY, Kuprik street 30, Tashkent' || char(10) || char(10) || '**Phone:** +998 (88) 414-88-88',
  content_cyrl = '**Манзил:** Тонг Юлдузи МФЙ, кўприк кўчаси 30-уй, Тошкент' || char(10) || char(10) || '**Телефон:** +998 (88) 414-88-88'
WHERE slug = 'kontakt';
