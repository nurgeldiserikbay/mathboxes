<script lang="ts" setup>
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import { I_Floor } from '@/utils/types'
import { alpha, darken, lighten } from '@/utils/color'

/**
 * One course of the tower: a slab with a number on it.
 *
 * The equation is not here any more. It lives in the card above the tower, and
 * a built floor carries only the answer it was built with — which is the whole
 * point of the design rule: the tower is a chain of results the player can read
 * at a glance, not a wall of arithmetic they have to re-parse. A tiny floor
 * number in the corner says how high this course is, and nothing else competes
 * with the answer.
 *
 * Depth here is physical, not decorative: a lit top edge, a shaded underside, a
 * solid lip and a soft shadow on the sky. That stack is what makes a rectangle
 * read as something built rather than as a list row.
 */
const $props = defineProps<{
	item: I_Floor
	/** The colour this height belongs to. */
	tint: string
	height: number
	/** Landed on this beat — takes the squash. */
	justLanded?: boolean
	/**
	 * Position in the run of blocks a mistake is taking down, counted from the
	 * top. It sets which way this one leaves and when: they go one after
	 * another, alternating sides, so three floors coming off read as three
	 * events rather than as one thing sliding off the screen.
	 */
	fallIndex?: number
	/**
	 * How far below the head of the tower this floor is, in courses. The hue
	 * says how high the tower has got and moves far too slowly to see on one
	 * screen; the depth is what makes the visible stack a gradient, and because
	 * a block sinks one course with every answer, it darkens as the player
	 * climbs past it.
	 */
	depth?: number
}>()

/** The one colour in the tower that does not mean height. */
const BAD = '#f0645d'

/** Depth shading, deliberately light: the colour that carries meaning is the
 *  height, and shading hard was competing with the ramp it sits under. */
const MAX_SINK = 0.2

const face = computed(() => {
	if (!$props.item.correct) return BAD
	if ($props.item.safe) return '#f5b83d'
	const sink = Math.min(MAX_SINK, Math.max(0, ($props.depth ?? 1) - 1) * 0.055)
	return darken($props.tint, sink)
})

const answer = computed(() => String($props.item.question.result))

/** Long results have to fit the same block everyone else stands on. */
const answerSize = computed(() => {
	const length = Math.max(1, answer.value.length)
	const ratio = length <= 2 ? 0.52 : length <= 3 ? 0.44 : length <= 4 ? 0.36 : 0.29
	return Math.max(18, Math.round($props.height * ratio))
})

/** Which way this block leaves, and when. Alternating sides read as separate
 *  events; one direction reads as the stack sliding away. */
const fallSide = computed(() => (($props.fallIndex ?? 0) % 2 === 1 ? 1 : -1))
const fallDelay = computed(() => `${($props.fallIndex ?? 0) * 110}ms`)
</script>

<template>
	<div
		class="slab"
		:class="{
			'is-safe': item.safe && item.correct,
			'is-bad': !item.correct,
			'is-falling': item.falling,
			'is-landed': justLanded,
		}"
		:style="{
			'--face': face,
			'--cap': lighten(face, 0.2),
			'--mid': face,
			'--bot': darken(face, 0.16),
			'--lip': darken(face, 0.4),
			'--halo': alpha(face, 0.45),
			'--fall-side': fallSide,
			'--fall-delay': fallDelay,
		}"
	>
		<!-- Едва заметная текстура: без неё большая плита выглядит куском
		     вектора, с ней — чем-то отлитым. -->
		<i class="slab__grain" aria-hidden="true" />

		<!-- Опора светится один раз, на своём этаже, и больше никогда. -->
		<i v-if="item.safe && item.correct" class="slab__sweep" aria-hidden="true" />

		<span class="slab__floor num">{{ item.number }}</span>

		<b class="slab__answer num" :style="{ fontSize: `${answerSize}px` }">{{ answer }}</b>

		<AppIcon
			v-if="item.safe && item.correct"
			name="shield-plain"
			:size="Math.max(15, Math.round(height * 0.26))"
			class="slab__shield"
		/>

		<!-- Трещина рисуется один раз и только на том блоке, по которому
		     пришёлся промах. -->
		<svg
			v-if="item.falling"
			class="slab__crack"
			viewBox="0 0 100 40"
			preserveAspectRatio="none"
			aria-hidden="true"
		>
			<path d="M18 0 30 15 22 21 38 40M62 0 55 13 70 19 60 40" />
		</svg>
	</div>
</template>

<style lang="scss" scoped>
.slab {
	position: relative;
	height: 100%;
	border-radius: var(--r-slab);
	display: flex;
	align-items: center;
	justify-content: center;
	@include face(var(--cap), var(--mid), var(--bot));
	@include raised(var(--lip), 5px, 0.46, 0.2, 0.42, 2.5px);
	will-change: transform;

	&__grain {
		@include grain(0.15);
	}

	&__floor {
		position: absolute;
		left: 9px;
		top: 6px;
		font-size: 11px;
		font-weight: 900;
		line-height: 1;
		color: rgba(255, 255, 255, 0.5);
		text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3);
	}

	&__answer {
		position: relative;
		z-index: 2;
		font-weight: 900;
		line-height: 1;
		color: #fff;
		letter-spacing: -0.5px;
		text-shadow: 0 2px 0 rgba(10, 20, 60, 0.36), 0 4px 9px rgba(6, 10, 36, 0.32);
	}

	/* Щит наследует цвет плиты, а не носит свой: зелёная иконка на золотой
	   опоре читалась как наклейка из другой игры. Появляется не вместе с
	   блоком, а через треть секунды после него — сначала игрок видит, что
	   этаж встал, и только потом что этот этаж не сгорит. */
	&__shield {
		position: absolute;
		right: 9px;
		top: 50%;
		color: rgba(255, 255, 255, 0.9);
		filter: drop-shadow(0 1px 2px rgba(90, 52, 0, 0.55));
		animation: shield-in 380ms 300ms var(--pop) both;
	}

	&__crack {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: inherit;
		fill: none;
		stroke: rgba(255, 255, 255, 0.72);
		stroke-width: 2.6;
		stroke-linecap: round;
		pointer-events: none;
		animation: crack 180ms ease-out both;
	}

	/* Золотой прогон по опоре — один раз, слева направо. */
	&__sweep {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		overflow: hidden;
		pointer-events: none;

		&::after {
			content: '';
			position: absolute;
			inset: 0 auto 0 -40%;
			width: 40%;
			background: linear-gradient(
				100deg,
				transparent,
				rgba(255, 255, 255, 0.55),
				transparent
			);
			animation: sweep 620ms 120ms var(--soft) both;
		}
	}
}

/* Опора не может сгореть, и это видно: золото плюс постоянное кольцо. */
.is-safe {
	@include raised-glow(var(--lip), rgba(255, 222, 130, 0.95), rgba(255, 200, 80, 0.5), 5px, 3px, 2.5px);
}

.is-bad {
	@include raised-glow(var(--lip), rgba(255, 160, 150, 0.9), rgba(240, 100, 93, 0.5), 5px, 3px, 2.5px);
}

/*
   Приземление: сплющиться и отпружинить — и только это.

   Само «приехать сверху» плита не делает: её ряд уже переезжает на высоту
   этажа средствами страницы. Пока здесь стояло ещё и собственное падение на
   88 px, блок пролетал два этажа вместо одного. Задержка равна длительности
   переезда ряда, поэтому удар приходится на момент, когда плита встала.
*/
.is-landed {
	animation: land 240ms 300ms var(--pop) both;
}

.is-falling {
	animation: fall 430ms var(--fall) var(--fall-delay, 0ms) forwards;
	z-index: 60;
}

@keyframes land {
	0% {
		transform: scaleX(1.04) scaleY(0.93);
	}
	46% {
		transform: scaleX(0.99) scaleY(1.028);
	}
	100% {
		transform: scaleX(1) scaleY(1);
	}
}

@keyframes fall {
	0% {
		transform: translate3d(0, 0, 0) rotate(0deg);
		opacity: 1;
	}
	18% {
		transform: translate3d(calc(var(--fall-side, -1) * 3%), -7px, 0)
			rotate(calc(var(--fall-side, -1) * -3deg));
	}
	60% {
		opacity: 0.9;
	}
	100% {
		transform: translate3d(calc(var(--fall-side, -1) * 34%), 190px, 0)
			rotate(calc(var(--fall-side, -1) * 34deg));
		opacity: 0;
	}
}

@keyframes shield-in {
	0% {
		opacity: 0;
		transform: translateY(-50%) scale(0.2) rotate(-30deg);
	}
	62% {
		opacity: 1;
		transform: translateY(-50%) scale(1.24) rotate(6deg);
	}
	100% {
		opacity: 1;
		transform: translateY(-50%) scale(1) rotate(0deg);
	}
}

@keyframes crack {
	from {
		stroke-dasharray: 0 90;
	}
	to {
		stroke-dasharray: 90 0;
	}
}

@keyframes sweep {
	from {
		transform: translateX(0);
	}
	to {
		transform: translateX(360%);
	}
}
</style>
