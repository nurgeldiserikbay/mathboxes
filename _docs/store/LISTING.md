# Карточка Google Play — единый источник

Всё, что уходит в консоль, лежит здесь. Правится этот файл, потом копируется в
Play Console. Картинки — не здесь: они собираются скриптом и лежат готовыми к
загрузке в [`upload/`](upload/), там же инструкция, что куда грузить.

| Что | Откуда взять | Требование Play |
|---|---|---|
| Значок | `upload/icon-512.png` | 512×512, PNG, 32-бит |
| Графика функции | `upload/feature-graphic-1024x500.png` | 1024×500, PNG или JPEG |
| Скриншоты телефона | `upload/phone-{ru,en}/` | 1080×1920, 9:16, 2–8 шт |
| Скриншоты 7″ планшета | `upload/tablet7-{ru,en}/` | 1440×2560, 9:16 |
| Скриншоты 10″ планшета | `upload/tablet10-{ru,en}/` | 1620×2880, 9:16 |

Пересобрать всё, что рисуется, из двух исходников в `brand/`:

```
node _docs/store/make-brand.mjs
```

Переснять скриншоты (нужен запущенный dev-сервер на 4236):

```
node node_modules/vite/bin/vite.js --mode development --port 4236
node _docs/store/make-store-shots.mjs 4236
```

Скрипт играет по-настоящему, вычисляя верный ответ из разметки, поэтому на
кадрах живая партия, а не первый экран.

---

## Название

```
Math Boxes: Solve and Climb
```

27 знаков из 30. «Math Boxes» оставлено намеренно: под этим именем приложение
уже стоит у людей, оно нарисовано на баннере и на логотипе внутри игры, а хвост
после двоеточия делает ровно то, ради чего это поле и существует, — объясняет,
что за игра, тому, кто видит её впервые.

Заголовок можно локализовать: Play разрешает свой на каждый язык. Ниже у каждого
языка стоит свой вариант — бренд английский, хвост на языке витрины. Если решите
держать один заголовок на всех, берите английский.

---

## Иконка

Нарисована, а не собрана кодом: синий кубик-персонаж стоит на стопке цветных
блоков со знаками действий, за ним городское небо. Исходник — `brand/icon-source.png`,
всё остальное выводится из него.

Букв в иконке нет намеренно. Прежняя несла «M» и «B», а иконку видят в списке
приложений на 48 пикселях, где буквы превращаются в кашу. Читаться она должна
силуэтом.

Передний слой адаптивной иконки идёт **во весь холст, без полей**: разметка
Android, которую пишет `capacitor-assets`, уже вкладывает слой внутрь видимой
области, и свой запас поверх этого давал двойное уменьшение — рисунок выглядел
наклейкой на синем диске.

---

## Тексты

**Язык в самой игре.** Приложение открывается на языке устройства, если он один
из шести; во всех остальных случаях — на английском. Язык меняется в настройках
и запоминается.

**Правило по ключам:** они должны стоять в живых фразах. Play ранжирует и по
названию, и по короткому, и по полному описанию, но набор слов через запятую
снижает конверсию, а конверсия — тоже фактор ранжирования.

**Чего в текстах нет и не должно быть.** Ни степеней, ни корней, ни логарифмов:
их вырезали, в игре ровно четыре действия. Ни уровней по операциям, ни таймера,
ни жизней — ничего этого в игре больше нет, и обещать это в витрине нельзя не
только из вежливости: заявка на то, чего в приложении не найти, — повод для
претензии к листингу, а под Families-политикой к таким вещам относятся строже.

---

### English — язык карточки по умолчанию

Play показывает этот текст всем, у кого нет карточки на их языке, поэтому в
консоли основным языком должен стоять **English (United States)**, а остальные
пять — переводами.

**Title** (30)

```
Math Boxes: Solve and Climb
```

**Short description** (80)

```
Solve, jump, climb higher. Mental math with the water rising below you.
```

**Full description**

```
Math Boxes is a mental math climber. An equation appears at the top, you pick
the answer, and your cube hops onto that block. The tower grows under you — and
the water keeps rising.

HOW IT PLAYS

Tap the column you want, or swipe left and right. One correct answer, one floor
higher. Answer wrong and you drop down the column you jumped into, until a block
catches you — while the water climbs on.

No countdown, no lives, no "level failed". The only pressure is the water, and
it moves one way.

FOUR OPERATIONS

Addition, subtraction, multiplication, division — and nothing else. It starts at
5 + 3 and grows with you through twelve steps, up to three-digit arithmetic if
you get that far.

The game reads how you answer, not how long you have played: answer quickly and
cleanly and it steps up, stumble and it eases off. Two answer blocks at the
start, three and then four as you get better.

SIX PLACES TO CLIMB

City, valley, winter, canyon, night and space. Each has its own sky and its own
thing rising below — water, spores, ice or lava. Pick one in the settings, or
let the game choose.

MADE TO BE PICKED UP

Works offline. No sign-up, no account, nothing to sync. One tap from the home
screen to the first equation.

Six languages: English, Русский, Қазақша, Deutsch, Français, Español.
```

---

### Русский

**Название** (30)

```
Math Boxes: решай и поднимайся
```

**Краткое описание** (80)

```
Решай в уме, прыгай выше. Вода поднимается — не отставай.
```

**Полное описание**

```
Math Boxes — устный счёт с подъёмом. Наверху появляется пример, вы выбираете
ответ, и кубик прыгает на этот блок. Башня растёт под вами — а вода всё время
поднимается.

КАК ИГРАТЬ

Нажмите на нужную колонку или проведите пальцем влево-вправо. Верный ответ —
этаж вверх. Ошиблись — падаете вниз по той колонке, в которую прыгнули, пока вас
не поймает блок. Вода тем временем не ждёт.

Ни обратного отсчёта, ни жизней, ни «уровень не пройден». Давление здесь одно —
вода, и она идёт только в одну сторону.

ЧЕТЫРЕ ДЕЙСТВИЯ

Сложение, вычитание, умножение, деление — и больше ничего. Начинается с 5 + 3 и
растёт вместе с вами через двенадцать ступеней, до трёхзначных чисел, если
дойдёте.

Игра смотрит, как вы отвечаете, а не сколько играли: отвечаете быстро и без
ошибок — становится сложнее, запнулись — отпускает. В начале два блока с
ответами, дальше три и четыре.

ШЕСТЬ МЕСТ

Город, долина, зима, каньон, ночь и космос. У каждого своё небо и своё, что
поднимается снизу: вода, споры, лёд или лава. Выберите в настройках или доверьте
жребию.

ЧТОБЫ ВЗЯТЬ И ИГРАТЬ

Работает без интернета. Без регистрации, без аккаунта, ничего никуда не
отправляется. Одно нажатие с главного экрана — и вы уже считаете.

Шесть языков: English, Русский, Қазақша, Deutsch, Français, Español.
```

---

### Қазақша

**Атауы** (30)

```
Math Boxes: шеш және өрле
```

**Қысқаша сипаттама** (80)

```
Ойша есепте, жоғары сек. Су көтеріліп келеді — қалып қойма.
```

**Толық сипаттама**

```
Math Boxes — ойша есептеу мен өрлеу. Жоғарыда мысал шығады, сен жауабын
таңдайсың, текшең сол блокқа секіреді. Мұнара астыңда өседі — ал су үнемі
көтеріліп отырады.

ҚАЛАЙ ОЙНАЙДЫ

Керекті бағанды бас немесе саусақты солға-оңға сырғыт. Дұрыс жауап — бір қабат
жоғары. Қателессең, секірген бағанмен төмен құлайсың, әлдебір блок ұстап
қалғанша. Су ол кезде күтіп тұрмайды.

Кері санақ жоқ, жан жоқ, «деңгей өтілмеді» деген де жоқ. Мұндағы жалғыз қысым —
су, әрі ол бір ғана бағытқа жүреді.

ТӨРТ АМАЛ

Қосу, азайту, көбейту, бөлу — басқа ештеңе жоқ. 5 + 3-тен басталып, он екі
сатымен сенімен бірге өседі; жетсең, үш таңбалы сандарға дейін жетеді.

Ойын қанша ойнағаныңды емес, қалай жауап бергеніңді қарайды: жылдам әрі қатесіз
жауап берсең — қиындайды, сүрінсең — жеңілдейді. Басында жауабы бар екі блок,
кейін үшеу, сосын төртеу.

АЛТЫ ОРЫН

Қала, аңғар, қыс, шатқал, түн және ғарыш. Әрқайсысының өз аспаны және астынан
көтерілетін өз нәрсесі бар: су, спора, мұз немесе лава. Баптауда таңда немесе
жеребеге қалдыр.

АЛЫП ОЙНАЙ БЕРУГЕ

Интернетсіз жұмыс істейді. Тіркелусіз, аккаунтсыз, ешқайда ештеңе жіберілмейді.
Басты экраннан бір басу — және сен есептеп жатырсың.

Алты тіл: English, Русский, Қазақша, Deutsch, Français, Español.
```

---

### Deutsch

**Titel** (30)

```
Math Boxes: Rechnen & Steigen
```

**Kurzbeschreibung** (80)

```
Rechne im Kopf und steig höher. Das Wasser steigt mit — bleib nicht zurück.
```

**Vollständige Beschreibung**

```
Math Boxes ist Kopfrechnen mit Aufstieg. Oben erscheint eine Aufgabe, du wählst
die Antwort, und dein Würfel springt auf diesen Block. Der Turm wächst unter dir
— und das Wasser steigt weiter.

SO WIRD GESPIELT

Tippe auf die gewünschte Spalte oder wische nach links und rechts. Eine richtige
Antwort, ein Stockwerk höher. Bei einer falschen fällst du die Spalte hinunter,
in die du gesprungen bist, bis dich ein Block auffängt. Das Wasser wartet
derweil nicht.

Kein Countdown, keine Leben, kein "Level nicht geschafft". Der einzige Druck ist
das Wasser, und es kennt nur eine Richtung.

VIER RECHENARTEN

Addition, Subtraktion, Multiplikation, Division — und sonst nichts. Es beginnt
bei 5 + 3 und wächst über zwölf Stufen mit dir, bis zu dreistelligen Zahlen,
wenn du so weit kommst.

Das Spiel schaut darauf, wie du antwortest, nicht wie lange du spielst:
antwortest du schnell und sauber, wird es schwerer; stolperst du, lässt es
nach. Am Anfang zwei Antwortblöcke, später drei und vier.

SECHS ORTE

Stadt, Tal, Winter, Schlucht, Nacht und Weltraum. Jeder mit eigenem Himmel und
eigenem Etwas, das von unten steigt: Wasser, Sporen, Eis oder Lava. Wähle in den
Einstellungen oder überlass es dem Zufall.

ZUM EINFACH LOSSPIELEN

Funktioniert offline. Keine Anmeldung, kein Konto, nichts wird übertragen. Ein
Tippen vom Startbildschirm bis zur ersten Aufgabe.

Sechs Sprachen: English, Русский, Қазақша, Deutsch, Français, Español.
```

---

### Français

**Titre** (30)

```
Math Boxes: calcule et grimpe
```

**Description courte** (80)

```
Calcule de tête et grimpe. L'eau monte sous toi — ne reste pas en arrière.
```

**Description complète**

```
Math Boxes, c'est du calcul mental avec de la grimpe. Une opération apparaît en
haut, tu choisis la réponse, et ton cube saute sur ce bloc. La tour grandit sous
toi — et l'eau, elle, continue de monter.

COMMENT ON JOUE

Touche la colonne voulue, ou glisse le doigt à gauche et à droite. Une bonne
réponse, un étage de plus. En cas d'erreur, tu tombes le long de la colonne où
tu as sauté, jusqu'à ce qu'un bloc te rattrape. L'eau, pendant ce temps,
n'attend pas.

Pas de compte à rebours, pas de vies, pas de "niveau échoué". La seule pression,
c'est l'eau, et elle ne va que dans un sens.

QUATRE OPÉRATIONS

Addition, soustraction, multiplication, division — et rien d'autre. Ça commence
à 5 + 3 et grandit avec toi sur douze paliers, jusqu'aux nombres à trois
chiffres si tu vas jusque-là.

Le jeu regarde comment tu réponds, pas combien de temps tu joues : réponds vite
et juste, ça monte ; hésite, ça redescend. Deux blocs de réponse au début, puis
trois, puis quatre.

SIX LIEUX

Ville, vallée, hiver, canyon, nuit et espace. Chacun avec son ciel et sa propre
chose qui monte d'en bas : eau, spores, glace ou lave. Choisis dans les
réglages, ou laisse faire le hasard.

FAIT POUR ÊTRE PRIS EN MAIN

Fonctionne hors ligne. Sans inscription, sans compte, rien n'est envoyé nulle
part. Une touche depuis l'écran d'accueil et tu calcules déjà.

Six langues : English, Русский, Қазақша, Deutsch, Français, Español.
```

---

### Español

**Título** (30)

```
Math Boxes: calcula y sube
```

**Descripción corta** (80)

```
Calcula de cabeza y sube. El agua sube contigo: no te quedes abajo.
```

**Descripción completa**

```
Math Boxes es cálculo mental con escalada. Arriba aparece una operación, eliges
la respuesta y tu cubo salta a ese bloque. La torre crece bajo tus pies — y el
agua no deja de subir.

CÓMO SE JUEGA

Toca la columna que quieras, o desliza el dedo a izquierda y derecha. Una
respuesta correcta, un piso más. Si fallas, caes por la columna a la que
saltaste hasta que un bloque te atrape. El agua, mientras tanto, no espera.

Sin cuenta atrás, sin vidas, sin "nivel fallido". La única presión es el agua, y
solo va en una dirección.

CUATRO OPERACIONES

Suma, resta, multiplicación, división — y nada más. Empieza en 5 + 3 y crece
contigo a lo largo de doce escalones, hasta números de tres cifras si llegas tan
lejos.

El juego mira cómo respondes, no cuánto llevas jugando: responde rápido y limpio
y sube; tropieza y afloja. Dos bloques de respuesta al principio, luego tres y
cuatro.

SEIS LUGARES

Ciudad, valle, invierno, cañón, noche y espacio. Cada uno con su cielo y con lo
suyo subiendo desde abajo: agua, esporas, hielo o lava. Elige en los ajustes o
déjalo al azar.

HECHO PARA COGERLO Y JUGAR

Funciona sin conexión. Sin registro, sin cuenta, no se envía nada a ninguna
parte. Un toque desde la pantalla de inicio hasta la primera operación.

Seis idiomas: English, Русский, Қазақша, Deutsch, Français, Español.
```

---

## Что нового

Это не обновление, а другая игра под тем же именем, и текст должен это сказать
прямо: человек, у которого стоит прежняя версия, иначе не поймёт, почему у него
пропали уровни и режимы.

Play даёт на этот текст 500 знаков.

**Русский**

```
• Игра переделана целиком: вместо уровней по операциям — бесконечный подъём по
  башне, снизу подступает вода
• Управление: нажатие по колонке или свайп влево-вправо
• Сложность подстраивается под вас — двенадцать ступеней, от 5 + 3 до
  трёхзначных чисел
• Шесть мест на выбор: город, долина, зима, каньон, ночь, космос
• Звуки прыжка, серии и опасности
• Новая иконка и оформление
• Нормальная работа на планшетах
```

**English**

```
• Rebuilt from scratch: no more operation levels — an endless climb up the
  tower, with the water rising below
• Controls: tap a column or swipe left and right
• Difficulty adapts to you — twelve steps, from 5 + 3 to three-digit arithmetic
• Six places to climb: city, valley, winter, canyon, night, space
• Sounds for the jump, the streak and the danger
• New icon and artwork
• Works properly on tablets
```

**Қазақша**

```
• Ойын толық қайта жасалды: амалдар бойынша деңгейлердің орнына — мұнарамен
  шексіз өрлеу, астынан су көтеріледі
• Басқару: бағанды басу немесе солға-оңға сырғыту
• Қиындық саған бейімделеді — он екі саты, 5 + 3-тен үш таңбалы сандарға дейін
• Алты орын: қала, аңғар, қыс, шатқал, түн, ғарыш
• Секіру, серия және қауіп дыбыстары
• Жаңа белгіше және безендіру
• Планшеттерде дұрыс жұмыс істейді
```

**Deutsch**

```
• Komplett neu gebaut: keine Level nach Rechenarten mehr — ein endloser Aufstieg
  über den Turm, während unten das Wasser steigt
• Steuerung: Spalte antippen oder nach links und rechts wischen
• Die Schwierigkeit passt sich an — zwölf Stufen, von 5 + 3 bis zu dreistelligen
  Zahlen
• Sechs Orte: Stadt, Tal, Winter, Schlucht, Nacht, Weltraum
• Sounds für Sprung, Serie und Gefahr
• Neues Icon und neue Gestaltung
• Läuft jetzt richtig auf Tablets
```

**Français**

```
• Jeu entièrement refait : plus de niveaux par opération — une grimpe sans fin le
  long de la tour, avec l'eau qui monte en dessous
• Commandes : touche une colonne ou glisse à gauche et à droite
• La difficulté s'adapte à toi — douze paliers, de 5 + 3 aux nombres à trois
  chiffres
• Six lieux : ville, vallée, hiver, canyon, nuit, espace
• Sons pour le saut, la série et le danger
• Nouvelle icône et nouveaux graphismes
• Fonctionne correctement sur tablette
```

**Español**

```
• Juego rehecho por completo: se acabaron los niveles por operación — una
  escalada sin fin por la torre, con el agua subiendo por debajo
• Controles: toca una columna o desliza a izquierda y derecha
• La dificultad se adapta a ti: doce escalones, de 5 + 3 a números de tres cifras
• Seis lugares: ciudad, valle, invierno, cañón, noche, espacio
• Sonidos del salto, la racha y el peligro
• Icono y aspecto nuevos
• Funciona bien en tablets
```

---

## Скриншоты

Три набора по шесть кадров на каждом из двух языков, все портретные PNG,
соотношение ровно 9:16 — Play принимает только 16:9 или 9:16.

| Папка | Размер | Куда в консоли |
|---|---|---|
| `upload/phone-{ru,en}/` | 1080×1920 | Скриншоты телефона |
| `upload/tablet7-{ru,en}/` | 1440×2560 | Скриншоты 7-дюймового планшета |
| `upload/tablet10-{ru,en}/` | 1620×2880 | Скриншоты 10-дюймового планшета |

Кадры одинаковые во всех наборах, порядок задан именами — Play показывает их в
том порядке, в каком загрузили:

| Файл | Что показывает | Подпись, если добавлять |
|---|---|---|
| `1-home.png` | Главный экран с рекордом | Считай в уме |
| `2-climb.png` | Подъём в городе, вода внизу | Ответил — поднялся |
| `3-streak.png` | Похвала за серию | Серия без ошибок |
| `4-winter.png` | Зима с сосульками | Шесть разных мест |
| `5-lava.png` | Каньон с лавой | Внизу не ждут |
| `6-result.png` | Итог партии | Побей свой рекорд |

Подписи Play не накладывает сам — если они нужны, их запекают в картинку. Сейчас
кадры чистые, без текста, и без рекламной полосы: место под объявление на
витрине показывать нечего.

**Планшетные кадры потребовали правки самой игры.** Вёрстка была в пикселях под
телефон и тянулась только по ширине: блоки разъезжались в полосы, высота этажа
не росла, а вокруг колонки в 680px оставались тёмные поля в треть экрана.
Теперь интерфейс масштабируется целиком (`src/utils/scale.ts`), и планшет
показывает ту же доску, только крупнее. На телефонах масштаб равен единице, то
есть там не изменилось ничего.
