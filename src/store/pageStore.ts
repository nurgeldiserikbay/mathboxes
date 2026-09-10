import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { TYPE_PAGES } from '@/utils/types'

import { PAGES } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'
// Прежняя доска — та, где ответ выбирался нажатием — осталась в дереве целиком.
// Откат к ней стоит одной строки ниже: переписана треть кодовой базы, и такая
// правка должна быть обратимой без археологии в истории.
import ClimbPage from '@/pages/ClimbPage.vue'

export const usePageStore = defineStore('PageStore', () => {
	const currentPage = ref<TYPE_PAGES>(PAGES.START)

	/**
	 * Bumped on every run. `App.vue` keys the page on it, so "play again"
	 * remounts the board with a fresh session instead of routing through a menu.
	 */
	const runId = ref(0)

	const pages: { [key in TYPE_PAGES]: Component } = {
		START: StartPage,
		PLAYGROUND: ClimbPage,
	}

	const currentPageComponent = computed(() => pages[currentPage.value])
	const viewKey = computed(() => `${currentPage.value}-${runId.value}`)

	function startRun() {
		runId.value += 1
		currentPage.value = PAGES.PLAYGROUND
	}

	function toHome() {
		currentPage.value = PAGES.START
	}

	return { currentPage, currentPageComponent, viewKey, startRun, toHome }
})
