<script lang="ts" setup>
import { onBeforeUnmount, onMounted } from 'vue'

import { NEUTRAL_TINT } from '@/utils/conts'
import { useAudio } from '@/composables/useAudio'

import AppIcon from '@/components/AppIcon.vue'

/**
 * Shared shell for every dialog. Before this each modal painted itself, so the
 * same control looked different — and sometimes unreadable — from one screen to
 * the next. Now a dialog is a sheet: one lifted card, one accent, one way out.
 */
withDefaults(
	defineProps<{
		title: string
		/** Name of an AppIcon file, or empty for a plain header. */
		icon?: string
		/** Solid hex accent for the header mark. */
		accent?: string
		hideAction?: boolean
		actionLabel?: string
	}>(),
	{
		icon: '',
		accent: NEUTRAL_TINT,
		hideAction: false,
		actionLabel: '',
	}
)

const $emits = defineEmits(['close'])
const { playAudio } = useAudio()

function close() {
	playAudio('click')
	$emits('close')
}

function onKey(event: KeyboardEvent) {
	if (event.key === 'Escape') $emits('close')
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
	<div class="sheet" role="dialog" aria-modal="true" @click="close">
		<div class="sheet__box" :style="{ '--tint': accent }" @click.stop="">
			<header class="sheet__head">
				<span v-if="icon" class="sheet__mark">
					<AppIcon :name="icon" :size="20" />
				</span>
				<h2 class="sheet__title">{{ title }}</h2>
				<button class="sheet__close" type="button" :aria-label="$t('close')" @click="close">
					<AppIcon name="close" :size="14" />
				</button>
			</header>

			<div class="sheet__body">
				<slot />
			</div>

			<footer v-if="!hideAction" class="sheet__foot">
				<button class="sheet__action" type="button" @click="close">
					{{ actionLabel || $t('close') }}
				</button>
			</footer>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.sheet {
	position: fixed;
	inset: 0;
	z-index: 80;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 18px;
	background: rgba(5, 8, 26, 0.72);
	backdrop-filter: blur(8px);
	animation: veil 200ms var(--soft) both;

	&__box {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 360px;
		max-height: calc(var(--vh) - 36px);
		border-radius: var(--r-card);
		background: linear-gradient(180deg, var(--sheet-top), var(--sheet-bot));
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.16),
			inset 0 -8px 0 rgba(0, 0, 0, 0.28), 0 7px 0 var(--panel-lip),
			0 26px 52px rgba(3, 5, 20, 0.66);
		animation: rise 240ms var(--pop) both;
	}

	&__head {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 14px 14px 12px;
		/* Одна линия под шапкой вместо рамки вокруг: рамка на скруглённой
		   карточке всегда выглядит как второй, лишний контур. */
		box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.07);
	}

	/* Знак раздела. Цветной квадрат, а не круг: круг здесь спорил бы с
	   круглыми кнопками HUD. */
	&__mark {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 38px;
		height: 38px;
		flex: 0 0 38px;
		border-radius: 12px;
		color: #fff;
		background: linear-gradient(180deg, var(--tint), color-mix(in srgb, var(--tint) 72%, #000));
		box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.4),
			inset 0 -4px 0 rgba(0, 0, 0, 0.22), 0 3px 0 rgba(0, 0, 0, 0.35);
	}

	&__title {
		flex: 1;
		margin: 0;
		font-size: 21px;
		font-weight: 900;
		line-height: 1.1;
		color: #fff;
		text-shadow: 0 2px 0 rgba(6, 9, 30, 0.4);
	}

	&__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		flex: 0 0 34px;
		padding: 0;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		color: var(--text-dim);
		background: rgba(255, 255, 255, 0.08);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
		transition: transform 120ms var(--soft), color 120ms var(--soft);

		&:active {
			transform: scale(0.92);
			color: #fff;
		}
	}

	&__body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 14px;
		-webkit-overflow-scrolling: touch;
	}

	&__foot {
		padding: 0 14px 14px;
	}

	&__action {
		width: 100%;
		height: 52px;
		border: none;
		border-radius: var(--r-btn);
		cursor: pointer;
		font-size: 16px;
		font-weight: 900;
		letter-spacing: 1.2px;
		color: #fff;
		@include face(#9280f7, #7b62e8, #6246d6);
		// Лист лежит поверх затемнённого экрана: здесь широкая тень и нужна —
		// она и отделяет его от того, что под ним.
		@include raised(#3f2ba0, 5px, 0.54, 0.2, 0.45, 2.5px, $cast: 1);
		transition: transform 110ms var(--soft), filter 110ms var(--soft);

		&:active {
			@include press(5px);
		}
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
		transform: translateY(16px) scale(0.94);
	}
}
</style>
