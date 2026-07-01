INSERT INTO settings (id, down_payment_percent, usd_to_uzs, terms) VALUES
  (1, 20, 12600, '[{"months":3,"markup":0.1},{"months":6,"markup":0.22},{"months":12,"markup":0.42}]');

INSERT INTO products (id, name, category, condition, condition_note, cash_price_uzs, image_url, sort_order, is_active, created_at) VALUES
  ('iphone-17-pro',   'iPhone 17 Pro',              'iphone', 'yangi',       NULL,         18500000, '', 10, 1, unixepoch()),
  ('iphone-16',       'iPhone 16',                  'iphone', 'yangi',       NULL,         12900000, '', 20, 1, unixepoch()),
  ('macbook-pro',     'MacBook Pro',                'mac',    'yangi',       NULL,         32000000, '', 30, 1, unixepoch()),
  ('macbook-air',     'MacBook Air',                'mac',    'yangi',       NULL,         19900000, '', 40, 1, unixepoch()),
  ('ipad-pro',        'iPad Pro',                   'ipad',   'yangi',       NULL,         14500000, '', 50, 1, unixepoch()),
  ('imac',            'iMac',                       'mac',    'yangi',       NULL,         24000000, '', 60, 1, unixepoch()),
  ('mac-mini',        'Mac Mini',                   'mac',    'yangi',       NULL,          9900000, '', 70, 1, unixepoch()),
  ('workstation',     'Workstation PC',             'pc',     'yangi',       NULL,         21000000, '', 80, 1, unixepoch()),
  ('iphone-15-used',  'iPhone 15 (ishlatilgan)',    'iphone', 'ishlatilgan', '95% holat',   9500000, '', 90, 1, unixepoch()),
  ('macbook-air-used','MacBook Air (ishlatilgan)',  'mac',    'ishlatilgan', '90% holat',  13900000, '',100, 1, unixepoch());
