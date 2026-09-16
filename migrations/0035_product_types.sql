-- Tovar turlari bazaga ko'chdi (shared/product-types.ts registri o'rniga): admin CRUD,
-- sayt tile qatori, Billz moslash va mahsulot validatsiyasi shu jadvaldan o'qiydi.
-- Kalit (category_id, id): `aksessuar` to'rttala yo'nalishda, `mikrofon` audio va video'da
-- takrorlanadi. products.type o'sha-o'sha id (FK yo'q — tur o'chirilsa NULL qilinadi).
CREATE TABLE product_types (
  id            TEXT NOT NULL,
  category_id   TEXT NOT NULL,
  label         TEXT NOT NULL,
  label_ru      TEXT NOT NULL DEFAULT '',
  icon_url      TEXT NOT NULL DEFAULT '',
  billz_aliases TEXT NOT NULL DEFAULT '[]',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, id)
);

INSERT INTO product_types (category_id, id, label, label_ru, icon_url, billz_aliases, sort_order) VALUES
('apple','iphone','iPhone','iPhone','/sections/image-grid-iphone-nav_2x.png','[]',10),
('apple','ipad','iPad','iPad','/sections/image-grid-ipad-tn_2x.png','["iPad Pro","iPad Air","iPad mini"]',20),
('apple','macbook','MacBook','MacBook','/sections/image-grid-mac-nav_2x.png','["MacBook Pro","MacBook Air","MacBook Neo"]',30),
('apple','imac','iMac','iMac','/sections/imac.webp','[]',40),
('apple','mac-mini','Mac mini','Mac mini','/sections/image-grid-mac-mini_2x.png','["Mac Studio","Mac Pro"]',50),
('apple','apple-watch','Apple Watch','Apple Watch','/sections/image-grid-watch_2x.png','["iWatch","Watch"]',60),
('apple','vision-pro','Apple Vision Pro','Apple Vision Pro','/sections/image-grid-apple-vision-pro_2x.png','["Vision Pro"]',70),
('apple','airpods','AirPods','AirPods','/sections/image-grid-airpods_2x.png','["Air Pods"]',80),
('apple','aksessuar','Aksessuar','Аксессуары','/sections/apple-accessories.webp','["Phone Case","Case","Cable","Glass","Charger","Adapter","Bag","Trackpad","Keyboard","Mouse","Magic Mouse","Magic Keyboard","Pencil","HUB","Kronshteyn","Combo","Speaker","Headset","Mousepad","Apple TV","Chair","MagSafe Battery","Magic trackpad","Power Bank","Power Adapter","Keyboard Guard","KIT","M.2 Adapter","SATA Adapter","Watch Band","Apple Pencil","EarPods"]',90),
('pc','noutbuk','Noutbuk','Ноутбуки','/sections/laptops.webp','["Laptop","Notebook"]',10),
('pc','tayyor-pc','Tayyor PC','Готовые ПК','/sections/pc.webp','["PC","Monoblock","Mini PC"]',20),
('pc','cpu','CPU','CPU','/sections/cpu.webp','["Processor"]',30),
('pc','gpu','GPU','GPU','/sections/gpu.webp','["Videokarta","Video Card"]',40),
('pc','motherboard','Motherboard','Материнские платы','/sections/motherboard.webp','[]',50),
('pc','ram','RAM','RAM','/sections/ram.webp','["DDR4","DDR5"]',60),
('pc','xotira','Xotira','Накопители','/sections/ssd-hdd.webp','["SSD","SSD M2","SSD M.2","NVMe","HDD","External SSD","External HDD"]',70),
('pc','korpus','Korpus','Корпуса','/sections/case.webp','["PC Case","Case"]',80),
('pc','psu','Quvvat bloki','Блоки питания','/sections/psu.webp','["PSU","Power Supply"]',90),
('pc','sovutish','Sovutish','Охлаждение','/sections/cooler.webp','["Liquid Cooler","CPU Cooler","Cooler","Fan","Fans"]',100),
('pc','monitor','Monitor','Мониторы','/sections/pc-monitor.webp','[]',110),
('pc','aksessuar','Aksessuar','Аксессуары','/sections/pc-accessories.webp','["Mouse","Keyboard","Mousepad","Glasspad","Headset","Speaker","Cable","HUB","Kronshteyn","Combo","Chair","Bag","Webcam","Microphone","Glass","Wired Headset","Controller Hub","DVD Writer"]',120),
('audio','mikrofon','Mikrofon','Микрофоны','/sections/condenser-microphone.webp','["Microphone","Mic","Wireless Microphone","Микрофон"]',10),
('audio','studio-monitor','Studio monitor','Студийные мониторы','/sections/studio-monitors.webp','["Studio Monitor","Studio Monitors","Monitors"]',20),
('audio','naushnik','Naushnik','Наушники','/sections/pro-headphones.webp','["Headphones","Headphone","Наушники"]',30),
('audio','interfeys','Audio interfeys','Аудиоинтерфейсы','/sections/audio-interface.webp','["Audio Interface","Interface","Sound Card"]',40),
('audio','mikser','Mikser / rekorder','Микшеры и рекордеры','/sections/audio-mixer.webp','["Mixer","Recorder","Audio Recorder"]',50),
('audio','analog','Analog uskuna','Аналоговое оборудование','/sections/analog-studio-hardware.webp','["Preamp","Compressor","Equalizer","Outboard"]',60),
('audio','midi','MIDI kontroller','MIDI-контроллеры','/sections/usb-midi-controllers.webp','["MIDI Controller","MIDI Keyboard","USB Controller"]',70),
('audio','aksessuar','Aksessuar','Аксессуары','/sections/audio-accessories.webp','["Stand","Cable","Pop Filter","Shock Mount"]',80),
('video','kamera','Kamera','Камеры','/sections/digital-cameras.webp','["Camera","Camcorder"]',10),
('video','action-kamera','Action kamera','Экшн-камеры','/sections/action-cameras.webp','["Action Camera"]',20),
('video','obyektiv','Obyektiv','Объективы','/sections/camera-lens.webp','["Lens","Lenses"]',30),
('video','stabilizator','Stabilizator','Стабилизаторы','/sections/gimbal.webp','["Gimbal","Stabilizer"]',40),
('video','shtativ','Shtativ','Штативы','/sections/tripods.webp','["Tripod"]',50),
('video','yoruglik','Yorug''lik','Свет','/sections/video-lighting.webp','["Light","LED Light","Lighting"]',60),
('video','post-production','Post-production','Постпродакшн','/sections/post-production.webp','["Post Production","Editing Console"]',70),
('video','mikrofon','Mikrofon','Микрофоны','/sections/wireless-mic.webp','["Microphone","Wireless Microphone","Микрофон"]',80),
('video','xotira-kartasi','Xotira kartasi','Карты памяти','/sections/memory-cards.webp','["Memory Card"]',90),
('video','aksessuar','Aksessuar','Аксессуары','/sections/video-accessories.webp','["Battery","Bag","Cable"]',100);

-- Sayt kontenti (spec §6; 4-bosqich ishlatadi): faqat o'zgartirilgan matn/rasm saqlanadi,
-- qolgani koddagi standart.
CREATE TABLE site_texts (
  key TEXT PRIMARY KEY,
  uz  TEXT NOT NULL DEFAULT '',
  ru  TEXT NOT NULL DEFAULT ''
);
CREATE TABLE site_assets (
  key TEXT PRIMARY KEY,
  url TEXT NOT NULL
);

-- Landing brend tasmasi endi brands.logo_url dan (16 ta SVG public/brands/ ga ko'chdi).
-- sort_order shu 16 tada tasmadagi hozirgi tartib (10..160); yo'q brendlar yaratiladi.
UPDATE brands SET logo_url = '/brands/apple.svg',      sort_order = 10  WHERE id = 'apple';
UPDATE brands SET logo_url = '/brands/sony.svg',       sort_order = 20  WHERE id = 'sony';
UPDATE brands SET logo_url = '/brands/intel.svg',      sort_order = 30  WHERE id = 'intel';
UPDATE brands SET logo_url = '/brands/nvidia.svg',     sort_order = 40  WHERE id = 'nvidia';
UPDATE brands SET logo_url = '/brands/asus.svg',       sort_order = 50  WHERE id = 'asus';
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'asus-proart', 'ASUS ProArt', 'asus-proart', '/brands/proart.svg', 60
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'asus-proart' OR slug = 'asus-proart');
UPDATE brands SET logo_url = '/brands/hp.svg',         sort_order = 70  WHERE id = 'hp';
UPDATE brands SET logo_url = '/brands/amd.svg',        sort_order = 80  WHERE id = 'amd';
UPDATE brands SET logo_url = '/brands/blackmagic.svg', sort_order = 90  WHERE id = 'blackmagic';
UPDATE brands SET logo_url = '/brands/dji.svg',        sort_order = 100 WHERE id = 'dji';
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'audio-technica', 'Audio-Technica', 'audio-technica', '/brands/audio-technica.svg', 110
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'audio-technica' OR slug = 'audio-technica');
INSERT INTO brands (id, name, slug, logo_url, sort_order)
  SELECT 'bang-olufsen', 'Bang & Olufsen', 'bang-olufsen', '/brands/bang-olufsen.svg', 120
  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE id = 'bang-olufsen' OR slug = 'bang-olufsen');
UPDATE brands SET logo_url = '/brands/logitech.svg',   sort_order = 130 WHERE id = 'logitech';
UPDATE brands SET logo_url = '/brands/hollyland.svg',  sort_order = 140 WHERE id = 'hollyland';
UPDATE brands SET logo_url = '/brands/2e-gaming.svg',  sort_order = 150 WHERE id = '2e';
UPDATE brands SET logo_url = '/brands/whoop.svg',      sort_order = 160 WHERE id = 'whoop';
