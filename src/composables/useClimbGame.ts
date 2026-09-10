import { computed, ref } from 'vue'

import { COMBO_CAP, BASE_POINTS } from '@/utils/conts'
import { nextQuestion } from '@/utils/mathEngine'
import { createDifficulty, feed, optionsForTier, shownTier } from '@/utils/difficulty'
import { I_Question, TYPE_OP } from '@/utils/types'

/**
 * Правила подъёма.
 *
 * Игрок выбирает блок нажатием — ловкость тут ни при чём. Персонаж
 * перепрыгивает на выбранный блок сам: промахнуться ногами нельзя, ошибиться
 * можно только в счёте. Это осознанное решение — игру ставят детям ради
 * математики, и проваливать пример, который ребёнок знает, из-за медленного
 * пальца было бы нечестно.
 *
 * Давление всё равно есть, но не в виде часов в углу: снизу поднимается вода.
 * Её видно, и она объясняет себя без единой цифры.
 *
 * Композабл ничего не рисует и ничего не ждёт: он считает кадр, а страница
 * решает, как это показать.
 */

/** Сколько блоков-кандидатов стоит над игроком. Берётся из тира сложности. */
export interface I_Slot {
	id: number
	value: number
	/** Тот ли это блок. Игроку не показывается, пока он не прыгнет. */
	right: boolean
	/** Центр блока по ширине сцены, 0…1. */
	x: number
	/** Сломан прыжком — уходит вниз и больше не держит. */
	broken: boolean
}

/** Поля по краям сцены: крайние блоки не должны упираться в рамку. */
const EDGE = 0.1

/**
 * Какую долю ширины сцены занимает блок.
 *
 * Живёт в правилах, а не в вёрстке, потому что от неё зависит не только вид:
 * по ней решается, поймает ли плита падающего. Блоки занимают не всю ширину, а
 * её часть — между ними должен остаться промежуток, в который можно
 * провалиться, иначе падать было бы некуда и промах ничего не стоил бы.
 */
export function slotShare(count: number): number {
	return count <= 2 ? 0.3 : count === 3 ? 0.26 : 0.21
}

/** Плита в башне. Каждая — чей-то верный ответ. */
export interface I_Brick {
	id: number
	value: number
	/** Этаж, на котором она стоит. */
	floor: number
	/** Центр по ширине сцены, 0…1. */
	x: number
	/** Полуширина в тех же долях: по ней и решается, поймает ли она падающего. */
	half: number
}

/** Сколько длится прыжок от отрыва до приземления. */
export const JUMP_MS = 340

/**
 * Дуга прыжка, 0…1, где 1 — целый шаг этажа.
 *
 * Персонаж действительно поднимается на блок и остаётся на нём: вниз его
 * вернёт только промах. Мир при этом стоит — он поедет после, когда камера
 * будет догонять.
 *
 * Замедление к концу: так и прыгают на приступок — усилие на отрыве, а к самой
 * плите подходят почти без скорости. Отсюда `1 − (1−t)²`, а не что-то с
 * перелётом: перелёт хорош, когда после него есть падение, а тут его нет.
 */
function arc(t: number): number {
	const left = 1 - t
	return 1 - left * left
}

/**
 * Наибольший запас, в этажах. Он же и стартовый.
 *
 * Вода не отстаёт больше: обогнал — она подтягивается следом. Раньше запас рос
 * без предела, и это ломало сразу три вещи.
 *
 * Игрок, решавший быстро, уходил на десятки этажей вперёд, и дальше в игре не
 * происходило ничего: вода была далеко и добиралась до него минутами. Шкала
 * оседания упиралась в свой потолок и замирала — мир перестававал двигаться
 * вовсе. А верный ответ на самом верху шкалы двигал её обратно вниз, и после
 * прыжка блоки заметно приподнимались: награда за ответ выглядела рывком не в
 * ту сторону.
 *
 * С потолком запас всегда в пределах шкалы. Мир едет вниз непрерывно, верный
 * ответ поднимает его ровно на столько, сколько успела съесть вода, — и
 * «уйти вперёд» больше нельзя: можно только держаться.
 */
export const MAX_GAP = 4

/**
 * Насколько вода разгоняется за время партии.
 *
 * Без этого партия у сильного игрока не кончалась вовсе: он решает быстрее,
 * чем вода поднимается, и подъём превращается в бесконечную таблицу умножения.
 * Разгон — это то, что делает счёт счётом: рано или поздно вода догонит
 * любого, и весь вопрос в том, на каком этаже.
 *
 * За полторы минуты вода удваивается и дальше растёт тем же шагом. Потолок
 * стоит далеко — на тринадцатой минуте, — и это не запас на всякий случай, а
 * необходимость: с прежним потолком в тройку безошибочный игрок не тонул
 * вовсе. Замер показал восемнадцать минут, восемьсот восемьдесят восьмой этаж
 * и запас в шестьсот этажей, который всё рос: разгон упирался в потолок
 * раньше, чем вода успевала догнать подъём, и дальше они шли параллельно.
 *
 * Обычной партии потолок не касается: до него доживает только тот, кто идёт
 * без единой ошибки дольше десяти минут. Медленный игрок тонет на второй
 * минуте что с потолком в три, что в десять — там работает не он, а сам шаг.
 */
function ageBoost(seconds: number): number {
	return Math.min(10, 1 + seconds / 90)
}

/**
 * Скорость воды в этажах за секунду.
 *
 * Три множителя, и каждый отвечает за своё. Тир — за то, что примеры стали
 * длиннее и думать над ними дольше. Разрыв — за то, что у самой воды страшнее,
 * чем высоко над ней: так проигрыш не наступает внезапно, но и отсидеться на
 * запасе нельзя. Время — за то, что партия обязана кончиться.
 */
function waterRate(tier: number, gap: number, seconds: number): number {
	// Этаж примерно за семь секунд на старте. Мерка тут одна: верный ответ
	// даёт этаж, и вода должна отнимать его за время, сравнимое с тем, за
	// которое ответ дают. Прежние двадцать секунд на этаж означали, что вода
	// просто не участвует в игре — обогнать её можно было чем угодно.
	const base = 0.14 + Math.max(0, tier) * 0.012
	const close = gap < 2 ? 1.5 : gap < 3 ? 1.2 : 1
	return base * close * ageBoost(seconds)
}

/**
 * Чего стоит промах, который ничего не стоил, в этажах воды.
 *
 * Падение платит этажами, но иногда платить нечем: если неверная плита стояла
 * ровно над той, на которой он и так стоял, он падает обратно на неё и не
 * теряет ничего. Тогда платит вода — на тот же этаж, который даёт верный
 * ответ. Иначе внизу башни, где колонка всего одна, ошибаться было бы
 * бесплатно.
 */
const MISS_SURGE = 1

export interface I_ClimbResult {
	right: boolean
	value: number
	/** Сколько игрок думал над этим примером. Отсюда похвала за скорость. */
	elapsedMs: number
	/**
	 * Этим ответом на доске стало больше вариантов.
	 *
	 * Не «поднялся тиром выше»: тир растёт каждые несколько ответов, и хвалить
	 * за каждый его шаг — снова превращать похвалу в фон. А вот когда вариантов
	 * становится три вместо двух, доска меняется у игрока на глазах, и это
	 * стоит назвать.
	 */
	optionsUp: boolean
	/** Сколько этажей отнял промах. У верного ответа всегда 0. */
	floorsLost: number
	/** Где он окажется по ширине сцены, когда всё кончится. */
	landX: number
	points: number
	combo: number
	floor: number
	drowned: boolean
}

export function useClimbGame() {
	const floor = ref(0)
	const topFloor = ref(0)
	const score = ref(0)
	const combo = ref(0)
	const bestCombo = ref(0)
	const correct = ref(0)
	const wrong = ref(0)

	const running = ref(false)
	const finished = ref(false)

	/** Где вода, в этажах. Может быть дробной — она поднимается непрерывно. */
	const water = ref(-MAX_GAP)
	/** Сколько партия уже идёт, в секундах. От этого вода и разгоняется. */
	const played = ref(0)

	/** Где игрок по ширине сцены, 0…1. На прыжке едет к выбранному блоку. */
	const playerX = ref(0.5)
	/** Дуга прыжка, 0…1, где 1 — целый шаг этажа. */
	const jump = ref(0)
	const jumping = ref(false)

	const question = ref<I_Question | null>(null)
	const slots = ref<I_Slot[]>([])

	/**
	 * Башня, сверху вниз. Не украшение, а опора: от того, в какой колонке
	 * стоит плита, зависит, поймает ли она падающего и на сколько этажей
	 * провалится промах.
	 */
	const tower = ref<I_Brick[]>([])

	const difficulty = ref(createDifficulty())

	let carry = 0
	let lastOp: TYPE_OP | null = null
	let slotId = 0
	let brickId = 0
	let rafId = 0
	let lastFrame = 0
	let askedAt = 0
	let jumpStarted = 0
	/** Откуда и куда идёт текущий прыжок, и на какой блок он нацелен. */
	let jumpFrom = 0.5
	let jumpTo = 0.5
	let jumpSlot: I_Slot | null = null
	let onDrown: ((result: I_ClimbResult) => void) | null = null
	let onLand: ((result: I_ClimbResult) => void) | null = null

	const answered = computed(() => correct.value + wrong.value)
	const tier = computed(() => shownTier(difficulty.value, answered.value))

	/** Сколько этажей между игроком и водой. Это и есть его здоровье. */
	const gap = computed(() => Math.max(0, floor.value - water.value))

	/** Насколько всё плохо, 0…1 — для тревоги в интерфейсе. */
	const danger = computed(() => Math.max(0, Math.min(1, 1 - gap.value / 3)))

	// ------------------------------------------------------------------ ряд --

	/** Ставит над игроком новый ряд блоков и заводит новый пример. */
	function deal() {
		if (finished.value) return
		const tierNow = shownTier(difficulty.value, answered.value)
		const next = nextQuestion(carry, tierNow, lastOp, optionsForTier(tierNow))
		question.value = next

		const values = next.options
		slots.value = values.map((value, index) => ({
			id: ++slotId,
			value,
			right: value === next.result,
			// Блоки стоят с одинаковым шагом и с полями по краям: крайний не
			// должен уезжать за экран, а попадание должно зависеть от того, куда
			// игрок добежал, а не от того, повезло ли ему с расстоянием.
			x: EDGE + ((index + 0.5) / values.length) * (1 - EDGE * 2),
			broken: false,
		}))
		askedAt = performance.now()
	}

	// ----------------------------------------------------------------- ход ---

	/** Прыгнуть на выбранный блок. Куда прыгнули — туда и попали. */
	function leap(slot: I_Slot) {
		if (!running.value || finished.value || jumping.value || slot.broken) return
		jumpFrom = playerX.value
		jumpTo = slot.x
		jumpSlot = slot
		jumping.value = true
		jumpStarted = performance.now()
	}

	/** Прыжок долетел. Здесь и решается всё. */
	function land() {
		jumping.value = false
		jump.value = 0

		const slot = jumpSlot
		jumpSlot = null
		if (!slot) return
		const elapsedMs = Math.max(0, performance.now() - askedAt)

		const right = slot.right
		let points = 0
		let floorsLost = 0
		let landX = slot.x

		if (right) {
			correct.value += 1
			combo.value += 1
			if (combo.value > bestCombo.value) bestCombo.value = combo.value
			floor.value += 1
			topFloor.value = Math.max(topFloor.value, floor.value)

			// Плита остаётся там, где он её взял. Башня получается зигзагом —
			// и это не украшение: колонка, в которой она стоит, однажды его
			// поймает или не поймает.
			tower.value = [
				{
					id: ++brickId,
					value: slot.value,
					floor: floor.value,
					x: slot.x,
					half: slotShare(slots.value.length) / 2,
				},
				...tower.value,
			]

			points = BASE_POINTS * Math.min(combo.value, COMBO_CAP) + (question.value?.tier ?? 0) * 3
			score.value += points

			carry = question.value?.result ?? 0
			lastOp = question.value?.op ?? null

			// Вода подтягивается за поднявшимся. Иначе запас копился бы без
			// предела, и всё, что описано у `MAX_GAP`, возвращалось бы.
			//
			// Здесь же кончилась и прежняя награда за серию — «пять подряд
			// отгоняют воду на этаж». С потолком отгонять некуда: запас и так
			// полный. Серия теперь платит очками и похвалой, и это честнее —
			// награда за мастерство не должна выключать саму игру.
			water.value = Math.max(water.value, floor.value - MAX_GAP)
		} else {
			wrong.value += 1
			combo.value = 0
			slot.broken = true

			// Падает он отвесно — по той колонке, в которую прыгнул, — пока
			// его не поймает плита. Ловит первая же, что стоит достаточно
			// близко по ширине; соседняя колонка не ловит, между ними воздух.
			// Не поймает ни одна — падать он будет до земли, а земля это
			// нулевой этаж.
			const caught = tower.value.find((brick) => Math.abs(brick.x - slot.x) <= brick.half)
			const landed = caught ? caught.floor : 0

			floorsLost = floor.value - landed
			floor.value = landed
			landX = caught ? caught.x : slot.x

			// Всё, мимо чего он пролетел, рушится вместе с ним.
			if (floorsLost > 0) tower.value = tower.value.filter((brick) => brick.floor <= landed)

			// Бывает, что терять нечего: неверная плита стояла ровно над той,
			// на которой он стоял, и он свалился обратно на неё. Тогда платит
			// вода — промах не должен быть бесплатным нигде.
			else water.value += MISS_SURGE

			// Цепочка рвётся: следующий пример начнётся заново.
			carry = 0
			lastOp = null
		}

		// Результат обязан быть присвоен: `feed` ничего не мутирует, он считает
		// новое состояние и возвращает его. Здесь стоял вызов без присваивания —
		// и вся лестница сложности была мертва. Тир навсегда оставался нулевым,
		// то есть на любом этаже игрок видел два варианта и плюс-минус в
		// пределах двадцати, сколько бы верных подряд ни дал.
		const optionsBefore = slots.value.length
		const step = feed(difficulty.value, {
			correct: right,
			elapsedMs,
			options: optionsBefore,
		})
		difficulty.value = step.next

		// Сравнивать надо здесь: следующий ряд `deal()` выложит уже после того,
		// как страница получит результат.
		const optionsUp =
			optionsForTier(shownTier(difficulty.value, answered.value)) > optionsBefore

		const result = out(right, slot.value, points, floorsLost, landX, elapsedMs, optionsUp)
		onLand?.(result)

		// Новый пример нужен в обоих случаях: после промаха игрок стоит на другой
		// плите, и цепочка начинается заново.
		if (!checkDrown()) deal()
	}

	function out(
		right: boolean,
		value: number,
		points: number,
		floorsLost = 0,
		landX = playerX.value,
		elapsedMs = 0,
		optionsUp = false
	): I_ClimbResult {
		return {
			right,
			value,
			elapsedMs,
			optionsUp,
			floorsLost,
			landX,
			points,
			combo: combo.value,
			floor: floor.value,
			drowned: false,
		}
	}

	function checkDrown(): boolean {
		if (water.value < floor.value) return false
		finish()
		onDrown?.({ ...out(false, 0, 0), drowned: true })
		return true
	}

	// ---------------------------------------------------------------- кадр ---

	function frame(now: number) {
		rafId = requestAnimationFrame(frame)

		if (!running.value || finished.value) {
			lastFrame = now
			return
		}

		let delta = lastFrame ? now - lastFrame : 0
		lastFrame = now
		// Вебвью в фоне не получает кадров. Возврат из звонка не должен стоить
		// партии, поэтому скачок отбрасывается, а не начисляется воде.
		if (delta > 250 || delta < 0) delta = 0

		// Прыжок. Персонаж поднимается на целый этаж и там остаётся; мир на это
		// время стоит. Догонять будет камера, и уже после приземления.
		if (jumping.value) {
			const t = Math.min(1, (now - jumpStarted) / JUMP_MS)
			jump.value = arc(t)
			// Горизонталь едет вместе с дугой: это один прыжок на выбранный блок,
			// а не «сначала дошёл, потом подпрыгнул».
			playerX.value = jumpFrom + (jumpTo - jumpFrom) * t
			if (t >= 1) land()
		}

		played.value += delta / 1000
		water.value += waterRate(tier.value, gap.value, played.value) * (delta / 1000)
		checkDrown()
	}

	// ---------------------------------------------------------------- поток --

	function start() {
		if (finished.value) return
		floor.value = 0
		water.value = -MAX_GAP
		played.value = 0
		playerX.value = 0.5
		tower.value = []
		deal()
		lastFrame = 0
		running.value = true
		if (!rafId) rafId = requestAnimationFrame(frame)
	}

	function pause() {
		running.value = false
	}

	function resume() {
		if (finished.value) return
		lastFrame = 0
		askedAt = performance.now()
		running.value = true
	}

	function finish() {
		if (finished.value) return
		finished.value = true
		running.value = false
	}

	function destroy() {
		if (rafId) cancelAnimationFrame(rafId)
		rafId = 0
		running.value = false
	}

	return {
		floor,
		topFloor,
		score,
		combo,
		bestCombo,
		correct,
		wrong,
		answered,
		tier,
		water,
		gap,
		danger,
		playerX,
		jump,
		jumping,
		question,
		slots,
		tower,
		running,
		finished,
		leap,
		start,
		pause,
		resume,
		finish,
		destroy,
		onDrowned(callback: (result: I_ClimbResult) => void) {
			onDrown = callback
		},
		onLanded(callback: (result: I_ClimbResult) => void) {
			onLand = callback
		},
	}
}
