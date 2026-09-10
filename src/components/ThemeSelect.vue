<script lang="ts" setup>
import AppIcon from '@/components/AppIcon.vue'

import { useAudio } from '@/composables/useAudio'
import { useGameStore } from '@/store/gameStore'
import { LOCATIONS, THEME_RANDOM } from '@/utils/locations'

/**
 * Выбор места.
 *
 * Первым пунктом стоит жребий, и он же по умолчанию: место должно удивлять, а
 * лезть за ним в настройки перед каждой партией никто не станет. Остальные —
 * для тех, кому одно из мест понравилось больше прочих.
 *
 * У каждого пункта своя плашка цвета — не украшение, а собственно ответ на
 * вопрос «какое оно». Названия вроде «Каньон» ничего не говорят тому, кто туда
 * ещё не поднимался, а две краски неба говорят сразу.
 */
const { playAudio } = useAudio()
const gameStore = useGameStore()

/** Две краски неба каждой локации: верх и низ её купола. */
const CHIP: Record<string, [string, string]> = {
	city: ['#3d8ae8', '#ffba86'],
	valley: ['#3f9ede', '#c2e6b4'],
	winter: ['#5194d8', '#eef4f6'],
	canyon: ['#95457a', '#f9b264'],
	night: ['#1c3080', '#4e5aa4'],
	space: ['#331862', '#b276ff'],
}

function select(id: string) {
	playAudio('click')
	gameStore.setTheme(id)
}
</script>

<template>
	<div class="themes">
		<button
			class="themes__item"
			:class="{ 'is-active': gameStore.theme === THEME_RANDOM }"
			:aria-pressed="gameStore.theme === THEME_RANDOM"
			type="button"
			@click="select(THEME_RANDOM)"
		>
			<span class="themes__chip themes__chip--any">
				<AppIcon name="star" :size="13" />
			</span>
			<span class="themes__name">{{ $t('theme_random') }}</span>
		</button>

		<button
			v-for="place in LOCATIONS"
			:key="place.id"
			class="themes__item"
			:class="{ 'is-active': gameStore.theme === place.id }"
			:aria-pressed="gameStore.theme === place.id"
			type="button"
			@click="select(place.id)"
		>
			<span
				class="themes__chip"
				:style="{ '--chip-top': CHIP[place.id][0], '--chip-bot': CHIP[place.id][1] }"
			/>
			<span class="themes__name">{{ $t(place.name) }}</span>
		</button>
	</div>
</template>

<style lang="scss" scoped>
/* Тот же строй, что у выбора языка: два столбца, плашка и подпись. Два разных
   вида списка в одном окне спорили бы друг с другом. */
.themes {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 8px;

	&__item {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 9px 10px;
		border: none;
		border-radius: 13px;
		cursor: pointer;
		text-align: left;
		background: rgba(255, 255, 255, 0.05);
		box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.08);
		transition: transform 110ms var(--soft), box-shadow 160ms var(--soft),
			background 160ms var(--soft);

		&:active {
			transform: scale(0.97);
		}
	}

	&__chip {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 34px;
		height: 22px;
		border-radius: 8px;
		color: #fff;
		background: linear-gradient(180deg, var(--chip-top), var(--chip-bot));
		box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.18);

		/* У жребия своего неба нет — вместо красок значок. */
		&--any {
			--chip-top: #6b6fb8;
			--chip-bot: #3b3170;
		}
	}

	&__name {
		font-size: 14px;
		font-weight: 800;
		color: var(--text-dim);
	}

	.is-active {
		background: rgba(118, 87, 232, 0.24);
		box-shadow: inset 0 0 0 2px rgba(154, 128, 255, 0.65),
			0 0 16px rgba(118, 87, 232, 0.32);

		.themes__chip {
			box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.5),
				0 0 10px rgba(255, 255, 255, 0.22);
		}

		.themes__name {
			color: #fff;
		}
	}
}
</style>
