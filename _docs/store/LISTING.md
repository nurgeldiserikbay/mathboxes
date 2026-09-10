# Карточка Google Play — единый источник

Всё, что уходит в консоль, лежит здесь. Правится этот файл, потом копируется в
Play Console. Картинки — рядом, в этой же папке.

| Что | Файл | Требование Play |
|---|---|---|
| Иконка | `icon-512.png` | 512×512, PNG, 32-бит |
| Исходник иконки | `icon.svg` | правится он, PNG пересобирается скриптом |
| Графика функции | `feature-graphic-1024x500.png` | 1024×500, PNG или JPEG |
| Скриншоты телефона | `screenshots/phone/` | 1080×1920, PNG, от 2 до 8 штук |
| Скриншоты 7" планшета | `screenshots/tablet7/` | 1200×1920, PNG |
| Скриншоты 10" планшета | `screenshots/tablet10/` | 1600×2560, PNG |

Пересобрать иконки и графику функции (обновляет и лаунчер-иконки Android, и
иконки PWA):

```
node _docs/store/make-icons.mjs
```

Переснять скриншоты — все три формата сразу (нужен запущенный `vite preview` на
порту 4217):

```
node node_modules/vite/bin/vite.js preview --port 4217
node _docs/store/make-screenshots.mjs
```

Скрипт сам играет правильно, вычисляя ответы из разметки, поэтому на кадрах
живая партия, а не первый вопрос.

---

## Иконка

Старая иконка была из прежнего оформления: неоновые градиенты, розовый и
бирюзовый. Приложение с тех пор стало светлым и приглушённым, и иконка перестала
совпадать с тем, что игрок видит после установки.

Новая — четыре изометрические коробки со знаками `+ − × ÷` в тех же четырёх
тонах, что и операции в игре (`#b3705a`, `#4f8f8a`, `#7b7bb5`, `#5f9169`), на
светлом фоне. Коробка это и название, и главный объект на экране.

Собираются: `mipmap-*/ic_launcher.png`, `ic_launcher_round.png`,
`ic_launcher_foreground.png` (с запасом под обрезку адаптивной иконки),
`ic_launcher_background.png`, весь набор `public/icons/*`, плюс `icon-512.png`
для консоли.

---

## Тексты

**Язык в самой игре.** Приложение открывается на языке устройства, если он один
из шести; во всех остальных случаях — на английском. Язык меняется в настройках
и запоминается. Скриншоты для витрины сняты на английском (`LANG` в начале
`make-screenshots.mjs`).

Правило по ключам: они должны стоять в живых фразах. Play ранжирует и по
названию, и по короткому, и по полному описанию, но набор слов через запятую
снижает конверсию, а конверсия — тоже фактор ранжирования.

### English — язык карточки по умолчанию

Play показывает этот текст всем, у кого нет карточки на их языке, поэтому в
консоли основным языком должен стоять **English (United States)**, а остальные
пять — переводами.

**Title** (30)

```
Math Boxes: Mental Math
```

**Short description** (80)

```
Mental math drills: add, multiply, divide, powers and roots. Works offline.
```

**Full description**

```
Math Boxes is a mental math trainer. Solve an equation against the clock and
pick the right answer out of four boxes. One tap and you are playing — no
sign-up, no settings, no internet needed.

ONE CHAIN

Every answer starts the next equation: 2 − 1 = 1 + 9 = 10 × 3 = ?
No modes to pick, no settings — one tap and the chain begins.

SEVEN OPERATIONS

Addition, subtraction, multiplication, division, exponents, square roots and
logarithms. It opens on single-digit sums and unlocks new operations as you are
ready for them.

DIFFICULTY THAT FOLLOWS YOU

Sixteen steps. Answer quickly and the numbers grow; slip and the game steps back
with you. No level picker — it finds your edge and stays next to it.

ALSO

• A timer on every equation, counted in tenths
• A combo multiplier for a run of correct answers
• A record for every mode and every operation
• Works offline
• Six languages: English, Russian, Kazakh, German, French, Spanish

For a pupil drilling the times tables and for an adult who wants their mental
arithmetic back. Five minutes a day changes how fast you count without a
calculator.
```

### Русский

**Название** (30 знаков)

```
Math Boxes: устный счёт
```

**Краткое описание** (80 знаков)

```
Тренажёр устного счёта: сложение, умножение, степени и корни. Без интернета.
```

**Полное описание**

```
Math Boxes — тренажёр устного счёта, в котором нужно решать примеры на скорость
и выбирать верный ответ из четырёх коробок. Одно нажатие — и вы уже играете:
ни регистрации, ни настроек, ни интернета.

ОДНА ЦЕПОЧКА

Ответ становится началом следующего примера: 2 − 1 = 1 + 9 = 10 × 3 = ?
Никаких режимов и настроек — одно нажатие, и цепочка пошла.

СЕМЬ ОПЕРАЦИЙ

Сложение, вычитание, умножение, деление, возведение в степень, квадратный корень
и логарифм. Начинается всё с однозначных примеров, а новые действия открываются
по мере того, как вы к ним готовы.

СЛОЖНОСТЬ ПОДСТРАИВАЕТСЯ

Шестнадцать ступеней. Отвечаете быстро — примеры растут, ошибаетесь — игра
отступает на шаг назад. Никакого выбора уровня вручную: игра сама находит вашу
границу и держится рядом с ней.

ЧТО ЕЩЁ

• Таймер на каждый пример — счёт идёт на десятые
• Комбо-множитель за серию верных ответов
• Рекорд для каждого режима и каждой операции
• Работает без интернета
• Шесть языков: русский, английский, казахский, немецкий, французский,
  испанский

Подходит и школьнику, который отрабатывает таблицу умножения, и взрослому,
которому нужно вернуть скорость счёта в уме. Пять минут в день заметно меняют
то, как быстро вы считаете без калькулятора.
```

### Қазақша

**Атауы**

```
Math Boxes: ауызша есеп
```

**Қысқаша сипаттама**

```
Ауызша есептеу жаттықтырғышы: қосу, көбейту, бөлу, дәреже. Интернетсіз.
```

**Толық сипаттама**

```
Math Boxes — ауызша есептеу жаттықтырғышы. Мысалды уақытпен жарысып шығарасыз
да, төрт қорапшаның ішінен дұрысын таңдайсыз. Бір рет басасыз — ойын басталды:
тіркелу де, баптау да, интернет те қажет емес.

БІР ТІЗБЕК

Жауап келесі мысалдың басы болады: 2 − 1 = 1 + 9 = 10 × 3 = ?
Режим таңдаудың қажеті жоқ — бір басасыз да, тізбек басталады.

ЖЕТІ АМАЛ

Қосу, азайту, көбейту, бөлу, дәрежелеу, квадрат түбір және логарифм. Бәрі бір
таңбалы сандардан басталады, жаңа амалдар сіз дайын болған сайын ашылады.

КҮРДЕЛІЛІК ӨЗІ БЕЙІМДЕЛЕДІ

Он алты саты. Жылдам жауап берсеңіз — сандар өседі, қателессеңіз — ойын бір
қадам артқа шегінеді. Деңгейді қолмен таңдау жоқ.

ТАҒЫ НЕ БАР

• Әр мысалға таймер
• Дұрыс жауаптар қатары үшін комбо-көбейткіш
• Әр режим мен әр амалға рекорд
• Интернетсіз жұмыс істейді
• Алты тіл
```

### Deutsch

**Titel**

```
Math Boxes: Kopfrechnen
```

**Kurzbeschreibung**

```
Kopfrechnen üben: Addieren, Multiplizieren, Dividieren, Potenzen. Offline.
```

**Vollständige Beschreibung**

```
Math Boxes ist ein Trainer fürs Kopfrechnen. Löse eine Aufgabe gegen die Uhr und
wähle die richtige Antwort aus vier Kisten. Ein Tippen und du spielst — keine
Anmeldung, keine Einstellungen, kein Internet nötig.

EINE KETTE

Jede Antwort beginnt die nächste Aufgabe: 2 − 1 = 1 + 9 = 10 × 3 = ?
Keine Modi, keine Einstellungen — ein Tippen und die Kette läuft.

SIEBEN RECHENARTEN

Addition, Subtraktion, Multiplikation, Division, Potenzen, Quadratwurzeln und
Logarithmen. Es beginnt einstellig, neue Rechenarten kommen dazu, sobald du so
weit bist.

SCHWIERIGKEIT, DIE MITWÄCHST

Sechzehn Stufen. Schnelle Antworten lassen die Zahlen wachsen, ein Fehler nimmt
einen Schritt zurück. Keine Levelauswahl von Hand.

AUSSERDEM

• Ein Timer für jede Aufgabe
• Combo-Multiplikator für eine Serie richtiger Antworten
• Ein Rekord pro Modus und pro Rechenart
• Funktioniert offline
• Sechs Sprachen
```

### Français

**Titre**

```
Math Boxes : calcul mental
```

**Description courte**

```
Calcul mental : addition, multiplication, division, puissances. Hors ligne.
```

**Description complète**

```
Math Boxes est un entraîneur de calcul mental. Résolvez une équation contre la
montre et choisissez la bonne réponse parmi quatre boîtes. Une pression et vous
jouez : sans inscription, sans réglages, sans connexion.

UNE CHAÎNE

Chaque réponse commence l'équation suivante : 2 − 1 = 1 + 9 = 10 × 3 = ?
Pas de modes, pas de réglages — une pression et la chaîne démarre.

SEPT OPÉRATIONS

Addition, soustraction, multiplication, division, puissances, racines carrées et
logarithmes. On commence à un chiffre, les nouvelles opérations s'ouvrent quand
vous êtes prêt.

UNE DIFFICULTÉ QUI VOUS SUIT

Seize paliers. Répondez vite et les nombres grandissent ; une erreur et le jeu
recule d'un pas. Pas de choix de niveau à la main.

ET AUSSI

• Un chronomètre sur chaque équation
• Un multiplicateur de série
• Un record par mode et par opération
• Fonctionne hors ligne
• Six langues
```

### Español

**Título**

```
Math Boxes: cálculo mental
```

**Descripción corta**

```
Cálculo mental: sumar, multiplicar, dividir, potencias y raíces. Sin conexión.
```

**Descripción completa**

```
Math Boxes es un entrenador de cálculo mental. Resuelve una ecuación contra el
reloj y elige la respuesta correcta entre cuatro cajas. Un toque y ya estás
jugando: sin registro, sin ajustes, sin internet.

UNA CADENA

Cada respuesta empieza la siguiente: 2 − 1 = 1 + 9 = 10 × 3 = ?
Sin modos ni ajustes: un toque y la cadena empieza.

SIETE OPERACIONES

Suma, resta, multiplicación, división, potencias, raíces cuadradas y logaritmos.
Empieza con una cifra y abre operaciones nuevas cuando estás listo.

DIFICULTAD QUE TE SIGUE

Dieciséis escalones. Responde rápido y los números crecen; falla y el juego
retrocede un paso. Sin selector de nivel.

ADEMÁS

• Un cronómetro en cada ecuación
• Multiplicador por racha
• Un récord por modo y por operación
• Funciona sin conexión
• Seis idiomas
```

---

## Что нового (версия 7.0)

**Русский**

```
• Новый режим «Цепь»: ответ становится началом следующего примера
• Плавный разгон: игра начинается с маленьких чисел, операции открываются
  постепенно
• 16 ступеней сложности вместо 13
• Новая иконка
• Реклама реже: межстраничная раз в 3–4 партии, баннер больше не перекрывает
  кнопки ответов
• Приложение легче на 2 МБ и быстрее запускается
```

**English**

```
• New Chain mode: every answer starts the next equation
• Gentler ramp: small numbers first, operations unlock as you go
• 16 difficulty steps instead of 13
• New icon
• Fewer ads: one interstitial per 3–4 games, and the banner no longer covers the
  answer buttons
• 2 MB smaller and quicker to start
```

---

## Скриншоты

Три набора по шесть кадров, все портретные PNG:

| Папка | Размер | Куда в консоли |
|---|---|---|
| `screenshots/phone/` | 1080×1920 | Скриншоты телефона |
| `screenshots/tablet7/` | 1200×1920 | Скриншоты 7-дюймового планшета |
| `screenshots/tablet10/` | 1600×2560 | Скриншоты 10-дюймового планшета |

Кадры одинаковые во всех наборах:

| Файл | Что показывает | Подпись, если добавлять |
|---|---|---|
| `1-home.png` | Главный экран, два режима и уровни | Одно нажатие — и вы играете |
| `2-chain.png` | Башня в разгаре | Ответ становится фундаментом следующего |
| `3-correct.png` | Ответ встал в кладку | Верно — зелёный блок, мимо — красный |
| `4-levels.png` | Уровни по операциям | Видно, что открыто и что впереди |
| `5-streak.png` | Серия горит | Не ошибайтесь — и башня светится |
| `6-result.png` | Итог партии | Заработанные уровни остаются |

Подписи Play не накладывает сам — если они нужны, их запекают в картинку. Сейчас
скриншоты чистые, без текста.

**Планшетные кадры потребовали правки самой игры.** Вёрстка была рассчитана на
телефон и упиралась в 460 px: на 10-дюймовом экране игра занимала 57 % ширины и
выглядела узкой полосой посреди пустоты. Теперь на экранах от 600 px колонка
шире, крупнее шрифт уравнения, кнопки ответов, логотип и кнопка «Играть», а
коробка может вырасти до 260 px. Заполнение: 100 % на телефоне, 93–100 % на 7",
70–78 % на 10". Это не только про витрину — так игру видят реальные владельцы
планшетов.
