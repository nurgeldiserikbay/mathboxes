import { ref } from 'vue'
import { defineStore } from 'pinia'
import { Preferences } from '@capacitor/preferences'

/**
 * Interstitials are paced by games, not by every game over. An ad after each
 * run is the single loudest reason to leave a game like this, and the runs are
 * short — a minute each — so the ad would arrive every minute.
 *
 * The gap is random inside a small range instead of fixed, so the ad never
 * lands on a predictable game the player can learn to avoid by quitting early.
 */
const KEY_GATE = 'adGate'
const MIN_GAMES_BETWEEN = 3
const MAX_GAMES_BETWEEN = 4

function pickGap(): number {
	const span = MAX_GAMES_BETWEEN - MIN_GAMES_BETWEEN + 1
	return MIN_GAMES_BETWEEN + Math.floor(Math.random() * span)
}

export const useAdsStore = defineStore('adsStore', () => {
	const loading = ref(false)

	function toggleLoading(value: boolean) {
		loading.value = value
	}

	/**
	 * Стоит ли сейчас настоящее объявление в баннерном слоте.
	 *
	 * Слот зарезервирован всегда, поэтому кто-то должен решать, что в нём
	 * рисовать: пришедший баннер закрывает строку собой, а пока его нет — там
	 * кросс-промо наших же игр. Ответ на этот вопрос знает только нативный
	 * слой, поэтому он его сюда и публикует.
	 */
	const bannerLive = ref(false)
	/** Настоящая высота объявления, когда она стала известна. */
	const bannerHeight = ref(0)

	function setBanner(live: boolean, height = 0) {
		bannerLive.value = live
		bannerHeight.value = live ? height : 0
		if (live) bannerFault.value = ''
	}

	/** Последняя причина, по которой баннера нет. Видна только в dev-сборке. */
	const bannerFault = ref('')

	function setBannerFault(reason: string) {
		bannerFault.value = reason
	}

	/** Games finished since the last interstitial, and the gap to the next one. */
	const gamesSinceAd = ref(0)
	const gapToNextAd = ref(pickGap())

	async function loadGate() {
		try {
			const stored = await Preferences.get({ key: KEY_GATE })
			if (!stored.value) return
			const parsed = JSON.parse(stored.value) as { since?: number; gap?: number }
			if (typeof parsed.since === 'number') {
				gamesSinceAd.value = Math.max(0, Math.min(MAX_GAMES_BETWEEN, parsed.since))
			}
			if (
				typeof parsed.gap === 'number' &&
				parsed.gap >= MIN_GAMES_BETWEEN &&
				parsed.gap <= MAX_GAMES_BETWEEN
			) {
				gapToNextAd.value = parsed.gap
			}
		} catch {
			// A broken value just means the count starts over.
		}
	}

	function persistGate() {
		void Preferences.set({
			key: KEY_GATE,
			value: JSON.stringify({ since: gamesSinceAd.value, gap: gapToNextAd.value }),
		})
	}

	/**
	 * Counts the finished game and answers whether it earns an interstitial.
	 * Call exactly once per game over. The count is stored, so closing the app
	 * between games is not a way to never see an ad.
	 */
	function claimInterstitial(): boolean {
		gamesSinceAd.value += 1

		if (gamesSinceAd.value < gapToNextAd.value) {
			persistGate()
			return false
		}

		gamesSinceAd.value = 0
		gapToNextAd.value = pickGap()
		persistGate()
		return true
	}

	return {
		loading,
		toggleLoading,
		bannerLive,
		bannerFault,
		setBannerFault,
		bannerHeight,
		setBanner,
		gamesSinceAd,
		gapToNextAd,
		loadGate,
		claimInterstitial,
	}
})
