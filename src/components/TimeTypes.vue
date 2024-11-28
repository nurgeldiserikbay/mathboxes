<script lang="ts" setup>
import { TYPE_TIMES } from '@/utils/types'

import { PAGES, TIMES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { useAudio } from '@/composables/useAudio'

const pageStore = usePageStore()
const gameStore = useGameStore()
const { playAudio } = useAudio()

function selectTime(time: TYPE_TIMES) {
	playAudio('click', true)
	gameStore.setTimeType(time)
	pageStore.routeTo(PAGES.PLAYGROUND)
}
</script>

<template>
	<div class="times" @click="gameStore.selectLevel(null)">
		<div class="container">
			<div class="times__in" @click.stop="">
				<button
					v-for="time in Object.values(TIMES)"
					:key="time"
					class="time"
					@click.stop="selectTime(time)"
				>
					{{ $t(time) }}
				</button>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.times {
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

	&__in {
		display: flex;
		flex-direction: column;
		gap: 34px;
		margin-bottom: 25%;
	}
}

.time {
	padding: 25px 45px;
	cursor: pointer;
	font-size: 18px;
	background: linear-gradient(
		to bottom,
		rgba(1, 158, 219, 1),
		rgba(0, 78, 139, 1)
	);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 5px;
	color: #ffffff;
	transition: transform 0.2s ease, box-shadow 0.2s ease;
	box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.4),
		inset 0px -2px 4px rgba(255, 255, 255, 0.2);

	&:hover {
		transform: translateY(-4px);
		box-shadow: 0px 8px 12px rgba(0, 0, 0, 0.6),
			inset 0px -2px 4px rgba(255, 255, 255, 0.1);
	}
}
</style>
