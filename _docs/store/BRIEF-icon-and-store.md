# Бриф для GPT: иконка и витрина Math Boxes

Отдавать целиком, одним сообщением. Всё, что в блоках `prompt`, — на английском
намеренно: генераторы изображений понимают его точнее.

---

## Что за игра (контекст, без него получится не та картинка)

Math Boxes — детская аркада про устный счёт. Синий кубик с лицом поднимается по
башне из блоков: наверху два-четыре блока с числами, игрок выбирает верный
ответ, кубик прыгает на него, башня растёт. Снизу подступает опасность — вода,
лава, сосульки или мухоморы, смотря какая локация.

**Визуальный язык — он уже задан игрой, менять его не надо:**

- рисованный мультяшный стиль, плоские заливки с мягким градиентом;
- **толстая тёмно-синяя обводка `#0d1233`** вокруг каждой фигуры — это главная
  примета стиля;
- у блоков **сплошная «губа» снизу** более тёмного оттенка, мягких размытых
  теней нет вовсе;
- персонаж: светло-голубой куб с двумя большими белыми глазами, маленькой
  улыбкой и розовыми щёчками, без рук и ног;
- палитра: небо от `#3d8ae8` вверху к розово-оранжевому закату `#ffba86` внизу;
  блоки синие и бирюзовые `#4a9ff0`–`#5ed7e8`; кнопки фиолетовые `#7b62e8`;
  акценты золотые `#f9b83a`;
- шрифт Nunito, начертания 800–900.

Опорные кадры лежат в `_docs/store/screenshots/phone/ru/` — **только в папках
`ru/` и `en/`**.

> Файлы, лежащие прямо в `phone/`, `tablet7/` и `tablet10/` без подпапки, — от
> старой версии игры: тёмно-фиолетовый экран, сердца, таймер, стопка
> операторов. Это другая игра, и за образец их брать нельзя.

---

## 1. Иконка приложения

Нужен **один файл: квадратный PNG, сторона от 1024**. Класть его в
`_docs/store/brand/icon-source.png`.

Больше ничего рисовать не надо. Слои адаптивной иконки Android, значок 512×512
для витрины и заплатку запуска собирает из него скрипт:

```
node _docs/store/make-brand.mjs
```

Раньше здесь просились три файла — иконка, передний слой и задний. Нарезать их
руками оказалось хуже, чем выводить из одного: у Android свои правила вложения,
и разъезжались они молча.

**Требования, каждое по своей причине:**

**Без букв и цифр.** Сейчас в иконке буквы «M» и «B» — на 48 пикселях, а именно
так её видят в списке приложений, они превращаются в кашу. Иконка должна
читаться силуэтом.

**Одна крупная идея, а не сцена.** Лучше всего: кубик-персонаж стоит на одном
блоке, за ним кусочек неба. Всё остальное — мелко и не нужно.

**Рисунок во весь квадрат, без полей.** Запас под обрезку добавляет сборка сама
— в разметке Android слой уже вложен внутрь видимой области. Если оставить поля
в исходнике, они сложатся с этим запасом, и персонаж окажется наклейкой на
пустом фоне.

**Углы не нагружать.** Обрезка кругом съедает именно их, поэтому по углам должны
быть небо и дальний план, а не персонаж и не блоки.

```prompt
App icon for a children's mental-math arcade game.

A friendly light-blue cube character with two big white eyes, small
smile and pink cheeks, standing on top of one chunky rounded blue
block. Bright cartoon style, flat colors with soft gradients, thick
dark navy outline (#0d1233) around every shape, solid darker lip
under the block, no drop shadows, no blur.

Background: simple sky gradient from #3d8ae8 at top to #ffba86 at
bottom, no clouds, no other objects.

Centered composition, large simple shapes, fully readable at 48
pixels. No text, no letters, no numbers. Square 1024x1024.
```

Для переднего слоя — тот же промпт плюс:

```prompt
Transparent background. Only the cube character and the single block.
All artwork inside the central 66% circle of the canvas.
```

Для заднего слоя:

```prompt
Plain vertical sky gradient from #3d8ae8 to #ffba86. No objects, no
text, no gradient banding. Square 1024x1024.
```

**Как вставить в сборку:** положить файлы в `resources/`, затем

```
pnpm build:android
```

— `capacitor-assets generate` соберёт из них все размеры под Android сам.
Отдельно класть ничего в `android/` не нужно.

---

## 2. Баннер витрины (feature graphic)

Один файл **1024×500 PNG**, `_docs/store/feature-graphic-1024x500.png`.

Нынешний — тёмно-синий с изометрическими кубами, от светлой игры про подъём в
нём нет ничего.

**Две вещи, которые ломают баннеры чаще всего:**

**Центр перекрывается.** Play кладёт поверх баннера кнопку воспроизведения,
если к странице приложен ролик. Ничего важного в середине быть не должно.

**Края обрезаются.** На части раскладок срезается до 10% с каждой стороны.
Название и персонажа держать внутри центральных 80%.

```prompt
Google Play feature graphic, 1024x500, for a children's mental-math
arcade game.

Left third: the game title "Math Boxes" in a heavy rounded sans-serif
(Nunito Black), white letters with a thick dark navy outline and a
soft golden glow.

Right third: a friendly light-blue cube character with big white eyes
and pink cheeks, hopping upward between two chunky rounded blue
blocks that show the numbers 7 and 12. Thick dark navy outline
(#0d1233) on every shape, solid darker lip under each block.

Background: bright sky gradient from #3d8ae8 to #ffba86 with soft
cartoon clouds, and a thin cyan water line along the very bottom
edge.

Flat cartoon style, no photorealism, no drop shadows. Keep the middle
of the image visually calm and free of key elements. Nothing
important within 10% of any edge.
```

---

## 3. Скриншоты витрины

Кадры уже сняты и лежат готовыми к загрузке:

```
_docs/store/screenshots/phone/{ru,en}/     1080×1920, 6 шт
_docs/store/screenshots/tablet7/{ru,en}/   1200×1920, 6 шт
_docs/store/screenshots/tablet10/{ru,en}/  1600×2560, 6 шт
```

Это чистые кадры игры без рекламной полосы. **Пересоздавать их генератором не
надо** — скриншот обязан показывать то, что в приложении на самом деле, и
нарисованный «скриншот» это нарушение. Улучшать можно только оформление вокруг.

**Что стоит добавить:** подпись-полосу сверху каждого кадра, примерно 15%
высоты, на сплошной плашке цвета `#151a3d` с белым текстом Nunita 900. Три-пять
слов, не больше: подпись на витрине читают за долю секунды.

Предлагаемые подписи:

| кадр | ru | en |
| --- | --- | --- |
| `1-home` | Считай в уме | Mental math |
| `2-climb` | Ответил — поднялся | Answer, climb higher |
| `3-streak` | Серия без ошибок | Keep the streak |
| `4-winter` | Шесть разных мест | Six locations |
| `5-lava` | Внизу не ждут | Don't fall behind |
| `6-result` | Побей свой рекорд | Beat your record |

```prompt
Take the attached game screenshot (1080x1920) and add a caption band
across the top, 15% of the image height, solid color #151a3d, with
the text "<подпись>" centered in white heavy rounded sans-serif
(Nunito Black, all caps, letter-spacing 1px).

Do not alter, redraw, crop or restyle the game screenshot itself. Do
not add device frames, glow, or decorative elements. Output 1080x1920
PNG.
```

Каждый кадр отдавать отдельно вместе с его подписью.

---

## Чего делать не нужно

**Не рисовать «скриншоты» с нуля** — см. выше, это нарушение правил витрины.

**Не менять шрифт и не добавлять свой.** Nunito уже зашит в игру, и другой
шрифт на витрине разойдётся с тем, что человек увидит после установки.

**Не добавлять людей и детей на баннер.** Приложение под Families Policy, и
изображения детей в витрине притягивают лишнее внимание проверки.

**Не использовать чужих персонажей и узнаваемые стили** — отказ придёт не от
Play, а позже и дороже.
