<script setup lang="ts">
import { ref, computed, toRefs, onMounted, onBeforeUnmount, watch } from 'vue'
import { Swiper, SwiperSlide } from 'swiper/vue'

import 'swiper/css'

import { LEVELS, GAME_TYPES, SIGNS, SIGN_COMPLEXITY_ARR } from '@/utils/conts'

import { evaluateExpression, generateAll } from '@/utils/helpers'

import { useAudio } from '@/composables/useAudio'

import { useGameStore } from '@/store/gameStore'
import { useAdsStore } from '@/store/adsStore'

import HeadMain from '@/components/HeadMain.vue'
import ResultTable from '@/components/ResultTable.vue'

import Admob from '@/utils/admob'
import { getRandomInt } from '@/utils/helpers'

interface ISign {
	sign: string
	state: boolean
}

type IExpresstion = ISign[]

type IExpresstionOption = {
	value: IExpresstion
	complexity: number
	suggests: string[]
}

const { restore, selectLevel, currentLevel, updateGameStat, gameType } = toRefs(useGameStore())
const adsStore = useAdsStore()
const { playAudio } = useAudio()

const COUNT = 3
const expresstions = ref<IExpresstionOption[]>([])
const solved = ref<{ [key: number]: boolean }>({})
const score = ref(0)
const mySwiper = ref()
const selectedSymbol = ref(0)
const timeouts: { [key: number]: ReturnType<typeof setTimeout> } = {}

const currentExpresstion = computed(() => {
	return mySwiper.value?.$el.swiper.activeIndex || 0
})
const getCurrentExpresstion = computed(() => {
	return expresstions.value[currentExpresstion.value]
})
const getCurrentExpresstionValue = computed(() => {
	return getCurrentExpresstion.value?.value
})
const getSuggests = computed(() => getCurrentExpresstion.value?.suggests)
const allSolved = computed(() => {
	return Object.values(solved.value).length === expresstions.value?.length
})
const isFirstType = computed(() => {
	return gameType.value === GAME_TYPES.CLASSIC
})
const isSecondType = computed(() => {
	return gameType.value === GAME_TYPES.FOR_SCORE
})
const getCurrentLevel = computed(() => {
	return LEVELS.find((level) => level.id === currentLevel.value)
})
const getExpressionFunc = computed<(opt: any) => string[]>(() => {
	if (gameType.value === GAME_TYPES.CLASSIC) {
		return getCurrentLevel.value?.generate || (() => [])
	}
	return generateAll
})
const isGameEnd = ref(false)

watch(() => currentLevel.value, () => {
	isGameEnd.value = false
	mySwiper.value?.$el.swiper.slideTo(0)
	initLevel()
})

watch(
	() => currentExpresstion.value,
	(curValue, prevValue) => {
		selectedSymbol.value = 0
		moveSelectedSymbol()
		if (isSecondType.value && curValue !== 0) {
			expresstions.value.push(addToExpArr(expresstions.value.length))
			if (prevValue < curValue && !solved.value[prevValue]) {
				score.value -= getCurrentExpresstion.value.complexity
				updateGameStat.value(['score'], {
					score: score.value,
				})
			}
		}
	}
)

onMounted(async () => {
	try {
		if (import.meta.env.VITE_APP_MODE !== 'TEST') {
			if (adsStore.bannerInited) {
				await Admob.resumeBanner()
			} else {
				await Admob.showBanner()
				adsStore.bannerInit()
			}
		}

		initLevel()
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.hideBanner()
	clearTimeOuts()
})

function levelSolved() {
	isGameEnd.value = true
}

function expresstionSolved() {
	const nextInd = setNextExpression()
	if (nextInd !== undefined) {
		mySwiper.value?.$el.swiper.slideTo(nextInd)
	}
}

function numSums(expressionValue: IExpresstion, hidedSymbols: string[]) {
	let sum = 0
	expressionValue.forEach((e) => {
		if (!isNaN(+e.sign)) sum += +e.sign
	})
	hidedSymbols.forEach((e) => {
		if (!isNaN(+e)) sum += +e
	})
	return Math.floor(sum / 2)
}

function setSuggests(hidedSymbols: string[], expressionValue: IExpresstion) {
	const addSymb = []
	const count = 8 - hidedSymbols.length
	for (let i = 0; i < count; i += 1) {
		const prb = Math.random()

		if (prb > 0.5) {
			addSymb.push(SIGNS[getRandomInt(SIGNS.length - 1)])
		} else {
			addSymb.push(String(getRandomInt(numSums(expressionValue, hidedSymbols))))
		}
	}
	return addSymb.concat(hidedSymbols || [])
}

function selectSymbolValue(value: string) {
	getCurrentExpresstionValue.value[selectedSymbol.value].sign = value

	const nextSymbol = moveSelectedSymbol()
	if (nextSymbol === -1) {
		const isRight = checkExpression()
		if (isRight) {
			if (!solved.value[currentExpresstion.value]) {
				score.value += getCurrentExpresstion.value.complexity
			}
			solved.value[currentExpresstion.value] = true

			if (allSolved.value) {
				levelSolved()
			} else {
				updateGameStat.value(['score'], {
					score: score.value,
				})
				expresstionSolved()
			}
		}
	}
}

function setNextExpression() {
	let i = currentExpresstion.value
	let nextInd

	while (nextInd === undefined && i < expresstions.value.length) {
		if (!solved.value[i]) {
			nextInd = i
		}
		i += 1
	} 

	if (!nextInd) {
		i = -1

		do {
			i += 1
			if (!solved.value[i]) nextInd = i
		} while (solved.value[i] && i < currentExpresstion.value)
	}
	return nextInd
}

function checkExpression(): boolean {
	return (
		getCurrentExpresstionValue.value &&
		evaluateExpression(getCurrentExpresstionValue.value.map((s) => s.sign)) !==
			null
	)
}

function selectSymbol(symbol: ISign, symbolInd: number) {
	if (symbol.state) return
	selectedSymbol.value = symbolInd
}

function moveSelectedSymbol() {
	const findedIndex = getCurrentExpresstionValue.value.findIndex(
		(symbol, symbolIndex) => {
			return !symbol.sign && symbolIndex >= selectedSymbol.value
		}
	)

	if (findedIndex > -1) {
		selectedSymbol.value = findedIndex

		return findedIndex
	}

	const iterFindedIndex = getCurrentExpresstionValue.value.findIndex(
		(symbol) => !symbol.sign
	)

	if (iterFindedIndex > -1) {
		selectedSymbol.value = iterFindedIndex

		return iterFindedIndex
	}

	return -1
}

function initLevel() {
	solved.value = {}
	score.value = 0
	selectedSymbol.value = 0
	restore.value()
	isGameEnd.value = false
	generate()
	moveSelectedSymbol()
}

function addToExpArr(i: number) {
	const expression = getExpressionFunc.value(
		gameType.value === GAME_TYPES.CLASSIC ? getMaxNum(i) : SIGNS.slice(0, 2)
	)
	const [hiddensCount, transformedExpression, hidedSymbols] =
		transformExpresstion(expression)
	const expressionComplexity = calcExpComplexity(expression, hiddensCount)

	return {
		value: transformedExpression,
		complexity: expressionComplexity,
		suggests: setSuggests(hidedSymbols, transformedExpression),
	}
}

function generate() {
	for (let i = 0; i < COUNT; i++) {
		if (i < 5) expresstions.value[i] = addToExpArr(i)
		else {
			timeouts[i] = setTimeout(() => {
				expresstions.value[i] = addToExpArr(i)
				delete timeouts[i]
			}, i * 50)
		}
	}
}

function clearTimeOuts() {
	Object.values(timeouts).forEach((timeId) => clearTimeout(timeId))
}

function getMaxNum(index: number) {
	if (index < 10) return 10
	else if (index < 20) return 50
	else if (index < 30) return 100
	return 200
}

function transformExpresstion(
	expression: string[]
): [number, ISign[], string[]] {
	const hiddensCount = getRandomInt(1, Math.floor(expression.length * 0.5))
	const hidedSymbols: string[] = []
	const expresstionArray = expression?.map((symbol) => {
		return {
			sign: symbol,
			state: true,
		}
	})
	for (let i = 0; i < hiddensCount; i += 1) {
		const symbolIndex = getRandomInt(0, expression.length - 1)
		hidedSymbols.push(expresstionArray[symbolIndex].sign)
		expresstionArray[symbolIndex] = {
			sign: '',
			state: false,
		}
	}
	return [hiddensCount, expresstionArray, hidedSymbols]
}

function calcExpComplexity(expression: string[], hiddensCount: number): number {
	let comp = hiddensCount * 2
	SIGN_COMPLEXITY_ARR.forEach(([symbol, value]) => {
		comp += expression.filter((e) => e === symbol).length * value
	})
	const eqIndex = expression.findIndex((i) => i === '=')
	if (eqIndex > -1) {
		comp += Math.floor(
			Math.max(eqIndex, expression.length - eqIndex - 1) /
				Math.min(eqIndex, expression.length - eqIndex - 1)
		)
	}
	return comp
}

function timeend() {
	updateGameStat.value(['score'], {
		score: score.value,
	})
	isGameEnd.value = true
}

function reload() {
	selectLevel.value(currentLevel.value)
	mySwiper.value?.$el.swiper.slideTo(0)
	initLevel()
}
</script>

<template>
	<HeadMain :isGameEnd="isGameEnd" :settings="true" @timeend="timeend" />
	<div class="view-page playground-page">
		<div v-if="isGameEnd" class="playground-page__overlay">
			<ResultTable :show-time="isFirstType" @reload="reload" />
		</div>

		<Swiper
			ref="mySwiper"
			class="swiper"
			:slidePerView="1"
			:speed="500"
			:direction="'horizontal'"
		>
			<SwiperSlide
				v-for="(expresstion, expresstionInd) in expresstions"
				:key="expresstionInd"
			>
				<div class="expression">
					<div
						v-for="(symbol, symbolInd) in expresstion.value"
						:key="symbolInd"
						class="expression__sign"
						:class="{
							'expression__sign--empty': !symbol.state,
							'expression__sign--active': selectedSymbol === symbolInd,
						}"
						@click="selectSymbol(symbol, symbolInd)"
					>
						{{ symbol.sign }}
					</div>
				</div>
			</SwiperSlide>
		</Swiper>

		<div class="suggests">
			<div
				v-for="(suggest, suggestInd) in getSuggests"
				:key="suggestInd"
				class="suggests__sign"
				@click="selectSymbolValue(String(suggest))"
			>
				{{ String(suggest) }}
			</div>
		</div>

		<div v-if="adsStore.loading" class="loading">
			<span>L</span>
			<span>o</span>
			<span>a</span>
			<span>d</span>
			<span>i</span>
			<span>n</span>
			<span>g</span>
			<span>.</span>
			<span>.</span>
			<span>.</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.playground-page {
	position: relative;
	overflow: visible;
	color: #000;

	&__overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.3);
		background: radial-gradient(
			circle,
			rgba(83, 101, 210, 0.9) 0%,
			rgba(3, 34, 110, 0.9) 100%
		);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding-top: 5px;
	}

	.loading {
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 24px;
		color: #fff;
		letter-spacing: 4px;

		span {
			animation: toggle 1.5s linear infinite;

			&:nth-child(1) {
				animation-delay: 0.1s;
			}

			&:nth-child(2) {
				animation-delay: 0.2s;
			}

			&:nth-child(3) {
				animation-delay: 0.3s;
			}

			&:nth-child(4) {
				animation-delay: 0.4s;
			}

			&:nth-child(5) {
				animation-delay: 0.5s;
			}

			&:nth-child(6) {
				animation-delay: 0.6s;
			}

			&:nth-child(7) {
				animation-delay: 0.7s;
			}

			&:nth-child(8) {
				animation-delay: 0.8s;
			}

			&:nth-child(9) {
				animation-delay: 0.9s;
			}

			&:nth-child(10) {
				animation-delay: 1s;
			}
		}
	}
}

@keyframes toggle {
	0% {
		opacity: 1;
	}

	50% {
		opacity: 0;
	}

	100% {
		opacity: 1;
	}
}

.expression {
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 15px;
	padding: 15px 35px;

	&__sign {
		display: flex;
		justify-content: center;
		align-items: center;
		border-bottom: 1px solid dark;
		padding: 5px 10px 10px;
		cursor: pointer;
		font-size: 54px;
		font-weight: 900;

		&--empty {
			border-bottom: 1px solid green;
			color: green;
		}

		&--active {
			border-bottom: 1px solid red;
			color: red;
		}
	}
}

.suggests {
	display: flex;
	flex-wrap: wrap;
	gap: 15px;
	padding: 15px 35px;

	&__sign {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 5px 10px 10px;
		cursor: pointer;
		background: #a1a1a1;
		color: #000;
		font-weight: 700;
	}
}

.swiper {
	width: 100%;
}
</style>
