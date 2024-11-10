<script lang="ts" setup>
import { onBeforeMount, onMounted, ref, watch } from 'vue'
import { FlipCorner, PageFlip } from 'page-flip'

import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import RatioResize from '@/components/RatioResize.vue'

import Admob from '@/utils/admob'

import BackTo from '@/components/BackTo.vue'
import ScoreTable from '@/components/ScoreTable.vue'

import StartPage from '@/pages/StartPage.vue'
import LevelsPage from '@/pages/LevelsPage.vue'
import PlaygroundPage from '@/pages/PlaygroundPage.vue'

const pageStore = usePageStore()
const gameStore = useGameStore()

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

const wrapElem = ref()
let pageFlip: PageFlip

const getSide = (page: number): FlipCorner => {
	if (page === 3) return 'bottom' as FlipCorner

	return (Math.random() > 0.5 ? 'top' : 'bottom') as FlipCorner
}

watch(
	() => pageStore.currentPageIndex,
	() => {
		if (pageFlip) {
			pageFlip.flip(
				pageStore.currentPageIndex,
				getSide(pageStore.currentPageIndex)
			)
		}
	}
)

onBeforeMount(() => {
	gameStore.loadData()
})

onMounted(() => {
	if (import.meta.env.VITE_APP_MODE !== 'TEST') Admob.initialize()

	if (wrapElem.value) {
		pageFlip = new PageFlip(wrapElem.value, settings)
		pageFlip.loadFromHTML(wrapElem.value.querySelectorAll('.page-wrap'))
	}
})
</script>

<template>
	<RatioResize :width="width" :height="height">
		<ScoreTable
			v-if="pageStore.currentPage === PAGES.PLAYGROUND"
		/>
		<div class="wrapper" :style="{ width: `${2 * noteBookWidth}px`, height: `${notebookHeight}px` }">
			<div ref="wrapElem" class="wrapElem">
				<div class="page-wrap" data-density="soft"></div>
				<div class="page-wrap" data-density="soft">
					<StartPage />
				</div>
				<div class="page-wrap" data-density="soft"></div>
				<div class="page-wrap" data-density="soft">
					<LevelsPage />
				</div>
				<div class="page-wrap" data-density="soft"></div>
				<div class="page-wrap" data-density="soft">
					<PlaygroundPage />
				</div>
			</div>
			<BackTo />
		</div>
	</RatioResize>
</template>

<style lang="scss" scoped>
.wrapper {
	position: absolute;
	right: 10%;
	bottom: 10%;
	transform-origin: center;
	transform: rotate(-5deg);
}

.wrapElem {
	.page-wrap {
		position: absolute;
		bottom: 15px;
		background: url('@/assets/img/paper.jpg') center no-repeat;
		background-size: 100% 100%;

		&:nth-child(1) {
			background: none;
		}

		&:nth-child(2) {
			background: url('@/assets/img/page-front.png') center no-repeat;
			background-size: cover;
		}

		&:nth-child(3) {
			background: url('@/assets/img/page-back.png') center no-repeat;
			background-size: cover;
		}
	}
}
</style>
