import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

import { GAME_TYPE, GAME_TYPES, LEVELS } from '@/utils/conts'

export interface IGameStat {
	time?: string
	score?: number
	date: string
}

export type IGameStats = {
	[key: string]: { [key: number]: IGameStat }
}

export const useGameStore = defineStore('GameStore', () => {
	const gameType = ref<GAME_TYPE | null>(null)
	const currentLevel = ref(0)
	const curGameStat = ref<IGameStat>({
		time: '',
		score: 0,
		date: '',
	})
	const gameStats = ref<IGameStats>({
		[GAME_TYPES.CLASSIC]: {},
		[GAME_TYPES.FOR_SCORE]: {},
	})

	const nextLevel = computed(() => {
		return LEVELS.find((level) => level.id === currentLevel.value + 1)?.id
	})

	watch(
		() => gameStats.value,
		async () => {
			await Preferences.set({
				key: 'gameStats',
				value: JSON.stringify(gameStats.value),
			})
		},
		{ deep: true }
	)

	function setGameType(type: GAME_TYPE) {
		gameType.value = type
	}

	function selectLevel(levelInd: number) {
		currentLevel.value = levelInd

		curGameStat.value = {
			time: '',
			score: 0,
			date: '',
		}
	}

	function updateGameStat(
		fields: (keyof IGameStat)[],
		newGameStat: Partial<IGameStat>
	) {
		fields.forEach((key) => {
			if (curGameStat.value[key] !== undefined) {
				// @ts-ignore
				curGameStat.value[key] = newGameStat[key]
			}
		})
	}

	function gameEnd(time: string) {
		if (curGameStat.value) {
			curGameStat.value.time = time
			curGameStat.value.date = new Date().toDateString()
		}

		if (gameType.value) {
			gameStats.value[gameType.value][currentLevel.value] = curGameStat.value
		}
	}

	function reload() {
		selectLevel(currentLevel.value)
	}

	function restore() {
		curGameStat.value = {
			time: '',
			score: 0,
			date: '',
		}
	}

	async function loadData() {
		const ret = await Preferences.get({ key: 'gameStats' })

		if (ret.value) {
			gameStats.value = JSON.parse(ret.value) as IGameStats
		}
	}

	return {
		gameType,
		setGameType,
		currentLevel,
		selectLevel,
		curGameStat,
		updateGameStat,
		gameEnd,
		reload,
		gameStats,
		loadData,
		nextLevel,
		restore,
	}
})
