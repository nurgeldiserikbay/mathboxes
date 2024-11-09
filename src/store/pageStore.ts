import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { GAME_TYPES } from '@/utils/conts'

import { useGameStore } from '@/store/gameStore'

import { PAGES_CONST, PAGES, type PagesType } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'
import LevelTypes from '@/pages/LevelTypes.vue'
import LevelsPage from '@/pages/LevelsPage.vue'
import PlaygroundPage from '@/pages/PlaygroundPage.vue'

export const usePageStore = defineStore('PageStore', () => {
	const gameStore = useGameStore()
	const currentPage = ref<PagesType>(PAGES.START)
	const currentPageIndex = ref(0)

	const pages: { [key in PagesType]: Component } = {
		START: StartPage,
		LEVELTYPES: LevelTypes,
		LEVELS: LevelsPage,
		PLAYGROUND: PlaygroundPage,
	}
	
	const currentPageComponent = computed(() => {
		return pages[currentPage.value]
	})

	const backLink = computed(() => {
		if (currentPage.value === PAGES.LEVELTYPES) return PAGES.START
		else if (currentPage.value === PAGES.PLAYGROUND || gameStore.gameType === GAME_TYPES.FOR_SCORE) return PAGES.LEVELTYPES
		else if (currentPage.value === PAGES.LEVELS) return PAGES.LEVELTYPES
		else return ''
	})

	function routeTo(page: PagesType) {
		currentPage.value = page
		currentPageIndex.value = PAGES_CONST[page]
	}

	function toBackLink() {
		if (backLink.value) routeTo(backLink.value)
	}

	return {
		currentPage,
		currentPageIndex,
		currentPageComponent,
		routeTo,
		backLink,
		toBackLink,
	}
})
