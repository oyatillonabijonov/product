-- Preset icon key per category (lucide icon name). Empty = generic fallback.
ALTER TABLE categories ADD COLUMN icon TEXT NOT NULL DEFAULT '';

UPDATE categories SET icon = 'smartphone' WHERE id = 'telefonlar';
UPDATE categories SET icon = 'laptop'     WHERE id = 'noutbuklar';
UPDATE categories SET icon = 'tablet'     WHERE id = 'planshetlar';
UPDATE categories SET icon = 'monitor'    WHERE id = 'kompyuterlar';
UPDATE categories SET icon = 'headphones' WHERE id = 'aksessuarlar';
