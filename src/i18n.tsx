import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

// ─── Мова інтерфейсу ──────────────────────────────────────────────────────────
// Перемикач суто фронтовий: бекенд нічого не знає про мову, дані з API
// (назви турів, країн, статуси заявок) приходять як є і не перекладаються.
export type Lang = "uk" | "ru";

const STORAGE_KEY = "app.lang";

export const LOCALE: Record<Lang, string> = { uk: "uk-UA", ru: "ru-RU" };
// Те, що показуємо в кнопці хедера.
export const LANG_LABEL: Record<Lang, string> = { uk: "UA", ru: "RU" };
export const LANGS: Lang[] = ["uk", "ru"];

// ─── Словник ──────────────────────────────────────────────────────────────────
// Ключі однакові для обох мов; {змінні} підставляються через другий аргумент t().
const uk = {
  // Загальне
  "common.book": "Забронювати",
  "common.close": "Закрити",
  "common.cancel": "Скасувати",
  "common.email": "Email",
  "common.phone": "Телефон",
  "common.name": "Ім'я",
  "common.any.f": "Будь-яка",
  "common.any.m": "Будь-який",
  "common.any.n": "Будь-яке",
  "common.any.pl": "Будь-які",
  "common.loadingTours": "Завантаження турів…",
  "common.loadingReviews": "Завантаження відгуків…",
  "common.tourMeta": "{nights} ночей · {country} · {meal}",

  // Хедер
  "header.logoAlt": "Логотип",
  "header.brand": "На головну",
  "header.advancedFilter": "Розширений фільтр",
  "header.history": "Історія",
  "header.loginRegister": "Увійти / Зареєструватися",
  "header.langAria": "Мова інтерфейсу",

  // Головний екран
  "hero.title": "Знайдіть свій ідеальний відпочинок",
  "hero.where": "Куди",
  "hero.wherePlaceholder": "Країна",
  "hero.date": "Дата (для заявки)",
  "hero.stars": "Зірки готелю",
  "hero.people": "Кількість осіб",
  "hero.search": "Пошук",
  "hero.advancedSearch": "Розширений пошук →",

  // Розширений фільтр
  "filters.title": "Розширений пошук",
  "filters.destination": "Готель / напрямок",
  "filters.destinationPlaceholder": "Назва готелю або країна",
  "filters.country": "Країна",
  "filters.departureCity": "Місто вильоту",
  "filters.goalCity": "Курорт / місто",
  "filters.resort": "Курортна зона",
  "filters.operator": "Туроператор",
  "filters.meal": "Харчування",
  "filters.dateFrom": "Дата вильоту з (для заявки)",
  "filters.dateTo": "Дата вильоту по (для заявки)",
  "filters.dateToHint": "Рахується автоматично за кількістю ночей — можна поправити вручну",
  "filters.nightsFrom": "Ночей від",
  "filters.nightsTo": "Ночей до",
  "filters.priceFrom": "Ціна від",
  "filters.priceTo": "Ціна до",
  "filters.currency": "Валюта",
  "filters.stars": "Зірки готелю",
  "filters.starsAndUp": "{n}★ і вище",
  "filters.people": "Кількість осіб",
  "filters.withChildren": "Подорож із дітьми",
  "filters.hotOnly": "Тільки гарячі тури 🔥",
  "filters.submit": "Знайти тури",
  "filters.reset": "Скинути фільтри",

  // Валюти
  "currency.uah": "Гривня (₴)",
  "currency.usd": "Долар ($)",
  "currency.eur": "Євро (€)",

  // Чіпи активних фільтрів
  "chip.country": "Країна",
  "chip.departure": "Виліт",
  "chip.departureWith": "Виліт: {name}",
  "chip.goalCity": "Курорт",
  "chip.operator": "Оператор",
  "chip.forRequest": " (для заявки)",
  "chip.starsAndUp": "{n}★ і вище",
  "chip.nights": "{from}–{to} ночей",
  "chip.adults": "{n} особи",
  "chip.children": "З дітьми",
  "chip.hot": "Гарячі 🔥",

  // Мої заявки
  "history.loading": "Завантаження…",
  "history.title": "Мої заявки",
  "history.empty": "Заявок ще немає.",
  "history.tourDeleted": "Тур видалено",

  // Гарячі тури
  "hot.title": "Гарячі тури",
  "hot.empty": "Гарячих турів поки немає.",

  // Про нас
  "about.title": "Про турагента",
  "about.p1":
    "Ми — команда досвідчених фахівців із туристичного бізнесу з понад 12-річним досвідом роботи на ринку. Щороку ми допомагаємо тисячам сімей та пар здійснити мрію про ідеальну відпустку.",
  "about.p2":
    "Наш підхід простий: глибоке знання напрямків, чесні ціни та особистий супровід на кожному етапі — від вибору готелю до повернення додому.",
  "about.p3":
    "Ми співпрацюємо лише з перевіреними операторами та готелями, щоб ваша подорож була безтурботною та незабутньою.",
  "about.viber": "Написати нам у Viber",
  "about.reviewsEmpty": "Незабаром тут з'являться відгуки наших клієнтів.",

  // Футер
  "footer.brand": "Вам пощастило обрати нас",
  "footer.tagline": "Ваш надійний партнер у світі подорожей. Організовуємо незабутній відпочинок з 2012 року.",
  "footer.contacts": "Контакти",
  "footer.social": "Ми в соцмережах",
  "footer.copyright": "© 2026 Турагентство «Вам повезло». Всі права захищені.",
  "footer.made": "Розроблено з ♥ для мандрівників",

  // Заявка на тур
  "booking.title": "Заявка на тур",
  "booking.tour": "Тур",
  "booking.departureDate": "Дата вильоту",
  "booking.returnDate": "Дата повернення",
  "booking.returnDateNights": "Дата повернення ({n} ноч.)",
  "booking.pickDeparture": "оберіть дату вильоту",
  "booking.emailPlaceholder": "Введіть email",
  "booking.namePlaceholder": "Введіть ім'я",
  "booking.missingFields": "Заповніть email, телефон та ім'я, щоб продовжити.",
  "booking.contactQuestion": "Як з вами краще зв'язатися?",
  "booking.submitting": "Відправка…",
  "booking.submit": "Надіслати заявку",
  "booking.error": "Не вдалося відправити заявку. Спробуйте ще раз.",
  "booking.successTitle": "Вашу заявку надіслано менеджеру, очікуйте зворотного зв'язку",

  // Вхід / реєстрація
  "auth.login": "Вхід",
  "auth.register": "Реєстрація",
  "auth.password": "Пароль",
  "auth.passwordPlaceholder": "Введіть пароль",
  "auth.wait": "Зачекайте…",
  "auth.loginBtn": "Увійти",
  "auth.registerBtn": "Зареєструватися",
  "auth.noAccount": "Немає акаунту?",
  "auth.haveAccount": "Вже є акаунт?",
  "auth.error": "Помилка. Перевірте дані.",
  "auth.noConnection": "Немає з'єднання з сервером.",

  // Профіль
  "profile.title": "Профіль",
  "profile.deleteTitle": "Видалити акаунт?",
  "profile.deleteText": "Ця дія незворотна. Усі ваші дані будуть видалені.",
  "profile.deleteConfirm": "Так, видалити",
  "profile.changePhoto": "Змінити фото",
  "profile.removePhoto": "Прибрати фото",
  "profile.notSet": "— не вказано —",
  "profile.saving": "Збереження…",
  "profile.save": "Зберегти",
  "profile.edit": "Редагувати",
  "profile.logout": "Вийти",
  "profile.admin": "Панель адміністратора",
  "profile.delete": "Видалити акаунт",

  // Результати пошуку
  "results.title": "Результати пошуку",
  "results.advanced": "Розширені параметри",
  "results.found": "Знайдено турів: {n}",
  "results.empty": "За вашим запитом нічого не знайдено.",

  // Сторінка туру
  "tour.loading": "Завантаження туру…",
  "tour.notFound": "Тур не знайдено.",
  "tour.nights": "{n} ночей",
  "tour.descTitle": "Опис туру",
  "tour.descEmpty": "Опис готелю поки не додано менеджером.",
  "tour.reviews": "Відгуки",
  "tour.reviewsEmpty": "Відгуків поки немає. Будьте першим!",

  // Форма відгуку
  "review.formTitle": "Залишити відгук",
  "review.needAuth": "Щоб залишити відгук, увійдіть у свій акаунт.",
  "review.thanks": "Дякуємо! Ваш відгук з'явиться на сторінці після модерації.",
  "review.rating": "Оцінка",
  "review.yourReview": "Ваш відгук",
  "review.placeholder": "Поділіться враженнями від туру…",
  "review.submitting": "Відправка…",
  "review.submit": "Надіслати відгук",
  "review.error": "Не вдалося надіслати відгук. Спробуйте ще раз.",
  "review.starsAria": "{n} з 5",

  // Помилки завантаження
  "app.toursError":
    "Не вдалося завантажити тури. Перевір, чи запущений бекенд (python manage.py runserver) і чи вказаний правильний VITE_API_URL.",
};

const ru: Record<keyof typeof uk, string> = {
  // Общее
  "common.book": "Забронировать",
  "common.close": "Закрыть",
  "common.cancel": "Отменить",
  "common.email": "Email",
  "common.phone": "Телефон",
  "common.name": "Имя",
  "common.any.f": "Любая",
  "common.any.m": "Любой",
  "common.any.n": "Любое",
  "common.any.pl": "Любые",
  "common.loadingTours": "Загрузка туров…",
  "common.loadingReviews": "Загрузка отзывов…",
  "common.tourMeta": "{nights} ночей · {country} · {meal}",

  // Хедер
  "header.logoAlt": "Логотип",
  "header.brand": "На главную",
  "header.advancedFilter": "Расширенный фильтр",
  "header.history": "История",
  "header.loginRegister": "Войти / Зарегистрироваться",
  "header.langAria": "Язык интерфейса",

  // Главный экран
  "hero.title": "Найдите свой идеальный отдых",
  "hero.where": "Куда",
  "hero.wherePlaceholder": "Страна",
  "hero.date": "Дата (для заявки)",
  "hero.stars": "Звёзды отеля",
  "hero.people": "Количество человек",
  "hero.search": "Поиск",
  "hero.advancedSearch": "Расширенный поиск →",

  // Расширенный фильтр
  "filters.title": "Расширенный поиск",
  "filters.destination": "Отель / направление",
  "filters.destinationPlaceholder": "Название отеля или страна",
  "filters.country": "Страна",
  "filters.departureCity": "Город вылета",
  "filters.goalCity": "Курорт / город",
  "filters.resort": "Курортная зона",
  "filters.operator": "Туроператор",
  "filters.meal": "Питание",
  "filters.dateFrom": "Дата вылета с (для заявки)",
  "filters.dateTo": "Дата вылета по (для заявки)",
  "filters.dateToHint": "Считается автоматически по количеству ночей — можно поправить вручную",
  "filters.nightsFrom": "Ночей от",
  "filters.nightsTo": "Ночей до",
  "filters.priceFrom": "Цена от",
  "filters.priceTo": "Цена до",
  "filters.currency": "Валюта",
  "filters.stars": "Звёзды отеля",
  "filters.starsAndUp": "{n}★ и выше",
  "filters.people": "Количество человек",
  "filters.withChildren": "Путешествие с детьми",
  "filters.hotOnly": "Только горящие туры 🔥",
  "filters.submit": "Найти туры",
  "filters.reset": "Сбросить фильтры",

  // Валюты
  "currency.uah": "Гривна (₴)",
  "currency.usd": "Доллар ($)",
  "currency.eur": "Евро (€)",

  // Чипы активных фильтров
  "chip.country": "Страна",
  "chip.departure": "Вылет",
  "chip.departureWith": "Вылет: {name}",
  "chip.goalCity": "Курорт",
  "chip.operator": "Оператор",
  "chip.forRequest": " (для заявки)",
  "chip.starsAndUp": "{n}★ и выше",
  "chip.nights": "{from}–{to} ночей",
  "chip.adults": "{n} человека",
  "chip.children": "С детьми",
  "chip.hot": "Горящие 🔥",

  // Мои заявки
  "history.loading": "Загрузка…",
  "history.title": "Мои заявки",
  "history.empty": "Заявок пока нет.",
  "history.tourDeleted": "Тур удалён",

  // Горящие туры
  "hot.title": "Горящие туры",
  "hot.empty": "Горящих туров пока нет.",

  // О нас
  "about.title": "О турагенте",
  "about.p1":
    "Мы — команда опытных специалистов в туристическом бизнесе с более чем 12-летним опытом работы на рынке. Каждый год мы помогаем тысячам семей и пар осуществить мечту об идеальном отпуске.",
  "about.p2":
    "Наш подход прост: глубокое знание направлений, честные цены и личное сопровождение на каждом этапе — от выбора отеля до возвращения домой.",
  "about.p3":
    "Мы работаем только с проверенными операторами и отелями, чтобы ваше путешествие было беззаботным и незабываемым.",
  "about.viber": "Написать нам в Viber",
  "about.reviewsEmpty": "Скоро здесь появятся отзывы наших клиентов.",

  // Футер
  "footer.brand": "Вам повезло выбрать нас",
  "footer.tagline": "Ваш надёжный партнёр в мире путешествий. Организуем незабываемый отдых с 2012 года.",
  "footer.contacts": "Контакты",
  "footer.social": "Мы в соцсетях",
  "footer.copyright": "© 2026 Турагентство «Вам повезло». Все права защищены.",
  "footer.made": "Разработано с ♥ для путешественников",

  // Заявка на тур
  "booking.title": "Заявка на тур",
  "booking.tour": "Тур",
  "booking.departureDate": "Дата вылета",
  "booking.returnDate": "Дата возвращения",
  "booking.returnDateNights": "Дата возвращения ({n} ноч.)",
  "booking.pickDeparture": "выберите дату вылета",
  "booking.emailPlaceholder": "Введите email",
  "booking.namePlaceholder": "Введите имя",
  "booking.missingFields": "Заполните email, телефон и имя, чтобы продолжить.",
  "booking.contactQuestion": "Как с вами лучше связаться?",
  "booking.submitting": "Отправка…",
  "booking.submit": "Отправить заявку",
  "booking.error": "Не удалось отправить заявку. Попробуйте ещё раз.",
  "booking.successTitle": "Ваша заявка отправлена менеджеру, ожидайте обратной связи",

  // Вход / регистрация
  "auth.login": "Вход",
  "auth.register": "Регистрация",
  "auth.password": "Пароль",
  "auth.passwordPlaceholder": "Введите пароль",
  "auth.wait": "Подождите…",
  "auth.loginBtn": "Войти",
  "auth.registerBtn": "Зарегистрироваться",
  "auth.noAccount": "Нет аккаунта?",
  "auth.haveAccount": "Уже есть аккаунт?",
  "auth.error": "Ошибка. Проверьте данные.",
  "auth.noConnection": "Нет соединения с сервером.",

  // Профиль
  "profile.title": "Профиль",
  "profile.deleteTitle": "Удалить аккаунт?",
  "profile.deleteText": "Это действие необратимо. Все ваши данные будут удалены.",
  "profile.deleteConfirm": "Да, удалить",
  "profile.changePhoto": "Изменить фото",
  "profile.removePhoto": "Убрать фото",
  "profile.notSet": "— не указано —",
  "profile.saving": "Сохранение…",
  "profile.save": "Сохранить",
  "profile.edit": "Редактировать",
  "profile.logout": "Выйти",
  "profile.admin": "Панель администратора",
  "profile.delete": "Удалить аккаунт",

  // Результаты поиска
  "results.title": "Результаты поиска",
  "results.advanced": "Расширенные параметры",
  "results.found": "Найдено туров: {n}",
  "results.empty": "По вашему запросу ничего не найдено.",

  // Страница тура
  "tour.loading": "Загрузка тура…",
  "tour.notFound": "Тур не найден.",
  "tour.nights": "{n} ночей",
  "tour.descTitle": "Описание тура",
  "tour.descEmpty": "Описание отеля пока не добавлено менеджером.",
  "tour.reviews": "Отзывы",
  "tour.reviewsEmpty": "Отзывов пока нет. Будьте первым!",

  // Форма отзыва
  "review.formTitle": "Оставить отзыв",
  "review.needAuth": "Чтобы оставить отзыв, войдите в свой аккаунт.",
  "review.thanks": "Спасибо! Ваш отзыв появится на странице после модерации.",
  "review.rating": "Оценка",
  "review.yourReview": "Ваш отзыв",
  "review.placeholder": "Поделитесь впечатлениями от тура…",
  "review.submitting": "Отправка…",
  "review.submit": "Отправить отзыв",
  "review.error": "Не удалось отправить отзыв. Попробуйте ещё раз.",
  "review.starsAria": "{n} из 5",

  // Ошибки загрузки
  "app.toursError":
    "Не удалось загрузить туры. Проверь, запущен ли бекенд (python manage.py runserver) и указан ли правильный VITE_API_URL.",
};

export const DICT: Record<Lang, Record<string, string>> = { uk, ru };

export type TKey = keyof typeof uk;
export type TFunc = (key: TKey, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  if (typeof window === "undefined") return "uk";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "uk" || saved === "ru") return saved;
  const nav = window.navigator.language?.toLowerCase() ?? "";
  return nav.startsWith("ru") ? "ru" : "uk";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);

  // Запам'ятовуємо вибір, щоб він жив між перезавантаженнями сторінки,
  // і одразу правимо <html lang> — це важливо для скрінрідерів і SEO.
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = LOCALE[lang];
  }, [lang]);

  const value = useMemo<I18nValue>(() => {
    const t: TFunc = (key, vars) => {
      let str = DICT[lang][key] ?? DICT.uk[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.split(`{${k}}`).join(String(v));
        }
      }
      return str;
    };
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n() використано поза <I18nProvider>");
  return ctx;
}
