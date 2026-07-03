-- Rename the installment-terms page to the short label "Shartlar" (navbar + footer + page heading).
UPDATE pages SET
  title_uz   = 'Shartlar',
  title_ru   = 'Условия',
  title_en   = 'Terms',
  title_cyrl = 'Шартлар'
WHERE slug = 'muddatli-tolov';
