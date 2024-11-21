import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

export interface IGameStat {
	time: string
	score: number
	date: Date
}

export type IGameStats = {
	[key: string]: { [key: number]: IGameStat }
}

export const useGameStore = defineStore('GameStore', () => {
	const selectedBookInd = ref<null | number>(null)
	const gameStats = ref<IGameStats>({})

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

	function setSelectedBookInd(id: number | null) {
		selectedBookInd.value = id
	}

	function gameEnd(data: IGameStat) {
		if (!gameStats.value[String(selectedBookInd.value)]) {
			return gameStats.value[String(selectedBookInd.value)] = { [data.date.getTime()]: data }
		}
		gameStats.value[String(selectedBookInd.value)][data.date.getTime()] = data
	}

	async function loadData() {
		const ret = await Preferences.get({ key: 'gameStats' })

		if (ret.value) {
			gameStats.value = JSON.parse(ret.value) as IGameStats
		}
	}

	return {
		selectedBookInd,
		setSelectedBookInd,

		gameEnd,
		gameStats,
		loadData,
	}
})
