<script lang="ts" setup>
import { PAGES, GAME_TYPE, GAME_TYPES } from '@/utils/conts'

import HeadMain from '@/components/HeadMain.vue'

import { useGameStore } from '@/store/gameStore'
import { usePageStore } from '@/store/pageStore'

const gameStore = useGameStore()
const { routeTo } = usePageStore()

function clickOnType(type: GAME_TYPE) {
	gameStore.setGameType(type)

	if (type === GAME_TYPES.FOR_SCORE) {
		return routeTo(PAGES.PLAYGROUND)
	}

	routeTo(PAGES.LEVELS)
}
</script>

<template>
	<div class="view-page level-types-page">
		<HeadMain :settings="false" />
		<div class="level-types">
			<div class="level-type">
				<button
					class="btn level-type__title"
					@click="clickOnType(GAME_TYPES.CLASSIC)"
				>
					<span>Classic</span>
				</button>
			</div>
			<div class="level-type">
				<button
					class="btn level-type__title"
					@click="clickOnType(GAME_TYPES.FOR_SCORE)"
				>
					<span>For Score</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_common.scss';

.level-types-page {
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: center;
}

.level-types {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding-top: 11%;
	max-height: 480px;
	gap: 25px;
}

.level-type {
	width: 80%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;

	&__title {
		padding: 12px 25px;
		font-size: 22px;
		font-weight: bold;
		color: #020202;
		display: flex;
		justify-content: center;
		align-items: center;
		text-align: center;
		outline: none;
		cursor: pointer;
		white-space: nowrap;
	}
}
</style>
