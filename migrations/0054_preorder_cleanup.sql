-- 2026-11-13 kuni (BETA rejimi) saytdagi hamma faol tovarga `preorder = 1` qo'yilgan edi. Natijada qoldig'i
-- bor tovar ham «Oldindan buyurtma — sotuvga chiqishi bilan yetkazamiz» deb chiqdi — mijoz «bor tovar
-- yo'q deb ko'rinyapti» dedi. Endi holatni qoldiq hal qiladi (`shared/on-order.ts`):
-- • Billz'da yo'q, qo'lda kiritilgan pre-order tovarlar (Audio/Video, kutilayotgan Apple) — «Tovar qolmadi»
--   rejimiga o'tadi: narx yashirin, taxminiy narx va «Oldindan buyurtma».
UPDATE products SET on_order = 1 WHERE billz_id IS NULL AND preorder = 1;
-- • «Pre-order» belgisi hammadan olinadi; Billz tovarida u endi umuman o'qilmaydi.
UPDATE products SET preorder = 0 WHERE preorder = 1;
