import type { Dict } from '../dict';
import type uz from '../uz/shell';

const shell: Dict<typeof uz> = {
  brand: 'Admin',
  nav: {
    aria: 'Разделы',
    expand: '{{name}} — развернуть',
    collapse: '{{name}} — свернуть',
    home: { label: 'Главная', short: 'Главная' },
    products: { label: 'Товары', short: 'Товары', list: 'Товары', types: 'Типы', categories: 'Категории', brands: 'Бренды', models: 'Модели' },
    orders: { label: 'Заказы', short: 'Заказы', list: 'Заказы', applications: 'Отклики', announcements: 'Объявления' },
    content: { label: 'Контент', short: 'Контент', home: 'Главная', banners: 'Баннеры', news: 'Новости', posts: 'Блог', pages: 'Страницы', vacancies: 'Вакансии' },
    settings: { label: 'Настройки', short: 'Настройки', store: 'Магазин', contact: 'Контакты', payment: 'Оплата и курс', integrations: 'Интеграции', seo: 'SEO', account: 'Аккаунт' },
  },
  footer: {
    openSite: 'Открыть сайт',
    darkTheme: 'Тёмная тема',
    language: 'Язык',
    logout: 'Выйти',
  },
  login: {
    title: 'Админ-панель',
    usernameLabel: 'Логин',
    passwordLabel: 'Пароль',
    submit: 'Войти',
    submitting: 'Вход…',
    or: 'или',
    google: 'Войти через Google',
    tooManyAttempts: 'Слишком много попыток — попробуйте позже',
    invalidCredentials: 'Неверный логин или пароль',
    errors: {
      googleDenied: 'Этот аккаунт Google не имеет доступа администратора.',
      googleOff: 'Вход через Google не настроен.',
      state: 'Сессия истекла — попробуйте снова.',
      google: 'Ошибка входа через Google.',
    },
  },
  dashboard: {
    defaultPassword: '<b>Внимание:</b> пароль до сих пор стандартный «admin» — им может воспользоваться кто угодно. Смените его прямо сейчас.',
    changePassword: 'Сменить пароль',
    loadErrorTitle: 'Данные не загрузились',
    loadErrorText: 'Нет связи с интернетом или сервером — попробуйте ещё раз.',
    needsImage: {
      label: 'Товары без фото',
      note: 'Нет фото — поэтому не отображаются на сайте. Появятся сами, как только будет добавлено фото.',
      zero: 'У всех товаров есть фото.',
      action: 'Открыть список',
    },
    newOrders: {
      label: 'Заказы, ожидающие ответа',
      note: 'Клиент оставил заказ, звонок ещё не сделан.',
      zero: 'Нет заказов без ответа.',
      action: 'Перейти к заказам',
    },
    newApplications: {
      label: 'Отклики, ожидающие ответа',
      note: 'Кандидат откликнулся на вакансию, отклик ещё не просмотрен.',
      zero: 'Новых откликов нет.',
      action: 'Перейти к откликам',
    },
    billz: {
      title: 'Получение товаров из Billz',
      description: 'Сайт сам получает данные из Billz каждые 30 минут. Чтобы увидеть новый товар сразу — «Обновить».',
      refresh: 'Обновить',
      syncStarted: 'Синхронизация запущена',
    },
    usd: {
      title: 'Курс доллара',
      autoNote: 'Курс Центробанка + ваша наценка; обновляется каждые 6 часов.',
      manualNote: 'Введён вручную — не обновляется сам; если курс доллара изменится, цены устареют.',
      change: 'Изменить',
    },
  },
};

export default shell;
