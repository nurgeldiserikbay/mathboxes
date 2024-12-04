<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue'

import { TYPE_TIMES } from '@/utils/types'
import { TIMES } from '@/utils/conts'

import { useGameStore } from '@/store/gameStore'

const TIMES_VALUE: { [key in TYPE_TIMES]: number } = {
	MIN: 60 * 10,
	MIN_3: 3 * 60 * 10,
	MIN_5: 5 * 60 * 10,
}

const $props = withDefaults(
	defineProps<{
		time?: TYPE_TIMES
		correctAns: number
	}>(),
	{
		time: TIMES.MIN_3,
	}
)

const $emits = defineEmits(['timeend'])

const gameStore = useGameStore()

let timerId: ReturnType<typeof setInterval> | undefined

const date = ref(0)
const getWidth = computed(() => {
	return `${(date.value / TIMES_VALUE[$props.time]) * 100}%`
})

watch(() => $props.correctAns, () => {
	date.value += 10
})

onMounted(() => {
	createTimer()
})

onBeforeUnmount(() => {
	clearTimer()
})

function createTimer() {
	clearTimer()
	date.value = TIMES_VALUE[$props.time]
	timerId = setInterval(() => {
		date.value -= 1

		if (date.value === 0) {
			clearTimer()
			$emits('timeend')
		}
	}, 100)
}

function clearTimer() {
	if (timerId) clearInterval(timerId)
}
</script>

<template>
	<div class="time" :style="{ border: `2px solid ${gameStore.mainColor}` }">
		<div
			class="time__in"
			:style="{
				width: getWidth,
				background: gameStore.bgColor,
				filter: `drop-shadow(0 0 5px ${gameStore.bgColor}))`,
			}"
		></div>
	</div>
</template>

<style lang="scss" scoped>
.time {
	width: 80%;
	box-sizing: border-box;
	height: 20px;
	text-align: center;
	border-radius: 25px;

	&__in {
		border-radius: 25px;
		height: 100%;
		background: hsl(200, 100%, 60%);
		filter: drop-shadow(0 0 5px hsl(200, 100%, 60%));
	}
}
</style>
