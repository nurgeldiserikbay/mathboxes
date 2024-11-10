<script setup lang="ts">
import { ref, computed, toRefs, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { FlipCorner, PageFlip } from 'page-flip'

import { PAGES, LEVELS, SIGNS, SIGN_COMPLEXITY_ARR } from '@/utils/conts'

import { evaluateExpression, generateAll } from '@/utils/helpers'

import { useAudio } from '@/composables/useAudio'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { useAdsStore } from '@/store/adsStore'

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

const width = 480
const height = 586
const noteBookWidth = Math.floor(width * 0.8)
const notebookHeight = Math.floor(height * 0.8)
const settings = {
	width: noteBookWidth,
	height: notebookHeight,
	flippingTime: 1000,
	startZIndex: 0,
	usePortrait: true,
	autoSize: true,
	mobileScrollSupport: false,
	useMouseEvents: false,
	disableFlipByClick: false,
}

let pageFlip: PageFlip

const getSide = (page: number): FlipCorner => {
	if (page === 3) return 'bottom' as FlipCorner

	return (Math.random() > 0.5 ? 'top' : 'bottom') as FlipCorner
}

const { activeLevels, restore, updateGameStat } = toRefs(useGameStore())
const adsStore = useAdsStore()
const pageStore = usePageStore()
const { playAudio } = useAudio()

const PAGE_COUNT = 5
const COUNT = 3
const expresstions = ref<IExpresstionOption[]>([])
const solved = ref<{ [key: number]: boolean }>({})
const score = ref(0)
const selectedSymbol = ref(0)
const selectedExp = ref(0)
const timeouts: { [key: number]: ReturnType<typeof setTimeout> } = {}
const expBook = ref()
const curPage = ref(0)

const pages = computed(() => {
	return Math.ceil(expresstions.value.length / PAGE_COUNT)
})
const getPageExp = computed(() => {
	return expresstions.value.slice(curPage.value * PAGE_COUNT, curPage.value * PAGE_COUNT + PAGE_COUNT)
})
const getSuggests = computed(() => {
	return getPageExp.value.reduce((total, exp) => {
		return total.concat(exp.suggests)
	}, [])
})
const getUsedSymbols = computed(() => {
	const entries = Object.entries(activeLevels.value)
	return entries.reduce((arr: string[], levelArr) => {
		const level = LEVELS.find((level) => level.id == levelArr[0])

		if (level) {
			arr = arr.concat(level.definition)
		}

		return arr
	}, [])
})

watch(
	() => curPage.value,
	(curValue, prevValue) => {
		selectedSymbol.value = 0
		selectedExp.value = 0
		if (curValue !== 0) {
			for (let i = 0; i < PAGE_COUNT; i++) {
				const ind = expresstions.value.length + i
				timeouts[ind] = setTimeout(() => {
					expresstions.value.push(addToExpArr(ind))
					delete timeouts[ind]
				}, i * 50)
			}
		}
	}
)

watch(
	() => pageStore.currentPage,
	async (curValue, prevValue) => {
		if (curValue === PAGES.PLAYGROUND) {
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

				if (expBook.value) {
					nextTick(() => {
						pageFlip = new PageFlip(expBook.value, settings)
						pageFlip.loadFromHTML(expBook.value.querySelectorAll('.exp-book__page'))
					})
				}
			} catch (error: any) {}
		} else if (prevValue === PAGES.PLAYGROUND) {
			if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.hideBanner()
			clearTimeOuts()

			if (pageFlip) {
				nextTick(() => {
					setTimeout(() => {
						pageFlip.destroy()
					}, 1000)
				})
			}
		}
	}
)

function selectSymbolValue(value: string) {
	expresstions.value[selectedExp.value][selectedSymbol.value].sign = value
}

function selectSymbol(symbol: ISign, symbolInd: number, expInd: number, pageInd: number) {
	if (symbol.state) return
	selectedExp.value = pageInd * PAGE_COUNT + expInd
	selectedSymbol.value = symbolInd
}

function initLevel() {
	solved.value = {}
	score.value = 0
	selectedSymbol.value = 0
	restore.value()
	generate()
}

function generate() {
	for (let i = 0; i < COUNT; i++) {
		if (i < PAGE_COUNT) expresstions.value[i] = addToExpArr(i)
		else {
			timeouts[i] = setTimeout(() => {
				expresstions.value[i] = addToExpArr(i)
				delete timeouts[i]
			}, i * 50)
		}
	}
}

function addToExpArr(i: number) {
	const expression = generateAll(getUsedSymbols.value, getMaxNum(i))
	const [hiddensCount, transformedExpression, hidedSymbols] =
		transformExpresstion(expression)
	const expressionComplexity = calcExpComplexity(expression, hiddensCount)

	return {
		value: transformedExpression,
		complexity: expressionComplexity,
		suggests: hidedSymbols,
	}
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
	const expresstionArray = expression?.map((symbol) => {
		return {
			sign: symbol,
			state: true,
		}
	})
	const hidedSymbols: string[] = []
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

function checkPageExpression() {
	return getPageExp.value?.every((exp) => checkExpression(exp.map((sym) => sym.sign)))
}

function checkExpression(expression: string[]): boolean {
	return evaluateExpression(expression) !== null
}

function clearTimeOuts() {
	Object.values(timeouts).forEach((timeId) => clearTimeout(timeId))
}
</script>

<template>
	<div class="view-page playground-page">
		<div class="exp-book-wrapper" :style="{ width: `${2 * noteBookWidth}px`, height: `${notebookHeight}px` }">
			<div ref="expBook" class="exp-book">
				<template v-for="(page, pageInd) in pages"
				:key="pageInd">
					<div class="exp-book__page" data-density="soft"></div>
					<div class="exp-book__page" data-density="soft">
						<div class="expression" v-for="(expresstion, expresstionInd) in getPageExp" :key="expresstionInd">
							<div
								v-for="(symbol, symbolInd) in expresstion.value"
								:key="symbolInd"
								class="expression__sign"
								:class="{
									'expression__sign--empty': !symbol.state,
									'expression__sign--active': selectedSymbol === symbolInd,
								}"
								@click="selectSymbol(symbol, symbolInd, expresstionInd, pageInd)"
							>
								{{ symbol.sign }}
							</div>
						</div>

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
					</div>
				</template>
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
	padding: 0;

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

.exp-book-wrapper {
	position: absolute;
	right: 0;
	top: 0;
}

.exp-book {
	&__page {
		position: absolute;
		bottom: 15px;
		background: url('@/assets/img/paper.jpg') center no-repeat;
		background-size: 100% 100%;
	}
}

.expression {
	display: flex;
	justify-content: center;
	gap: 8px;
	padding: 5px 10px;

	&__sign {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0 2px 2px;
		cursor: pointer;
		font-size: 30px;
		min-width: 20px;
		font-weight: 900;
		border-bottom: 4px solid #0202029a;

		&--empty {
			border-bottom: 4px solid green;
			color: green;
		}

		&--active {
			
		}
	}
}

.suggests {
	display: flex;
	flex-wrap: wrap;
	gap: 15px;

	&__sign {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 5px 10px 10px;
		cursor: pointer;
		color: #000;
		font-weight: 700;
	}
}
</style>
