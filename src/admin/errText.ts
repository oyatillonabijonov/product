const MESSAGES: Record<string, string> = {
  imageUrl_required: 'Banner rasmi majburiy',
  link_invalid: "Link '/' yoki 'https://' bilan boshlanishi kerak",
  slug_required: 'Slug majburiy',
  slug_invalid: "Slug faqat kichik lotin harflari, raqam va '-' dan iborat bo'lishi kerak",
  slug_taken: 'Bu slug band — boshqasini tanlang',
  title_uz_required: "Sarlavha (o'zbek lotin) majburiy",
  title_ru_required: 'Sarlavha (rus) majburiy',
  title_en_required: 'Sarlavha (ingliz) majburiy',
  title_uzCyrl_required: 'Sarlavha (kirill) majburiy',
  name_required: 'Nomi majburiy',
  phone_required: 'Telefon majburiy',
  id_taken: 'Bu model allaqachon mavjud',
  brandId_required: 'Brend majburiy',
  categoryId_required: 'Kategoriya majburiy',
  price_positive: "Narx 0 dan katta bo'lishi kerak",
  variant_price_positive: "Variant narxi 0 dan katta bo'lishi kerak",
  category_invalid: "Kategoriya noto'g'ri",
  current_password_required: 'Joriy parolni kiriting',
  invalid_current_password: "Joriy parol noto'g'ri",
  username_too_short: "Login kamida 3 belgidan iborat bo'lishi kerak",
  password_too_short: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak",
  nothing_to_update: "O'zgartirish uchun ma'lumot yo'q",
  not_initialized: "Admin sozlanmagan (migratsiya qo'llanganmi?)",
  too_many_attempts: "Urinishlar ko'payib ketdi — birozdan so'ng qayta urining",
  variant_duplicate: "Bir xil kombinatsiyali ikkita variant bor",
  images_limit: "Rasmlar soni chegaradan oshdi",
  specs_limit: "Xususiyatlar soni chegaradan oshdi",
  options_limit: "Opsiyalar soni chegaradan oshdi",
  option_values_limit: "Opsiya qiymatlari soni chegaradan oshdi",
  variants_limit: "Variantlar soni chegaradan oshdi",
};

export function errText(e: unknown): string {
  const code = e instanceof Error ? e.message : '';
  return MESSAGES[code] ?? (code || 'Xatolik yuz berdi');
}
