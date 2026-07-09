<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'

import BackLink from '@/components/BackLink.vue'
import TimerItem from '@/components/TimerItem.vue'
import CubeRube from '@/components/CubeRube.vue'
import ResultTable from '@/components/ResultTable.vue'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'
import { useGameStore } from '@/store/gameStore'

import { useAudio } from '@/composables/useAudio'
import { LEVELS } from '@/utils/conts'
import { I_Exp } from '@/utils/types'
import Admob from '@/utils/admob'

import { checkEquation, getParsedExp, randomInt } from './bookfile'

let timerID: ReturnType<typeof setInterval>
let timerCorID: ReturnType<typeof setInterval>
const gameStore = useGameStore()
const pageStore = usePageStore()
const adsStore = useAdsStore()
const { playAudio } = useAudio()
const expressions = ref<I_Exp[]>([])
const exp = ref(0)
const expInd = ref(0)
const answers = ref<{ [key: number]: number }>({})
const correctAns = ref(0)
const isEnd = ref(false)
const isCorrect = ref<boolean | null>(null)
const colors = ref<string[]>([])
const optionColors = ref<string[]>([])

// Buffer sizes for expression pre-generation.
const INITIAL_BUFFER = 20
const MAX_BUFFER = 1100

const getCurrentExp = computed(() => {
	return expressions.value[expInd.value]
})

watch(
	() => exp.value,
	() => {
		setColors()
	}
)

const getLevelSign = () => {
	// Level 7 ("all") mixes real operators. Exclude the last level itself,
	// whose sign "..." is not a valid operator and would crash generation.
	if (gameStore.getCurrentLevel?.id === 7)
		return LEVELS[randomInt(0, LEVELS.length - 2)].sign || '+'
	return gameStore.getCurrentLevel?.sign || '+'
}

onMounted(async () => {
	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	if (timerID) clearInterval(timerID)
	if (timerCorID) clearTimeout(timerCorID)
	gameStore.selectLevel(null)
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

function timeend() {
	if (timerID) clearInterval(timerID)
	playAudio('result', true)
	isEnd.value = true
	if (Capacitor.getPlatform() === 'android') {
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => {
				adsStore.toggleLoading(false)
			},
		})
	}
}

function setColors() {
	if (!getCurrentExp.value) return
	colors.value = new Array(getCurrentExp.value.raw.length)
		.fill(0)
		.map(() => LEVELS[randomInt(0, LEVELS.length - 1)].bgColor)
	// Compute option colors once per expression to avoid per-render flicker.
	optionColors.value = getCurrentExp.value.options.map(
		() => LEVELS[randomInt(0, LEVELS.length - 1)].bgColor
	)
}

function answer(option: number) {
	if (answers.value[exp.value] !== undefined) return

	const expRaw = getCurrentExp.value.raw
		.map((el, index) => {
			if (index === getCurrentExp.value.answer) return option
			return el.value
		})
		.join('')

	const itsCorrect = checkEquation(expRaw)

	if (itsCorrect) {
		playAudio('correct', true)
		isCorrect.value = true
	} else {
		playAudio('error', true)
		isCorrect.value = false
	}

	answers.value[exp.value] = option

	timerCorID = setTimeout(() => {
		if (isCorrect.value) correctAns.value += 1
		else correctAns.value -= 1
		isCorrect.value = null
		exp.value += 1
		expInd.value += 1

		if (expInd.value === 1000) {
			expressions.value = expressions.value.slice(1000)
			expInd.value = 0
		}
	}, 1000)
}

function pushExp() {
	expressions.value.push(
		getParsedExp(getLevelSign(), expressions.value.length)
	)
}

function genExps() {
	// Pre-generate a buffer so the play field is never empty (no 1s blank frame).
	for (let i = 0; i < INITIAL_BUFFER; i++) pushExp()
	setColors()

	// Keep the buffer topped up ahead of the player.
	timerID = setInterval(() => {
		if (expressions.value.length >= MAX_BUFFER) return
		pushExp()
	}, 1000)
}

// Build the initial buffer synchronously so the first render already has data.
genExps()

function save(name: string) {
	gameStore.recordGameStat(
		correctAns.value,
		gameStore.getCurrentLevel?.id || 0,
		name
	)
	nextTick(() => {
		pageStore.toBackLink()
	})
}
</script>

<template>
	<div class="page play-page">
		<BackLink />
		<div class="corrects">{{ correctAns }}</div>
		<div v-if="getCurrentExp" class="task">
			<TimerItem
				:time="gameStore.timeType"
				:correct-ans="correctAns"
				class="time"
				@timeend="timeend"
			/>
			<div class="exp">
				<CubeRube
					v-for="(item, index) in getCurrentExp.raw"
					:animateClass="''"
					:key="item.order"
					:value="
						String(
							item.order === getCurrentExp.answer && isCorrect
								? answers[exp]
								: item.value
						)
					"
					:show="item.order !== getCurrentExp.answer || isCorrect !== null"
					:bgcolor="colors[index]"
				/>
			</div>

			<div class="options">
				<CubeRube
					v-for="(option, optionInd) in getCurrentExp.options"
					:key="optionInd"
					:value="String(option)"
					:bgcolor="optionColors[optionInd]"
					:size="'64px'"
					:show="true"
					:animateClass="
						answers[exp] !== undefined && answers[exp] === option
							? isCorrect
								? 'rotate'
								: 'shaking'
							: ''
					"
					:class="{
						hide: answers[exp] !== undefined && answers[exp] !== option,
					}"
					class="options__cube"
					@click="answer(option)"
				/>
			</div>
		</div>
		<div v-if="isCorrect !== null" class="show-correct">
			{{ isCorrect ? '+1' : '-1' }}
		</div>
		<ResultTable v-if="isEnd" :result="correctAns" @close="save" />
	</div>
</template>

<style lang="scss" scoped>
.page {
	min-height: 100dvh;
	box-sizing: border-box;
	padding: 85px 15px 65px;
	perspective: 900px;
	display: flex;
	flex-direction: column;
}

.task {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 25%;
}

.exp {
	width: 100%;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	padding: 55px 15px;
	gap: 25px;
	box-sizing: border-box;
	margin-bottom: 25px;
}

.options {
	width: 93%;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	align-items: center;
	gap: 35px 25px;

	&__cube {
		align-self: center;
		margin: 0 auto;
		transition: 0.2s linear;

		&.hide {
			opacity: 0;
		}
	}
}

.corrects {
	position: absolute;
	top: 15px;
	right: 35px;
	font-size: 28px;
	font-weight: 800;
	color: rgb(240, 164, 42);
	background: -webkit-linear-gradient(
		top,
		rgb(247, 191, 49) 0%,
		rgb(240, 164, 42) 26%,
		rgb(251, 174, 50) 35%,
		rgb(237, 154, 22) 45%,
		rgb(255, 196, 2) 61%,
		rgb(255, 190, 39) 100%
	);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

.show-correct {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 120px;
	height: 120px;
	margin-top: -120px;
	margin-left: -60px;
	display: flex;
	justify-content: center;
	align-items: center;
	text-align: center;
	font-size: 76px;
	font-weight: 800;
	color: rgb(240, 164, 42);
	background: -webkit-linear-gradient(
		top,
		rgb(247, 191, 49) 0%,
		rgb(240, 164, 42) 26%,
		rgb(251, 174, 50) 35%,
		rgb(237, 154, 22) 45%,
		rgb(255, 196, 2) 61%,
		rgb(255, 190, 39) 100%
	);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
	animation: move 0.82s linear both;
}

@keyframes move {
	0% {
		opacity: 0;
		transform: translateY(50%);
	}
	50% {
		opacity: 1;
		transform: translateY(0%);
	}
	100% {
		opacity: 0;
		transform: translateY(-50%);
	}
}
</style>
