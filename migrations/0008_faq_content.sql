-- Real FAQ content for the /page/faq page (4 languages). Replaces the placeholder NAMUNA text.
UPDATE pages SET
  content_uz =
    '## Muddatli to''lovni kim ola oladi?' || char(10) ||
    '21 yoshdan katta har bir shaxs muddatli to''lovga qurilma rasmiylashtirishi mumkin.' || char(10) ||
    '## Qanday hujjat kerak?' || char(10) ||
    'Faqat bitta passport yoki ID karta yetarli — boshqa hech qanday hujjat talab qilinmaydi.' || char(10) ||
    '## Boshlang''ich to''lov qancha bo''ladi?' || char(10) ||
    'Boshlang''ich to''lov miqdori tanlagan telefon modeliga qarab farq qiladi. Aniq summani do''konda yoki operatorimiz orqali bilib olasiz.' || char(10) ||
    '## To''lov muddati qancha?' || char(10) ||
    'Muddatni o''zingizga qulay tarzda 3 oydan 12 oygacha tanlaysiz.' || char(10) ||
    '## To''lov kechiksa jarima bo''ladimi?' || char(10) ||
    'Yo''q. Bizda riba, jarima va penya yo''q — bu halol muddatli to''lov. To''lov kechiksa ham qo''shimcha to''lov undirilmaydi.' || char(10) ||
    '## Telefonni darhol olib ketamanmi?' || char(10) ||
    'Ha, qurilma darhol sizga beriladi. Faqat qarz to''liq uzilgunicha telefon korobkasi do''konda saqlanadi va qurilmaga iCloud (Activation Lock) o''rnatiladi. To''lov tugagach ikkalasi ham to''liq sizga qaytariladi.' || char(10) ||
    '## Muddatidan oldin to''lab tugatsam bo''ladimi?' || char(10) ||
    'Albatta. Qarzni istalgan vaqtda muddatidan oldin to''liq yopishingiz mumkin — hech qanday qo''shimcha to''lovsiz.',
  content_ru =
    '## Кто может оформить рассрочку?' || char(10) ||
    'Оформить устройство в рассрочку может любой человек старше 21 года.' || char(10) ||
    '## Какие документы нужны?' || char(10) ||
    'Достаточно одного паспорта или ID-карты — других документов не требуется.' || char(10) ||
    '## Каким будет первоначальный взнос?' || char(10) ||
    'Размер первоначального взноса зависит от выбранной модели телефона. Точную сумму уточните в магазине или у нашего оператора.' || char(10) ||
    '## На какой срок оформляется рассрочка?' || char(10) ||
    'Вы выбираете удобный срок от 3 до 12 месяцев.' || char(10) ||
    '## Есть ли штраф за просрочку?' || char(10) ||
    'Нет. У нас нет рибы, штрафов и пени — это честная рассрочка. Даже при задержке платежа доплата не взимается.' || char(10) ||
    '## Заберу ли я телефон сразу?' || char(10) ||
    'Да, устройство выдаётся сразу. Только до полного погашения коробка хранится в магазине, а на устройство устанавливается iCloud (Activation Lock). После выплаты всё возвращается вам полностью.' || char(10) ||
    '## Можно ли погасить раньше срока?' || char(10) ||
    'Конечно. Вы можете полностью закрыть долг досрочно в любой момент — без каких-либо доплат.',
  content_en =
    '## Who can get installment?' || char(10) ||
    'Anyone over 21 years old can buy a device on installment.' || char(10) ||
    '## What documents are required?' || char(10) ||
    'Just one passport or ID card — no other documents are needed.' || char(10) ||
    '## How much is the down payment?' || char(10) ||
    'The down payment depends on the phone model you choose. Check the exact amount in store or with our operator.' || char(10) ||
    '## How long is the term?' || char(10) ||
    'You choose a convenient term from 3 to 12 months.' || char(10) ||
    '## Is there a penalty for late payment?' || char(10) ||
    'No. We have no riba, fines or penalties — this is halal installment. Even if a payment is late, no extra charge is applied.' || char(10) ||
    '## Do I get the phone right away?' || char(10) ||
    'Yes, the device is handed over immediately. Only until the debt is fully paid, the box is kept in the store and iCloud (Activation Lock) is set on the device. Once paid off, both are fully returned to you.' || char(10) ||
    '## Can I pay it off early?' || char(10) ||
    'Of course. You can fully close the debt early at any time — with no extra fees.',
  content_cyrl =
    '## Муддатли тўловни ким ола олади?' || char(10) ||
    '21 ёшдан катта ҳар бир шахс муддатли тўловга қурилма расмийлаштириши мумкин.' || char(10) ||
    '## Қандай ҳужжат керак?' || char(10) ||
    'Фақат битта паспорт ёки ID карта етарли — бошқа ҳеч қандай ҳужжат талаб қилинмайди.' || char(10) ||
    '## Бошланғич тўлов қанча бўлади?' || char(10) ||
    'Бошланғич тўлов миқдори танлаган телефон моделига қараб фарқ қилади. Аниқ суммани дўконда ёки операторимиз орқали билиб оласиз.' || char(10) ||
    '## Тўлов муддати қанча?' || char(10) ||
    'Муддатни ўзингизга қулай тарзда 3 ойдан 12 ойгача танлайсиз.' || char(10) ||
    '## Тўлов кечикса жарима бўладими?' || char(10) ||
    'Йўқ. Бизда риба, жарима ва пеня йўқ — бу ҳалол муддатли тўлов. Тўлов кечикса ҳам қўшимча тўлов ундирилмайди.' || char(10) ||
    '## Телефонни дарҳол олиб кетаманми?' || char(10) ||
    'Ҳа, қурилма дарҳол сизга берилади. Фақат қарз тўлиқ узилгунича телефон коробкаси дўконда сақланади ва қурилмага iCloud (Activation Lock) ўрнатилади. Тўлов тугагач иккаласи ҳам тўлиқ сизга қайтарилади.' || char(10) ||
    '## Муддатидан олдин тўлаб тугатсам бўладими?' || char(10) ||
    'Албатта. Қарзни исталган вақтда муддатидан олдин тўлиқ ёпишингиз мумкин — ҳеч қандай қўшимча тўловсиз.'
WHERE slug = 'faq';
