<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useI18n } from 'vue-i18n'

import AppIcon from '@/components/AppIcon.vue'
import AdSlot from '@/components/AdSlot.vue'
import OtherGames from '@/components/OtherGames.vue'
import GameSky from '@/components/GameSky.vue'
import TowerFloor from '@/components/TowerFloor.vue'
import ChallengeBar from '@/components/ChallengeBar.vue'
import ForkCard from '@/components/ForkCard.vue'
import GameOverCard from '@/components/GameOverCard.vue'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'
import { useGameStore } from '@/store/gameStore'

import { useAudio } from '@/composables/useAudio'
import { I_AnswerResult, useTowerGame } from '@/composables/useTowerGame'

import { MAX_LIVES } from '@/utils/conts'
import { I_SessionSummary, TYPE_BOON } from '@/utils/types'
import { brickTint } from '@/utils/floors'
import { GLYPHS } from '@/utils/mathEngine'
import { groupDigits } from '@/utils/format'
import Admob from '@/utils/admob'

/**
 * The board.
 *
 * Nothing here decides anything — `useTowerGame` has already settled the score,
 * the floor and the hearts by the time this file hears about an answer. What it
 * owns is the *order things happen in*, because that is the whole difference
 * between "I climbed a floor" and "some numbers changed".
 *
 * The layout follows one rule from the design brief and everything else falls
 * out of it: **the equation is above the tower, and a built floor carries only
 * its answer.** So the screen reads top to bottom as state → question → what
 * you have built → what you can press.
 */
const gameStore = useGameStore()
const pageStore = usePageStore()
const adsStore = useAdsStore()

const isOtherGames = ref(false)
const { playAudio, vibrate } = useAudio()
const { t } = useI18n()

const game = useTowerGame()

const previousBestFloor = gameStore.bestFloor
const previousBestScore = gameStore.bestScore

const locked = ref(false)
const picked = ref<number | null>(null)
const wasCorrect = ref<boolean | null>(null)
const paused = ref(false)
const isEnd = ref(false)
const finalSummary = ref<I_SessionSummary | null>(null)

/** The floor that has just been built — it takes the squash. */
const landedId = ref(0)
/** Chips of a broken floor. Capped and short-lived; particles are seasoning. */
const debris = ref<{ id: number; x: number; y: number; tilt: number }[]>([])
/** Sparks off a landing. Same idea, opposite mood. */
const sparks = ref<{ id: number; dx: number; dy: number; late: number }[]>([])
/** A short camera impulse. Down on a landing, sideways on a mistake. */
const impulse = ref<'' | 'land' | 'miss'>('')

/** One transient line over the tower. Outranks everything else while it is up. */
const flash = ref<{ kind: string; text: string; tone: string } | null>(null)
/**
 * Held for the length of the reply's fade-out as well as its life.
 *
 * The reply is written in the empty socket, so the socket hides while one is up.
 * Keying that off `flash` alone let the socket come back the instant the line
 * started leaving, and for the quarter second of the fade the two were drawn on
 * top of each other.
 */
const sayBusy = ref(false)

/**
 * Показывать ли развилку.
 *
 * Отдельно от `game.forkOpen`, потому что правила и картинка тут расходятся во
 * времени намеренно: опора уже закреплена и подъём уже стоит, но игрок должен
 * сперва увидеть, как золотой блок встал на место и как игра сказала «Опора».
 * Окно, вылетающее в тот же кадр, съедало бы собственную награду.
 */
const forkShown = ref(false)

let advanceID: ReturnType<typeof setTimeout> | undefined
let collapseID: ReturnType<typeof setTimeout> | undefined
let flashID: ReturnType<typeof setTimeout> | undefined
let landID: ReturnType<typeof setTimeout> | undefined
let impulseID: ReturnType<typeof setTimeout> | undefined
let sparkID: ReturnType<typeof setTimeout> | undefined
let debrisID: ReturnType<typeof setTimeout> | undefined
let heartID: ReturnType<typeof setTimeout> | undefined
let sayID: ReturnType<typeof setTimeout> | undefined
let forkID: ReturnType<typeof setTimeout> | undefined

/* ------------------------------------------------------------------- tower -- */

const stageEl = ref<HTMLElement | null>(null)
const stageBox = ref({ width: 320, height: 420 })
let stageObserver: ResizeObserver | null = null

/** The gap between courses. Small on purpose: at six pixels with a big corner
 *  radius the blocks read as one structure rather than a list. */
const GAP = 6

/**
 * A course is this many times wider than it is high. The proportion is the
 * input, not the output: taken as a share of the board the blocks came out
 * three times wider than they were tall, which is the shape of a table row.
 */
const BRICK_RATIO = 2.9

/**
 * Floors are sized from the room the board actually has. Aiming at a little
 * over five courses keeps the live block big enough to read at arm's length on
 * a small phone and stops a tablet showing a ladder of fifteen tiny bricks.
 */
const floorHeight = computed(() => {
	const byHeight = (stageBox.value.height - GAP * 5) / 5.6
	const byWidth = (stageBox.value.width * 0.56) / BRICK_RATIO
	return Math.round(Math.max(46, Math.min(96, Math.min(byHeight, byWidth))))
})

const brickWidth = computed(() =>
	Math.round(
		Math.max(
			stageBox.value.width * 0.46,
			Math.min(stageBox.value.width * 0.72, floorHeight.value * BRICK_RATIO)
		)
	)
)

/**
 * Запас по бокам колонки.
 *
 * У башни стоит маска, которая растворяет нижний край, а маска обрезает всё,
 * что выходит за её бокс. Пока бокс был ровно по ширине плиты, срезались
 * тёмная обводка и мягкие тени по обеим сторонам — плиты выглядели обрубленными
 * слева и справа, — а при обвале срезались и сами блоки, уходящие в сторону.
 * Запас считается от того, насколько далеко блок улетает, плюс место под тень.
 */
const gutter = computed(() => Math.round(brickWidth.value * 0.34) + 24)

/** One course plus the gap under it: the distance the whole stack travels
 *  every time a floor is built. */
const pitch = computed(() => floorHeight.value + GAP)

/**
 * Where the top built floor sits, in pixels down from the top of the stage.
 *
 * It does not move. That is the entire mechanic of the view: the head of the
 * tower is a fixed place on the screen, and every answer slides the whole stack
 * down through it by exactly one course. A tower anchored to the ground instead
 * would either never move or climb off the top of the screen.
 *
 * One course of clearance above it, because that is where the arriving block
 * comes from and where the reply to an answer is written.
 */
const headY = computed(() => pitch.value + 4)

/**
 * Every floor that has been built. The live question is not in this list — it
 * lives in the card above the tower — but the floor answered a moment ago is,
 * which is why this filters on `pending` instead of slicing the array: between
 * the answer and the next question the stack briefly has no pending head.
 */
const built = computed(() => game.stack.value.filter((item) => !item.pending))

/** How many courses have room below the head. */
const room = computed(() =>
	Math.max(2, Math.ceil((stageBox.value.height - headY.value) / pitch.value) + 1)
)

/** Old floors are dropped rather than kept off-screen: the DOM stays small. */
const visible = computed(() => built.value.slice(0, room.value))

/**
 * One course of head start, held for a single frame.
 *
 * Without it a new floor is painted straight into its final slot while the rest
 * of the tower is still where it was — which reads as the block appearing out
 * of nowhere and the stack jumping. With it, the new block is first placed
 * where the empty socket was, every existing floor keeps the position it
 * already had, and then the whole stack — new block included — transitions down
 * by exactly one course. Nothing jumps because nothing is ever drawn out of
 * place.
 */
const rise = ref(0)

/** Where a course sits, in pixels down from the top of the stage. */
function rowY(index: number): number {
	return Math.round(headY.value + (index - rise.value) * pitch.value)
}

/** The empty socket, one course above the head — where the answer will land. */
const socketY = computed(() => Math.round(headY.value - pitch.value))

/**
 * Where the tower stands. It sits one course under the lowest built floor and
 * is gone by about the third, which is the whole of the game's opening
 * statement: you were on the ground, and now you are not.
 */
const ground = computed(() => {
	const y = rowY(built.value.length)
	return y < stageBox.value.height ? y : null
})

/** Lets the stack and the arriving block move as one. */
function slideDown() {
	rise.value = 1
	void nextTick(() => {
		requestAnimationFrame(() => {
			rise.value = 0
		})
	})
}

/* ------------------------------------------------------------------- clock -- */

/** The bar under the equation. Driven by a CSS variable so a value changing
 *  every frame never re-renders a component. */
const clockStyle = computed(() => ({ '--clock': String(game.timeRatio.value) }))

const seconds = computed(() => game.secondsLeft.value)

const expression = computed(() => {
	const live = game.active.value
	if (!live) return ''
	return `${live.question.a} ${GLYPHS[live.question.op]} ${live.question.b}`
})

/** Long sums must not push the card taller — the tower is below it. */
const expressionSize = computed(() => {
	const length = expression.value.length
	if (length <= 8) return 38
	if (length <= 11) return 32
	return 27
})

/* --------------------------------------------------------------------- HUD -- */

const hearts = computed(() =>
	Array.from({ length: MAX_LIVES }, (_, index) => index < game.lives.value)
)
const heartBeat = ref(false)
const floorBump = ref(false)
const comboPop = ref(false)
/** Which heart has just gone. Without it the row simply has one fewer heart in
 *  it the next frame, and losing a life is the loudest thing that happens. */
const lostHeart = ref(-1)

watch(
	() => game.lives.value,
	(now, before) => {
		if (before === undefined || now >= before) return
		lostHeart.value = now
		if (heartID) clearTimeout(heartID)
		heartID = setTimeout(() => (lostHeart.value = -1), 620)
	}
)

watch(
	() => game.combo.value,
	(now, before) => {
		if (before === undefined || now <= before || now < 2) return
		comboPop.value = false
		void nextTick(() => (comboPop.value = true))
	}
)

/**
 * How loud the streak is allowed to be. The escalation is deliberately slow —
 * readability of the tower always wins over celebrating it.
 */
const heat = computed(() => {
	const combo = game.combo.value
	if (combo >= 15) return 'is-blazing'
	if (combo >= 10) return 'is-hot'
	return ''
})

/* ------------------------------------------------------------------ answers */

function optionState(option: number): string {
	if (wasCorrect.value === null || !game.active.value) return ''
	const answer = game.active.value.question.result
	if (option === answer) return 'is-right'
	if (option === picked.value) return 'is-wrong'
	return 'is-dim'
}

/** What a mistake actually cost, in the fewest words that are true. */
function missText(result: I_AnswerResult): string {
	// On a timeout the reason outranks the count: the tower coming down already
	// says how much it cost, and nothing on screen would otherwise say why.
	if (result.timedOut) return t('out_of_time')
	if (result.shielded) return t('shield_held')
	if (result.floorsLost <= 0) return t('checkpoint_held')
	return `−${result.floorsLost}`
}

function showFlash(kind: string, text: string, tone = 'good', ms = 900) {
	flash.value = { kind, text, tone }
	sayBusy.value = true
	if (flashID) clearTimeout(flashID)
	if (sayID) clearTimeout(sayID)
	flashID = setTimeout(() => {
		flash.value = null
		// Хвост равен длительности анимации ухода в `.say-leave-active`.
		sayID = setTimeout(() => (sayBusy.value = false), 280)
	}, ms)
}

function shake(kind: 'land' | 'miss') {
	impulse.value = kind
	if (impulseID) clearTimeout(impulseID)
	impulseID = setTimeout(() => (impulse.value = ''), kind === 'miss' ? 260 : 200)
}

/**
 * A fan of sparks off the block that just landed. The count follows the streak
 * — richer landings are the reward for a long one — but the spread does not, so
 * a hot streak never turns the head of the tower into a firework.
 */
function spawnSparks(combo: number) {
	const count = combo >= 10 ? 14 : 9
	sparks.value = Array.from({ length: count }, (_, index) => {
		// Fanned across the top half, deterministically: a random spray reads as
		// noise where a fan reads as an impact.
		const angle = Math.PI * (0.08 + 0.84 * (index / Math.max(1, count - 1)))
		const power = 34 + (index % 3) * 15
		return {
			id: Date.now() + index,
			dx: Math.round(Math.cos(angle) * -power),
			dy: Math.round(-Math.abs(Math.sin(angle)) * (power * 0.8) - 8),
			late: (index % 4) * 26,
		}
	})
	if (sparkID) clearTimeout(sparkID)
	sparkID = setTimeout(() => (sparks.value = []), 700)
}

/** A short burst, and never more than a dozen pieces. */
function spawnDebris(count: number) {
	if (count <= 0) return
	const pieces = Math.min(12, 4 + count * 3)
	debris.value = Array.from({ length: pieces }, (_, index) => ({
		id: Date.now() + index,
		x: (index / Math.max(1, pieces - 1)) * 100,
		y: 10 + ((index * 37) % 40),
		tilt: ((index * 53) % 90) - 45,
	}))
	if (debrisID) clearTimeout(debrisID)
	debrisID = setTimeout(() => (debris.value = []), 720)
}

/** The line that gets to speak. A checkpoint outranks points, points outrank
 *  praise: the rarer the event, the louder it is allowed to be. */
function announce(result: I_AnswerResult) {
	if (result.challengeDone) {
		showFlash('challenge', t(`ch_${result.challengeDone}_done`), 'gold', 1300)
		return
	}
	if (result.checkpoint) {
		showFlash('checkpoint', t('checkpoint'), 'gold', 1200)
		return
	}
	if (result.newZone) {
		showFlash('zone', t('new_zone'), 'gold', 1200)
		return
	}
	if (result.gainedLife) {
		showFlash('life', '+1 ♥', 'gold', 1000)
		return
	}
	if (result.correct) {
		// The streak bonus is folded into the number rather than shown beside
		// it: "+53 +60" reads as two things going wrong, not one going right.
		showFlash('points', `+${result.points + result.bonus}`, 'good', 800)
	}
}

function choose(option: number) {
	if (locked.value || isEnd.value || paused.value || !game.running.value) return

	const result = game.answer(option)
	if (result) showResult(result, option)
}

/**
 * The clock ran out. Nothing was picked, so the board does exactly what a wrong
 * tap does — the rules already treated it as a miss, and the pictures must not
 * disagree with them.
 */
game.onTimedOut((result) => {
	if (isEnd.value || paused.value) return
	showResult(result, null)
})

function showResult(result: I_AnswerResult, option: number | null) {
	locked.value = true
	picked.value = option
	wasCorrect.value = result.correct

	const live = game.active.value
	if (live) landedId.value = live.id

	if (result.correct) {
		// The answered floor has just joined the stack. Hold it one course high
		// for a frame so it and the tower come down together.
		slideDown()

		// The streak has a voice: the same sample, a step higher for every answer
		// in a row, so a long combo is something you hear climbing rather than a
		// number you have to look up. It flattens out at ×14 — past that it would
		// stop sounding like the game and start sounding like a fault.
		playAudio('correct', {
			rate: 1 + Math.min(result.combo - 1, 13) * 0.036,
			maxMs: 460,
		})
		vibrate(result.gainedLife ? 'life' : result.checkpoint ? 'checkpoint' : 'land')
		shake('land')
		spawnSparks(result.combo)
		if (result.gainedLife) {
			heartBeat.value = true
			setTimeout(() => (heartBeat.value = false), 420)
		}
		// A checkpoint or a heart is worth a second note. One accent on top of the
		// answer, not a jingle of its own: these land mid-streak and the streak is
		// already saying something.
		if (result.checkpoint || result.gainedLife || result.challengeDone) {
			setTimeout(() => playAudio('click', { rate: result.checkpoint ? 1.5 : 1.28 }), 140)
		}
		floorBump.value = true
		if (landID) clearTimeout(landID)
		landID = setTimeout(() => {
			floorBump.value = false
			// Плита приминается на 300–540 мс — класс должен дожить до конца,
			// иначе удар обрывается на середине.
			landedId.value = 0
		}, 580)
	} else {
		playAudio('error')
		vibrate(result.timedOut ? 'timeout' : 'miss')
		showFlash('miss', missText(result), 'bad', 1000)
		shake('miss')
		// A beat first: the block that broke has to be readable before the tower
		// goes, otherwise the answer the next tower is founded on is never seen.
		collapseID = setTimeout(() => {
			game.collapse()
			spawnDebris(result.floorsLost)
		}, 300)
	}

	// Развилка приезжает после того, как опора отпразднована.
	if (result.forkOpened) {
		if (forkID) clearTimeout(forkID)
		forkID = setTimeout(() => (forkShown.value = true), 1000)
	}

	if (result.correct) announce(result)
	if (result.challengeStarted) {
		showFlash('new-challenge', t('challenge_new'), 'gold', 1100)
	}

	advanceID = setTimeout(
		() => {
			if (result.gameOver) {
				endGame()
				return
			}
			locked.value = false
			picked.value = null
			wasCorrect.value = null
			game.advance()
		},
		// Correct: read the result, then climb. Wrong: read it, watch the floors
		// go, and land before the empty stretch above them is noticed. A mistake
		// is three blocks leaving one after another; the board is not handed back
		// until the last of them is gone.
		result.correct ? 420 : 940
	)
}

/* ---------------------------------------------------------------- lifecycle */

function endGame() {
	if (isEnd.value) return
	isEnd.value = true
	locked.value = true
	game.finish()
	playAudio('result')

	const summary = game.summary(previousBestFloor, previousBestScore)
	finalSummary.value = summary
	gameStore.finishSession(summary)

	// Every third or fourth game, not every one — the runs are short.
	if (Capacitor.getPlatform() === 'android' && adsStore.claimInterstitial()) {
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => adsStore.toggleLoading(false),
		})
	}
}

function onFork(kind: TYPE_BOON) {
	forkShown.value = false
	game.chooseFork(kind)
}

function togglePause(value: boolean) {
	// Пока висит развилка, пауза не нужна: подъём и так стоит, а два окна
	// друг на друге читать нельзя.
	if (isEnd.value || forkShown.value) return
	paused.value = value
	if (value) game.pause()
	else game.resume()
}

function onVisibility() {
	if (document.hidden && game.running.value) togglePause(true)
}

/**
 * Both exits are refused while an interstitial is being prepared. The result
 * card stays readable and interactive-looking, but starting a run here would
 * put the ad on top of a game whose clock is already running.
 */
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

	// No countdown. The first floor is `5 + 3` and the tower moves the moment it
	// is answered — that is the whole tutorial.
	game.start()

	await nextTick()
	if (stageEl.value && typeof ResizeObserver !== 'undefined') {
		stageObserver = new ResizeObserver(([entry]) => {
			const { height, width } = entry.contentRect
			stageBox.value = { width, height }
		})
		stageObserver.observe(stageEl.value)
	}
})

onBeforeUnmount(() => {
	stageObserver?.disconnect()
	document.removeEventListener('visibilitychange', onVisibility)
	for (const timer of [advanceID, collapseID, flashID, sayID, forkID, landID, impulseID, sparkID, debrisID, heartID]) {
		if (timer) clearTimeout(timer)
	}
	game.destroy()
})
</script>

<template>
	<div class="play">
		<GameSky :floor="game.floor.value" />

		<!-- Строка под рекламу. Стоит всегда: нативный баннер закрывает её
		     собой, а пока его нет — в ней наши же игры. -->
		<!-- Касание разрешено только по концу партии: полоса стоит над доской, на
		     которой идёт счёт времени, и тап во время партии стоил бы её игроку. -->
		<AdSlot :interactive="isEnd" @open="isOtherGames = true" />

		<!--
			The top bar. The height is the hero and sits in the middle where the eye
			lands; the hearts are a state rather than a number, so they get the
			corner, and the score is the quietest thing up here because the only
			number that matters at the end is how high you got.
		-->
		<header class="hud">
			<button
				class="round"
				type="button"
				:aria-label="$t('pause')"
				@click="togglePause(true)"
			>
				<AppIcon name="pause" :size="17" />
			</button>

			<div class="hud__score">
				<AppIcon name="crown" :size="19" />
				<b class="num">{{ groupDigits(game.score.value) }}</b>
			</div>

			<div class="hud__floor" :class="{ 'is-bump': floorBump }">
				<span class="cap">{{ $t('floor') }}</span>
				<b class="hud__height num">{{ game.floor.value }}</b>
			</div>

			<div
				class="hud__lives"
				:class="{ 'is-beat': heartBeat }"
				:aria-label="`${game.lives.value}/${MAX_LIVES}`"
			>
				<AppIcon
					v-for="(alive, index) in hearts"
					:key="index"
					:name="alive ? 'heart' : 'heart-empty'"
					:size="21"
					class="hud__heart"
					:class="{ 'is-lost': index === lostHeart }"
				/>
			</div>
		</header>

		<div class="chips">
			<div class="chip" :class="{ 'is-live': game.combo.value >= 2 }">
				<AppIcon name="flame" :size="17" />
				<div class="chip__text">
					<span class="cap">{{ $t('combo_label') }}</span>
					<b class="chip__val num" :class="{ 'is-pop': comboPop }">
						×{{ Math.max(1, game.combo.value) }}
					</b>
				</div>
			</div>

			<div class="chip">
				<AppIcon name="shield" :size="17" />
				<div class="chip__text">
					<span class="cap">{{ $t('next_checkpoint') }}</span>
					<b class="chip__val chip__val--green num">{{ game.nextCheckpoint.value }}</b>
				</div>
			</div>
		</div>

		<ChallengeBar
			:challenge="game.challenge.value"
			:double-left="game.doubleLeft.value"
			:shield-ready="game.shieldReady.value"
			:boon="game.boon.value"
		/>

		<!-- The tower, seen from the floor being built. The head is a fixed place
		     on the screen and the whole stack slides down through it, one course
		     per answer — which is why every row is placed by transform rather
		     than by layout: layout cannot be animated, and a stack that changes
		     length in a flex column simply jumps. -->
		<main ref="stageEl" class="stage" :class="[`is-${impulse}`, heat]">
			<div
				class="tower"
				:style="{
					width: `${brickWidth + gutter * 2}px`,
					marginLeft: `${-(brickWidth / 2 + gutter)}px`,
					'--gutter': `${gutter}px`,
				}"
			>
				<!-- Where the answer being chosen is about to land. -->
				<div
					v-if="game.active.value && !locked && !sayBusy"
					class="socket"
					:style="{ height: `${floorHeight}px`, transform: `translate3d(0,${socketY}px,0)` }"
					aria-hidden="true"
				>
					<span>?</span>
				</div>

				<div
					v-for="(item, index) in visible"
					:key="item.id"
					class="row"
					:style="{
						height: `${floorHeight}px`,
						transform: `translate3d(0,${rowY(index)}px,0)`,
						zIndex: String(40 - index),
					}"
				>
					<TowerFloor
						:item="item"
						:tint="brickTint(item.number)"
						:height="floorHeight"
						:just-landed="item.id === landedId"
						:depth="index"
						:fall-index="item.falling ? index : undefined"
					/>
				</div>

				<!-- Sparks off the landing, at the head of the tower. -->
				<div
					v-if="sparks.length"
					class="sparks"
					:style="{ transform: `translate3d(0,${rowY(0) + floorHeight / 2}px,0)` }"
					aria-hidden="true"
				>
					<i
						v-for="piece in sparks"
						:key="piece.id"
						:style="{
							'--dx': `${piece.dx}px`,
							'--dy': `${piece.dy}px`,
							animationDelay: `${piece.late}ms`,
						}"
					/>
				</div>

			</div>

			<!-- Земля во всю ширину сцены, а не внутри колонки: башня стоит на
			     ней, а не на постаменте своего размера. -->
			<div
				v-if="ground !== null"
				class="ground"
				:style="{ transform: `translate3d(0,${ground}px,0)` }"
				aria-hidden="true"
			/>

			<!-- What just happened, written in the empty socket over the head of
			     the tower. The socket is hidden while an answer is resolving, so
			     the two never share the space. -->
			<div class="say" :style="{ top: `${socketY}px`, height: `${floorHeight}px` }">
				<transition name="say">
					<div
						v-if="flash"
						:key="flash.kind + flash.text"
						class="say__line"
						:class="`is-${flash.tone}`"
					>
						{{ flash.text }}
					</div>
				</transition>
			</div>

			<div v-if="debris.length" class="debris" aria-hidden="true">
				<i
					v-for="piece in debris"
					:key="piece.id"
					:style="{
						top: `${rowY(0) + piece.y}px`,
						left: `${piece.x}%`,
						transform: `rotate(${piece.tilt}deg)`,
					}"
				/>
			</div>
		</main>

		<!--
			The question, directly over the buttons that answer it.

			It used to sit at the top of the screen, under the HUD. That is where
			the reference puts it, but the reference is a wider canvas: on a tall
			phone it left the sum and the answers a whole tower apart, and the
			player had to read at one end of the screen and press at the other.
			The pair that makes up a single decision is now a single glance, and
			the tower — which is feedback, not a decision — keeps the room above.
		-->
		<div v-if="game.active.value" class="ask" :style="clockStyle">
			<div class="ask__expr num" :style="{ fontSize: `${expressionSize}px` }">
				{{ expression }} <span class="ask__q">= ?</span>
			</div>

			<div class="ask__row">
				<AppIcon name="clock" :size="17" />
				<i class="ask__bar" :class="{ 'is-low': game.lowTime.value }"><b /></i>
				<span class="ask__sec num" :class="{ 'is-low': game.lowTime.value }">
					{{ seconds }}{{ $t('sec_short') }}
				</span>
			</div>
		</div>

		<!-- One row, however many answers there are. A row that keeps its height
		     whatever it holds is what lets the count change mid-run without the
		     board moving under the player's thumb. -->
		<div
			v-if="game.active.value"
			class="pad"
			:style="{
				gridTemplateColumns: `repeat(${game.active.value.question.options.length}, 1fr)`,
			}"
		>
			<button
				v-for="(option, index) in game.active.value.question.options"
				:key="`${game.active.value.id}-${index}`"
				class="answer"
				:class="[optionState(option), `tone-${index % 4}`]"
				type="button"
				:disabled="locked"
				@click="choose(option)"
			>
				<span class="answer__value num">{{ option }}</span>
				<!-- Состояние сказано знаком, а не только цветом: у верного ответа
				     галочка, у нажатого неверного — крест. -->
				<AppIcon
					v-if="optionState(option) === 'is-right'"
					name="check"
					:size="15"
					class="answer__mark"
				/>
				<AppIcon
					v-else-if="optionState(option) === 'is-wrong'"
					name="close"
					:size="13"
					class="answer__mark"
				/>
			</button>
		</div>

		<!-- Pause -->
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

		<!-- Развилка. Единственное место, где игра спрашивает, а не проверяет. -->
		<ForkCard v-if="forkShown && !isEnd" :floor="game.floor.value" @choose="onFork" />

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
.play {
	position: relative;
	display: flex;
	flex-direction: column;
	height: 100dvh;
	overflow: hidden;
	/*
	   Место под рекламу — паддингом, а не просто элементом.

	   Паддинг задаёт padding-box, а именно от него отсчитываются
	   абсолютно позиционированные дети: пауза и карточка итога встают ниже
	   баннера сами, без единой строчки про рекламу в своих стилях. С обычным
	   флекс-элементом они начинались бы от нуля и снова уезжали под баннер —
	   ровно то, из-за чего статистика была не видна.
	*/
	padding-top: var(--ad-band, 56px);
}

/* ==================================================================== HUD == */
.hud {
	position: relative;
	z-index: 5;
	display: flex;
	align-items: flex-start;
	gap: 8px;
	padding: 10px 12px 0;
}

.round {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 42px;
	height: 42px;
	flex: 0 0 42px;
	padding: 0;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	color: #fff;
	@include face(#9280f7, #7b62e8, #6246d6);
	@include raised(#3f2ba0, 4px, 0.54, 0.22, 0.5, 2.5px);
	transition: transform 120ms var(--soft), filter 120ms var(--soft);

	&:active {
		@include press(4px);
	}
}

.hud {
	&__score {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 42px;
		font-size: 16px;
		font-weight: 900;
		color: #fff;
		text-shadow: 0 2px 0 rgba(10, 14, 45, 0.5);
	}

	&__floor {
		margin: 0 auto;
		padding: 4px 14px 6px;
		border-radius: var(--r-panel);
		text-align: center;
		@include panel(4px);
		transition: transform 180ms var(--pop);

		&.is-bump {
			transform: scale(1.07);
		}
	}

	&__height {
		display: block;
		font-size: 26px;
		font-weight: 900;
		line-height: 1.05;
		color: #fff;
		text-shadow: 0 2px 0 rgba(6, 9, 30, 0.55);
	}

	&__lives {
		display: flex;
		align-items: center;
		gap: 3px;
		height: 42px;
		transition: transform 200ms var(--pop);

		&.is-beat {
			transform: scale(1.14);
		}
	}

	&__heart {
		filter: drop-shadow(0 2px 3px rgba(6, 9, 30, 0.5));

		/* Потеря жизни — самое громкое, что происходит на экране. Без этого в
		   строке просто становилось на одно сердце меньше. */
		&.is-lost {
			animation: heart-gone 620ms var(--soft) both;
		}
	}
}

@keyframes heart-gone {
	0% {
		transform: scale(1.5);
		filter: drop-shadow(0 0 12px rgba(255, 90, 110, 0.9));
	}
	34% {
		transform: scale(0.82) rotate(-8deg);
	}
	100% {
		transform: scale(1);
		filter: drop-shadow(0 2px 3px rgba(6, 9, 30, 0.5));
	}
}

/* ================================================================ ПРИМЕР == */
.ask {
	position: relative;
	z-index: 5;
	margin: 0 14px 9px;
	padding: 11px 14px 10px;
	border-radius: var(--r-card);
	background: linear-gradient(180deg, #ffffff, #eef1fb);
	box-shadow: inset 0 2px 0 #fff, inset 0 -6px 0 rgba(160, 170, 205, 0.42),
		0 6px 0 rgba(112, 124, 168, 0.5), 0 14px 22px rgba(5, 8, 30, 0.42);

	&__expr {
		text-align: center;
		font-weight: 900;
		line-height: 1;
		letter-spacing: 0.5px;
		color: var(--text-ink);
	}

	&__q {
		color: #6c78a8;
	}

	&__row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 9px;
		color: #5a6690;
	}

	&__bar {
		position: relative;
		flex: 1;
		height: 12px;
		border-radius: 6px;
		background: #101838;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
		overflow: hidden;

		b {
			position: absolute;
			inset: 2px 2px 2px 2px;
			border-radius: 4px;
			transform-origin: left center;
			/* Ширина берётся из переменной на карточке: значение меняется каждый
			   кадр, а перерисовки компонента при этом нет. */
			transform: scaleX(var(--clock, 1));
			background: linear-gradient(180deg, #6fe08f, #33b463);
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
		}

		&.is-low b {
			background: linear-gradient(180deg, #ff9a86, #e8483f);
		}
	}

	&__sec {
		min-width: 34px;
		text-align: right;
		font-size: 14px;
		font-weight: 900;
		color: #5a6690;

		&.is-low {
			color: var(--danger);
			animation: tick 1s steps(2, end) infinite;
		}
	}
}

@keyframes tick {
	50% {
		opacity: 0.45;
	}
}

/* ================================================================== ЧИПЫ == */
.chips {
	position: relative;
	z-index: 5;
	display: flex;
	gap: 8px;
	margin: 8px 14px 0;
}

.chip {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 7px;
	padding: 5px 10px 6px;
	border-radius: 13px;
	@include panel(3px);
	transition: box-shadow 200ms var(--soft);

	&__text {
		min-width: 0;
	}

	/* Подпись не переносится ни при какой ширине: на 360 px «СЛЕДУЮЩАЯ ОПОРА»
	   уходила на две строки, чип становился выше и сдвигал вниз всё, включая
	   башню. Высота чипа должна быть постоянной. */
	.cap {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	&__val {
		display: block;
		font-size: 16px;
		font-weight: 900;
		line-height: 1.1;
		color: #fff;
		transform-origin: left center;

		&--green {
			color: #7de3a0;
		}

		/* Комбо считает вслух: каждый шаг подпрыгивает. */
		&.is-pop {
			animation: combo-pop 320ms var(--pop);
		}
	}

	&.is-live {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 0 0 2px rgba(255, 184, 90, 0.5),
			0 3px 0 var(--panel-lip), 0 0 18px rgba(255, 160, 60, 0.28);
	}
}

@keyframes combo-pop {
	0% {
		transform: scale(1);
	}
	40% {
		transform: scale(1.32);
		color: var(--gold);
	}
	100% {
		transform: scale(1);
	}
}

/* ================================================================ БАШНЯ == */
.stage {
	position: relative;
	z-index: 6;
	flex: 1;
	min-height: 0;
	/* Сцена — только изображение: ни один её элемент не нажимается. Земля
	   уходит на 70vh ниже своей кромки, вылезала за сцену и перехватывала
	   нажатия по кнопкам ответов — в начале партии играть было нельзя. */
	overflow: hidden;
	pointer-events: none;
	will-change: transform;

	&.is-land {
		animation: cam-land 200ms var(--soft);
	}

	&.is-miss {
		animation: cam-miss 260ms var(--soft);
	}
}

/* Камера следует за игроком: короткий толчок вниз на приземлении и боковая
   тряска на промахе. Ровно столько, чтобы это чувствовалось, и не столько,
   чтобы читать стало трудно. */
@keyframes cam-land {
	40% {
		transform: translate3d(0, 5px, 0);
	}
	100% {
		transform: none;
	}
}

@keyframes cam-miss {
	20% {
		transform: translate3d(-4px, 2px, 0);
	}
	50% {
		transform: translate3d(4px, 0, 0);
	}
	78% {
		transform: translate3d(-2px, 1px, 0);
	}
	100% {
		transform: none;
	}
}

.tower {
	position: absolute;
	left: 50%;
	top: 0;
	bottom: 0;
	/* Нижний край растворяется, а не режет плиту пополам. */
	mask-image: linear-gradient(180deg, #000 0%, #000 88%, transparent 100%);
}

/*
   Каждый ряд ставится трансформом и переезжает переходом. Раньше башня была
   флекс-колонкой: при добавлении этажа стопка мгновенно смещалась на высоту
   ряда — вёрстка не анимируется, и это читалось как щелчок. Теперь голова
   башни стоит на месте, а вся стопка съезжает вниз ровно на один этаж.
*/
.row,
.socket {
	position: absolute;
	/* Плита живёт внутри запаса, а не по кромке колонки: за кромкой её обрезает
	   маска вместе с обводкой и тенями. */
	left: var(--gutter, 0px);
	right: var(--gutter, 0px);
	top: 0;
	transition: transform 340ms var(--soft);
}

/* Пустой сокет: куда приедет ответ, который игрок сейчас выбирает. */
.socket {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--r-slab);
	border: 2px dashed rgba(255, 255, 255, 0.32);
	background: rgba(10, 14, 40, 0.14);
	animation: socket-breathe 1.9s var(--soft) infinite;

	span {
		font-size: 24px;
		font-weight: 900;
		color: rgba(255, 255, 255, 0.4);
	}
}

@keyframes socket-breathe {
	50% {
		border-color: rgba(255, 255, 255, 0.14);
	}
}

/*
   Подножие, а не земля.

   Продлить его вниз до края экрана — «физически честно», но пол экрана
   превращается в глухую плиту и закрывает небо, в котором игра и происходит.
   Башня стоит на footing'е среди облаков: он чуть шире колонки, живёт три
   первых этажа и уезжает вниз вместе со стопкой.
*/
.ground {
	position: absolute;
	left: 11%;
	right: 11%;
	top: 0;
	height: 34px;
	transition: transform 340ms var(--soft);
	border-radius: 12px 12px 6px 6px;
	background: linear-gradient(180deg, #6a5c8f 0 5px, #453a6c 5px 15px, #2c2450 15px 100%);
	box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.24), inset 0 -6px 0 rgba(0, 0, 0, 0.3),
		0 6px 0 #1a1436, 0 16px 26px rgba(5, 8, 30, 0.5);

	/* Трава по кромке: подножие — верх скалы, а не кусок бетона. */
	&::before {
		content: '';
		position: absolute;
		left: 4px;
		right: 4px;
		top: -11px;
		height: 14px;
		background: radial-gradient(58% 100% at 8% 100%, #2f6b3a 62%, transparent 63%),
			radial-gradient(46% 100% at 26% 100%, #3b8047 62%, transparent 63%),
			radial-gradient(52% 100% at 46% 100%, #2b6236 62%, transparent 63%),
			radial-gradient(42% 100% at 66% 100%, #34713e 62%, transparent 63%),
			radial-gradient(56% 100% at 88% 100%, #2f6b3a 62%, transparent 63%);
	}
}

/* Жар серии. Нарастает медленно и только свечением: читаемость башни всегда
   важнее того, чтобы серию отпраздновать. */
.is-hot .tower {
	filter: drop-shadow(0 0 16px rgba(255, 168, 70, 0.34));
}

.is-blazing .tower {
	filter: drop-shadow(0 0 22px rgba(255, 132, 50, 0.5));
}

/* ============================================================== ИСКРЫ == */
.sparks {
	position: absolute;
	left: 50%;
	top: 0;
	width: 0;
	height: 0;
	pointer-events: none;
	z-index: 45;

	i {
		position: absolute;
		width: 7px;
		height: 7px;
		margin: -3.5px 0 0 -3.5px;
		border-radius: 50%;
		background: radial-gradient(circle, #fffbe8 0%, #ffe066 46%, rgba(255, 190, 60, 0) 72%);
		animation: spark 520ms var(--soft) both;
	}
}

@keyframes spark {
	0% {
		opacity: 0;
		transform: translate3d(0, 0, 0) scale(0.4);
	}
	18% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate3d(var(--dx), var(--dy), 0) scale(0.9);
	}
}

/* ============================================================== РЕПЛИКА == */
.say {
	position: absolute;
	left: 0;
	right: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
	z-index: 50;
}

/*
   Обводка собрана из `text-shadow` в восемь сторон, а не из
   `-webkit-text-stroke`: штрих там рисуется по центру контура и съедает саму
   букву, а на тёмном небе от неё оставался нечитаемый тёмный комок. Плюс
   отдельная нижняя фаска — она и даёт объём, как на референсе.
*/
.say__line {
	font-size: 31px;
	font-weight: 900;
	letter-spacing: 0.5px;
	white-space: nowrap;
	color: var(--fill);
	text-shadow: -2.5px -2.5px 0 var(--edge-ink), 2.5px -2.5px 0 var(--edge-ink),
		-2.5px 2.5px 0 var(--edge-ink), 2.5px 2.5px 0 var(--edge-ink),
		0 -3px 0 var(--edge-ink), 0 3px 0 var(--edge-ink), -3px 0 0 var(--edge-ink),
		3px 0 0 var(--edge-ink), 0 6px 0 var(--edge-deep), 0 0 18px var(--glow),
		0 8px 16px rgba(4, 6, 24, 0.5);
}

.is-good {
	--fill: #d9ffb0;
	--edge-ink: #1c5b28;
	--edge-deep: #0e3517;
	--glow: rgba(140, 240, 110, 0.65);
}

.is-gold {
	--fill: #fff0b8;
	--edge-ink: #8a5406;
	--edge-deep: #4a2c04;
	--glow: rgba(255, 190, 70, 0.7);
}

.is-bad {
	--fill: #ffd9d2;
	--edge-ink: #8e1f1a;
	--edge-deep: #4a1010;
	--glow: rgba(255, 110, 90, 0.6);
}

.say-enter-active {
	animation: say-in 260ms var(--pop);
}

.say-leave-active {
	animation: say-out 260ms var(--soft) forwards;
}

@keyframes say-in {
	from {
		opacity: 0;
		transform: translateY(10px) scale(0.86);
	}
}

@keyframes say-out {
	to {
		opacity: 0;
		transform: translateY(-16px) scale(1.04);
	}
}

/* ============================================================== ОБЛОМКИ == */
.debris {
	position: absolute;
	inset: 0;
	pointer-events: none;
	z-index: 18;

	i {
		position: absolute;
		width: 7px;
		height: 7px;
		border-radius: 2px;
		background: #e8746a;
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
		animation: chip 660ms var(--fall) forwards;
	}
}

@keyframes chip {
	from {
		opacity: 1;
		transform: translate3d(0, 0, 0) rotate(0deg);
	}
	to {
		opacity: 0;
		transform: translate3d(0, 76px, 0) rotate(220deg);
	}
}

/* =============================================================== ОТВЕТЫ == */
.pad {
	position: relative;
	z-index: 5;
	display: grid;
	gap: 8px;
	padding: 0 12px calc(20px + env(safe-area-inset-bottom, 0px));
}

.answer {
	position: relative;
	height: 58px;
	border: none;
	border-radius: var(--r-btn);
	cursor: pointer;
	color: #fff;
	@include face(var(--top), var(--mid), var(--bot));
	@include raised(var(--lip), 6px, 0.52, 0.2, 0.45, 2.5px);
	transition: transform 110ms var(--soft), filter 110ms var(--soft), opacity 180ms var(--soft),
		box-shadow 160ms var(--soft);

	&__value {
		font-size: 25px;
		font-weight: 900;
		line-height: 1;
		text-shadow: 0 2px 0 rgba(10, 20, 60, 0.42);
	}

	&__mark {
		position: absolute;
		right: 8px;
		top: 7px;
	}

	&:active:not(:disabled) {
		@include press(6px);
	}

	/* Четыре тона по кругу: одинаковые кнопки читаются как один длинный
	   элемент, а не как четыре варианта. */
	&.tone-0 {
		--top: #9b7cf5;
		--mid: #7657e8;
		--bot: #6144c8;
		--lip: var(--violet-lip);
	}
	&.tone-1 {
		--top: #5aa8f8;
		--mid: #2f80ed;
		--bot: #2668cb;
		--lip: var(--blue-lip);
	}
	&.tone-2 {
		--top: #58d6ee;
		--mid: #31b8d4;
		--bot: #2596b0;
		--lip: #14657b;
	}
	&.tone-3 {
		--top: #d886f0;
		--mid: #b658d8;
		--bot: #9a43bb;
		--lip: #6d2b88;
	}

	/* Верный ответ и промах говорят не только цветом: у верного появляется
	   галочка, у промаха — крест и просадка. */
	&.is-right {
		--top: #7ee49a;
		--mid: #45c977;
		--bot: #33a95f;
		--lip: var(--green-lip);
		@include raised-glow(var(--green-lip), rgba(200, 255, 150, 0.95), rgba(150, 240, 110, 0.55), 6px, 3px, 2.5px);
		animation: answer-yes 320ms var(--pop);
	}

	&.is-wrong {
		--top: #ff8b84;
		--mid: #f0645d;
		--bot: #d54a45;
		--lip: var(--coral-lip);
		animation: answer-no 300ms var(--soft) both;
	}

	&.is-dim {
		opacity: 0.42;
		filter: saturate(0.5);
	}

	&:disabled {
		cursor: default;
	}
}

@keyframes answer-yes {
	0% {
		transform: translateY(3px) scale(0.97);
	}
	46% {
		transform: translateY(-3px) scale(1.03);
	}
	100% {
		transform: none;
	}
}

/* Промах отвечает отказом: короткая дрожь и просадка вниз. */
@keyframes answer-no {
	0%,
	100% {
		transform: translateY(3px) scale(0.985) translateX(0);
	}
	22% {
		transform: translateY(3px) scale(0.985) translateX(-5px);
	}
	58% {
		transform: translateY(3px) scale(0.985) translateX(5px);
	}
	82% {
		transform: translateY(3px) scale(0.985) translateX(-2px);
	}
}

/* ================================================================ ПАУЗА == */
.overlay {
	position: absolute;
	/* Как и карточка итога: ниже рекламной строки, а не от нуля. */
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
		animation: box-in 220ms var(--pop) both;
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
	margin-top: 10px;
	border: none;
	border-radius: var(--r-btn);
	cursor: pointer;
	font-size: 16px;
	font-weight: 900;
	letter-spacing: 1.4px;
	text-transform: uppercase;
	color: #fff;
	transition: transform 110ms var(--soft), filter 110ms var(--soft);

	&--play {
		@include face(#9280f7, #7b62e8, #6246d6);
		@include raised(#3f2ba0, 5px, 0.54, 0.2, 0.45, 2.5px);
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

@keyframes box-in {
	from {
		opacity: 0;
		transform: scale(0.9);
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

/*
   Невысокий экран. Считать надо не по ширине, а по высоте: 360×640 с баннером
   на 90 px оставляет игре 550 px, и на них по умолчанию не влезали ни башня,
   ни фаски кнопок. Сжимается только вспомогательное — пример и кнопки ответов
   свой размер держат.
*/
@media (max-height: 720px) {
	.hud {
		padding-top: 6px;
	}

	.round {
		width: 36px;
		height: 36px;
		flex: 0 0 36px;
	}

	.hud__score,
	.hud__lives {
		height: 36px;
	}

	.hud__floor {
		padding: 2px 11px 4px;
	}

	.hud__height {
		font-size: 21px;
	}

	.chips {
		gap: 6px;
		margin-top: 6px;
	}

	.chip {
		padding: 4px 8px 5px;

		&__val {
			font-size: 14px;
		}
	}

	.ask {
		margin-bottom: 7px;
		padding: 8px 12px 8px;
	}

	.answer {
		height: 52px;
	}
}

/* Планшет: те же пропорции, просто крупнее. */
@media (min-width: 600px) {
	.ask__expr {
		font-size: 46px !important;
	}

	.answer {
		height: 70px;

		&__value {
			font-size: 30px;
		}
	}

	.hud__height {
		font-size: 32px;
	}
}
</style>
