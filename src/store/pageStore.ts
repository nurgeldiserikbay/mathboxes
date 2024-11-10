import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { PAGES_CONST, PAGES, type PagesType } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'
import LevelsPage from '@/pages/LevelsPage.vue'
import PlaygroundPage from '@/pages/PlaygroundPage.vue'

export const usePageStore = defineStore('PageStore', () => {
	const currentPage = ref<PagesType>(PAGES.START)
	const currentPageIndex = ref(0)

	const pages: { [key in PagesType]: Component } = {
		START: StartPage,
		LEVELS: LevelsPage,
		PLAYGROUND: PlaygroundPage,
	}
	
	const currentPageComponent = computed(() => {
		return pages[currentPage.value]
	})

	const backLink = computed(() => {
		if (currentPage.value === PAGES.PLAYGROUND) return PAGES.LEVELS
		else if (currentPage.value === PAGES.LEVELS) return PAGES.START
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
