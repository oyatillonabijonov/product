-- Do'konda hozircha muddatli to'lov yo'q — storefront naqd rejimga o'tadi
-- (narx bloklari, savat va mahsulot sahifasidagi oylik to'lov qismlari yashirinadi).
-- Qaytarish uchun kod o'zgartirish shart emas: admin → Sozlamalar → To'lov rejimi.
UPDATE site_config SET payment_mode = 'cash' WHERE id = 1;
