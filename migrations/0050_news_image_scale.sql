-- Yangiliklar kartasidagi rasm o'lchami: admin surgich bilan boshqaradi (foizda, 100 = odatdagi o'lcham).
ALTER TABLE news ADD COLUMN image_scale INTEGER NOT NULL DEFAULT 100;
