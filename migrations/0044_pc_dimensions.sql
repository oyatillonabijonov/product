-- PC konfigurator — admin boshqaradigan moslik guruhlari
-- (spec: docs/superpowers/specs/2026-10-13-pc-moslik-guruhlari-design.md).
-- Moslik endi nomdan taxmin emas: admin har qismga qiymat (AM5, DDR5…) beradi; ikki qism faol turda
-- kamida bitta umumiy qiymatga ega bo'lsa — mos. products.pc_socket/pc_memory bazada qoladi,
-- kod ularni endi o'qimaydi ham, yozmaydi ham. Billz sinxronizatsiyasi bu jadvallarga tegmaydi.
CREATE TABLE pc_dimensions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT UNIQUE,
  name       TEXT NOT NULL,
  name_ru    TEXT NOT NULL DEFAULT '',
  slots      TEXT NOT NULL DEFAULT '[]',
  is_active  INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pc_dimension_values (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dimension_id INTEGER NOT NULL,
  label        TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (dimension_id, label)
);

CREATE TABLE pc_part_values (
  product_id TEXT NOT NULL,
  value_id   INTEGER NOT NULL,
  PRIMARY KEY (product_id, value_id)
);
CREATE INDEX idx_pc_part_values_value ON pc_part_values (value_id);

INSERT INTO pc_dimensions (key, name, name_ru, slots, is_active, sort_order) VALUES
  ('socket', 'Soket', 'Сокет', '["cpu","mb"]', 1, 10),
  ('memory', 'Xotira turi', 'Тип памяти', '["cpu","mb","ram"]', 1, 20);

INSERT INTO pc_dimension_values (dimension_id, label, sort_order)
  SELECT d.id, v.label, v.ord FROM pc_dimensions d,
    (SELECT 'AM4' AS label, 10 AS ord UNION ALL SELECT 'AM5', 20 UNION ALL SELECT 'LGA1200', 30
     UNION ALL SELECT 'LGA1700', 40 UNION ALL SELECT 'LGA1851', 50) v
  WHERE d.key = 'socket';

INSERT INTO pc_dimension_values (dimension_id, label, sort_order)
  SELECT d.id, v.label, v.ord FROM pc_dimensions d,
    (SELECT 'DDR4' AS label, 10 AS ord UNION ALL SELECT 'DDR5', 20) v
  WHERE d.key = 'memory';

-- Eski admin tuzatishlari (prod'da 0 ta, lokal bazalarda bo'lishi mumkin) tasdiqlangan qiymatga aylanadi.
INSERT OR IGNORE INTO pc_part_values (product_id, value_id)
  SELECT p.id, v.id FROM products p
  JOIN pc_dimension_values v ON v.label = p.pc_socket
  JOIN pc_dimensions d ON d.id = v.dimension_id AND d.key = 'socket'
  WHERE p.pc_socket IS NOT NULL;

INSERT OR IGNORE INTO pc_part_values (product_id, value_id)
  SELECT p.id, v.id FROM products p
  JOIN pc_dimension_values v ON v.label = p.pc_memory
  JOIN pc_dimensions d ON d.id = v.dimension_id AND d.key = 'memory'
  WHERE p.pc_memory IS NOT NULL;
