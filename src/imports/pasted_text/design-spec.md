Ниже — ТЗ в формате, который удобно напрямую переносить в Figma / First Draft. Я закладываю **desktop 1440 px**, контейнер **1200 px**, 8-пиксельную систему отступов и единый стиль компонентов.

## 0. Общая система

### Frame → `Desktop / 1440`

* Width: **1440 px**
* Height: auto / по содержимому
* Background: **#F7F8F6**
* Основной контентный контейнер:

  * Width: **1200 px**
  * Left/Right margin: **120 px**
  * Max-width: 1200 px
* Основная сетка: **12 columns**

  * Gutter: 24 px
  * Column width: 76 px
* Базовая spacing-система: **8 px**
* Основной текст: **#1F2A24**
* Вторичный текст: #66716B
* Зеленый: **#1F7A53**
* Синий кнопок: **#2F6FED**
* Желтый акцент: **#FFB800**
* Белый: **#FFFFFF**
* Border: **#E2E4DF**
* Border radius:

  * карточки: 16 px
  * кнопки: 10 px
  * поля: 10 px
  * модальные окна: 20 px
* Тени:

  * карточки: `0 4px 16px rgba(31,42,36,0.06)`
  * modal: `0 16px 48px rgba(31,42,36,0.18)`

---

# FRAME 1 — Главная страница

### Frame → `Page / Home / 1440`

---

### Section → `Header`

* Width: 1440 px
* Height: **80 px**
* Background: **#1F7A53**
* Content container: 1200 × 80 px
* Display: horizontal / space-between
* Padding: 0 px

#### Component → `Logo`

* Position: x=120, y=20
* Height: 40 px
* Width: примерно 250 px
* Слева иконка стилизованной **бирюзовой подковы**
* Размер подковы: 36 × 36 px
* Справа от подковы:

  * текст: **«Вам повезло выбрать нас»**
  * font-size: 18 px
  * font-weight: 600
  * color: white
* Logo кликабелен → `Home`

#### Component → `Header Navigation`

* Position: справа
* Height: 40 px
* Gap: 24 px

##### Component → `Link / Расширенный фильтр`

* Text: «Расширенный фильтр»
* 15–16 px
* Color: white
* Click → открывает расширенный поиск / переводит к расширенному фильтру

##### Component → `Language Switcher`

* Width: 70 px
* Height: 36 px
* Text: `RU`
* Chevron-down справа
* Click → dropdown:

  * RU
  * UA
* Выбор языка → переключение языка интерфейса

##### Component → `History Icon`

* 24 × 24 px
* Иконка часов / истории
* Tooltip при hover: «История»
* Click → страница истории заказов

##### Component → `Profile Icon`

* 24 × 24 px
* Иконка пользователя
* Click → `Modal B / Profile`

---

### Section → `Hero / Search`

* Width: 1200 px
* Height: **360 px**
* Position: после header
* Background: #F7F8F6
* Display: flex
* Align-items: center
* Justify-content: center

#### Component → `Search Panel`

* Width: **1040 px**
* Height: **180 px**
* Background: white
* Border: 1 px #E2E4DF
* Radius: 20 px
* Shadow: subtle
* Padding: 32 px

##### Section → `Search Fields Row`

* Display: flex
* Gap: 16 px
* Height: 64 px

##### Component → `Field / Куда`

* Width: 250 px
* Height: 56 px
* Label: «Куда»
* Placeholder: «Страна / город»
* Border: 1 px #E2E4DF
* Radius: 10 px
* Click → dropdown/autocomplete

##### Component → `Field / Дата`

* Width: 180 px
* Height: 56 px
* Label: «Дата»
* Placeholder: «Выберите дату»
* Calendar icon справа
* Click → date picker

##### Component → `Field / Звёзды`

* Width: 180 px
* Height: 56 px
* Label: «Звёзды отеля»
* Dropdown
* Options: 1–5

##### Component → `Field / Люди`

* Width: 180 px
* Height: 56 px
* Label: «Количество человек»
* Stepper / dropdown
* Click → выбор количества

##### Component → `Button / Поиск`

* Width: 170 px
* Height: 56 px
* Background: #2F6FED
* Radius: 10 px
* Text: «Поиск»
* Color: white
* Font-weight: 600
* Click → **Frame 3 / Search Results**
* Передаёт выбранные параметры фильтра

---

### Section → `Hot Tours`

* Width: 1200 px
* Margin-top: 56 px
* Padding-bottom: 64 px

#### Component → `Section Header`

* Height: 40 px
* Left: title
* Right: navigation controls

##### Text

* «Горячие туры»
* Font-size: 28 px
* Weight: 700

##### Component → `Carousel Controls`

* Две кнопки 40 × 40 px
* `<` и `>`
* Border: 1 px #E2E4DF
* Radius: 50%
* Click → горизонтальная прокрутка карточек

#### Component → `Hot Tours Carousel`

* Width: 1200 px
* Overflow: hidden
* Display: horizontal
* Gap: 24 px
* Margin-top: 24 px

#### Component → `Tour Card`

* Width: **282 px**
* Height: **430 px**
* Background: white
* Radius: 16 px
* Border: 1 px #E2E4DF
* Shadow
* Cursor: pointer

##### Component → `Tour Card / Image`

* Width: 280 px
* Height: 190 px
* Object-fit: cover
* Верхние углы: 16 px

##### Component → `Tour Card / Content`

* Padding: 20 px

##### Text → `Hotel Name`

* Font-size: 19 px
* Weight: 700
* Max 2 lines

##### Component → `Stars`

* 5 звёзд максимум
* Active: #FFB800
* Size: 16 px

##### Text → `Tour Info`

* 14–15 px
* Серый/вторичный цвет
* Например: `7 ночей · Турция · All Inclusive`

##### Text → `Price`

* Font-size: 22 px
* Weight: 700
* Например: `от 24 500 ₴`

##### Component → `Button / Забронировать`

* Width: 100%
* Height: 48 px
* Background: #2F6FED
* Radius: 10 px
* Text white
* Click → **Modal A**

**Важно:** click по любой области карточки, кроме кнопки → `Frame 2 / Tour Details`.

---

### Section → `About Agency`

* Width: 1200 px
* Margin-top: 32 px
* Padding: 64 px 0
* Display: grid 7/5
* Gap: 64 px

#### Component → `About Text`

* Width: 680 px

##### Heading

* «О турагенте»
* 28 px / 700

##### Paragraphs

* 16 px
* Line-height: 26 px
* 2–4 коротких абзаца

##### Component → `Viber Link`

* Text: «Написать нам в Viber»
* Color: #2F6FED
* Иконка Viber
* Click → внешний Viber-чат

#### Component → `Reviews Preview`

* Width: 440 px
* 2–3 отзыва
* Каждый отзыв:

  * white card
  * padding 20 px
  * radius 12 px
  * margin-bottom 12 px
  * имя клиента
  * 5 звёзд
  * короткий текст

---

### Section → `Footer`

* Width: 1440 px
* Background: **#1F7A53**
* Padding: 48 px 0 32 px
* Margin-top: 0

#### Container

* Width: 1200 px
* Display: grid 3 columns

##### Component → `Footer Brand`

* Logo
* Слоган
* Color white

##### Component → `Footer Contacts`

* Заголовок: «Контакты»
* Телефоны
* Email
* Каждый телефон — clickable → `tel:...`

##### Component → `Footer Social`

* Заголовок: «Мы в соцсетях»
* Иконки соцсетей
* Каждая кликабельна → соответствующая социальная сеть

##### Bottom Row

* Border-top: 1 px rgba(255,255,255,.2)
* Margin-top: 32 px
* Padding-top: 20 px
* Copyright / служебная информация
* Font-size: 13 px
* Color: rgba(255,255,255,.75)

---

# FRAME 2 — Страница тура

### Frame → `Page / Tour Details / 1440`

---

### Section → `Header`

Полностью идентичен `Home / Header`.

---

### Section → `Tour Hero`

* Container: 1200 px
* Margin-top: 40 px
* Display: grid
* Columns: **2fr 1fr**
* Gap: 40 px

#### Component → `Tour Gallery`

* Width: 760 px
* Height: 480 px
* Radius: 16 px
* Overflow: hidden

##### Main Image

* Width: 100%
* Height: 380 px
* Object-fit: cover

##### Thumbnail Navigation

* Height: 80 px
* Display: horizontal
* Gap: 8 px
* 4–5 thumbnails
* Each: 72 × 64 px
* Active thumbnail: border 2 px #2F6FED

##### Component → `Gallery Arrows`

* 40 × 40 px
* Circular
* Positioned vertically centered
* Click → previous / next image

---

### Component → `Tour Summary`

* Width: 400 px
* Background: white
* Border: 1 px #E2E4DF
* Radius: 16 px
* Padding: 32 px

##### Text → `Hotel Name`

* 30 px
* Weight: 700
* Line-height: 36 px

##### Component → `Stars`

* Margin-top: 12 px
* 5 stars
* Active #FFB800

##### Text → `Short Info`

* Margin-top: 20 px
* 16 px / 26 px
* Destination
* Duration
* Meal plan
* Number of people

##### Text → `Price`

* Margin-top: 24 px
* 32 px
* Weight: 700
* Example: `24 500 ₴`

##### Component → `Button / Забронировать`

* Width: 100%
* Height: 56 px
* Margin-top: 24 px
* Background: #2F6FED
* Click → **Modal A**

---

### Section → `Tour Description`

* Container: 1200 px
* Margin-top: 56 px
* Background: white
* Radius: 16 px
* Padding: 40 px

##### Heading

* «Описание тура»
* 28 px / 700

##### Body

* Max-width: 1000 px
* Font-size: 16 px
* Line-height: 28 px
* Несколько абзацев
* При необходимости подзаголовки / списки

---

### Section → `Tour Reviews`

* Container: 1200 px
* Margin-top: 48 px
* Padding-bottom: 64 px

##### Heading

* «Отзывы»
* 28 px / 700

##### Component → `Reviews Grid`

* 3 колонки
* Gap: 24 px

##### Component → `Review Card`

* Background: white
* Border: 1 px #E2E4DF
* Radius: 14 px
* Padding: 24 px
* Имя
* Дата
* 5 звёзд
* Текст отзыва

---

### Section → `Footer`

Идентичен футеру главной страницы.

---

# FRAME 3 — Результаты поиска

### Frame → `Page / Search Results / 1440`

---

### Section → `Header`

Идентичный Header.

---

### Section → `Search Results`

* Container: 1200 px
* Padding-top: 40 px
* Padding-bottom: 64 px

#### Component → `Results Header`

##### Heading

* «Результаты поиска»
* 28 px / 700

##### Component → `Applied Filters`

* Horizontal chips
* Height: 32 px
* Gap: 8 px
* Например:

  * `Турция ×`
  * `10.09.2026 ×`
  * `4★ ×`
  * `2 человека ×`

---

### Component → `Results List`

* Width: 100%
* Margin-top: 24 px
* Display: vertical
* Gap: 16 px

### Component → `Search Result Card`

* Width: 1200 px
* Height: **190 px**
* Background: white
* Border: 1 px #E2E4DF
* Radius: 16 px
* Padding: 16 px
* Display: flex

#### Component → `Result Image`

* Width: 240 px
* Height: 158 px
* Radius: 12 px
* Object-fit: cover

#### Component → `Result Content`

* Width: remaining
* Padding-left: 24 px

##### Hotel Name

* 21 px
* Weight: 700

##### Stars

* 16 px
* #FFB800

##### Info

* 14–15 px
* 2–3 строки

##### Price

* 22 px
* Weight: 700

#### Component → `Booking Area`

* Width: 160 px
* Align-items: center
* Justify-content: center

##### Button → `Бронь`

* Width: 140 px
* Height: 48 px
* Background: #2F6FED
* Radius: 10 px
* Click → **Modal A**

**Click по всей карточке, кроме кнопки → Frame 2.**

---

### Component → `Pagination`

* Centered
* Margin-top: 32 px
* Buttons 40 × 40 px
* Previous / numbers / next
* Active page: #2F6FED
* Click → соответствующая страница результатов

---

### Section → `Footer`

Идентичен.

---

# MODAL A — Форма заявки

### Frame → `Overlay / Booking Modal`

* Position: fixed
* Width: 1440 px
* Height: viewport
* Background: `rgba(15,25,20,0.55)`
* Display: center center
* Z-index: 100

### Component → `Modal / Booking`

* Width: **520 px**
* Height: примерно **620 px**
* Background: white
* Radius: 20 px
* Padding: 32 px
* Shadow: `0 16px 48px rgba(0,0,0,.18)`

#### Component → `Modal Header`

* Height: 40 px
* Display: flex / space-between

##### Heading

* «Заявка на тур»
* 24 px
* Weight: 700

##### Close

* 24 × 24 px
* `×`
* Click → закрыть modal
* Также закрытие по клику вне окна

---

### Component → `Booking Form`

#### Field → `Тур`

* Width: 100%
* Height: 52 px
* Label: «Тур»
* Value: автоматически подставленное название
* Read-only
* Background: #F7F8F6

#### Field → `Email`

* Height: 52 px
* Label: «Email»
* Placeholder: `Введите email`

#### Field → `Телефон`

* Height: 52 px
* Label: «Телефон»
* Placeholder: `+380...`

#### Field → `Имя`

* Height: 52 px
* Label: «Имя»
* Placeholder: `Введите имя`

#### Component → `Checkbox`

* 20 × 20 px
* Label: **«Создать аккаунт»**
* Default: unchecked
* Click → toggle checked/unchecked

---

### Component → `Contact Options`

* Margin-top: 24 px
* Heading:

  * «Выберите способ связи»
  * 15 px
* Display: vertical
* Gap: 12 px

#### Button → `Связаться через Viber`

* Width: 100%
* Height: 52 px
* Background: #2F6FED
* Text white
* Click → отправляет заявку → **Booking Success State**

#### Button → `Связаться через Telegram`

* Width: 100%
* Height: 52 px
* Background: #2F6FED
* Text white
* Click → отправляет заявку → **Booking Success State**

---

## Component State → `Booking Success`

**Размер modal не меняется.**

### Modal Content

* Center aligned
* Padding: 48 px

#### Component → `Success Icon`

* 56 × 56 px
* Круглая иконка успешной отправки

#### Heading / Message

* **«Ваша заявка отправлена менеджеру, ожидайте обратной связи»**
* 22 px
* Weight: 600
* Line-height: 30 px
* Max-width: 380 px
* Text-align: center

#### Component → `Close`

* 40 × 40 px
* Margin-top: 32 px
* Click → закрывает modal

---

# MODAL B — Профиль пользователя

### Frame → `Overlay / Profile Modal`

* Position: fixed
* 1440 × viewport
* Overlay: `rgba(15,25,20,0.55)`
* Center

### Component → `Modal / Profile`

* Width: **520 px**
* Height: **400 px**
* Background: white
* Radius: 20 px
* Padding: 32 px
* Shadow: как Modal A

---

### Component → `Modal Header`

##### Heading

* «Профиль»
* 24 px / 700

##### Close

* 24 × 24 px
* Click → закрывает modal

---

### Section → `Profile Main`

* Margin-top: 24 px
* Display: flex
* Gap: 32 px

#### Component → `Avatar Column`

##### Avatar

* 120 × 120 px
* Circle
* Background: #F7F8F6
* Placeholder/user image

##### Button → `Редактировать`

* Width: 120 px
* Height: 40 px
* Margin-top: 16 px
* Border: 1 px #E2E4DF
* Background: white
* Text: #1F2A24
* Click → режим редактирования профиля

#### Component → `User Info`

* Flex: 1

##### Label + Value → `Имя`

* Label 13 px
* Value 17 px / 600
* Margin-bottom: 20 px

##### Label + Value → `Email`

* Label 13 px
* Value 17 px
* Margin-bottom: 20 px

##### Label + Value → `Телефон`

* Label 13 px
* Value 17 px

---

### Component → `Delete Account`

* Position: bottom of modal
* Width: 100%
* Height: 48 px
* Background: **#D64545**
* Text: white
* Radius: 10 px
* Text: «Удалить аккаунт»
* Click → confirmation dialog/state перед удалением

---

# ОБЩИЕ COMPONENTS / Figma Library

Рекомендую сразу собрать отдельный Frame:

### Frame → `Components`

#### Header

* `Header / Desktop`
* `Logo`
* `Header Link`
* `Language Dropdown`
* `Icon Button`

#### Search

* `Search Panel`
* `Input / Default`
* `Input / Filled`
* `Input / Focus`
* `Dropdown`
* `Date Picker`
* `Counter`
* `Button / Primary`

#### Tours

* `Tour Card`
* `Tour Card / Hover`
* `Search Result Card`
* `Stars`
* `Price`
* `Carousel Controls`

#### Reviews

* `Review Card`
* `Review Preview Card`

#### Modals

* `Modal / Booking`
* `Modal / Booking Success`
* `Modal / Profile`
* `Modal / Delete Confirmation`

#### Footer

* `Footer / Desktop`

---

# Интерактивные связи для Figma Prototype

| Элемент                  | Действие | Destination               |
| ------------------------ | -------- | ------------------------- |
| Logo                     | Click    | Home                      |
| Расширенный фильтр       | Click    | Advanced Filter           |
| Language                 | Click    | Language Dropdown         |
| History                  | Click    | Order History             |
| Profile                  | Click    | Modal B                   |
| Поиск                    | Click    | Search Results            |
| Карточка горячего тура   | Click    | Tour Details              |
| Забронировать            | Click    | Modal A                   |
| Галерея ← →              | Click    | Следующее/предыдущее фото |
| Бронь                    | Click    | Modal A                   |
| Viber                    | Click    | Viber                     |
| Telegram                 | Click    | Telegram                  |
| Close Modal              | Click    | Close overlay             |
| Viber/Telegram в Modal A | Click    | Booking Success           |
| Редактировать            | Click    | Profile Edit State        |
| Удалить аккаунт          | Click    | Delete Confirmation       |

### Состояния, которые стоит заложить в Figma

* `Button`: Default / Hover / Pressed / Disabled
* `Input`: Default / Focus / Filled / Error
* `Tour Card`: Default / Hover
* `Language`: Closed / Open
* `Carousel`: First / Middle / Last
* `Booking Modal`: Form / Success
* `Profile Modal`: View / Edit
* `Delete Account`: Default / Confirmation
* `Search`: Empty / Filled / Loading / Results / No Results

**Итоговая структура страниц в Figma:**

```text
📁 TOUR AGENCY
│
├── 📄 01 Home
│   ├── Header
│   ├── Hero / Search
│   ├── Hot Tours
│   ├── About Agency
│   └── Footer
│
├── 📄 02 Tour Details
│   ├── Header
│   ├── Tour Gallery + Summary
│   ├── Description
│   ├── Reviews
│   └── Footer
│
├── 📄 03 Search Results
│   ├── Header
│   ├── Results Header
│   ├── Results List
│   ├── Pagination
│   └── Footer
│
├── 📄 04 Modals
│   ├── Booking Modal
│   ├── Booking Success
│   └── Profile Modal
│
└── 📄 05 Components
    ├── Header
    ├── Buttons
    ├── Inputs
    ├── Cards
    ├── Stars
    ├── Modals
    └── Footer
```

Это даст достаточно точную основу для сборки **1440 px desktop wireframe**, при этом компоненты уже разделены так, чтобы их было удобно превращать в Auto Layout + Components + Variants в Figma.
