import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

import { I_GameStats, TYPE_TIMES } from '@/utils/types'

import { DEFAULT_NAME, LEVELS, TIMES } from '@/utils/conts'

export const useGameStore = defineStore('GameStore', () => {
	const name = ref<string>('')
	const setName = (value: string) => (name.value = value)
	watch(
		() => name.value,
		async () => {
			await Preferences.set({
				key: 'name',
				value: name.value || DEFAULT_NAME,
			})
		}
	)

	const level = ref<null | number>(null)
	const selectLevel = (id: number | null) => {
		level.value = id
	}
	const getCurrentLevel = computed(() =>
		LEVELS.find((item) => item.id === level.value)
	)

	const timeType = ref<TYPE_TIMES>(TIMES.MIN_3)
	const setTimeType = (type: TYPE_TIMES) => (timeType.value = type)

	const gameStats = ref<I_GameStats>({})
	const recordGameStat = (score: number, id: number, nameValue?: string) => {
		if (!gameStats.value[id]) {
			gameStats.value[id] = Object.values(TIMES).reduce(
				(total: Partial<{ [key in TYPE_TIMES]: [] }>, key: TYPE_TIMES) => {
					total[key] = []
					return total
				},
				{}
			) as { [key in TYPE_TIMES]: [] }
		}

		if (!gameStats.value[id][timeType.value]) {
			gameStats.value[id][timeType.value] = []
		}

		gameStats.value[id][timeType.value] = [
			...gameStats.value[id][timeType.value],
			{
				name: nameValue || name.value || DEFAULT_NAME,
				score,
				date: new Date(),
			},
		]
			.sort((a, b) => (a.score > b.score ? -1 : 1))
			.slice(0, 30)
	}
	watch(
		() => gameStats.value,
		async () => {
			await Preferences.set({
				key: 'gameStats',
				value: JSON.stringify(gameStats.value),
			})
		}
	)

	const loadData = async () => {
		const localData = await Preferences.get({ key: 'gameStats' })

		if (localData.value) {
			gameStats.value = JSON.parse(localData.value) as I_GameStats
		}

		const nameData = await Preferences.get({ key: 'name' })

		name.value = nameData.value || DEFAULT_NAME
	}

	// Tie the timer/modal colors to the selected level (fallback to first level).
	const bgColor = computed(
		() => getCurrentLevel.value?.bgColor ?? LEVELS[0].bgColor
	)
	const mainColor = computed(
		() => getCurrentLevel.value?.mainColor ?? LEVELS[0].mainColor
	)

	return {
		name,
		setName,
		level,
		selectLevel,
		getCurrentLevel,
		timeType,
		setTimeType,
		gameStats,
		recordGameStat,
		loadData,
		bgColor,
		mainColor,
	}
})
