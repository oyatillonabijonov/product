import type { Dict } from '../dict';
import type uz from '../uz/common';

const common: Dict<typeof uz> = {
  back: 'Назад',
  confirm: 'Подтвердить',
  cancel: 'Отмена',
  retry: 'Повторить',
  sum: 'сум',
  default: 'По умолчанию',
  loading: 'Загрузка…',
  ruHint: 'Если оставить пустым — будет показан узбекский текст',
  shownOnSite: 'Показано на сайте',
  hidden: 'Скрыто',
  unsavedChanges: {
    title: 'Есть несохранённые изменения',
    message: 'При выходе изменения будут потеряны.',
    leave: 'Выйти',
  },
  aria: {
    tabs: 'Вкладки',
    loading: 'Загрузка',
    pagination: 'Страницы',
    prevPage: 'Предыдущая страница',
    nextPage: 'Следующая страница',
  },
  upload: {
    onlyType: 'Разрешено только {{types}}',
    onlyVideo: 'Разрешено только видео MP4',
    onlyImage: 'Разрешено только фото',
    videoTooLarge: 'Видео больше {{size}} МБ — выберите файл поменьше',
    videoFailed: 'Видео не загрузилось',
    imageFailed: 'Фото не загрузилось',
    removeVideo: 'Удалить видео',
    removeImage: 'Удалить фото',
    dropVideo: 'Перетащите видео (MP4) или выберите файл',
    dropImage: 'Перетащите фото или выберите файл',
  },
  markdownHelp: {
    toggle: 'Как форматировать текст',
    note: 'Строки подряд образуют один абзац; новый абзац — пустая строка.',
    heading: 'Заголовок раздела',
    subheading: 'Подзаголовок',
    list: 'Список',
    orderedList: 'Нумерованный список (после числа точка и пробел)',
    bold: 'Жирный текст',
    link: 'Ссылка — с / или https://',
    sample: {
      heading: '## Заголовок',
      subheading: '### Подзаголовок',
      list: '- Пункт',
      orderedList: '1. Пункт',
      bold: '**жирный**',
      link: '[текст](/katalog)',
    },
  },
};

export default common;
