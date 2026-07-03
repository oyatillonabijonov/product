-- 2b: banners, content pages, site_config
CREATE TABLE banners (
  id         TEXT PRIMARY KEY,
  image_url  TEXT NOT NULL,
  link_url   TEXT NOT NULL DEFAULT '',
  alt_text   TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE pages (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title_uz     TEXT NOT NULL,
  title_ru     TEXT NOT NULL,
  title_en     TEXT NOT NULL,
  title_cyrl   TEXT NOT NULL,
  content_uz   TEXT NOT NULL DEFAULT '',
  content_ru   TEXT NOT NULL DEFAULT '',
  content_en   TEXT NOT NULL DEFAULT '',
  content_cyrl TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE site_config (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  phone_display    TEXT NOT NULL,
  telegram         TEXT NOT NULL,
  instagram        TEXT NOT NULL,
  whatsapp         TEXT NOT NULL,
  map_ll           TEXT NOT NULL,
  map_label        TEXT NOT NULL,
  seo_title_suffix TEXT NOT NULL,
  seo_description  TEXT NOT NULL,
  og_image         TEXT NOT NULL
);

INSERT INTO site_config (id, name, phone, phone_display, telegram, instagram, whatsapp, map_ll, map_label, seo_title_suffix, seo_description, og_image) VALUES
(1, 'Taqsit Store', '+998886043636', '+998 (88) 604-36-36', 'https://t.me/Taqsit_store', 'https://www.instagram.com/taqsit.store/', 'https://wa.me/998886043636', '69.271481,41.338874', 'Malika Bozori, Toshkent', 'Taqsit Store', 'Toshkentda Apple va PC mahsulotlarini halol muddatli to''lovga oling.', '/og.png');

INSERT INTO pages (id, slug, title_uz, title_ru, title_en, title_cyrl, content_uz, content_ru, content_en, content_cyrl, sort_order, is_active) VALUES
('page-faq', 'faq',
 'Ko''p so''raladigan savollar', 'Часто задаваемые вопросы', 'FAQ', 'Кўп сўраладиган саволлар',
 '## Muddatli to''lov qanday ishlaydi?' || char(10) || 'Passport va boshlang''ich to''lov bilan 3, 6 yoki 12 oyga rasmiylashtiriladi. (NAMUNA matn — admin orqali almashtiring.)',
 '## Как работает рассрочка?' || char(10) || 'Оформляется по паспорту с первоначальным взносом на 3, 6 или 12 месяцев. (ОБРАЗЕЦ — замените в админке.)',
 '## How does installment work?' || char(10) || 'Issued with a passport and down payment for 3, 6 or 12 months. (SAMPLE — replace via admin.)',
 '## Муддатли тўлов қандай ишлайди?' || char(10) || 'Паспорт ва бошланғич тўлов билан 3, 6 ёки 12 ойга расмийлаштирилади. (НАМУНА — админ орқали алмаштиринг.)',
 0, 1),
('page-shartlar', 'muddatli-tolov',
 'Muddatli to''lov shartlari', 'Условия рассрочки', 'Installment terms', 'Муддатли тўлов шартлари',
 '- 21 yoshdan boshlab' || char(10) || '- Passport + boshlang''ich to''lov' || char(10) || '- 3 / 6 / 12 oy muddat' || char(10) || '- Ribosiz, jarimasiz (NAMUNA)',
 '- От 21 года' || char(10) || '- Паспорт + первоначальный взнос' || char(10) || '- Срок 3 / 6 / 12 месяцев' || char(10) || '- Без рибы и штрафов (ОБРАЗЕЦ)',
 '- From age 21' || char(10) || '- Passport + down payment' || char(10) || '- 3 / 6 / 12 month terms' || char(10) || '- No riba, no penalties (SAMPLE)',
 '- 21 ёшдан бошлаб' || char(10) || '- Паспорт + бошланғич тўлов' || char(10) || '- 3 / 6 / 12 ой муддат' || char(10) || '- Рибосиз, жаримасиз (НАМУНА)',
 1, 1),
('page-haqimizda', 'biz-haqimizda',
 'Biz haqimizda', 'О нас', 'About us', 'Биз ҳақимизда',
 'Toshkentdagi Apple va PC do''koni. Halol muddatli to''lov bilan ishlaymiz. (NAMUNA matn.)',
 'Магазин Apple и PC в Ташкенте. Работаем с честной рассрочкой. (ОБРАЗЕЦ.)',
 'Apple & PC store in Tashkent. We offer halal installment plans. (SAMPLE.)',
 'Тошкентдаги Apple ва PC дўкони. Ҳалол муддатли тўлов билан ишлаймиз. (НАМУНА.)',
 2, 1),
('page-kontakt', 'kontakt',
 'Kontakt', 'Контакты', 'Contact', 'Контакт',
 '**Manzil:** Malika Bozori, Toshkent' || char(10) || char(10) || '**Telefon:** +998 (88) 604-36-36 (NAMUNA)',
 '**Адрес:** Рынок Малика, Ташкент' || char(10) || char(10) || '**Телефон:** +998 (88) 604-36-36 (ОБРАЗЕЦ)',
 '**Address:** Malika Bazaar, Tashkent' || char(10) || char(10) || '**Phone:** +998 (88) 604-36-36 (SAMPLE)',
 '**Манзил:** Малика Бозори, Тошкент' || char(10) || char(10) || '**Телефон:** +998 (88) 604-36-36 (НАМУНА)',
 3, 1);
