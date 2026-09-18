-- PC konfiguratori (spec: docs/superpowers/specs/2026-09-18-pc-konfigurator-moslik-design.md).
-- pc_hidden — egasi eskirgan modelni konfiguratordan chiqaradi; pc_socket/pc_memory/pc_watts —
-- nomdan aniqlangan atributning admin tuzatishi (NULL = avtomatik). Billz sinxronizatsiyasi
-- bu ustunlarga tegmaydi (slug, condition kabi — egasiniki).
ALTER TABLE products ADD COLUMN pc_hidden INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN pc_socket TEXT;
ALTER TABLE products ADD COLUMN pc_memory TEXT;
ALTER TABLE products ADD COLUMN pc_watts INTEGER;
