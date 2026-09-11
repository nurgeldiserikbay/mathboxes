<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'

import AppIcon from '@/components/AppIcon.vue'
import AdSlot from '@/components/AdSlot.vue'
import OtherGames from '@/components/OtherGames.vue'
import GameHazard from '@/components/GameHazard.vue'
import GameSky from '@/components/GameSky.vue'
import GameOverCard from '@/components/GameOverCard.vue'

import Mascot from '@/assets/mascot/cube.svg?component'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'
import { useI18n } from 'vue-i18n'

import { useGameStore } from '@/store/gameStore'

import { useAudio } from '@/composables/useAudio'
import {
	I_ClimbResult,
	I_Slot,
	JUMP_MS,
	MAX_GAP,
	slotShare,
	useClimbGame,
} from '@/composables/useClimbGame'
import { resolveLocation } from '@/utils/locations'

import { I_SessionSummary } from '@/utils/types'
import { brickTint } from '@/utils/floors'
import { GLYPHS } from '@/utils/mathEngine'
import { darken, lighten } from '@/utils/color'
import { groupDigits } from '@/utils/format'
import Admob from '@/utils/admob'

/**
 * Подъём, в котором игрок бегает сам.
 *
 * Ход перестал быть нажатием: сначала прочитать пример, потом добежать до
 * нужного блока, потом прыгнуть. Поэтому и давление тут не часы в углу, а вода
 * снизу — её видно, и она объясняет сама себя без единой цифры.
 *
 * Мир рисуется трансформами: у персонажа и воды меняется одна матрица за кадр,
 * остальное стоит на месте. Canvas не нужен — блоки стоят ровно этажом выше и
 * прыжок всегда попадает туда, где игрок стоит, так что ни столкновений, ни
 * гравитации считать не приходится.
 */
const gameStore = useGameStore()
/** Явное имя: `t` в этом файле — прогресс прыжка. */
const { t: translate } = useI18n()
const pageStore = usePageStore()
const adsStore = useAdsStore()

const isOtherGames = ref(false)
const { playAudio, holdAudio, holdSilence, vibrate } = useAudio()

const game = useClimbGame()

const previousBestFloor = gameStore.bestFloor
const previousBestScore = gameStore.bestScore

const paused = ref(false)
const isEnd = ref(false)
const finalSummary = ref<I_SessionSummary | null>(null)

/**
 * Что видно из башни. Сама башня живёт в правилах — она опора, а не декорация,
 * — а здесь только её верхушка: ниже девятого этажа под ногами всё равно
 * экран кончается.
 */
const built = computed(() => game.tower.value.slice(0, 9))

/** Что игра сказала на последний прыжок. */
const flash = ref<{ id: number; text: string; tone: string } | null>(null)
let flashID: ReturnType<typeof setTimeout> | undefined

/**
 * Похвала — отдельно от очков.
 *
 * Цифра над головой говорит, сколько дали. Она не говорит, что игрок сделал
 * что-то хорошо, — а серия из пяти верных подряд или ответ за секунду это
 * именно достижение, и до сих пор игра на них не отвечала ничем. Отсюда и
 * ощущение, что на сцене ничего не происходит: происходило, но молча.
 */
const praise = ref<{ id: number; text: string; tone: string } | null>(null)
let praiseID: ReturnType<typeof setTimeout> | undefined

/** Быстрее этого ответ считается быстрым. */
const FAST_MS = 1400
/** Сколько быстрых подряд уже набралось. Считается, чтобы выбрать слово. */
let fastRun = 0
/** Хвалили ли в этой партии вообще. Первая похвала приходит раньше прочих. */
let praised = false

/**
 * Невыбранные блоки прошлого ряда: они осыпаются, а не исчезают.
 *
 * Снимок делается при выборе, а показываются они только с приземления — и
 * внутри мира, а не поверх него. Иначе получалось так: пока шёл прыжок, старый
 * ряд был на месте и призраки дублировали его, а после переезда они оставались
 * висеть там, где уже стоял новый ряд.
 */
const ghosts = ref<{ id: number; value: number; x: number }[]>([])
let pendingRow: { id: number; value: number; x: number }[] = []
let pendingTower: { id: number; value: number; x: number }[] = []
let pendingChosen = 0
let ghostTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Обломки падения: плиты, мимо которых персонаж пролетел, и остатки ряда.
 *
 * Живут вне мира и с ним не едут — они уже не башня. Экранная высота
 * запоминается на момент обвала, дальше они просто падают.
 */
const debris = ref<{ id: number; value: number; x: number; y: number }[]>([])
let debrisTimer: ReturnType<typeof setTimeout> | undefined

/* --------------------------------------------------------------- геометрия */

const stageEl = ref<HTMLElement | null>(null)
const stageBox = ref({ width: 360, height: 460 })
let stageObserver: ResizeObserver | null = null

/** Высота блока. Считается от места, а не константой: на низком экране с
 *  баннером высокие блоки не оставили бы места ни для бега, ни для воды. */
const floorHeight = computed(() =>
	Math.round(Math.max(40, Math.min(58, stageBox.value.height / 9)))
)

/** Рост персонажа. Должен совпадать с тем, что рисует CSS: от него зависит,
 *  влезает ли он под ряд кандидатов. */
const PLAYER_H = 40

/**
 * Шаг этажа. Он же высота прыжка — и это не совпадение, а требование.
 *
 * Чтобы персонаж влезал под ряд кандидатов, между этажами должно быть не меньше
 * чем высота блока плюс его рост. А чтобы после прыжка мир мог просто съехать
 * на один шаг, прыжок обязан быть ровно в этот шаг: иначе блок, на который он
 * встал, приедет не туда, где он стоит. Поэтому башня здесь — не кладка, а
 * лестница из площадок с воздухом между ними.
 */
const pitch = computed(() => floorHeight.value + PLAYER_H + 10)

/**
 * Где стоит этаж под ногами — при полном запасе.
 *
 * Это не место персонажа, а верх его хода: отсюда он оседает к воде и сюда же
 * возвращается верными ответами. Почти всю партию он проводит ниже, так что
 * места над головой в среднем столько же, сколько было.
 *
 * Высоко — потому что от длины этого хода зависит, видно ли вообще, что мир
 * едет. Скорость на экране это ход, делённый на запас, умноженный на скорость
 * воды: при прежних 0.62 выходило 7.7 px/с, а это едва выше порога, на котором
 * движение замечают вообще. Теперь ход почти вдвое длиннее.
 */
const baseY = computed(() => Math.round(stageBox.value.height * 0.34))

/**
 * Ширина блока-кандидата. Доля считается в правилах: по ней там решается, кого
 * поймает падающая плита, и разъехаться этим двум числам нельзя.
 */
const slotWidth = computed(() =>
	Math.round(stageBox.value.width * slotShare(Math.max(1, game.slots.value.length)))
)

function slotLeft(x: number): number {
	return Math.round(x * stageBox.value.width - slotWidth.value / 2)
}

/*
   Камера.

   Раньше после прыжка состояние просто подменялось: блок исчезал из ряда и
   появлялся в башне, а новый ряд возникал сверху из ниоткуда. Подъёма при этом
   не читалось — читалась подмена.

   Теперь так. Персонаж прыгает на верхний блок и остаётся на нём — мир при
   этом стоит. И только после приземления, когда он оказался этажом выше
   насеста, мир вместе с ним съезжает вниз на этот этаж. Сначала событие, потом
   его следствие; обратный порядок читался как «блоки поехали сами».

   Помост и вода в мир не входят: помост — это всегда «пол под ногами», а вода
   считается от разрыва и живёт своей непрерывной жизнью.
*/
/** Падение длиннее прыжка и идёт с разгоном: вниз тянет, вверх — усилие. */
const FALL_MS = 440

/**
 * Сколько длится падение.
 *
 * Зависит от глубины: свалиться на плиту под ногами и рухнуть с седьмого этажа
 * на землю — разные события, и одинаковой длительностью они бы читались
 * одинаково. Но растёт не пропорционально и упирается в потолок: падение —
 * это то, что с игроком случилось, а не то, что он смотрит.
 */
function fallTime(floors: number): number {
	return Math.min(760, 300 + floors * 110)
}

/** Сдвиг мира, пикселей. Между кадрами уезжает к нулю. */
const cam = ref(0)
/** Идёт ли переезд. Пока false, сдвиг ставится мгновенно и без анимации. */
const gliding = ref(false)
/** Падение, а не подъём: другая длительность и другая кривая. */
const dropping = ref(false)
/** Длительность текущего падения. Её же читает CSS через `--fall-ms`. */
const fallMs = ref(FALL_MS)
let glideTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Камера догоняет — и догоняет одним куском.
 *
 * Порядок такой: персонаж прыгает на верхний блок и остаётся на нём, мир при
 * этом стоит. И только после приземления, когда он оказался этажом выше
 * насеста, мир вместе с ним съезжает вниз на этот этаж.
 *
 * Отсюда и отдельный слой. Раньше эти два движения жили на разных элементах:
 * мир ехал своим трансформом, персонаж — своим. Проходили они одно и то же
 * расстояние, но по отдельности, и на экране это читалось не как «камера
 * поехала за ним», а как «персонаж осел обратно». Теперь сдвиг висит на общем
 * родителе: персонаж и блоки едут жёстко вместе, и никакого своего движения у
 * персонажа в этот момент нет вовсе.
 *
 * Стык сделан так, что его не видно. В миг приземления этаж меняется, дуга
 * сбрасывается в ноль, а камера получает ровно тот же сдвиг с обратным знаком —
 * и всё оказывается там же, где было кадром раньше. Двигается только следующий
 * кадр.
 */
/**
 * Сколько едет камера на один этаж.
 *
 * Пятьсот двадцать, а не триста сорок. Расстояние тут фиксированное — шаг
 * этажа, около ста десяти пикселей, — и на трёхстах сорока это выходило больше
 * трёхсот пикселей в секунду: мир не съезжал, а падал. Теперь около двухсот
 * десяти, и спуск читается спуском.
 *
 * Платится за это темпом: от нажатия до появления нового ряда выходит около
 * секунды. Для игры, где над примером думают две-пять секунд, это незаметно, но
 * быстрее чем раз в секунду отвечать уже нельзя.
 */
const SLIDE_MS = 520

/**
 * Пауза между приземлением и началом переезда.
 *
 * Приземление должно прочитаться приземлением, а не началом следующего
 * движения. Без этой паузы прыжок и сдвиг склеивались в одно, и весь ход
 * выглядел обрывистым: персонаж ещё не встал, а мир уже поехал.
 */
const HOLD_MS = 120

/**
 * Ход ещё идёт: от приземления до конца переезда.
 *
 * По нему прячется новый ряд. Такты должны читаться по одному — прыгнул,
 * пространство сдвинулось, и только потом вышли блоки. Пока ряд появлялся
 * одновременно со сдвигом, три события накладывались в одно мгновение.
 */
const moving = ref(false)

/**
 * Насколько персонаж поднят над своей плитой сверх дуги прыжка, в шагах этажа.
 *
 * Обычно ноль. В начале падения — столько, сколько ему предстоит пролететь:
 * оттуда он и опускается, пока камера едет навстречу.
 */
const hopExtra = ref(0)

/** Где персонаж по вертикали, в шагах этажа над своей плитой. */
const hop = computed(() => game.jump.value + hopExtra.value)

/**
 * Проезд камеры.
 *
 * Кадр первый: сдвиг ставится так, что всё рисуется ровно там, где было, — без
 * перехода. Кадр второй: переход включается и сдвиг отпускается в ноль.
 *
 * Верный ответ даёт `-pitch`: персонаж стоит этажом выше насеста, и мир вместе
 * с ним съезжает на этаж вниз. Промах даёт `+этажи × pitch` камере и
 * `этажи + 1` персонажу: мир уезжает вверх, персонаж опускается ему навстречу,
 * и вместе выходит ровно то расстояние, которое он пролетел.
 *
 * `moveTo` — куда уехать по горизонтали: плита, что его поймала, может стоять
 * чуть в стороне от той, на которую он метил. Ставится здесь, чтобы смена
 * позиции попала в тот же кадр, что и включение перехода. Иначе персонаж
 * успевает переставиться до него и дёргается вбок, ещё вися наверху.
 */
function glide(camFrom: number, hopFrom: number, falling: boolean, moveTo?: number) {
	gliding.value = false
	dropping.value = falling
	moving.value = true

	/*
	   Оседание отдаёт свой шаг камере.

	   К приземлению запас меняется рывком, и цель оседания смещается сразу на
	   весь накопленный дрейф. Дать оседанию отыграть этот шаг самому нельзя:
	   его кривая экспоненциальная, то есть быстрее всего в самом начале, а
	   камера в это время только трогается со своей мягкой. Первую десятую долю
	   секунды подъём перебивает спуск — мир заметно приподнимается и лишь потом
	   едет вниз. Замер: 14 px вверх за 115 мс, при том что камера прошла за них
	   всего 8 из 108.

	   Поэтому шаг оседания ставится мгновенно, а камера берёт его на себя:
	   начинает на столько же ниже и приезжает в ноль одним движением. Кадр не
	   дрогнет — сумма двух слоёв та же, меняется только то, кто из них едет.

	   Делается это лишь когда оседание собиралось ВВЕРХ. На промахе оно идёт
	   вниз, в одну сторону с падением, спорить там нечему — и пусть отыгрывает
	   само.
	*/
	const lift = sink.value - sinkTo.value
	if (lift > 0) {
		sink.value = sinkTo.value
		camFrom += lift
	}

	// Сдвиг ставится сразу, а едет — после паузы. Кадр при этом не дрогнет: он
	// ровно тот же, что был в последнем кадре прыжка.
	cam.value = camFrom
	hopExtra.value = hopFrom

	const start = () =>
		requestAnimationFrame(() => {
			gliding.value = true
			cam.value = 0
			hopExtra.value = 0
			if (moveTo !== undefined) game.playerX.value = moveTo
		})

	void nextTick(() => setTimeout(start, HOLD_MS))

	if (glideTimer) clearTimeout(glideTimer)
	glideTimer = setTimeout(
		() => {
			gliding.value = false
			dropping.value = false
			moving.value = false
		},
		HOLD_MS + (falling ? fallMs.value : SLIDE_MS) + 30
	)
}

/** Персонаж: горизонталь от прыжка, вертикаль — дуга плюс запас на падение. */
const playerStyle = computed(() => ({
	transform: `translate3d(${Math.round(game.playerX.value * stageBox.value.width)}px, ${(
		baseY.value -
		hop.value * pitch.value
	).toFixed(2)}px, 0)`,
}))

/** Слой камеры. На нём и персонаж, и блоки — потому и едут вместе. */
const camStyle = computed(() => ({
	transform: `translate3d(0, ${cam.value.toFixed(2)}px, 0)`,
}))

/**
 * Поверхность воды.
 *
 * Расстояние сжато: дальше четырёх этажей вода стоит у нижней кромки и просто
 * ждёт. Без этого она уезжала за экран и появлялась в кадре за полтора этажа до
 * конца — то есть ровно тогда, когда сделать уже ничего нельзя, и вся её польза
 * как предупреждения пропадала. Сколько там на самом деле, говорит счётчик в
 * HUD; вода отвечает за «скоро» и «пора».
 */
/*
   Шкала оседания растянута ровно на наибольший запас.

   Не «столько же, сколько на старте», а именно то же число из правил: запас
   там ограничен сверху, и шкала обязана кончаться там же, где он. Разойдись
   они — и на верхних этажах шкала снова упиралась бы в потолок и замирала.
*/
const SHOWN_FLOORS = MAX_GAP

/** Где земля: на этаж ниже самой нижней построенной плиты. `null` — ушла. */
const groundY = computed(() => {
	const y = baseY.value + game.floor.value * pitch.value
	return y < stageBox.value.height + pitch.value ? y : null
})

/**
 * Вода стоит. Опускается мир.
 *
 * Раньше было наоборот, и это не читалось. Вода поднималась из-за нижней
 * кромки, а пока запас был больше двух этажей, она не двигалась вовсе — то
 * есть всё начало партии на экране не происходило ничего, и понять, что надо
 * шевелиться, было неоткуда.
 *
 * Теперь угроза неподвижна и всегда на виду, а к ней съезжает всё остальное:
 * персонаж, башня, земля. Движение то же самое — относительное расстояние
 * между ними считается по тем же правилам, — но видно его сразу, потому что
 * едет не полоска у края, а весь кадр.
 */
const waterY = computed(() => Math.round(stageBox.value.height - 48))

/**
 * Где стоит похвала.
 *
 * Считается от той же геометрии, что и всё остальное, а не подобранным числом:
 * над рядом ответов есть свободная полоса от кромки сцены до его верха, и
 * похвала садится в её середину. Подобранное число один раз уже подвело —
 * надпись легла ровно на карточку примера, по которой играют.
 *
 * Берётся положение покоя: когда мир оседает, ряд уходит вниз и полоса только
 * растёт.
 */
const praiseY = computed(() => Math.max(4, Math.round((baseY.value - pitch.value) / 2 - 16)))

/**
 * Где идёт эта партия.
 *
 * Решается один раз, при заходе на доску, и до конца партии не меняется. Из
 * настроек приходит либо конкретная локация, либо жребий; жребий бросается
 * здесь же, потому что «партия» начинается именно тут.
 */
const location = resolveLocation(gameStore.theme)

/**
 * Насколько мир осел к воде. 0 — полный запас, максимум — вода у ног.
 *
 * Без округления, и ниже оно тоже снято. Целые пиксели здесь были прямой
 * ошибкой: оседание идёт около десятка пикселей в секунду, то есть округлённый
 * сдвиг менялся раз в сотню миллисекунд и мир не ехал, а тикал восемь раз в
 * секунду. Дробные пиксели браузер сглаживает сам.
 */
const sinkTo = computed(() => {
	const shown = Math.min(Math.max(game.gap.value, 0), SHOWN_FLOORS)
	return (1 - shown / SHOWN_FLOORS) * Math.max(0, waterY.value - baseY.value)
})

/**
 * То же, но сглаженное.
 *
 * Оседание идёт по капле в секунду, а верный ответ отбирает у воды целый этаж
 * разом — и без сглаживания этот этаж отдавался бы рывком в четверть экрана.
 * Догоняем цель долей за кадр: медленный дрейф проходит почти как есть, а шаг
 * растягивается примерно на треть секунды.
 */
const sink = ref(0)
let sinkRaf = 0

function sinkFrame() {
	sinkRaf = requestAnimationFrame(sinkFrame)

	/*
	   Пауза после приземления держит кадр целиком — и камеру, и оседание.

	   Без этого выходило вот что. В миг приземления запас прыгает на этаж
	   вверх, оседание отыгрывает назад весь накопленный дрейф, и мир вместе с
	   блоком уходит ВВЕРХ — а следом камера везёт его ВНИЗ. Два движения в
	   противоположные стороны подряд, и именно они читались неправильной
	   анимацией: «прыгнул, поднялся вместе с блоком, снова опустился».
	*/
	if (moving.value && !gliding.value) return

	const delta = sinkTo.value - sink.value
	// Порога «доехали» нет намеренно: он отсекал как раз тот дрейф, ради
	// которого всё и затевалось, — за кадр набегает пятая доля пикселя.
	//
	// Доля маленькая, и это тоже про то же самое: подъём от верного ответа
	// должен растянуться на весь переезд и сложиться с ним в одно движение
	// вниз, а не отыграть до его начала. Медленному дрейфу это не мешает —
	// цель уползает медленнее, чем догоняет сглаживание.
	sink.value = Math.abs(delta) < 0.01 ? sinkTo.value : sink.value + delta * 0.09
}

const sinkStyle = computed(() => ({
	transform: `translate3d(0, ${sink.value.toFixed(2)}px, 0)`,
}))

const expression = computed(() => {
	const q = game.question.value
	return q ? `${q.a} ${GLYPHS[q.op]} ${q.b}` : ''
})

/* -------------------------------------------------------------- управление */

/**
 * Один жест: нажать на блок.
 *
 * Бег пальцем отсюда убран намеренно. Игру ставят детям ради математики, и
 * проваливать пример, который ребёнок знает, из-за медленного пальца — нечестно.
 * Ловкость ушла, прыжок остался: персонаж перелетает на выбранный блок сам.
 */
/* -------------------------------------------------------------------- ввод */

/**
 * Целиться в блок больше не нужно.
 *
 * Блок 58 пикселей высотой, а ездит он по вертикали на полторы сотни: чем
 * меньше запас, тем ниже ряд. Попадать приходилось в движущуюся цель, да ещё в
 * середине экрана — там, куда большой палец достаёт хуже всего. По горизонтали
 * при этом ряд стоит намертво, колонки заданы жёстко.
 *
 * Значит цель — колонка, а не блок. Нажатие в любом месте сцены выбирает тот
 * вариант, чья колонка ближе к пальцу, включая самый низ экрана. Сам блок
 * теперь только рисуется.
 *
 * Свайп — второй жест и только при двух вариантах: влево-вправо однозначно
 * ложится на «левый-правый», а на три и четыре уже нет. Разбирается он здесь
 * же, одним обработчиком с тапом: два независимых слушателя на одной сцене
 * спорили бы за один и тот же жест.
 */

/** Насколько далеко надо провести, чтобы это был свайп, а не тап. */
const SWIPE_MIN = 34
/** И насколько быстро: медленное ведение пальцем — не жест, а раздумье. */
const SWIPE_MS = 700

/** Какая колонка сейчас под пальцем. Оттуда же берётся вид нажатия. */
const pressing = ref(0)
let gestureFrom: { x: number; y: number; t: number } | null = null

/** Вариант, чья колонка ближе к этой точке экрана. */
function columnAt(clientX: number): I_Slot | null {
	const slots = game.slots.value
	if (!slots.length || !stageEl.value) return null
	const box = stageEl.value.getBoundingClientRect()
	const at = (clientX - box.left) / Math.max(1, box.width)
	let best = slots[0]
	let bestGap = Infinity
	for (const slot of slots) {
		const gap = Math.abs(slot.x - at)
		if (gap < bestGap) {
			bestGap = gap
			best = slot
		}
	}
	return best
}

function onStageDown(event: PointerEvent) {
	gestureFrom = { x: event.clientX, y: event.clientY, t: performance.now() }
	pressing.value = columnAt(event.clientX)?.id ?? 0
}

function onStageUp(event: PointerEvent) {
	pressing.value = 0
	const from = gestureFrom
	gestureFrom = null
	if (!from || paused.value || isEnd.value) return

	const dx = event.clientX - from.x
	const dy = event.clientY - from.y
	const slots = game.slots.value

	// Свайп: жест должен быть явно горизонтальным и быстрым, иначе это тап с
	// дрожащим пальцем, а не выбор направлением.
	if (
		slots.length === 2 &&
		Math.abs(dx) >= SWIPE_MIN &&
		Math.abs(dx) > Math.abs(dy) * 1.2 &&
		performance.now() - from.t <= SWIPE_MS
	) {
		const ordered = [...slots].sort((a, b) => a.x - b.x)
		choose(dx < 0 ? ordered[0] : ordered[1])
		return
	}

	// Иначе — колонка под пальцем. Порога «слишком уехал» тут нет намеренно:
	// на сцене больше нечего делать, любое касание — это ответ, и прощать
	// неточность надо ровно в этом.
	const slot = columnAt(event.clientX)
	if (slot) choose(slot)
}

function onStageCancel() {
	pressing.value = 0
	gestureFrom = null
}

function choose(slot: I_Slot) {
	if (paused.value || isEnd.value || game.jumping.value || slot.broken) return
	playAudio('click', { rate: 1.4, maxMs: 160 })
	// Обрезано по длительности прыжка: звук кончается ровно на приземлении, а
	// не тянется в следующий ход.
	playAudio('jump', { maxMs: JUMP_MS })
	vibrate('tap')

	// Снимок всего ряда. Покажем его с приземления: пока идёт прыжок, ряд ещё
	// на месте и дублировать его нечем. Что с ним будет — зависит от ответа:
	// при верном осыпаются только невыбранные, при промахе рушится весь.
	pendingRow = game.slots.value.map((item) => ({
		id: item.id,
		value: item.value,
		x: item.x,
	}))
	pendingChosen = slot.id
	// И башни тоже: если он промахнётся, часть её осыплется, а к тому времени
	// правила её уже перепишут — обломки будет неоткуда взять.
	pendingTower = built.value.map((item) => ({ id: item.id, value: item.value, x: item.x }))

	game.leap(slot)
}

/* ------------------------------------------------------------------ отклик */

function say(text: string, tone: string, ms = 800) {
	flash.value = { id: Date.now(), text, tone }
	if (flashID) clearTimeout(flashID)
	flashID = setTimeout(() => (flash.value = null), ms)
}

function cheer(text: string, tone: string, ms = 1000) {
	praise.value = { id: Date.now(), text, tone }
	if (praiseID) clearTimeout(praiseID)
	praiseID = setTimeout(() => (praise.value = null), ms)
}

/**
 * За что хвалить этот ответ.
 *
 * Порядок важен: круглая серия перебивает скорость, потому что серия — это
 * достижение, которое копилось, а скорость случается сама. Хвалить за оба разом
 * нельзя: две надписи на одном приземлении читаются как сбой, а не как двойная
 * заслуга.
 *
 * Ничего — тоже ответ. Хвалить каждый верный ответ значит не хвалить вовсе:
 * похвала, которая приходит всегда, перестаёт быть похвалой и становится частью
 * интерфейса.
 */
function praiseFor(result: I_ClimbResult): { text: string; tone: string } | null {
	const combo = result.combo
	fastRun = result.elapsedMs < FAST_MS ? fastRun + 1 : 0

	// Прибавка варианта перебивает всё: доска меняется у игрока на глазах, и
	// это самое редкое, что в партии случается — за неё же и хвалим.
	if (result.optionsUp) {
		praised = true
		return { text: translate('praise_tier'), tone: 'gold' }
	}

	// Первая похвала за партию приходит на третьем верном, а не на пятом: до
	// пятого доходят не все, а сказать «получается» надо тому, кто только начал.
	if (!praised && combo === 3) {
		praised = true
		return { text: translate('praise_good'), tone: 'good' }
	}

	// Дальше — ровно одна похвала на каждые пять верных подряд, и ни одной
	// между ними.
	//
	// Скорость сюда входит не отдельной похвалой, а словом: пять быстрых подряд
	// — то же самое достижение, что пять верных, только сделанное иначе. Пока
	// «Быстро!» жило своим счётчиком, обе похвалы накладывались и текст
	// появлялся через каждые два ответа. Похвала, которая приходит всегда, — уже
	// не похвала, а часть интерфейса.
	if (combo < 5 || combo % 5 !== 0) return null

	praised = true
	if (combo % 10 === 0) return { text: translate('praise_wow'), tone: 'gold' }
	if (fastRun >= 5) return { text: translate('praise_fast'), tone: 'good' }
	return { text: translate('praise_streak', { n: combo }), tone: 'gold' }
}

game.onLanded((result: I_ClimbResult) => {
	if (result.right) {
		playAudio('correct', {
			rate: 1 + Math.min(result.combo - 1, 13) * 0.036,
			maxMs: 420,
		})
		vibrate(result.combo % 5 === 0 ? 'life' : 'land')

		const cheered = praiseFor(result)
		if (cheered) {
			cheer(cheered.text, cheered.tone)
			// Поверх обычного ответа и много выше него: похвала не должна
			// смешаться с ним в одно пятно.
			playAudio('praise', { rate: 1.9, maxMs: 300 })
		}
		// Персонаж стоит этажом выше насеста — теперь мир съезжает к нему.
		glide(-pitch.value, 0, false)
		// Ряд, из которого он ушёл, теперь на уровне пола — оттуда и осыпается.
		ghosts.value = pendingRow.filter((item) => item.id !== pendingChosen)
		pendingRow = []
		pendingTower = []
		if (ghostTimer) clearTimeout(ghostTimer)
		ghostTimer = setTimeout(() => (ghosts.value = []), 520)
		// Знака «вода отступила» больше нет: отступать ей некуда, запас и так
		// полный. Осталась одна цифра — сколько дали за ответ.
		say(`+${result.points}`, 'good')
	} else {
		// Чем глубже провалился, тем ниже звук. Тот же приём, что у верного
		// ответа с комбо, только в другую сторону — и файл тот же.
		playAudio('error', { rate: 1 - Math.min(result.floorsLost, 4) * 0.08 })
		vibrate('miss')
		fastRun = 0
		say(result.floorsLost ? `−${result.floorsLost}` : '×', 'bad', 900)

		// Рушится всё, мимо чего он пролетел: ряд наверху целиком и те плиты
		// башни, что не смогли его поймать. Обломки снимаются на их экранной
		// высоте — с миром они больше не едут, мир уезжает без них.
		debris.value = [
			...pendingRow.map((item) => ({ ...item, y: baseY.value - pitch.value })),
			...pendingTower.slice(0, result.floorsLost).map((item, index) => ({
				...item,
				y: baseY.value + index * pitch.value,
			})),
		]
		pendingRow = []
		pendingTower = []
		if (debrisTimer) clearTimeout(debrisTimer)
		debrisTimer = setTimeout(() => (debris.value = []), 640)

		fallMs.value = fallTime(result.floorsLost)
		// Камере — потерянные этажи, персонажу — они же плюс тот, с которого он
		// сорвался. Вместе выходит ровно пролетевшее расстояние.
		glide(result.floorsLost * pitch.value, result.floorsLost + 1, true, result.landX)
	}
})

/*
   Сердцебиение у воды.

   Единственный проигрыш в игре до сих пор не звучал вовсе: при малом запасе
   картинка обесцвечивалась, и всё. Низкий пульс говорит «шевелись» лучше любой
   музыки — и, в отличие от музыки, он сам собой кончается, когда опасность
   прошла.
*/

/** С какого запаса начинает биться. Два этажа — это ещё не приговор, но уже
 *  повод торопиться. */
const DANGER_FROM = 2

/** Должно ли сейчас звучать. Пауза и итог его снимают. */
const dangerOn = computed(
	() =>
		!paused.value &&
		!isEnd.value &&
		game.running.value &&
		game.gap.value < DANGER_FROM
)

/**
 * Насколько быстро бьётся.
 *
 * Ставка растёт с приближением воды: у самой кромки пульс почти вдвое чаще, чем
 * на границе тревоги. Высота тона идёт за ней же — `preservesPitch` выключен, —
 * и это правильно: у испуга голос выше.
 *
 * Округление до двадцатых не косметика: запас меняется каждый кадр, и без него
 * ставка пересчитывалась бы шестьдесят раз в секунду.
 */
const dangerRate = computed(() => {
	const close = Math.min(1, Math.max(0, (DANGER_FROM - game.gap.value) / DANGER_FROM))
	return Math.round((1 + close * 0.7) * 20) / 20
})

watch([dangerOn, dangerRate], ([on, rate]) => {
	// Тише коротких звуков: это фон тревоги, а не событие.
	holdAudio('danger', on, { rate, volume: 0.55 })
})

game.onDrowned(() => endGame())

/* -------------------------------------------------------------- жизненный */

function endGame() {
	if (isEnd.value) return
	isEnd.value = true
	game.finish()
	playAudio('result')

	const summary: I_SessionSummary = {
		score: game.score.value,
		floor: game.topFloor.value,
		bestFloor: Math.max(previousBestFloor, game.topFloor.value),
		correct: game.correct.value,
		wrong: game.wrong.value,
		accuracy: game.answered.value
			? Math.round((game.correct.value / game.answered.value) * 100)
			: 0,
		bestCombo: game.bestCombo.value,
		topTier: game.tier.value,
		checkpoints: 0,
		challenges: 0,
		isRecord: game.topFloor.value > previousBestFloor,
		previousBestFloor,
		previousBestScore,
	}
	finalSummary.value = summary
	gameStore.finishSession(summary)

	if (Capacitor.getPlatform() === 'android' && adsStore.claimInterstitial()) {
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => adsStore.toggleLoading(false),
		})
	}
}

function togglePause(value: boolean) {
	if (isEnd.value) return
	paused.value = value
	if (value) game.pause()
	else game.resume()
}

function onVisibility() {
	if (document.hidden && game.running.value) togglePause(true)
}

function playAgain() {
	if (adsStore.loading) return
	pageStore.startRun()
}

function goHome() {
	if (adsStore.loading) return
	pageStore.toHome()
}

onMounted(async () => {
	document.addEventListener('visibilitychange', onVisibility)
	game.start()
	sinkRaf = requestAnimationFrame(sinkFrame)

	await nextTick()
	if (stageEl.value && typeof ResizeObserver !== 'undefined') {
		stageObserver = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect
			stageBox.value = { width, height }
		})
		stageObserver.observe(stageEl.value)
	}
})

onBeforeUnmount(() => {
	// Петля не кончается сама: уходя с доски, её надо остановить, иначе
	// сердцебиение переживёт партию и будет звучать на главной.
	holdSilence()
	if (sinkRaf) cancelAnimationFrame(sinkRaf)
	stageObserver?.disconnect()
	document.removeEventListener('visibilitychange', onVisibility)
	if (flashID) clearTimeout(flashID)
	if (glideTimer) clearTimeout(glideTimer)
	if (ghostTimer) clearTimeout(ghostTimer)
	if (debrisTimer) clearTimeout(debrisTimer)
	game.destroy()
})
</script>

<template>
	<div class="climb">
		<GameSky :floor="game.floor.value" :zone="location.id" />
		<!-- Касание разрешено только по концу партии: полоса стоит над доской, на
		     которой идёт счёт времени, и тап во время партии стоил бы её игроку. -->
		<AdSlot :interactive="isEnd" @open="isOtherGames = true" />

		<header class="hud">
			<button class="round" type="button" :aria-label="$t('pause')" @click="togglePause(true)">
				<AppIcon name="pause" :size="17" />
			</button>

			<div class="hud__score">
				<AppIcon name="crown" :size="18" />
				<b class="num">{{ groupDigits(game.score.value) }}</b>
			</div>

			<div class="hud__floor">
				<span class="cap">{{ $t('floor') }}</span>
				<b class="hud__height num">{{ game.floor.value }}</b>
			</div>

			<!-- Здоровье здесь — расстояние до воды. Сердечек нет: игрок и так
			     видит, сколько у него осталось, а два способа сказать одно и то
			     же спорят друг с другом. -->
			<div class="hud__gap" :class="{ 'is-danger': game.danger.value > 0.5 }">
				<AppIcon name="bolt" :size="15" />
				<b class="num">{{ Math.floor(game.gap.value) }}</b>
			</div>
		</header>

		<div v-if="game.question.value" class="ask">
			<div class="ask__expr num">{{ expression }} <span class="ask__q">= ?</span></div>
		</div>

		<!-- Сцена целиком — поверхность управления: персонаж бежит туда, где
		     палец, а короткий тап на месте засчитывается как прыжок. -->
		<main
			ref="stageEl"
			class="stage"
			:class="{ 'is-danger': game.danger.value > 0.6 }"
			:style="{ '--fall-ms': `${fallMs}ms` }"
			@pointerdown="onStageDown"
			@pointerup="onStageUp"
			@pointercancel="onStageCancel"
			@pointerleave="onStageCancel"
		>
			<!--
				Башня и ряд кандидатов едут вместе: это и есть подъём. Всё
				остальное — помост, персонаж, вода — живёт снаружи и своим
				временем.
			-->
			<!--
				Всё, что тонет, — одним слоем.

				Оседание висит на обёртке, а не на самих блоках: у мира и у
				персонажа свои переходы на прыжок и падение, и подмешивать к ним
				ещё и покадровый сдвиг значило бы, что они его сглаживают —
				то есть дрейф отставал бы от воды на треть секунды.
			-->
			<div class="sink" :style="sinkStyle">
			<!--
				Обломки: то, мимо чего он пролетел. Вне мира — они уже не башня,
				они падают.
			-->
			<div
				v-for="piece in debris"
				:key="`debris-${piece.id}`"
				class="block block--ghost"
				:style="{
					width: `${slotWidth}px`,
					height: `${floorHeight}px`,
					transform: `translate3d(${slotLeft(piece.x)}px, ${piece.y}px, 0)`,
				}"
			>
				<span
					class="slab slab--falling"
					:style="{
						'--face': brickTint(game.floor.value),
						'--cap': lighten(brickTint(game.floor.value), 0.2),
						'--bot': darken(brickTint(game.floor.value), 0.16),
						'--lip': darken(brickTint(game.floor.value), 0.4),
					}"
				>
					<b class="num">{{ piece.value }}</b>
				</span>
			</div>

			<!--
				Слой камеры: внутри и блоки, и персонаж, поэтому съезжают они
				жёстко вместе. Обломки снаружи — они уже не мир и с камерой не
				едут, они падают сами.
			-->
			<div class="cam" :class="{ 'is-gliding': gliding, 'is-dropping': dropping }" :style="camStyle">
			<div class="world">
				<!--
					Ряд кандидатов. Каждый блок — кнопка: нажал, и персонаж туда
					перепрыгнул.

					Пока ход идёт, ряда нет вовсе.

					Правила заводят новый пример сразу, как персонаж оторвался от
					прежней плиты, — но показывать его в тот же миг нельзя. Такты
					должны читаться по одному: прыгнул, пространство сдвинулось, и
					только потом вышли блоки. Пока ряд появлялся одновременно со
					сдвигом, три события накладывались в одно мгновение и ход
					выглядел обрывистым.

					На падении то же самое, но там причина ещё грубее: свежий ряд
					возникал ровно там, где персонаж в этот момент висит, и
					полсекунды выглядело, будто он стоит на блоке, которого секунду
					назад не было.
				-->
				<button
					v-for="(slot, index) in moving ? [] : game.slots.value"
					:key="slot.id"
					class="block"
					type="button"
					:disabled="game.jumping.value"
					:style="{
						width: `${slotWidth}px`,
						height: `${floorHeight}px`,
						transform: `translate3d(${slotLeft(slot.x)}px, ${baseY - pitch}px, 0)`,
					}"
					@click="choose(slot)"
				>
					<span
						class="slab"
						:class="{ 'is-pressed': pressing === slot.id }"
						:style="{
							animationDelay: `${index * 55}ms`,
							'--face': brickTint(game.floor.value + 1),
							'--cap': lighten(brickTint(game.floor.value + 1), 0.2),
							'--bot': darken(brickTint(game.floor.value + 1), 0.16),
							'--lip': darken(brickTint(game.floor.value + 1), 0.4),
						}"
					>
						<b class="num">{{ slot.value }}</b>
					</span>
				</button>

				<!-- Построенное под ногами. -->
				<div
					v-for="(item, index) in built"
					:key="item.id"
					class="block block--built"
					:style="{
						width: `${slotWidth}px`,
						height: `${floorHeight}px`,
						transform: `translate3d(${slotLeft(item.x)}px, ${baseY + index * pitch}px, 0)`,
						zIndex: String(20 - index),
					}"
				>
					<span
						class="slab slab--still"
						:style="{
							'--face': brickTint(item.floor),
							'--cap': lighten(brickTint(item.floor), 0.2),
							'--bot': darken(brickTint(item.floor), 0.16),
							'--lip': darken(brickTint(item.floor), 0.4),
						}"
					>
						<b class="num">{{ item.value }}</b>
					</span>
				</div>

				<!--
					Земля, с которой начался подъём.

					Она не «пол под ногами», а именно земля: на нулевом этаже
					персонаж стоит на ней, а дальше она уезжает вниз вместе со всей
					башней и через несколько этажей уходит с экрана. Пока она
					висела снаружи мира, линия оставалась под ногами навсегда и
					подъём выглядел топтанием на месте.
				-->
				<div
					v-if="groundY !== null"
					class="walk"
					:style="{ transform: `translate3d(0, ${groundY}px, 0)` }"
				/>

				<!--
					Невыбранные блоки прошлого ряда. Едут вместе с миром — они ещё
					были его частью, — и оттуда осыпаются. Без них ряд просто
					подменялся, и смена читалась как склейка.
				-->
				<div
					v-for="ghost in ghosts"
					:key="`ghost-${ghost.id}`"
					class="block block--ghost"
					:style="{
						width: `${slotWidth}px`,
						height: `${floorHeight}px`,
						transform: `translate3d(${slotLeft(ghost.x)}px, ${baseY}px, 0)`,
					}"
				>
					<span
						class="slab slab--falling"
						:style="{
						'--face': brickTint(game.floor.value),
						'--cap': lighten(brickTint(game.floor.value), 0.2),
						'--bot': darken(brickTint(game.floor.value), 0.16),
						'--lip': darken(brickTint(game.floor.value), 0.4),
					}"
				>
						<b class="num">{{ ghost.value }}</b>
					</span>
				</div>
			</div>

			<!-- Персонаж. Внутри слоя камеры: с блоками он едет как одно целое. -->
			<div class="player" :class="{ 'is-gliding': gliding, 'is-dropping': dropping }" :style="playerStyle">
				<Mascot class="player__art" :class="{ 'is-air': game.jumping.value }" />

				<!--
					Реплика — над головой, а не в углу. Живёт внутри персонажа:
					снаружи её приходилось считать от статичного этажа, и на
					падении она отставала от него и ложилась поверх лица.
				-->
				<transition name="say">
					<div v-if="flash" :key="flash.id" class="say" :class="`is-${flash.tone}`">
						{{ flash.text }}
					</div>
				</transition>
			</div>
			</div>
			</div>

			<!--
				Похвала. Отдельно от цифры очков: цифра принадлежит персонажу и
				едет с ним, а похвала принадлежит всей сцене.
			-->
			<transition name="cheer">
				<div
					v-if="praise"
					:key="praise.id"
					class="cheer"
					:class="`is-${praise.tone}`"
					:style="{ top: `${praiseY}px` }"
				>
					{{ praise.text }}
				</div>
			</transition>

			<!--
				Опасность. Стоит на месте: к ней съезжает мир.

				Какая именно — решает высота: у каждой локации своё. Вода, лава,
				сосульки, мухоморы — правила у них одни и те же, разный только вид.
			-->
			<GameHazard
				:kind="location.hazard"
				:style="{ transform: `translate3d(0, ${waterY}px, 0)` }"
			/>
		</main>

		<transition name="fade">
			<div v-if="paused && !isEnd" class="overlay">
				<div class="overlay__box">
					<div class="overlay__title">{{ $t('paused') }}</div>
					<button class="btn btn--play" type="button" @click="togglePause(false)">
						<AppIcon name="play" :size="18" />
						{{ $t('resume') }}
					</button>
					<button class="btn btn--ghost" type="button" @click="goHome">
						<AppIcon name="home" :size="17" />
						{{ $t('main_menu') }}
					</button>
				</div>
			</div>
		</transition>

		<GameOverCard
			v-if="isEnd && finalSummary"
			:summary="finalSummary"
			:busy="adsStore.loading"
			@again="playAgain"
			@home="goHome"
		/>

		<OtherGames v-if="isOtherGames" @close="isOtherGames = false" />
	</div>
</template>

<style lang="scss" scoped>
.climb {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100dvh;
	overflow: hidden;
	padding-top: var(--ad-band, 56px);
}

/* ==================================================================== HUD */
.hud {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 8px 12px 0;
}

.round {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 40px;
	height: 40px;
	flex: 0 0 40px;
	padding: 0;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	color: #fff;
	@include face(#9280f7, #7b62e8, #6246d6);
	@include raised(#3f2ba0, 4px, 0.54, 0.22, 0.36, 2.5px);

	&:active {
		@include press(4px);
	}
}

.hud {
	&__score {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 40px;
		font-size: 15px;
		font-weight: 900;
		color: #fff;
		text-shadow: 0 2px 0 rgba(10, 14, 45, 0.5);
	}

	&__floor {
		margin: 0 auto;
		padding: 3px 13px 5px;
		border-radius: var(--r-panel);
		text-align: center;
		@include panel(4px);
	}

	&__height {
		display: block;
		font-size: 23px;
		font-weight: 900;
		line-height: 1.05;
		color: #fff;
	}

	/* Запас до воды. Красный — не украшение: это единственное предупреждение,
	   которое игра успевает дать. */
	&__gap {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 40px;
		font-size: 16px;
		font-weight: 900;
		color: #7de3a0;
		text-shadow: 0 2px 0 rgba(10, 14, 45, 0.5);
		transition: color 200ms var(--soft);

		&.is-danger {
			color: #ff8b84;
			animation: pulse 700ms var(--soft) infinite;
		}
	}
}

@keyframes pulse {
	50% {
		opacity: 0.5;
	}
}

/* ================================================================= ПРИМЕР */
.ask {
	position: relative;
	z-index: 5;
	margin: 8px 14px 0;
	padding: 7px 14px 8px;
	border-radius: var(--r-card);
	background: linear-gradient(180deg, #ffffff, #eef1fb);
	box-shadow: inset 0 2px 0 #fff, inset 0 -5px 0 rgba(160, 170, 205, 0.42),
		0 5px 0 rgba(112, 124, 168, 0.5), 0 12px 20px rgba(5, 8, 30, 0.42);

	&__expr {
		text-align: center;
		font-size: 30px;
		font-weight: 900;
		line-height: 1.1;
		color: var(--text-ink);
	}

	&__q {
		color: #6c78a8;
	}
}

/* ================================================================== СЦЕНА */
.stage {
	position: relative;
	z-index: 4;
	flex: 1;
	min-height: 0;
	overflow: hidden;
	touch-action: none;
	/* Перетаскивание по сцене не должно выделять цифры и вызывать лупу. */
	user-select: none;
	-webkit-user-select: none;
	-webkit-touch-callout: none;
	transition: filter 300ms var(--soft);

	&.is-danger {
		filter: saturate(0.85);
	}
}

/*
   Переход включается только на переезде. Постоянный он тут стоять не может:
   первый кадр переезда ставит сдвиг мгновенно — именно тем, что мир рисуется
   там же, где был, — и анимировать этот кадр нельзя.
*/
/* Слой оседания. Переходов на нём нет намеренно: он должен идти ровно за
   водой, кадр в кадр. */
.sink {
	position: absolute;
	inset: 0;
	will-change: transform;
}

/*
   Слой камеры. Он и есть «мир поехал»: внутри него и блоки, и персонаж, поэтому
   едут они жёстко вместе и разойтись не могут.
*/
.cam {
	position: absolute;
	inset: 0;
	will-change: transform;

	/*
	   Кривая с мягким началом, а не `--soft`.

	   `--soft` — это ease-out: он берёт полную скорость с первого кадра. Мир
	   стоял и должен тронуться, а не рвануть; и прийти он должен тоже в покой.
	   Резкое начало сразу после прыжка и было половиной той обрывистости.
	*/
	&.is-gliding {
		transition: transform 520ms cubic-bezier(0.4, 0.02, 0.3, 1);
	}

	/* Падение: тот же курс и та же длительность, что у персонажа. Разойдись
	   они — и блоки приедут раньше него, то есть он приземлится не на плиту,
	   а рядом с ней. */
	&.is-gliding.is-dropping {
		transition-duration: var(--fall-ms, 440ms);
		transition-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
	}
}

.world {
	position: absolute;
	inset: 0;
}

/*
   Блок — только позиция, грань — только вид.

   Разделено намеренно: положение задаётся инлайновым трансформом, а появление и
   осыпание — CSS-анимацией. В одном элементе они бы подрались: анимация
   трансформа перебивает инлайновый стиль и блок улетал бы в угол сцены.
*/
.block {
	position: absolute;
	left: 0;
	top: 0;
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;

	&:disabled {
		cursor: default;
	}

	&--built,
	&--ghost {
		pointer-events: none;
	}
}

.slab {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
	border-radius: var(--r-slab);
	@include face(var(--cap), var(--face), var(--bot));
	@include raised(var(--lip), 5px, 0.46, 0.2, 0.3, 2.5px);
	/* Новый ряд не возникает, а приходит: с задержкой по порядку, чтобы это
	   читалось как «выложили», а не как «подменили». */
	animation: slab-in 320ms var(--pop) both;

	b {
		font-size: 22px;
		font-weight: 900;
		color: #fff;
		text-shadow: 0 2px 0 rgba(10, 20, 60, 0.36);
	}

	/* Построенное уже стоит — ему появляться незачем. */
	&--still {
		animation: none;
	}

	/* Невыбранный блок уходит вниз и в сторону от того места, куда прыгнули. */
	&--falling {
		animation: slab-fall 520ms var(--fall) both;
	}

}

/* Нажатие показывает не блок, а колонка: палец до блока может и не доставать,
   а отклик на касание быть обязан. */
.block:not(:disabled):active .slab,
.slab.is-pressed {
	@include press(5px);
}

@keyframes slab-in {
	from {
		opacity: 0;
		transform: scale(0.72);
	}
	62% {
		opacity: 1;
		transform: scale(1.06);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes slab-fall {
	from {
		opacity: 1;
		transform: translateY(0) rotate(0deg);
	}
	to {
		opacity: 0;
		transform: translateY(150px) rotate(16deg);
	}
}

/*
   Помост — линия текущего этажа.

   Персонаж всегда стоит на блоке, кроме самого начала партии, когда башни ещё
   нет. Но помост нужен не только ради этого: он даёт сцене пол и показывает,
   на какой высоте идёт дело, — без него блоки висят в небе без всякого
   основания.
*/
.walk {
	position: absolute;
	left: -4%;
	right: -4%;
	top: 0;
	height: 11px;
	z-index: 18;
	pointer-events: none;
	border-radius: 4px;
	background: linear-gradient(180deg, #6a5c8f 0 3px, #453a6c 3px 7px, #2c2450 7px 100%);
	box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.26), 0 3px 0 #1a1436,
		0 8px 14px rgba(5, 8, 30, 0.4);
}

/* ============================================================== ПЕРСОНАЖ */
.player {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 30;
	pointer-events: none;
	will-change: transform;

	/*
	   Переход — только на падении.

	   На верном ответе персонаж не двигается вовсе: его вертикаль сбрасывается
	   мгновенно, а везёт его камера. Стоял бы переход и здесь — оба движения
	   сложились бы, и он проехал бы этаж дважды.
	*/
	&.is-gliding.is-dropping {
		transition: transform var(--fall-ms, 440ms) cubic-bezier(0.5, 0, 0.9, 0.5);
	}

	&__art {
		display: block;
		width: 40px;
		height: auto;
		margin: -34px 0 0 -20px;
		transition: transform 120ms var(--soft);

		&.is-air {
			transform: scaleY(1.08) scaleX(0.94);
		}
	}
}

/* ================================================================ РЕПЛИКА */
.say {
	position: absolute;
	left: 0;
	/* Над макушкой: арт поднят на 34px от точки опоры и сам 40px высотой. */
	top: -64px;
	z-index: 40;
	margin-left: -40px;
	width: 80px;
	text-align: center;
	font-size: 22px;
	font-weight: 900;
	pointer-events: none;
	color: var(--fill);
	text-shadow: -2px -2px 0 var(--ink), 2px -2px 0 var(--ink), -2px 2px 0 var(--ink),
		2px 2px 0 var(--ink), 0 4px 0 var(--ink), 0 0 14px var(--glow);
}

.is-good {
	--fill: #d9ffb0;
	--ink: #1c5b28;
	--glow: rgba(140, 240, 110, 0.6);
}

.is-gold {
	--fill: #fff0b8;
	--ink: #8a5406;
	--glow: rgba(255, 190, 70, 0.65);
}

.is-bad {
	--fill: #ffd9d2;
	--ink: #8e1f1a;
	--glow: rgba(255, 110, 90, 0.6);
}

.say-enter-active {
	animation: say-in 240ms var(--pop);
}

.say-leave-active {
	animation: say-out 240ms var(--soft) forwards;
}

@keyframes say-in {
	from {
		opacity: 0;
		transform: translateY(8px) scale(0.8);
	}
}

@keyframes say-out {
	to {
		opacity: 0;
	}
}



/*
   Похвала.

   Стоит над доской, но ниже карточки примера: перекрыть пример нельзя — по нему
   играют. Уходит вверх и растворяется, поэтому не требует места под себя и не
   спорит с блоками за него.
*/
.cheer {
	position: absolute;
	left: 0;
	right: 0;
	z-index: 45;
	text-align: center;
	font-size: 27px;
	font-weight: 900;
	letter-spacing: 0.5px;
	pointer-events: none;
	color: var(--fill);
	text-shadow: -2px -2px 0 var(--ink), 2px -2px 0 var(--ink), -2px 2px 0 var(--ink),
		2px 2px 0 var(--ink), 0 5px 0 var(--ink), 0 0 20px var(--glow);
}

.cheer-enter-active {
	animation: cheer-in 320ms var(--pop);
}

.cheer-leave-active {
	animation: cheer-out 320ms var(--soft) forwards;
}

@keyframes cheer-in {
	from {
		opacity: 0;
		transform: translateY(16px) scale(0.7);
	}
}

@keyframes cheer-out {
	to {
		opacity: 0;
		transform: translateY(-26px) scale(1.04);
	}
}

/* ================================================================== ПАУЗА */
.overlay {
	position: absolute;
	top: var(--ad-band, 56px);
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 60;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(6, 9, 30, 0.72);
	backdrop-filter: blur(7px);

	&__box {
		width: min(300px, 78vw);
		padding: 20px 18px 18px;
		border-radius: var(--r-card);
		text-align: center;
		background: linear-gradient(180deg, var(--sheet-top), var(--sheet-bot));
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 6px 0 var(--panel-lip),
			0 22px 44px rgba(4, 6, 24, 0.6);
	}

	&__title {
		margin-bottom: 16px;
		font-size: 22px;
		font-weight: 900;
		letter-spacing: 3px;
		text-transform: uppercase;
		color: #fff;
	}
}

.btn {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 9px;
	width: 100%;
	height: 52px;
	/* Считается от того, что кнопка занимает на экране: у `--play` ниже box
	   выступают губа (5px) и обводка (2.5px), и десяти пикселей на зазор не
	   оставалось почти ничего. */
	margin-top: 16px;
	border: none;
	border-radius: var(--r-btn);
	cursor: pointer;
	font-size: 16px;
	font-weight: 900;
	letter-spacing: 1.4px;
	text-transform: uppercase;
	color: #fff;

	&--play {
		@include face(#9280f7, #7b62e8, #6246d6);
		@include raised(#3f2ba0, 5px, 0.5, 0.2, 0.45, 2.5px);
	}

	&--ghost {
		background: rgba(255, 255, 255, 0.07);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.12);
		color: var(--text-dim);
	}

	&:active {
		@include press(5px);
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 180ms var(--soft);
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
