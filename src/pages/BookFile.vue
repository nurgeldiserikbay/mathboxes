<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { FlipCorner, PageFlip } from 'page-flip'

import IconBack from '@/assets/img/back.svg'

import { PAGE_COUNT, LEVELS, SIGNS_TYPES } from '@/utils/conts'

import { useGameStore } from '@/store/gameStore'

import COLORS, { getRandomColors } from '@/utils/colors'

import { useAdsStore } from '@/store/adsStore'

import Admob from '@/utils/admob'

import {
	clearTimeOuts,
	getExpOption,
	IExpresstionOption,
	ISuggests,
	findEmptySymbols,
	checkExp,
} from './bookfile'

const adsStore = useAdsStore()
const gameStore = useGameStore()

let timerId: ReturnType<typeof setTimeout> | null = null
let time = 0
const timeValue = ref('')
const noteBookWidth = 420
const notebookHeight = 540
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
const START_STYLE = {
	transform: `translate(0px, 0px) scale(1) rotateX(0deg) rotateY(0deg)`,
}

let pageFlip: PageFlip | undefined

let closing = false
const book = ref()
const bookCover = ref()
const flipBook = ref()
const flipBookPages = ref()
const expressions = ref<IExpresstionOption[]>([])
const scores = ref<{ [key: number]: number }>({})
const answers = ref<{ [key: number]: ISuggests }>({})
const activeSymbols = ref<number | null>(null)
const isOpened = ref(false)
const timeouts: { [key: number]: ReturnType<typeof setTimeout> } = {}
const isActive = computed(() => {
	return gameStore.selectedBookInd !== null
})
const getBook = computed(() => {
	return LEVELS.find((level) => level.id === gameStore.selectedBookInd)
})
const getBookStyle = computed(() => {
	return getBook.value?.startStyle
})
const getBookEndStyle = computed(() => {
	return getBook.value?.endStyle
})
const getTotalScore = computed(() => {
	return Object.values(scores.value).reduce((a, i) => {
		a += +i
		return a
	}, 0)
})
const bookPage = ref(0)
const pageColor = ref<string[]>([])
const getPageExp = computed(() => (ind: number) => {
	return expressions.value[ind - 2]
})
const getPageCurExp = computed(() => {
	return expressions.value[bookPage.value]
})
const isSelected = computed(() => (ind: number) => {
	return Object.values(answers.value).find((s) => s.id === ind)
})
const doBigger = computed(() => (sign: string) => {
	return ['-', '+', '=', '*', '√', '^'].includes(sign)
})

watch(
	() => isActive.value,
	() => {
		if (isActive.value && getBookStyle.value) {
			pageColor.value = COLORS
			gsap.fromTo(book.value, getBookStyle.value, {
				...START_STYLE,
				duration: 1,
			})
			gsap.fromTo(
				bookCover.value,
				{ rotationY: -25 },
				{
					rotationY: -180,
					duration: 1,
					onComplete() {
						generate()
						isOpened.value = true

						if (import.meta.env.VITE_APP_MODE !== 'TEST') {
							if (adsStore.bannerInited) {
								Admob.resumeBanner()
							} else {
								Admob.showBanner().then(() => {
									adsStore.bannerInit()
								})
							}
						}
					},
				}
			)
		} else {
			clearTimeOuts(timeouts)
			if (timerId) clearTimeout(timerId)
			if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.hideBanner()
		}
	}
)

watch(
	() => getPageCurExp.value,
	() => {
		if (getPageCurExp.value) moveActiveSign()
	}
)

onMounted(() => {
	if (flipBook.value && flipBookPages.value?.length) {
		pageFlip = new PageFlip(flipBook.value, settings)
		pageFlip?.loadFromHTML(flipBookPages.value)
	}
})

function startLevel() {
	timerId = setTimeout(() => {
		time += 1

		timeValue.value = getTime(time)

		pageFlip?.flipNext('bottom' as FlipCorner)
	}, 100)
}

function getTime(ml: number) {
	let time = ''
	const hour = Math.floor(ml / 36000)
	time += addZero(hour)
	ml %= 36000
	const min = Math.floor(ml / 600)
	time += (time.length ? ':' : '') + addZero(min)
	ml %= 600
	const sec = Math.floor(ml / 10)
	time += (time.length ? ':' : '') + addZero(sec)
	ml %= 10
	time += (time.length ? ':' : '') + addZero(ml)

	return time
}

function addZero(num: number) {
	if (num === 0) return ''
	return num < 10 ? `0${num}` : num
}

function selectCurExp(id: number) {
	activeSymbols.value = id
}

function moveActiveSign() {
	const nextInd = findEmptySymbols(0, getPageCurExp.value.value, answers.value)
	if (nextInd) activeSymbols.value = nextInd
	return nextInd
}

function selectSuggest(suggest: ISuggests) {
	if (activeSymbols.value && getPageCurExp.value) {
		answers.value[activeSymbols.value] = suggest

		const nextInd = moveActiveSign()

		if (nextInd === -1) {
			const checkResult = checkExp(getPageCurExp.value.value, answers.value)

			if (checkResult) {
				scores.value[bookPage.value] = getPageCurExp.value.complexity
				answers.value = {}
				if (bookPage.value + 1 < PAGE_COUNT + 2) {
					bookPage.value += 1
				} else {
					if (timerId) clearTimeout(timerId)
				}
				pageFlip?.flipNext()
			} else {
				console.log('error')
			}
		}
	}
}

function generate() {
	if (!getBook.value) return
	for (let i = 0; i < PAGE_COUNT; i += 1) {
		if (i < 5) {
			const exp =
				typeof getBook.value?.generate === 'function'
					? getExpOption(
							getBook.value.mainsign as SIGNS_TYPES[],
							getBook.value.signs as SIGNS_TYPES[],
							i,
							getBook.value.generate
					  )
					: getExpOption(
							getBook.value.mainsign as SIGNS_TYPES[],
							getBook.value.signs as SIGNS_TYPES[],
							i
					  )

			expressions.value.push(exp)
		} else {
			const timerId = setTimeout(() => {
				if (!getBook.value) return
				const expression = getExpOption(
					getBook.value.mainsign as SIGNS_TYPES[],
					getBook.value.signs as SIGNS_TYPES[],
					i
				)
				expressions.value.push(expression)
				delete timeouts[i]
			}, 20 * i)
			timeouts[i] = timerId
		}
	}
}

function reset() {
	expressions.value = []
	answers.value = {}
	activeSymbols.value = null
	bookPage.value = 0
}

function bookClose() {
	if (!closing && isActive.value && getBookEndStyle.value) {
		closing = true
		let time: number = 0
		if (pageFlip?.getCurrentPageIndex && pageFlip?.getCurrentPageIndex() > 0)
			time = 1000
		else time = 0
		pageFlip?.flip(0)
		setTimeout(() => {
			isOpened.value = false
			gsap.fromTo(book.value, START_STYLE, {
				...getBookEndStyle.value,
				duration: 1,
			})
			gsap.fromTo(
				bookCover.value,
				{ rotationY: -180 },
				{
					rotationY: 0,
					duration: 1,
					onComplete() {
						gameStore.setSelectedBookInd(null)
						reset()
						closing = false
					},
				}
			)
		}, time)
	}
}

function end() {
	gameStore.gameEnd({
		time: timeValue.value,
		score: getTotalScore.value,
		date: new Date(),
	})
	bookClose()
}
</script>

<template>
	<div class="book-file" :class="{ 'book-file--active': isActive }">
		<div ref="book" class="book">
			<div
				class="book__wrap"
				:style="{
					width: `${2 * noteBookWidth}px`,
					height: `${notebookHeight}px`,
				}"
			>
				<div ref="flipBook" class="flip-book">
					<template v-for="pageInd in PAGE_COUNT + 2" :key="pageInd">
						<template v-if="pageInd === 1">
							<div
								:key="pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 3
										)}`,
									}"
								></div>
							</div>
							<div
								:key="PAGE_COUNT + pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									class="flip-book__desc"
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 4
										)}`,
									}"
								>
									<span
										v-if="getBook?.description"
										v-html="$t(getBook?.description || '')"
									></span>

									<button
										class="flip-book__desc-btn"
										:style="{
											background: `${getRandomColors(
												pageInd - 1,
												(getBook?.id || 0) + 5
											)}`,
										}"
									>
										<span
											:style="{
												background: `${getRandomColors(
													pageInd - 1,
													(getBook?.id || 0) + 4
												)}`,
											}"
											@click="startLevel"
											><span>next</span></span
										>
									</button>
								</div>
							</div>
						</template>
						<template v-else-if="pageInd === PAGE_COUNT + 2">
							<div
								:key="pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 3
										)}`,
									}"
								></div>
							</div>
							<div
								:key="PAGE_COUNT + pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									class="flip-book__result"
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 4
										)}`,
									}"
								>
									<div class="flip-book__result-val">
										<div class="flip-book__result-row">
											<span>{{ 'Expression' }}</span>
											<span>{{ 'Score' }}</span>
										</div>
										<div
											v-for="score in Object.entries(scores)"
											:key="score[0]"
											class="flip-book__result-row"
										>
											<span>{{ Number(score[0]) + 1 }}</span>
											<span>{{ score[1] }}</span>
										</div>
										<div class="flip-book__result-row">
											<span>{{ 'total' }}</span>
											<span>{{ getTotalScore }}</span>
										</div>
									</div>
									<button class="flip-book__result-btn" @click="end">
										got it
									</button>
								</div>
							</div>
						</template>
						<template v-else>
							<div
								:key="pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 3
										)}`,
									}"
								></div>
							</div>
							<div
								:key="PAGE_COUNT + pageInd"
								ref="flipBookPages"
								class="flip-book__page"
								data-density="soft"
							>
								<div
									class="exp"
									:style="{
										background: `${getRandomColors(
											pageInd - 1,
											(getBook?.id || 0) + 4
										)}`,
									}"
								>
									<div v-if="getPageExp(pageInd)" class="expression">
										<div
											v-for="item in getPageExp(pageInd).value"
											:key="item.id"
											class="expression__sign"
											:class="{
												'expression__sign--empty': !item.state,
												'expression__sign--active': activeSymbols === item.id,
												'expression__sign--sign': doBigger(item.sign),
											}"
											@click="selectCurExp(item.id)"
										>
											{{
												item.state
													? item.sign
													: answers[item.id]
													? answers[item.id].sign
													: ''
											}}
										</div>
									</div>

									<div class="expression__task">
										Put the right sign in the right place
									</div>

									<div v-if="getPageExp(pageInd)" class="suggests">
										<div
											v-for="suggest in getPageExp(pageInd).suggests"
											:key="suggest.id"
											:class="{
												'suggest--active': isSelected(suggest.id),
												'suggest--sign': doBigger(suggest.sign),
											}"
											class="suggest"
											@click="selectSuggest(suggest)"
										>
											{{ suggest.sign }}
										</div>
									</div>
								</div>
							</div>
						</template>
					</template>
				</div>
			</div>

			<div
				ref="bookCover"
				:class="{ 'book__cover--active': isOpened }"
				class="book__cover"
			>
				<div
					class="book__cover--front"
					:style="{ background: getBook?.background }"
				>
					<div class="book__signs">
						<span v-for="sign in getBook?.mainsign || []" :key="sign">
							{{ sign }}
						</span>
					</div>

					<div class="book__label">
						{{ getBook?.title }}
					</div>
				</div>
				<div
					class="book__cover--back"
					:style="{ background: getBook?.background }"
				></div>
			</div>

			<button
				class="book__close"
				:class="{ 'book__close--hide': closing }"
				@click="bookClose"
			>
				<IconBack /> <span>put on a shelf</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.book-file {
	position: absolute;
	top: 0;
	left: 0;
	z-index: 1;
	width: 100%;
	height: 100%;
	pointer-events: none;

	&--active {
		pointer-events: unset;
	}

	.book {
		position: absolute;
		top: 50%;
		left: 50%;
		width: 420px;
		height: 540px;
		margin-top: -270px;
		margin-left: -210px;
		opacity: 0;
		background: #ffffff;
		overflow: hidden;

		&__wrap {
			position: absolute;
			right: 0;
			top: 0;
			width: 100%;
			height: 100%;
		}

		&__cover {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			transform-style: preserve-3d;
			transform-origin: 0% 50%;
			transform: rotateY(0deg);
			z-index: 50;

			&--active {
				z-index: -5;
			}

			&--front {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				display: flex;
				justify-content: center;
				text-align: center;
				padding-top: 90px;
				box-sizing: border-box;
				transform-origin: 50% 50%;
				transform: rotateY(0deg) translateZ(1px);
			}

			&--back {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				display: flex;
				justify-content: center;
				text-align: center;
				padding-top: 90px;
				box-sizing: border-box;
				transform-origin: 50% 50%;
				transform: rotateY(180deg) translateZ(1px);

				&:before {
					content: '';
					position: absolute;
					right: 0;
					top: 0;
					bottom: 0;
					z-index: 0;
					width: 85px;
					background: linear-gradient(
						90deg,
						rgba(208, 207, 207, 0) 0%,
						rgba(255, 255, 255, 0.3233618233618234) 70%,
						rgba(161, 161, 161, 0.4358974358974359) 100%
					);
				}
			}
		}

		&__label {
			font-family: 'LuckiestGuy', sans-serif;
			font-size: 60px;
			font-weight: 400;
			position: absolute;
			left: 50%;
			bottom: 150px;
			transform-origin: center;
			transform: rotateZ(-15deg) translate(-50%, 25%);
			color: #1e1c1b;
		}

		&__signs {
			position: relative;
			width: 150px;
			height: 150px;
			padding: 30px;
			background: #ffffff;
			border-radius: 50%;
			display: flex;
			justify-content: center;
			align-items: center;
			text-align: center;
			font-size: 84px;
			font-weight: 400;
			border: 12px solid #020202;
			box-shadow: 0 5px 25px 0 rgba(255, 255, 255, 0.6);
		}

		&__close {
			position: absolute;
			top: -28px;
			left: 25%;
			z-index: 15;
			height: 35px;
			box-sizing: border-box;
			padding: 0;
			border: none;
			background-position: 50% 56% !important;
			overflow: hidden;
			background: transparent;
			display: flex;
			align-items: center;
			gap: 5px;
			cursor: pointer;

			svg {
				width: 25px;
				transform-origin: center;
				transform: rotateX(-125deg) rotateZ(-35deg);
			}

			span {
				margin-bottom: 8px;
			}

			&--hide {
				opacity: 0;
			}
		}
	}

	&--active {
		.book {
			opacity: 1;
			overflow: visible;
		}
	}

	.flip-book {
		position: relative;
		z-index: 1;

		&__page {
			position: absolute;
			bottom: 15px;
			// background: url('@/assets/img/paper.jpg') center no-repeat;
			background-size: 100% 100%;
			backface-visibility: visible;
			box-sizing: border-box;

			&:first-child {
				opacity: 0;
			}

			& > div {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				box-sizing: border-box;
			}

			&:nth-child(2n + 1) > div {
				&:before {
					content: '';
					position: absolute;
					right: 0;
					top: 0;
					bottom: 0;
					z-index: 0;
					width: 85px;
					background: linear-gradient(
						90deg,
						rgba(208, 207, 207, 0) 0%,
						rgba(255, 255, 255, 0.223) 70%,
						rgba(161, 161, 161, 0.4358974358974359) 100%
					);
				}
			}

			&:nth-child(2n) > div {
				&:before {
					content: '';
					position: absolute;
					left: 0;
					top: 0;
					bottom: 0;
					z-index: 0;
					width: 65px;
					background: linear-gradient(
						90deg,
						rgba(161, 161, 161, 0.4358974358974359) 0%,
						rgba(255, 255, 255, 0.223) 30%,
						rgba(208, 207, 207, 0) 100%
					);
				}
			}
		}

		&__desc-btn {
			position: absolute;
			bottom: 0;
			right: 0;
			width: 65px;
			height: 65px;
			box-sizing: border-box;
			padding: 0;
			border: none;
			background-position: 50% 56% !important;
			overflow: hidden;

			& > span {
				position: absolute;
				top: 0;
				left: 0;
				width: 90px;
				height: 90px;
				transform-origin: center;
				transform: translate(-45px, -45px) rotateZ(45deg);
				box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.3);
				cursor: pointer;

				span {
					position: absolute;
					right: 2px;
					top: 36%;
				}
			}
		}

		&__result {
			display: flex;
			flex-direction: column;
			align-items: center;
			padding: 30px 35px;
		}

		&__result-val {
			flex-grow: 1;
		}

		&__result-row {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 25px;
			width: 80%;

			&:last-child {
				margin-top: 19px;
			}

			span {
				width: 100%;
				text-align: center;
			}
		}

		&__result-btn {
			padding: 0;
			background: transparent;
			border: none;
			outline: none;
			cursor: pointer;
			font-size: 35px;
			margin-bottom: 15px;
			transform-origin: center;
			transform: rotateZ(-15deg);
		}
	}
}

.exp {
	padding: 35px 25px;
	box-sizing: border-box;

	.expression {
		position: relative;
		z-index: 5;
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 45px;

		&__sign {
			width: 50px;
			height: 50px;
			display: flex;
			justify-content: center;
			align-items: center;
			text-align: center;
			font-size: 15px;
			font-weight: 400;
			background: #e5e4e4;
			border: 1px solid #e5e4e4;
			border-radius: 50%;
			pointer-events: none;
			box-sizing: border-box;
			transition: 0.3s linear;

			&--empty {
				background: #fff;
				cursor: pointer;
				pointer-events: unset;
				box-shadow: inset 0 0 5px 0 rgba(0, 0, 0, 0.8), 0 0 5px 0 rgba(0, 0, 0, 0.5);
			}

			&--active {
				border: 4px solid #f43f3f;
			}

			&--sign {
				font-size: 22px;
			}
		}

		&__task {
			margin-bottom: 35px;
		}
	}

	.suggests {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 10px;
		align-items: center;

		.suggest {
			margin: 0 auto;
			width: 50px;
			height: 50px;
			background: #fff;
			display: flex;
			justify-content: center;
			align-items: center;
			text-align: center;
			font-size: 15px;
			font-weight: 400;
			border: 1px solid #fff;
			cursor: pointer;
			box-sizing: border-box;
			border-radius: 50%;

			&--sign {
				font-size: 22px;
			}
		}
	}
}
</style>

<style lang="scss">
.flip-book {
	&__desc {
		padding: 31px 25px 31px 55px;

		h2 {
			margin-top: 18px;
			margin-bottom: 20px;
			font-size: 20px;
			line-height: 1.1;
		}

		p {
			margin-bottom: 18px;
		}
	}
}
</style>
