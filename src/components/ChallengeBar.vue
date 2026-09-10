<script lang="ts" setup>
import { computed } from 'vue'

import AppIcon from '@/components/AppIcon.vue'

import { I_Challenge, TYPE_BOON, TYPE_CHALLENGE } from '@/utils/types'
import { CHALLENGE_TEXT } from '@/utils/conts'
import { BOONS } from '@/utils/boons'
import { alpha } from '@/utils/color'

/**
 * One line. A challenge is a side bet, not a second game, so it gets a strip the
 * width of the board and never a dialog, never a pause, never a decision.
 */
const $props = defineProps<{
	challenge: I_Challenge | null
	/** Seconds left of the 2× reward, 0 when it is not running. */
	doubleLeft: number
	shieldReady: boolean
	/**
	 * Что выбрано на последней развилке. Висит всё время, пока действует:
	 * игрок принял решение и должен видеть, с чем он поднимается, иначе выбор
	 * забывается через три этажа и перестаёт быть выбором.
	 */
	boon?: TYPE_BOON | null
}>()

const activeBoon = computed(() =>
	$props.boon ? (BOONS.find((item) => item.kind === $props.boon) ?? null) : null
)

const ICONS: { [key in TYPE_CHALLENGE]: string } = {
	double: 'star',
	shield: 'shield',
	bonus: 'flame',
	quick: 'bolt',
	perfect: 'target',
}

const TINTS: { [key in TYPE_CHALLENGE]: string } = {
	double: '#e0a83a',
	shield: '#4a97cf',
	bonus: '#e07a4e',
	quick: '#c9a03a',
	perfect: '#8f7ae0',
}

const fill = computed(() =>
	$props.challenge ? $props.challenge.progress / $props.challenge.goal : 0
)

const tint = computed(() =>
	$props.challenge ? TINTS[$props.challenge.kind] : $props.doubleLeft > 0 ? TINTS.double : TINTS.shield
)
</script>

<template>
	<div class="strip">
		<!-- Выбор с развилки. Компактный: он напоминание, а не событие. -->
		<div
			v-if="activeBoon"
			class="chip chip--boon"
			:style="{ '--chip': activeBoon.tint }"
		>
			<AppIcon :name="activeBoon.icon" :size="14" class="chip__icon" />
			<span class="chip__text">{{ $t(activeBoon.name) }}</span>
		</div>

		<!-- A running challenge outranks a running reward: it is the thing the
		     player can still act on. -->
		<div
			v-if="challenge"
			class="chip"
			:style="{ '--chip': tint, '--chip-soft': alpha(tint, 0.16), '--chip-line': alpha(tint, 0.45) }"
		>
			<AppIcon :name="ICONS[challenge.kind]" :size="15" class="chip__icon" />
			<span class="chip__text">{{ $t(CHALLENGE_TEXT[challenge.kind].goal) }}</span>
			<span class="chip__count num">{{ challenge.progress }}/{{ challenge.goal }}</span>
			<i class="chip__bar"><b :style="{ width: `${fill * 100}%` }" /></i>
		</div>

		<div
			v-else-if="doubleLeft > 0"
			class="chip is-reward"
			:style="{
				'--chip': TINTS.double,
				'--chip-soft': alpha(TINTS.double, 0.18),
				'--chip-line': alpha(TINTS.double, 0.5),
			}"
		>
			<AppIcon name="star" :size="15" class="chip__icon" />
			<span class="chip__text">{{ $t('ch_double_reward') }}</span>
			<span class="chip__count num">{{ Math.ceil(doubleLeft) }}{{ $t('sec_short') }}</span>
		</div>

		<div
			v-else-if="shieldReady"
			class="chip is-reward"
			:style="{
				'--chip': TINTS.shield,
				'--chip-soft': alpha(TINTS.shield, 0.18),
				'--chip-line': alpha(TINTS.shield, 0.5),
			}"
		>
			<AppIcon name="shield" :size="15" class="chip__icon" />
			<span class="chip__text">{{ $t('ch_shield_reward') }}</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.strip {
	position: relative;
	z-index: 5;
	display: flex;
	justify-content: center;
	gap: 7px;
	margin: 8px 14px 0;
}

.chip {
	position: relative;
	display: flex;
	align-items: center;
	gap: 7px;
	max-width: 100%;
	padding: 6px 11px 7px;
	border-radius: 12px;
	@include panel(3px);

	&__icon {
		flex: 0 0 auto;
	}

	&__text {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 11px;
		font-weight: 900;
		letter-spacing: 0.9px;
		text-transform: uppercase;
		color: var(--text-dim);
	}

	&__count {
		font-size: 13px;
		font-weight: 900;
		color: #fff;
	}

	/* Полоса прогресса лежит на самой кромке чипа: отдельной строкой она
	   съедала высоту, которая принадлежит башне. */
	&__bar {
		position: absolute;
		left: 10px;
		right: 10px;
		bottom: 3px;
		height: 3px;
		border-radius: 2px;
		background: rgba(0, 0, 0, 0.45);
		overflow: hidden;

		b {
			display: block;
			height: 100%;
			border-radius: 2px;
			background: linear-gradient(90deg, var(--chip, #7de3a0), #fff);
			transition: width 300ms var(--soft);
		}
	}

	/* Выбор игрока обведён своим цветом, но тише награды: он длится долго и не
	   должен всё это время мигать. */
	&--boon {
		flex: 0 0 auto;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14),
			0 0 0 2px color-mix(in srgb, var(--chip) 45%, transparent),
			0 3px 0 var(--panel-lip);

		.chip__text {
			color: #fff;
		}
	}

	/* Награда получена — чип светится своим цветом, а не общим золотым. */
	&.is-reward {
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16),
			0 0 0 2px color-mix(in srgb, var(--chip, #f5b83d) 70%, transparent),
			0 3px 0 var(--panel-lip),
			0 0 18px color-mix(in srgb, var(--chip, #f5b83d) 40%, transparent);
	}
}
</style>
