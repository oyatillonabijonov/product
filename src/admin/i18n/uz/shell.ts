/** Qobiq: menyu, sidebar pasti, bosh sahifa, kirish sahifasi. */
const shell = {
  brand: 'Admin',
  nav: {
    aria: "Bo'limlar",
    expand: '{{name}} — ochish',
    collapse: '{{name}} — yopish',
    home: { label: 'Bosh sahifa', short: 'Asosiy' },
    products: { label: 'Mahsulotlar', short: 'Tovarlar', list: 'Mahsulotlar', types: 'Turlar', categories: 'Kategoriyalar', brands: 'Brendlar', models: 'Modellar' },
    orders: { label: 'Buyurtmalar', short: 'Buyurtma', list: 'Buyurtmalar', customers: 'Mijozlar', applications: 'Ish arizalari', announcements: "E'lonlar" },
    content: { label: 'Kontent', short: 'Kontent', home: 'Bosh sahifa', banners: 'Bannerlar', news: 'Yangiliklar', posts: 'Blog', pages: 'Sahifalar', vacancies: 'Vakansiyalar' },
    settings: { label: 'Sozlamalar', short: 'Sozlash', store: "Do'kon", contact: 'Aloqa', payment: "To'lov va kurs", integrations: 'Integratsiyalar', seo: 'SEO', account: 'Akkaunt' },
  },
  footer: {
    openSite: 'Saytni ochish',
    darkTheme: "Qorong'i mavzu",
    language: 'Til',
    logout: 'Chiqish',
  },
  login: {
    title: 'Admin panel',
    usernameLabel: 'Login',
    passwordLabel: 'Parol',
    submit: 'Kirish',
    submitting: 'Kirilmoqda…',
    or: 'yoki',
    google: 'Google bilan kirish',
    tooManyAttempts: "Urinishlar ko'payib ketdi — birozdan so'ng qayta urining",
    invalidCredentials: "Login yoki parol noto'g'ri",
    errors: {
      googleDenied: 'Bu Google akkaunt admin sifatida ruxsat etilmagan.',
      googleOff: 'Google kirishi sozlanmagan.',
      state: 'Sessiya muddati tugadi — qayta urining.',
      google: 'Google kirishida xatolik yuz berdi.',
    },
  },
  dashboard: {
    defaultPassword: "<b>Diqqat:</b> parol hali standart «admin» — bu paneldan har kim foydalana oladi. Hoziroq o'zgartiring.",
    changePassword: "Parolni o'zgartirish",
    loadErrorTitle: "Ma'lumot yuklanmadi",
    loadErrorText: "Internet yoki server bilan aloqa yo'q — qayta urinib ko'ring.",
    needsImage: {
      label: 'Rasm kutayotgan tovarlar',
      note: "Rasmi yo'q — shuning uchun saytda ko'rinmayapti. Rasm qo'yilishi bilan o'zi chiqadi.",
      zero: 'Hammasining rasmi bor.',
      action: "Ro'yxatni ochish",
    },
    newOrders: {
      label: 'Javob kutayotgan buyurtmalar',
      note: "Mijoz buyurtma qoldirgan, hali qo'ng'iroq qilinmagan.",
      zero: "Javobsiz buyurtma yo'q.",
      action: "Buyurtmalarga o'tish",
    },
    newApplications: {
      label: 'Javob kutayotgan ish arizalari',
      note: "Vakansiyaga nomzod ariza yuborgan, hali ko'rilmagan.",
      zero: "Yangi ariza yo'q.",
      action: "Arizalarga o'tish",
    },
    billz: {
      title: "Billz'dan tovarlarni olish",
      description: "Sayt Billz'dan har 30 daqiqada o'zi oladi. Yangi tovarni darhol ko'rmoqchi bo'lsangiz — «Yangilash».",
      refresh: 'Yangilash',
      syncStarted: 'Sinxronizatsiya boshlandi',
    },
    usd: {
      title: 'Dollar kursi',
      autoNote: "Markaziy bank kursi + ustamangiz; har 6 soatda o'zi yangilanadi.",
      manualNote: "Qo'lda kiritilgan — o'zi yangilanmaydi, dollar o'zgarsa narxlar eskirib qoladi.",
      change: "O'zgartirish",
    },
  },
} as const;

export default shell;
