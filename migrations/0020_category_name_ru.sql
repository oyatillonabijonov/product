-- Kategoriya nomining ruscha varianti: RU lokalda storefront o'zbekcha nom ko'rsatayotgan edi.
-- Bo'sh qiymat = ruscha nom kiritilmagan, UI o'zbekchasiga tushadi (fallback).
ALTER TABLE categories ADD COLUMN name_ru TEXT NOT NULL DEFAULT '';

UPDATE categories SET name_ru = 'Телефоны'    WHERE id = 'telefonlar';
UPDATE categories SET name_ru = 'Ноутбуки'    WHERE id = 'noutbuklar';
UPDATE categories SET name_ru = 'Планшеты'    WHERE id = 'planshetlar';
UPDATE categories SET name_ru = 'Компьютеры'  WHERE id = 'kompyuterlar';
UPDATE categories SET name_ru = 'Аксессуары'  WHERE id = 'aksessuarlar';
