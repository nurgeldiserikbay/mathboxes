import { computed, ref, shallowRef } from 'vue'

import {
	BASE_POINTS,
	COMBO_CAP,
	LIFE_BONUS_SCORE,
	LIFE_EVERY,
	MAX_LIVES,
	START_LIVES,
} from '@/utils/conts'
import { isCorrectAnswer, nextQuestion } from '@/utils/mathEngine'
import { createDifficulty, feed, optionsForTier, shownTier } from '@/utils/difficulty'
import { floorAfterMiss, isSafeFloor, nextSafeFloor, zoneIndex } from '@/utils/floors'
import {
	CALM_TIME,
	RUSH_SCORE,
	RUSH_TIER,
	RUSH_TIME,
	SUPPORT_STEP,
	isForkFloor,
} from '@/utils/boons'
import {
	BONUS_SCORE,
	DOUBLE_SECONDS,
	PERFECT_SCORE,
	QUICK_SCORE,
	advance as advanceChallenge,
	rollChallenge,
} from '@/utils/challenges'
import {
	I_Challenge,
	I_Floor,
	I_SessionSummary,
	TYPE_BOON,
	TYPE_CHALLENGE,
	TYPE_OP,
} from '@/utils/types'

/**
 * Game state. One loop, and everything in the game is a consequence of it:
 *
 *   solve → build the floor → climb → beat your best
 *
 * The tower is `stack`. `stack[0]` is always the live floor — the one showing a
 * "?" at the bottom of the screen — and everything after it is floors already
 * built, in descending order. Adding a floor unshifts, which is what makes the
 * whole tower slide up by one course with a single CSS transition.
 *
 * The composable never animates and never waits: `answer()` settles the rules
 * immediately, and the page calls `advance()` when its animation has played.
 * Keeping the two apart is what stops a slow frame from changing the score.
 */

/** Floors kept in the DOM. Deeper than any screen shows. */
const MAX_STACK = 14

/**
 * The clock on one floor.
 *
 * It scales with the tier because a three-digit sum takes longer to *read* than
 * to work out, and with the number of answers for the same reason — four options
 * are four numbers to scan before the arithmetic even starts. The base is set
 * against the ladder's own idea of slow (an answer past 6.5 s earns almost
 * nothing towards the next tier), so the clock runs out a little after the point
 * where an answer has stopped counting as a good one.
 */
export function questionTimeMs(tier: number, options: number): number {
	return 4800 + Math.max(0, tier) * 420 + Math.max(0, options - 2) * 320
}

export interface I_AnswerResult {
	correct: boolean
	/** The true result of the equation, right or wrong. */
	trueValue: number
	points: number
	/** Score awarded outside the answer itself: a challenge, a full-hearts bonus. */
	bonus: number
	combo: number
	floor: number
	floorsLost: number
	lostLife: boolean
	gainedLife: boolean
	/** The floor just built is a checkpoint. */
	checkpoint: boolean
	/** The mistake was absorbed by a FLOOR SHIELD. */
	shielded: boolean
	/** Nothing was picked — the clock ran out. */
	timedOut: boolean
	tierMoved: -1 | 0 | 1
	challengeStarted: TYPE_CHALLENGE | null
	challengeDone: TYPE_CHALLENGE | null
	challengeFailed: boolean
	/** The climb crossed into a new colour zone. */
	newZone: boolean
	/** The checkpoint opened the fork: the board has a choice to put up. */
	forkOpened: boolean
	gameOver: boolean
}

export function useTowerGame() {
	const stack = ref<I_Floor[]>([])
	const floor = ref(0)
	const topFloor = ref(0)
	const score = ref(0)
	const lives = ref(START_LIVES)
	const combo = ref(0)
	const bestCombo = ref(0)
	const correct = ref(0)
	const wrong = ref(0)
	const checkpoints = ref(0)
	const challengesDone = ref(0)

	const running = ref(false)
	const finished = ref(false)

	/** How long this floor was given, and how much of it is left. */
	const questionMs = ref(questionTimeMs(0, 4))
	const timeLeftMs = ref(questionMs.value)

	const challenge = ref<I_Challenge | null>(null)
	/** Seconds left of the 2× reward; 0 when it is not running. */
	const doubleLeft = ref(0)
	const shieldReady = ref(false)

	/**
	 * Развилка ждёт выбора, и подъём стоит.
	 *
	 * Отдельного флага паузы не нужно: `resolve()` гасит `running` на каждом
	 * ходе, а `advance()` — единственное, что его снова поднимает. Пока
	 * развилка открыта, `advance()` только убирает обвал и до нового этажа не
	 * доходит, поэтому часы стоят сами.
	 */
	const forkOpen = ref(false)
	/** Что выбрано. Живёт до следующей опоры, где будет заменено. */
	const boon = ref<TYPE_BOON | null>(null)

	/** Шаг опор, если игрок попросил их чаще. */
	const stepOverride = computed(() =>
		boon.value === 'support' ? SUPPORT_STEP : undefined
	)

	/** Во сколько раз выбор на развилке растянул или сжал часы. */
	const clockScale = computed(() => {
		if (boon.value === 'rush') return RUSH_TIME
		if (boon.value === 'calm') return CALM_TIME
		return 1
	})

	const difficulty = shallowRef(createDifficulty())

	/** Where the chain stands. 0 means the next floor founds a new one. */
	let carry = 0
	let lastOp: TYPE_OP | null = null
	let floorId = 0
	/** Floors the last mistake has doomed but not yet knocked down. */
	let burning = 0
	/** A mistake is waiting to bring the tower down. Not the same as `burning`
	 *  being non-zero: a mistake made standing on a checkpoint costs no floors,
	 *  but the block that was never built still has to go. */
	let pendingCollapse = false
	let questionShownAt = 0
	let sinceChallenge = 0
	let lastChallengeKind: TYPE_CHALLENGE | null = null
	let doubleTimer: ReturnType<typeof setInterval> | undefined
	let rafId = 0
	let lastFrame = 0
	let onFinish: (() => void) | null = null
	let onTimeUp: ((result: I_AnswerResult) => void) | null = null

	const active = computed<I_Floor | null>(() => stack.value[0] ?? null)
	const answered = computed(() => correct.value + wrong.value)
	const accuracy = computed(() =>
		answered.value ? Math.round((correct.value / answered.value) * 100) : 0
	)
	const tier = computed(() => shownTier(difficulty.value, answered.value))
	const nextCheckpoint = computed(() => nextSafeFloor(floor.value, stepOverride.value))
	const doubleActive = computed(() => doubleLeft.value > 0)

	/** 1 → the whole clock, 0 → out of time. */
	const timeRatio = computed(() =>
		Math.min(1, Math.max(0, timeLeftMs.value / (questionMs.value || 1)))
	)

	/** Whole seconds left, which is what the board shows. It changes once a
	 *  second where the ratio changes every frame, so anything bound to it is
	 *  re-rendered once a second too. */
	const secondsLeft = computed(() => Math.ceil(timeLeftMs.value / 1000))

	/**
	 * Time to worry. An absolute three seconds rather than a share of the clock:
	 * a quarter of ten seconds is a comfortable two and a half, a quarter of five
	 * is one — the same warning would mean two different things at either end of
	 * the ladder.
	 */
	const lowTime = computed(() => running.value && timeLeftMs.value <= 3000)

	/** Progress towards the heart the streak is about to hand back. */
	const lifeProgress = computed(() =>
		lives.value >= MAX_LIVES ? 0 : (combo.value % LIFE_EVERY) / LIFE_EVERY
	)

	// ------------------------------------------------------------------ floors

	function makeFloor(number: number): I_Floor {
		// Разгон поднимает числа на тир: это и есть неудобство, за которое он
		// платит двойными очками. Лестницу сложности он при этом не трогает —
		// она продолжает читать ответы, а не выбор игрока.
		const base = shownTier(difficulty.value, answered.value)
		const tierNow = boon.value === 'rush' ? base + RUSH_TIER : base
		const question = nextQuestion(carry, tierNow, lastOp, optionsForTier(tierNow))
		return {
			id: ++floorId,
			number,
			question,
			pending: true,
			correct: false,
			safe: isSafeFloor(number, stepOverride.value),
			falling: false,
		}
	}

	/** Puts the next live floor at the head of the tower and starts its clock. */
	function pushFloor() {
		if (finished.value) return
		const next = makeFloor(floor.value + 1)
		stack.value = [next, ...stack.value].slice(0, MAX_STACK)

		const full = questionTimeMs(next.question.tier, next.question.options.length)
		questionMs.value = Math.round(full * clockScale.value)
		timeLeftMs.value = questionMs.value
		questionShownAt = performance.now()
		lastFrame = 0
		running.value = true
	}

	/**
	 * Brings the tower down after a mistake: the live floor, which was never
	 * built, plus the floors the mistake cost. The drop of the floor counter
	 * happens here too, so the number and the blocks move together.
	 */
	function collapse() {
		const current = active.value
		if (!pendingCollapse || !current || current.pending) return
		pendingCollapse = false

		current.falling = true
		for (let index = 1; index <= burning && index < stack.value.length; index++) {
			stack.value[index].falling = true
		}
		floor.value = Math.max(0, floor.value - burning)
		burning = 0
	}

	/**
	 * Clears whatever the last answer knocked down and opens the next floor.
	 * Called by the page once its animation has played, so the rules and the
	 * pictures never race each other.
	 */
	function advance() {
		if (finished.value) return
		// Defensive: if the page never played the collapse, the rules still hold.
		if (pendingCollapse) collapse()
		if (stack.value.some((item) => item.falling)) {
			stack.value = stack.value.filter((item) => !item.falling)
			// The chain carries on from the floor the player is left standing on,
			// so the number at the foot of the new tower is one they can see.
			carry = stack.value[0]?.question.result ?? 0
			lastOp = null
		}
		// Обвал убран, но новый этаж не открывается: ждём, что игрок выберет на
		// развилке. Часы стоят сами — их поднимает только `pushFloor()`.
		if (forkOpen.value) return
		pushFloor()
	}

	/**
	 * Выбор на развилке. Действует до следующей опоры, где будет заменён.
	 *
	 * Ничего применять вручную не нужно: все три двери читаются там, где и
	 * работают — `stepOverride` при создании этажа, `clockScale` при запуске
	 * часов, `boon` при начислении очков и выборе тира.
	 */
	function chooseFork(kind: TYPE_BOON) {
		if (!forkOpen.value || finished.value) return
		boon.value = kind
		forkOpen.value = false
		pushFloor()
	}

	// -------------------------------------------------------------- challenges

	function reward(kind: TYPE_CHALLENGE): { bonus: number; life: boolean } {
		switch (kind) {
			case 'double':
				doubleLeft.value = DOUBLE_SECONDS
				startDoubleTimer()
				return { bonus: 0, life: false }
			case 'shield':
				shieldReady.value = true
				return { bonus: 0, life: false }
			case 'bonus':
				return { bonus: BONUS_SCORE, life: false }
			case 'quick':
				if (lives.value < MAX_LIVES) {
					lives.value += 1
					return { bonus: 0, life: true }
				}
				return { bonus: QUICK_SCORE, life: false }
			case 'perfect':
				return { bonus: PERFECT_SCORE, life: false }
		}
	}

	function startDoubleTimer() {
		if (doubleTimer) clearInterval(doubleTimer)
		doubleTimer = setInterval(() => {
			if (!running.value && !finished.value) return
			doubleLeft.value = Math.max(0, doubleLeft.value - 0.25)
			if (doubleLeft.value <= 0 && doubleTimer) {
				clearInterval(doubleTimer)
				doubleTimer = undefined
			}
		}, 250)
	}

	// ------------------------------------------------------------------ answer

	/**
	 * Settles one floor. Both ways of finishing it come through here — a tap and
	 * the clock running out — because a timeout *is* a miss: same heart, same
	 * collapse, same broken combo, same nudge to the difficulty. Two code paths
	 * for one outcome is how they drift apart.
	 */
	function resolve(wasCorrect: boolean, elapsedMs: number, timedOut: boolean): I_AnswerResult | null {
		const current = active.value
		if (!current || finished.value) return null

		running.value = false

		const question = current.question

		const zoneBefore = zoneIndex(floor.value)

		let points = 0
		let bonus = 0
		let gainedLife = false
		let lostLife = false
		let floorsLost = 0
		let shielded = false
		let checkpoint = false
		let landingFloor = floor.value

		// The floor stops being a question either way: a wrong answer still shows
		// the true result, because that is the number the tower carries on from.
		current.pending = false
		current.correct = wasCorrect

		if (wasCorrect) {
			correct.value += 1
			combo.value += 1
			if (combo.value > bestCombo.value) bestCombo.value = combo.value

			floor.value += 1
			topFloor.value = Math.max(topFloor.value, floor.value)
			current.number = floor.value
			current.safe = isSafeFloor(floor.value, stepOverride.value)
			checkpoint = current.safe
			if (checkpoint) checkpoints.value += 1

			points = BASE_POINTS * Math.min(combo.value, COMBO_CAP) + question.tier * 3
			if (doubleActive.value) points *= 2
			if (boon.value === 'rush') points *= RUSH_SCORE
			score.value += points

			// Every fifth answer in a row hands a heart back — or, when all three
			// are lit, pays out instead, so the streak is never worth less.
			if (combo.value % LIFE_EVERY === 0) {
				if (lives.value < MAX_LIVES) {
					lives.value += 1
					gainedLife = true
				} else {
					bonus += LIFE_BONUS_SCORE
				}
			}

			carry = question.result
			lastOp = question.op
		} else {
			wrong.value += 1
			combo.value = 0
			lives.value = Math.max(0, lives.value - 1)
			lostLife = true

			if (shieldReady.value) {
				shieldReady.value = false
				shielded = true
				landingFloor = floor.value
			} else {
				landingFloor = floorAfterMiss(floor.value, stepOverride.value)
				floorsLost = floor.value - landingFloor
			}

			// The tower is not brought down here. The player has to be able to read
			// the true result first — it is the number the next tower is founded
			// on, and taking the block away before they see it means they never do.
			// The page calls `collapse()` when that beat has passed.
			burning = floorsLost
			pendingCollapse = true
			// Re-seeded in `advance()` from whatever is left standing.
			lastOp = null
		}

		// Difficulty reads the answer, never the floor number.
		const step = feed(difficulty.value, {
			correct: wasCorrect,
			elapsedMs,
			options: question.options.length,
		})
		difficulty.value = step.next

		// --- challenges

		let challengeDone: TYPE_CHALLENGE | null = null
		let challengeFailed = false
		let challengeStarted: TYPE_CHALLENGE | null = null

		if (challenge.value) {
			const tick = advanceChallenge(challenge.value, {
				correct: wasCorrect,
				combo: combo.value,
				elapsedMs,
			})
			if (tick.failed) {
				challengeFailed = true
				challenge.value = null
				sinceChallenge = 0
			} else if (tick.completed) {
				challengeDone = challenge.value.kind
				challengesDone.value += 1
				const paid = reward(challenge.value.kind)
				bonus += paid.bonus
				gainedLife = gainedLife || paid.life
				challenge.value = null
				sinceChallenge = 0
			} else {
				challenge.value = tick.next
			}
		} else if (wasCorrect) {
			sinceChallenge += 1
			const rolled = rollChallenge(
				floor.value,
				sinceChallenge,
				lastChallengeKind,
				combo.value
			)
			if (rolled) {
				challenge.value = rolled
				lastChallengeKind = rolled.kind
				challengeStarted = rolled.kind
			}
		}

		if (bonus) score.value += bonus

		const gameOver = lives.value <= 0
		if (gameOver) finish()

		// Развилка стоит на своей лестнице, а не на опорах.
		//
		// Сначала она открывалась на каждой опоре, то есть раз в десять этажей —
		// слишком часто, чтобы быть решением. И привязка была лишней: опоры
		// нужны для страховки от промаха, а развилка — про выбор, и частота у
		// этих двух вещей своя. Тем более что «опоры чаще» сдвигает их шаг, и
		// выбор начинал ускорять сам себя.
		const forkOpened = wasCorrect && !gameOver && isForkFloor(floor.value)
		if (forkOpened) forkOpen.value = true

		return {
			correct: wasCorrect,
			trueValue: question.result,
			points,
			bonus,
			combo: combo.value,
			// Where the tower ends up, which after a mistake is not where it is
			// standing yet — `collapse()` takes it there.
			floor: wasCorrect ? floor.value : landingFloor,
			floorsLost,
			lostLife,
			gainedLife,
			checkpoint,
			shielded,
			tierMoved: step.moved,
			challengeStarted,
			challengeDone,
			challengeFailed,
			newZone: zoneIndex(floor.value) !== zoneBefore,
			forkOpened,
			timedOut,
			gameOver,
		}
	}

	function answer(value: number): I_AnswerResult | null {
		const current = active.value
		if (!current || !running.value || finished.value) return null

		return resolve(
			isCorrectAnswer(current.question, value),
			Math.max(0, performance.now() - questionShownAt),
			false
		)
	}

	/** The clock reached zero. Counted as a miss, and announced separately so the
	 *  board can show that nothing was picked. */
	function timeUp() {
		if (!running.value || finished.value) return
		timeLeftMs.value = 0
		const result = resolve(false, questionMs.value, true)
		if (result) onTimeUp?.(result)
	}

	/**
	 * One frame of the clock. A backgrounded webview stops receiving frames, so a
	 * jump is ignored rather than charged to the player — coming back from a phone
	 * call should not cost a life.
	 */
	function frame(timestamp: number) {
		rafId = requestAnimationFrame(frame)

		if (!running.value || finished.value) {
			lastFrame = timestamp
			return
		}

		let delta = lastFrame ? timestamp - lastFrame : 0
		lastFrame = timestamp
		if (delta > 250 || delta < 0) delta = 0

		timeLeftMs.value = Math.max(0, timeLeftMs.value - delta)
		if (timeLeftMs.value <= 0) timeUp()
	}

	// ------------------------------------------------------------------- flow

	function start() {
		if (finished.value) return
		if (!stack.value.length) pushFloor()
		else {
			questionShownAt = performance.now()
			lastFrame = 0
			running.value = true
		}
		if (!rafId) rafId = requestAnimationFrame(frame)
	}

	function pause() {
		running.value = false
	}

	function resume() {
		const current = active.value
		if (finished.value || !current) return
		// Both clocks start again from here. A phone call is not the player
		// thinking slowly, and it is certainly not a life.
		const full = questionTimeMs(
			current.question.tier,
			current.question.options.length
		)
		questionMs.value = Math.round(full * clockScale.value)
		timeLeftMs.value = questionMs.value
		questionShownAt = performance.now()
		lastFrame = 0
		running.value = true
	}

	function finish() {
		if (finished.value) return
		finished.value = true
		running.value = false
		if (doubleTimer) {
			clearInterval(doubleTimer)
			doubleTimer = undefined
		}
		onFinish?.()
	}

	function destroy() {
		if (doubleTimer) clearInterval(doubleTimer)
		doubleTimer = undefined
		if (rafId) cancelAnimationFrame(rafId)
		rafId = 0
		running.value = false
	}

	function summary(previousBestFloor: number, previousBestScore: number): I_SessionSummary {
		return {
			score: score.value,
			floor: topFloor.value,
			bestFloor: Math.max(previousBestFloor, topFloor.value),
			correct: correct.value,
			wrong: wrong.value,
			accuracy: accuracy.value,
			bestCombo: bestCombo.value,
			topTier: difficulty.value.peak,
			checkpoints: checkpoints.value,
			challenges: challengesDone.value,
			isRecord: topFloor.value > previousBestFloor,
			previousBestFloor,
			previousBestScore,
		}
	}

	return {
		stack,
		active,
		floor,
		topFloor,
		score,
		lives,
		combo,
		bestCombo,
		correct,
		wrong,
		answered,
		accuracy,
		tier,
		challenge,
		doubleLeft,
		doubleActive,
		shieldReady,
		forkOpen,
		boon,
		nextCheckpoint,
		lifeProgress,
		running,
		finished,
		questionMs,
		timeLeftMs,
		timeRatio,
		secondsLeft,
		lowTime,
		answer,
		collapse,
		advance,
		chooseFork,
		start,
		pause,
		resume,
		finish,
		destroy,
		summary,
		onFinished(callback: () => void) {
			onFinish = callback
		},
		onTimedOut(callback: (result: I_AnswerResult) => void) {
			onTimeUp = callback
		},
	}
}
