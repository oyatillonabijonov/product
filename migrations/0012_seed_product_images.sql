-- Fill empty product images with existing placeholder photos served from public/products/.
-- Only touches products whose image_url is still empty (never overwrites real uploads).

-- Computer-specific first (before the generic kompyuterlar fallback).
UPDATE products SET image_url = '/products/imac1.webp' WHERE image_url = '' AND (id = 'imac' OR name LIKE '%iMac%');
UPDATE products SET image_url = '/products/mini.webp'  WHERE image_url = '' AND (id = 'mac-mini' OR name LIKE '%Mac Mini%');

-- By storefront category.
UPDATE products SET image_url = '/products/iph1.webp' WHERE image_url = '' AND category_id = 'telefonlar';
UPDATE products SET image_url = '/products/mac1.webp' WHERE image_url = '' AND category_id = 'noutbuklar';
UPDATE products SET image_url = '/products/pad1.webp' WHERE image_url = '' AND category_id = 'planshetlar';
UPDATE products SET image_url = '/products/pc.webp'   WHERE image_url = '' AND category_id = 'kompyuterlar';

-- Fallback by legacy category for any product without a category_id.
UPDATE products SET image_url = '/products/iph1.webp' WHERE image_url = '' AND category = 'iphone';
UPDATE products SET image_url = '/products/pad1.webp' WHERE image_url = '' AND category = 'ipad';
UPDATE products SET image_url = '/products/mac1.webp' WHERE image_url = '' AND category = 'mac' AND name LIKE '%MacBook%';
UPDATE products SET image_url = '/products/imac1.webp' WHERE image_url = '' AND category = 'mac';
UPDATE products SET image_url = '/products/pc.webp'  WHERE image_url = '' AND category = 'pc';

-- Last-resort: anything still empty gets the phone photo so nothing renders blank.
UPDATE products SET image_url = '/products/iph1.webp' WHERE image_url = '';
