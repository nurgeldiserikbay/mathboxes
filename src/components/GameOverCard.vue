<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import { I_SessionSummary } from '@/utils/types'
import { alpha } from '@/utils/color'
import { floorTint } from '@/utils/floors'
import { groupDigits } from '@/utils/format'
import { useAudio } from '@/composables/useAudio'

/**
 * The end of a run, and the one place the game raises its voice. Everything on
 * this card exists to set up the next one: how high you got, how high you have
 * ever got, and a button that starts again without going anywhere.
 */
const $props = withDefaults(
	defineProps<{
		summary: I_SessionSummary
		/**
		 * An interstitial is being prepared. The card stays up and readable, but
		 * both exits are refused: starting a run here would put the ad on top of a
		 * game whose clock is already running.
		 */
		busy?: boolean
	}>(),
	{ busy: false }
)

const $emits = defineEmits(['again', 'home'])

const { playAudio, vibrate } = useAudio()

/** The card wears the colour of the height it is reporting. */
const tint = computed(() => floorTint($props.summary.floor))

/**
 * Четвёртая строка зависит от режима.
 *
 * В подъёме опор нет, и вечный ноль в итоге читался как сломанный счётчик.
 * Там на их месте стоит точность — она в подъёме и есть главная мера: этаж
 * говорит, докуда дошёл, точность — чего это стоило.
 */
const rows = computed(() => [
	{ icon: 'trophy', label: 'score', value: groupDigits($props.summary.score) },
	{ icon: 'check', label: 'correct_answers', value: `${$props.summary.correct}` },
	{ icon: 'flame', label: 'max_combo', value: `${$props.summary.bestCombo}` },
	$props.summary.checkpoints
		? { icon: 'shield', label: 'checkpoints', value: `${$props.summary.checkpoints}` }
		: { icon: 'target', label: 'accuracy', value: `${$props.summary.accuracy}%` },
])

/**
 * The floor counts itself up.
 *
 * A number that simply appears is a fact; a number that climbs is the run being
 * played back. It is deliberately quick — three quarters of a second — because
 * the player already knows roughly how high they got and is waiting for the
 * button, not for the animation.
 */
const shownFloor = ref(0)
let countID = 0

function countUp() {
	const target = $props.summary.floor
	if (target <= 0) return
	const started = performance.now()
	const RUN = 760

	const step = (now: number) => {
		const t = Math.min(1, (now - started) / RUN)
		// Ease out: fast at the start, settles on the last few floors.
		const eased = 1 - Math.pow(1 - t, 3)
		shownFloor.value = Math.round(target * eased)
		if (t < 1) countID = requestAnimationFrame(step)
	}
	countID = requestAnimationFrame(step)
}

onMounted(countUp)
onBeforeUnmount(() => cancelAnimationFrame(countID))

// Positioned deterministically so the burst reads as designed rather than as
// random noise, and only ever shown for a record.
const confetti = Array.from({ length: 12 }, (_, index) => ({
	left: `${8 + index * 7.4}%`,
	delay: `${(index % 6) * 90}ms`,
	tint: ['#f5b83d', '#31b8d4', '#7657e8', '#45c977', '#f0645d'][index % 5],
	tilt: `${(index % 5) * 24 - 40}deg`,
}))

function again() {
	if ($props.busy) return
	playAudio('click')
	vibrate('tap')
	$emits('again')
}

function home() {
	if ($props.busy) return
	playAudio('click')
	vibrate('tap')
	$emits('home')
}
</script>

<template>
	<div
		class="over"
		:style="{ '--tint': tint, '--tint-soft': alpha(tint, 0.18), '--tint-line': alpha(tint, 0.45) }"
	>
		<div v-if="summary.isRecord" class="confetti" aria-hidden="true">
			<i
				v-for="(item, index) in confetti"
				:key="index"
				:style="{
					left: item.left,
					background: item.tint,
					animationDelay: item.delay,
					transform: `rotate(${item.tilt})`,
				}"
			/>
		</div>

		<div class="card">
			<!-- A new best is the moment the whole game is built around, so it is
			     the only thing on the card that gets to glow. -->
			<template v-if="summary.isRecord">
				<div class="crown">{{ $t('new_best') }}</div>
				<div class="floor is-record">
					<span class="floor__label">{{ $t('floor') }}</span>
					<b class="floor__value num">{{ shownFloor }}</b>
				</div>
				<div class="was">
					{{ $t('previous_best') }} <b class="num">{{ summary.previousBestFloor }}</b>
				</div>
			</template>

			<template v-else>
				<div class="crown crown--quiet">{{ $t('game_over') }}</div>
				<div class="floor">
					<span class="floor__label">{{ $t('floor') }}</span>
					<b class="floor__value num">{{ shownFloor }}</b>
				</div>
				<div class="best">
					<span class="best__label">{{ $t('best_floor') }}</span>
					<b class="best__value num">{{ summary.bestFloor }}</b>
				</div>
			</template>

			<ul class="rows">
				<li
					v-for="(row, index) in rows"
					:key="row.label"
					class="row"
					:style="{ animationDelay: `${240 + index * 70}ms` }"
				>
					<AppIcon :name="row.icon" :size="16" class="row__icon" />
					<span class="row__label">{{ $t(row.label) }}</span>
					<b class="row__value num">{{ row.value }}</b>
				</li>
			</ul>

			<button class="again" type="button" :disabled="busy" @click="again">
				<AppIcon name="replay" :size="20" />
				{{ busy ? $t('loading') : $t('play_again') }}
			</button>
			<button class="menu" type="button" :disabled="busy" @click="home">
				{{ $t('main_menu') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
/*
   Экран итога прокручивается, а карточка ограничена по высоте.

   Раньше ни того, ни другого не было: карточка центрировалась в свободном
   месте, а `.play` резал всё лишнее по `overflow: hidden`. На невысоком
   телефоне — и на любом, где сверху висит баннер и забирает свои 50–90 px —
   нижние строки статистики и кнопка просто уезжали за край, и добраться до них
   было нельзя.
*/
.over {
	position: absolute;
	/*
   Оверлей начинается под рекламной строкой, а не от нуля.

   `inset: 0` здесь не годится: абсолютные дети отсчитываются от
   padding-box, а он включает паддинг — то есть `top: 0` попадает НАД
   зарезервированной полосой, и верх карточки (заголовок и сам этаж) уходил
   под баннер. Именно из-за этого статистику не было видно.
*/
	top: var(--ad-band-k, 56px);
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 70;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
	overscroll-behavior: contain;
	background: rgba(5, 8, 26, 0.74);
	backdrop-filter: blur(8px);
	animation: veil 220ms var(--soft) both;
}

.card {
	position: relative;
	/* `margin: auto` вместе с `align-items: center` держит карточку по центру,
	   пока она влезает, и честно отдаёт её прокрутке, когда не влезает. */
	margin: auto;
	width: 100%;
	max-width: 340px;
	padding: 18px 18px 16px;
	border-radius: var(--r-card);
	text-align: center;
	background: linear-gradient(180deg, var(--sheet-top), var(--sheet-bot));
	box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.16), inset 0 -8px 0 rgba(0, 0, 0, 0.28),
		0 7px 0 var(--panel-lip), 0 26px 52px rgba(3, 5, 20, 0.66);
	animation: rise 260ms var(--pop) both;
}

/* Заголовок. У рекорда он золотой и с обводкой, у обычного конца — тихая
   капитель: разница должна читаться до того, как игрок прочтёт число. */
.crown {
	margin-bottom: 2px;
	font-size: 15px;
	font-weight: 900;
	letter-spacing: 2.4px;
	text-transform: uppercase;
	color: #fff0b8;
	text-shadow: -2px -2px 0 #8a5406, 2px -2px 0 #8a5406, -2px 2px 0 #8a5406, 2px 2px 0 #8a5406,
		0 4px 0 #4a2c04, 0 0 16px rgba(255, 190, 70, 0.6);

	&--quiet {
		color: var(--text-faint);
		letter-spacing: 2.8px;
		font-size: 11px;
		text-shadow: none;
	}
}

.floor {
	&__label {
		display: block;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	&__value {
		display: block;
		font-size: 64px;
		font-weight: 900;
		line-height: 1;
		color: #fff;
		text-shadow: 0 4px 0 rgba(6, 9, 30, 0.5);
	}

	/* Рекорд светится цветом высоты, на которой он поставлен. */
	&.is-record .floor__value {
		color: var(--tint);
		text-shadow: 0 4px 0 rgba(6, 9, 30, 0.5), 0 0 30px var(--tint-line);
		animation: record-throb 1.6s var(--soft) infinite;
	}
}

@keyframes record-throb {
	50% {
		text-shadow: 0 4px 0 rgba(6, 9, 30, 0.5), 0 0 44px var(--tint);
	}
}

.was {
	margin-top: 2px;
	font-size: 11px;
	font-weight: 800;
	letter-spacing: 0.6px;
	color: var(--text-faint);

	b {
		color: var(--text-dim);
	}
}

.best {
	margin-top: 8px;
	padding: 7px 10px 8px;
	border-radius: 14px;
	background: rgba(6, 9, 30, 0.38);
	box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.32);

	&__label {
		display: block;
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--text-faint);
	}

	&__value {
		font-size: 26px;
		font-weight: 900;
		line-height: 1.1;
		color: var(--gold);
	}
}

.rows {
	margin: 14px 0 0;
	padding: 0;
	list-style: none;
}

/* Строки приезжают одна за другой — итог читается как отчёт, который
   разворачивают, а не как таблица, которая была тут всегда. */
.row {
	display: flex;
	align-items: center;
	gap: 9px;
	padding: 9px 2px;
	text-align: left;
	animation: row-in 320ms var(--soft) both;

	& + & {
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.06);
	}

	&__label {
		flex: 1;
		font-size: 14px;
		font-weight: 800;
		color: var(--text-dim);
	}

	&__value {
		font-size: 17px;
		font-weight: 900;
		color: #fff;
	}
}

@keyframes row-in {
	from {
		opacity: 0;
		transform: translateX(-10px);
	}
}

.again {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10px;
	width: 100%;
	height: 56px;
	margin-top: 14px;
	border: none;
	border-radius: var(--r-btn);
	cursor: pointer;
	font-size: 17px;
	font-weight: 900;
	letter-spacing: 1.4px;
	text-transform: uppercase;
	color: #fff;
	@include face(#9280f7, #7b62e8, #6246d6);
	// Как и лист паузы, карточка висит над размытым экраном.
	@include raised(#3f2ba0, 6px, 0.54, 0.2, 0.45, 2.5px, $cast: 1);
	transition: transform 110ms var(--soft), filter 110ms var(--soft), opacity 180ms var(--soft);

	&:active:not(:disabled) {
		@include press(6px);
	}

	/* Пока готовится реклама, кнопка честно говорит, что занята, вместо того
	   чтобы молча проглотить нажатие. */
	&:disabled {
		cursor: default;
		opacity: 0.6;
		filter: saturate(0.5);
	}
}

.menu {
	width: 100%;
	/* Ниже box кнопки «играть ещё» выступают губа (6px) и обводка (2.5px) —
	   зазор считается от них, иначе ссылка липнет к кнопке. */
	margin-top: 18px;
	padding: 8px;
	border: none;
	background: transparent;
	cursor: pointer;
	font-size: 14px;
	font-weight: 800;
	color: var(--text-faint);

	&:active:not(:disabled) {
		color: var(--text-dim);
	}

	&:disabled {
		cursor: default;
		opacity: 0.5;
	}
}

/* Конфетти только на рекорде, позиции заданы детерминированно — случайный
   разброс читается как сбой, а не как праздник. */
.confetti {
	position: absolute;
	inset: 0;
	overflow: hidden;
	pointer-events: none;

	i {
		position: absolute;
		top: -16px;
		width: 9px;
		height: 14px;
		border-radius: 2px;
		animation: fallcut 2.4s var(--fall) infinite;
	}
}

@keyframes fallcut {
	from {
		opacity: 0;
		transform: translateY(0) rotate(0deg);
	}
	12% {
		opacity: 1;
	}
	to {
		opacity: 0;
		transform: translateY(105vh) rotate(520deg);
	}
}

@keyframes veil {
	from {
		opacity: 0;
	}
}

@keyframes rise {
	from {
		opacity: 0;
		transform: translateY(18px) scale(0.93);
	}
}
</style>
