import { reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export interface IGameStat {
	score?: number
	date: string
}

export type IGameStats = {
	[key: string]: { [key: number]: IGameStat }
}

export const useGameStore = defineStore('GameStore', () => {
	const curGameStat = ref<IGameStat>({
		score: 0,
		date: '',
	})
	const gameStats = ref<IGameStats>({})

	const activeLevels = reactive<{ [key: string]: boolean }>({})

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

	function gameEnd() {
		curGameStat.value.date = new Date().toDateString()

		gameStats.value[new Date().getMilliseconds()] = curGameStat.value
	}

	function restore() {
		curGameStat.value = {
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

	function clickLevel(levelInd: number) {
		if (activeLevels[levelInd]) {
			delete activeLevels[levelInd]
		} else {
			activeLevels[levelInd] = true
		}
	}

	return {
		clickLevel,
		activeLevels,
		curGameStat,
		updateGameStat,
		gameEnd,
		gameStats,
		loadData,
		restore,
	}
})
