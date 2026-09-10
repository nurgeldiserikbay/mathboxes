import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

import { I_Records, I_SessionSummary } from '@/utils/types'
import { DEFAULT_NAME } from '@/utils/conts'
import { THEME_RANDOM } from '@/utils/locations'

const KEY_NAME = 'name'
/** v4: floors, not per-operation score slots. The old tables are left where
 *  they are rather than migrated into a shape that means something else. */
const KEY_RECORDS = 'records4'
const KEY_LANG = 'lang'
/** Где играть: идентификатор локации или `random`. */
const KEY_THEME = 'theme'

function emptyRecords(): I_Records {
	return { bestFloor: 0, bestScore: 0, gamesPlayed: 0, totalCorrect: 0 }
}

export const useGameStore = defineStore('GameStore', () => {
	const name = ref<string>(DEFAULT_NAME)
	const locale = ref<string>('')

	/**
	 * Выбранная локация. `random` — по умолчанию и намеренно: место должно
	 * удивлять, а лезть за ним в настройки перед каждой партией никто не станет.
	 */
	const theme = ref<string>(THEME_RANDOM)

	/** The only history the game keeps: how high, how much, how often. */
	const records = ref<I_Records>(emptyRecords())

	const lastSummary = ref<I_SessionSummary | null>(null)

	const bestFloor = computed(() => records.value.bestFloor)
	const bestScore = computed(() => records.value.bestScore)

	function setName(value: string) {
		name.value = value.trim() || DEFAULT_NAME
		void Preferences.set({ key: KEY_NAME, value: name.value })
	}

	function setLocale(value: string) {
		locale.value = value
		void Preferences.set({ key: KEY_LANG, value })
	}

	function setTheme(value: string) {
		theme.value = value
		void Preferences.set({ key: KEY_THEME, value })
	}

	/**
	 * Called once when a run ends. Written straight away: a closed app or a
	 * missed tap must never cost the player the tower they just climbed.
	 */
	function finishSession(summary: I_SessionSummary) {
		records.value = {
			bestFloor: Math.max(records.value.bestFloor, summary.floor),
			bestScore: Math.max(records.value.bestScore, summary.score),
			gamesPlayed: records.value.gamesPlayed + 1,
			totalCorrect: records.value.totalCorrect + summary.correct,
		}

		lastSummary.value = summary
		void persist()
	}

	async function persist() {
		await Preferences.set({
			key: KEY_RECORDS,
			value: JSON.stringify(records.value),
		})
	}

	async function loadData() {
		const [stored, nameData, langData, themeData] = await Promise.all([
			Preferences.get({ key: KEY_RECORDS }),
			Preferences.get({ key: KEY_NAME }),
			Preferences.get({ key: KEY_LANG }),
			Preferences.get({ key: KEY_THEME }),
		])

		name.value = nameData.value || DEFAULT_NAME
		locale.value = langData.value || ''
		theme.value = themeData.value || THEME_RANDOM

		if (!stored.value) return
		try {
			// Merged over a fresh record so a value added in a later version is
			// never `undefined` on a device that saved the older shape.
			const parsed = JSON.parse(stored.value) as Partial<I_Records>
			records.value = { ...emptyRecords(), ...parsed }
		} catch {
			records.value = emptyRecords()
		}
	}

	return {
		name,
		setName,
		locale,
		setLocale,
		theme,
		setTheme,
		records,
		bestFloor,
		bestScore,
		lastSummary,
		finishSession,
		loadData,
		persist,
	}
})
