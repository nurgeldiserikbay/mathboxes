<script lang="ts" setup>
import { ref, watch } from 'vue'

import IconAchievement from '@/assets/img/achievement.svg'

import { useAudio } from '@/composables/useAudio'
import { useGameStore } from '@/store/gameStore'
import { LEVELS } from '@/utils/conts'

import HistoryLevel from './HistoryLevel.vue'

const empty_time_records = {
	MIN: [],
	MIN_3: [],
	MIN_5: [],
}

const $emits = defineEmits(['close'])

const { playAudio } = useAudio()
const gameStore = useGameStore()

const isActive = ref(false)

const activeLevel = ref<number | null>(null)

watch(() => isActive.value, () => {
	if (!isActive.value) activeLevel.value = null
})

function select(id: number) {
	if (activeLevel.value === id) activeLevel.value = null
	else activeLevel.value = id
}
</script>

<template>
	<div class="history">
		<button class="history__btn" @click="playAudio('click', true), isActive = true">
			<IconAchievement />
		</button>

		<div v-if="isActive" class="history__body" @click="playAudio('click', true), isActive = false">
			<div class="container">
				<div
					:style="{ background: gameStore.bgColor }"
					class="history__body-in"
					@click.stop=""
				>
					<div class="histories">
						<div
							v-for="level in LEVELS"
							:key="level.id"
							:class="{
								'histories__item--hide':
									activeLevel !== null && activeLevel !== level.id,
								'histories__item--active': activeLevel === level.id,
							}"
							class="histories__item"
						>
							<HistoryLevel
								:level="level"
								:is-active="activeLevel === level.id"
								:story="gameStore.gameStats[level.id] || empty_time_records"
								@activate="playAudio('click', true), select(level.id)"
							/>
						</div>
					</div>
					<button class="history__ok" @click="playAudio('click', true), isActive = false">Ok</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.history {
	&__btn {
		width: 35px;
		height: 35px;
		background: transparent;
		padding: 0;
		border: none;
		outline: none;
		cursor: pointer;

		svg {
			width: 100%;
			height: 100%;
		}
	}

	&__body {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.container {
		width: 85%;
		max-width: 350px;
	}

	&__body-in {
		padding: 24px 14px 24px;
		border-radius: 12px;
		width: 100%;
		height: 70vh;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
		overflow: hidden;
		margin-bottom: 15px;
	}

	&__ok {
		color: #020202;
		background: transparent;
		padding: 8px 18px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 18px;
		font-weight: 600;
	}
}

.histories {
	position: relative;
	width: 100%;
	margin-bottom: 28px;
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	overflow: hidden;

	&__item {
		width: 100%;
		opacity: 1;
		transition: 0.3s linear;

		&--hide {
			opacity: 0;
			pointer-events: none;
		}

		&--active {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
		}

		&:last-child {
			margin-bottom: 0;
		}
	}
}
</style>
